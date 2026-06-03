#!/usr/bin/env node
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import {
  printReleaseNextActions,
  releaseNextActions,
  releaseResultNextActions,
} from './release-next-actions.mjs'

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url))
const REPO_ROOT = resolve(SCRIPT_DIR, '..')
const DEFAULT_REPO = 'sriinnu/grimoire'
export const REQUIRED_RELEASE_SECRETS = [
  'APPLE_CERTIFICATE',
  'APPLE_CERTIFICATE_PASSWORD',
  'APPLE_ID',
  'APPLE_PASSWORD',
  'APPLE_TEAM_ID',
  'KEYCHAIN_PASSWORD',
  'TAURI_SIGNING_PRIVATE_KEY',
]

function parseArgs(argv) {
  const args = {
    repo: DEFAULT_REPO,
    selfTest: false,
  }

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index]
    if (arg === '--') continue
    if (arg === '--self-test') args.selfTest = true
    else if (arg === '--repo') args.repo = argv[++index] ?? args.repo
    else throw new Error(`Unknown argument: ${arg}`)
  }

  return args
}

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: options.cwd ?? REPO_ROOT,
    encoding: 'utf8',
    stdio: 'pipe',
  })

  if (result.status !== 0 && !options.allowFailure) {
    const detail = result.stderr.trim() || result.stdout.trim() || `exit ${result.status}`
    throw new Error(`${command} ${args.join(' ')} failed: ${detail}`)
  }

  return {
    ok: result.status === 0,
    stderr: result.stderr.trim(),
    stdout: result.stdout.trim(),
  }
}

function readJson(path) {
  return JSON.parse(readFileSync(resolve(REPO_ROOT, path), 'utf8'))
}

function readText(path) {
  return readFileSync(resolve(REPO_ROOT, path), 'utf8')
}

function parseJsonOutput(result, fallback) {
  const source = result.stdout || result.stderr
  if (!source) return fallback
  try {
    return JSON.parse(source)
  } catch {
    return fallback
  }
}

function ghJson(endpoint) {
  const result = run('gh', ['api', endpoint], { allowFailure: true })
  return {
    error: result.ok ? null : result.stderr || result.stdout || 'request failed',
    json: parseJsonOutput(result, null),
    ok: result.ok,
  }
}

function collectSecretNames(repo) {
  const result = run('gh', ['secret', 'list', '--repo', repo, '--json', 'name'], { allowFailure: true })
  const json = parseJsonOutput(result, null)
  return {
    error: result.ok ? null : result.stderr || result.stdout || 'request failed',
    names: Array.isArray(json) ? json.map((secret) => secret.name).filter(Boolean) : null,
    ok: result.ok,
  }
}

export function collectLiveState(repo) {
  return {
    pages: ghJson(`repos/${repo}/pages`),
    releaseWorkflow: ghJson(`repos/${repo}/actions/workflows/release.yml`),
    secrets: collectSecretNames(repo),
  }
}

export function collectLocalState() {
  return {
    packageJson: readJson('package.json'),
    tauriConfig: readJson('src-tauri/tauri.conf.json'),
    workflowText: readText('.github/workflows/release.yml'),
  }
}

function hasText(value) {
  return typeof value === 'string' && value.trim().length > 0
}

export function evaluatePreflight(state) {
  const blockers = []
  const warnings = []
  const scripts = state.packageJson.scripts ?? {}
  const workflowText = state.workflowText ?? ''
  const updater = state.tauriConfig.plugins?.updater
  const bundle = state.tauriConfig.bundle

  if (scripts['release:verify-artifacts'] !== 'node scripts/verify-release-artifacts.mjs') {
    blockers.push('package.json is missing release:verify-artifacts.')
  }
  if (scripts['test:release-pages'] !== 'node scripts/build-release-pages.mjs --self-test') {
    blockers.push('package.json is missing test:release-pages.')
  }
  if (bundle?.createUpdaterArtifacts !== true) {
    blockers.push('Tauri updater artifacts are not enabled.')
  }
  if (!Array.isArray(updater?.endpoints) || updater.endpoints.length === 0) {
    blockers.push('Tauri updater endpoints are missing.')
  }
  if (!hasText(updater?.pubkey)) {
    blockers.push('Tauri updater public key is missing.')
  }

  for (const needle of [
    'APPLE_CERTIFICATE',
    'APPLE_CERTIFICATE_PASSWORD',
    'KEYCHAIN_PASSWORD',
    'APPLE_ID',
    'APPLE_PASSWORD',
    'APPLE_TEAM_ID',
    'TAURI_SIGNING_PRIVATE_KEY',
    'pnpm release:verify-artifacts',
    'node scripts/build-release-pages.mjs',
    'actions/deploy-pages',
    'gh release upload',
  ]) {
    if (!workflowText.includes(needle)) {
      blockers.push(`release.yml is missing ${needle}.`)
    }
  }

  if (!state.live) return { blockers, warnings }

  if (!state.live.releaseWorkflow.ok) {
    blockers.push('GitHub release workflow could not be read through the API.')
  } else if (state.live.releaseWorkflow.json?.state !== 'active') {
    blockers.push(`GitHub release workflow is not active: ${state.live.releaseWorkflow.json?.state ?? 'unknown'}.`)
  }

  if (!state.live.pages.ok) {
    blockers.push('GitHub Pages is not configured for this repository.')
  }

  if (!state.live.secrets.ok || !state.live.secrets.names) {
    blockers.push('Release secret names could not be inspected with the current GitHub token.')
  } else {
    const secretNames = new Set(state.live.secrets.names)
    const missing = REQUIRED_RELEASE_SECRETS.filter((secret) => !secretNames.has(secret))
    if (missing.length > 0) {
      blockers.push(`Release secrets missing: ${missing.join(', ')}.`)
    }
  }

  if (!state.live.secrets.names?.includes('TAURI_SIGNING_PRIVATE_KEY_PASSWORD')) {
    warnings.push('TAURI_SIGNING_PRIVATE_KEY_PASSWORD is absent; this is okay only if the updater key has no password.')
  }

  return { blockers, warnings }
}

