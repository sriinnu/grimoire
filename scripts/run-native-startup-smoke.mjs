#!/usr/bin/env node
import { spawn, spawnSync } from 'node:child_process'
import { mkdtempSync, rmSync } from 'node:fs'
import { homedir, tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url))
const REPO_ROOT = resolve(SCRIPT_DIR, '..')
const APP_ARG = '--grimoire-native-startup-smoke'
const READY_MARKER = 'GRIMOIRE_NATIVE_STARTUP_SMOKE_READY'
const READY_PROOF = `${READY_MARKER} process_entry=true`
const DEFAULT_TIMEOUT_MS = 90_000
const timeoutMs = Number.parseInt(
  process.env.GRIMOIRE_NATIVE_STARTUP_SMOKE_TIMEOUT_MS ?? `${DEFAULT_TIMEOUT_MS}`,
  10,
)

function fail(message) {
  throw new Error(`[native-startup-smoke] ${message}`)
}

function appendOutput(output, chunk) {
  const next = output + chunk
  return next.length > 120_000 ? next.slice(-120_000) : next
}

function commandExists(command) {
  if (process.platform === 'win32') {
    return spawnSync('where', [command], { stdio: 'ignore' }).status === 0
  }
  return spawnSync('which', [command], { stdio: 'ignore' }).status === 0
}

function nativeProcessCommand() {
  const cargo = process.platform === 'win32' ? 'cargo.exe' : 'cargo'
  const args = [
    'run',
    '--manifest-path=src-tauri/Cargo.toml',
    '--no-default-features',
    '--locked',
    '--',
    APP_ARG,
  ]

  if (process.platform === 'linux' && !process.env.DISPLAY) {
    if (!commandExists('xvfb-run')) {
      fail('Linux startup smoke needs xvfb-run when DISPLAY is unset')
    }
    return { args: ['-a', cargo, ...args], command: 'xvfb-run' }
  }

  return { args, command: cargo }
}

function killProcessTree(child) {
  if (!child.pid) return
  if (process.platform === 'win32') {
    spawnSync('taskkill', ['/pid', String(child.pid), '/t', '/f'], { stdio: 'ignore' })
    return
  }

  try {
    process.kill(-child.pid, 'SIGTERM')
  } catch {
    child.kill('SIGTERM')
  }
}

function tempHomeEnv(tempRoot) {
  const userHome = homedir()

  return {
    APPDATA: join(tempRoot, 'AppData', 'Roaming'),
    CARGO_HOME: process.env.CARGO_HOME ?? join(userHome, '.cargo'),
    HOME: tempRoot,
    LOCALAPPDATA: join(tempRoot, 'AppData', 'Local'),
    RUSTUP_HOME: process.env.RUSTUP_HOME ?? join(userHome, '.rustup'),
    USERPROFILE: tempRoot,
    XDG_CACHE_HOME: join(tempRoot, '.cache'),
    XDG_CONFIG_HOME: join(tempRoot, '.config'),
    XDG_DATA_HOME: join(tempRoot, '.local', 'share'),
  }
}

async function runSmoke() {
  if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) {
    fail('GRIMOIRE_NATIVE_STARTUP_SMOKE_TIMEOUT_MS must be a positive integer')
  }

  const tempRoot = mkdtempSync(join(tmpdir(), 'grimoire-native-startup-'))
  const { args, command } = nativeProcessCommand()
  let output = ''
  let sawReady = false
  let timedOut = false
  let readyExitTimer = null

  try {
    const child = spawn(command, args, {
      cwd: REPO_ROOT,
      detached: process.platform !== 'win32',
      env: {
        ...process.env,
        ...tempHomeEnv(tempRoot),
        GRIMOIRE_NATIVE_STARTUP_SMOKE: '1',
        WEBKIT_DISABLE_DMABUF_RENDERER: process.env.WEBKIT_DISABLE_DMABUF_RENDERER ?? '1',
      },
      stdio: ['ignore', 'pipe', 'pipe'],
    })

    const timer = setTimeout(() => {
      timedOut = true
      killProcessTree(child)
    }, timeoutMs)

    const handleChunk = (chunk, stream) => {
      const text = chunk.toString()
      stream.write(text)
      output = appendOutput(output, text)
      if (!sawReady && output.includes(READY_PROOF)) {
        sawReady = true
        readyExitTimer = setTimeout(() => killProcessTree(child), 5000)
      }
    }

    child.stdout?.on('data', (chunk) => handleChunk(chunk, process.stdout))
    child.stderr?.on('data', (chunk) => handleChunk(chunk, process.stderr))

    const { code, signal } = await new Promise((resolveExit, rejectExit) => {
      child.on('error', rejectExit)
      child.on('exit', (exitCode, exitSignal) => {
        clearTimeout(timer)
        if (readyExitTimer) clearTimeout(readyExitTimer)
        resolveExit({ code: exitCode ?? 1, signal: exitSignal })
      })
    })

    if (!sawReady) {
      if (timedOut) fail(`timed out after ${timeoutMs}ms waiting for ${READY_MARKER}`)
      if (signal) fail(`process exited via signal ${signal}`)
      if (code !== 0) fail(`cargo run exited ${code}\n${output.trim()}`)
      fail(`process exited without ${READY_MARKER}`)
    }

    console.log(`[native-startup-smoke] observed ${READY_MARKER}`)
  } finally {
    rmSync(tempRoot, { force: true, recursive: true })
  }
}

runSmoke().catch((error) => {
  const message = error instanceof Error ? error.message : String(error)
  console.error(message)
  process.exit(1)
})
