#!/usr/bin/env node
/**
 * Local Codex launcher for the Chitragupta MCP stdio bridge.
 *
 * The actual bridge is machine-local under ~/.codex. This wrapper keeps repo
 * setup secret-free while making fresh Codex MCP launches use the Codex-local
 * Chitragupta home, bridge token, streamable HTTP endpoint, and a Node runtime
 * that matches the native better-sqlite3 build.
 */

import { existsSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { spawn, spawnSync } from 'node:child_process'

const DEFAULT_CODEX_HOME = '/tmp/chitragupta-codex-home'
const DEFAULT_HTTP_URL = 'http://127.0.0.1:3001/mcp'
const DEFAULT_PROXY_RELATIVE = '.codex/scripts/chitragupta-mcp-stdio-proxy.mjs'

function homeDir() {
  return process.env.HOME || ''
}

function chitraguptaHome() {
  return process.env.CHITRAGUPTA_HOME || DEFAULT_CODEX_HOME
}

function bridgeTokenFile() {
  return join(chitraguptaHome(), 'daemon.api-key')
}

function daemonSocketFile() {
  return join(chitraguptaHome(), 'daemon/chitragupta.sock')
}

function proxyPath() {
  if (process.env.CHITRAGUPTA_MCP_STDIO_PROXY) return process.env.CHITRAGUPTA_MCP_STDIO_PROXY
  return join(homeDir(), DEFAULT_PROXY_RELATIVE)
}

function nodeCandidates() {
  const candidates = [
    process.env.CHITRAGUPTA_NODE_PATH,
    join(homeDir(), '.nvm/versions/node/v22.22.0/bin/node'),
    process.execPath,
    'node',
  ]
  return candidates.filter((candidate) => candidate && candidate.trim().length > 0)
}

function firstExistingNode() {
  for (const candidate of nodeCandidates()) {
    if (candidate === 'node' || existsSync(candidate)) return candidate
  }
  return 'node'
}

function readBridgeToken() {
  if (process.env.CHITRAGUPTA_MCP_BRIDGE_API_KEY) return process.env.CHITRAGUPTA_MCP_BRIDGE_API_KEY
  const tokenFile = bridgeTokenFile()
  if (!existsSync(tokenFile)) return ''
  return readFileSync(tokenFile, 'utf8').trim()
}

function childEnv(nodePath) {
  const env = {
    ...process.env,
    CHITRAGUPTA_HOME: chitraguptaHome(),
    CHITRAGUPTA_MCP_HTTP_URL: process.env.CHITRAGUPTA_MCP_HTTP_URL || DEFAULT_HTTP_URL,
  }
  const token = readBridgeToken()
  if (token) env.CHITRAGUPTA_MCP_BRIDGE_API_KEY = token
  if (nodePath !== 'node') env.PATH = `${dirname(nodePath)}:${env.PATH || ''}`
  return env
}

function projectPath() {
  return process.env.CHITRAGUPTA_MCP_PROJECT || process.cwd()
}

function httpPort() {
  const url = new URL(process.env.CHITRAGUPTA_MCP_HTTP_URL || DEFAULT_HTTP_URL)
  return url.port || (url.protocol === 'https:' ? '443' : '80')
}

function autostartEnabled() {
  return process.env.GRIMOIRE_CHITRAGUPTA_MCP_AUTOSTART !== 'false'
}

function startDaemon(nodePath) {
  if (existsSync(daemonSocketFile())) return
  spawnSync('chitragupta', ['daemon', 'start'], {
    env: childEnv(nodePath),
    stdio: 'ignore',
  })
}

async function hostReachable() {
  const token = readBridgeToken()
  if (!token) return false
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 900)
  try {
    const response = await fetch(process.env.CHITRAGUPTA_MCP_HTTP_URL || DEFAULT_HTTP_URL, {
      headers: {
        Accept: 'text/event-stream',
        Authorization: `Bearer ${token}`,
      },
      signal: controller.signal,
    })
    await response.body?.cancel()
    return response.ok
  } catch {
    return false
  } finally {
    clearTimeout(timer)
  }
}

function startHttpHost(nodePath) {
  const child = spawn('chitragupta-mcp', [
    '--streamable-http',
    '--port',
    httpPort(),
    '--agent',
    '--project',
    projectPath(),
  ], {
    detached: true,
    env: childEnv(nodePath),
    stdio: 'ignore',
  })
  child.unref()
}

async function waitForHost() {
  for (let attempt = 0; attempt < 10; attempt += 1) {
    if (await hostReachable()) return true
    await new Promise((resolve) => setTimeout(resolve, 200))
  }
  return false
}

async function ensureRuntime(nodePath) {
  if (!autostartEnabled()) return
  startDaemon(nodePath)
  if (await hostReachable()) return
  startHttpHost(nodePath)
  await waitForHost()
}

function dryRun() {
  const selectedNode = firstExistingNode()
  const selectedProxy = proxyPath()
  return {
    chitraguptaHome: chitraguptaHome(),
    httpUrl: process.env.CHITRAGUPTA_MCP_HTTP_URL || DEFAULT_HTTP_URL,
    nodePath: selectedNode,
    proxyPath: selectedProxy,
    proxyExists: existsSync(selectedProxy),
    tokenSource: readBridgeToken() ? 'local-file-or-env' : 'missing',
  }
}

if (process.argv.includes('--dry-run')) {
  process.stdout.write(`${JSON.stringify(dryRun(), null, 2)}\n`)
  process.exit(dryRun().proxyExists ? 0 : 1)
}

const selectedProxy = proxyPath()
if (!existsSync(selectedProxy)) {
  process.stderr.write(`[grimoire-chitragupta-mcp] Missing proxy: ${selectedProxy}\n`)
  process.exit(1)
}

const selectedNode = firstExistingNode()
await ensureRuntime(selectedNode)

const child = spawn(selectedNode, [selectedProxy, ...process.argv.slice(2)], {
  env: childEnv(selectedNode),
  stdio: 'inherit',
})

child.on('exit', (code, signal) => {
  if (signal) process.kill(process.pid, signal)
  process.exit(code ?? 0)
})

child.on('error', (error) => {
  process.stderr.write(`[grimoire-chitragupta-mcp] ${error.message}\n`)
  process.exit(1)
})