function runSelfTest() {
  const readyState = {
    live: {
      pages: { ok: true },
      releaseWorkflow: { json: { state: 'active' }, ok: true },
      secrets: {
        names: [...REQUIRED_RELEASE_SECRETS, 'TAURI_SIGNING_PRIVATE_KEY_PASSWORD'],
        ok: true,
      },
    },
    packageJson: {
      scripts: {
        'release:verify-artifacts': 'node scripts/verify-release-artifacts.mjs',
        'test:release-pages': 'node scripts/build-release-pages.mjs --self-test',
      },
    },
    tauriConfig: {
      bundle: { createUpdaterArtifacts: true },
      plugins: { updater: { endpoints: ['https://example.test/latest.json'], pubkey: 'abc' } },
    },
    workflowText: [
      'APPLE_CERTIFICATE',
      'APPLE_CERTIFICATE_PASSWORD',
      'KEYCHAIN_PASSWORD',
      'APPLE_ID',
      'APPLE_PASSWORD',
      'APPLE_TEAM_ID',
      'TAURI_SIGNING_PRIVATE_KEY',
      'pnpm release:verify-artifacts',
      'node scripts/build-release-pages.mjs',
      'actions/deploy-pages',
      'gh release upload',
    ].join('\n'),
  }

  const blockedState = {
    ...readyState,
    live: {
      pages: { ok: false },
      releaseWorkflow: { json: { state: 'active' }, ok: true },
      secrets: { names: [], ok: true },
    },
  }

  if (evaluatePreflight(readyState).blockers.length !== 0) {
    throw new Error('ready fixture should have no blockers')
  }
  if (evaluatePreflight(blockedState).blockers.length < 2) {
    throw new Error('blocked fixture should report missing secrets and Pages')
  }
  if (!releaseNextActions(evaluatePreflight(blockedState).blockers).some((action) => action.includes('Set the GitHub repository release secrets'))) {
    throw new Error('blocked fixture should print missing release-secret next actions')
  }
  if (!releaseNextActions(evaluatePreflight(blockedState).blockers).some((action) => action.includes('pnpm release:secrets'))) {
    throw new Error('blocked fixture should print release-secret handoff next actions')
  }
  if (!releaseResultNextActions(evaluatePreflight(blockedState)).some((action) => action.includes('TAURI_SIGNING_PRIVATE_KEY_PASSWORD'))) {
    throw new Error('blocked fixture should print optional updater password warning next actions')
  }

  console.log('[release-preflight] self-test ok')
}

function printReport(result) {
  if (result.warnings.length > 0) {
    console.log('Warnings:')
    for (const warning of result.warnings) console.log(`- ${warning}`)
  }

  if (result.blockers.length === 0) {
    console.log('[release-preflight] ok')
    return
  }

  console.error('Blockers:')
  for (const blocker of result.blockers) console.error(`- ${blocker}`)
  printReleaseNextActions(result, console.error)
  process.exitCode = 1
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  try {
    const args = parseArgs(process.argv.slice(2))
    if (args.selfTest) {
      runSelfTest()
    } else {
      const state = {
        ...collectLocalState(),
        live: collectLiveState(args.repo),
      }
      printReport(evaluatePreflight(state))
    }
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error))
    process.exit(1)
  }
}
