#!/usr/bin/env node
import { readFileSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { REQUIRED_RELEASE_SECRETS } from './release-preflight.mjs'

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url))
const REPO_ROOT = resolve(SCRIPT_DIR, '..')
const DEFAULT_REPO = 'sriinnu/grimoire'
export const OPTIONAL_RELEASE_SECRETS = ['TAURI_SIGNING_PRIVATE_KEY_PASSWORD']

function readRunbook() {
  return readFileSync(resolve(REPO_ROOT, 'docs/RELEASE-RUNBOOK.md'), 'utf8').replace(/\r\n?/gu, '\n')
}

function parseArgs(argv) {
  const args = {
    repo: DEFAULT_REPO,
    selfTest: false,
    skipLive: false,
  }

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index]
    if (arg === '--') continue
    if (arg === '--self-test') args.selfTest = true
    else if (arg === '--no-live') args.skipLive = true
    else if (arg === '--repo') args.repo = argv[++index] ?? args.repo
    else throw new Error(`Unknown argument: ${arg}`)
  }

  return args
}

function ghSecretNames(repo) {
  const result = spawnSync('gh', ['secret', 'list', '--repo', repo, '--json', 'name'], {
    cwd: REPO_ROOT,
    encoding: 'utf8',
    stdio: 'pipe',
  })

  if (result.status !== 0) {
    return {
      error: result.stderr.trim() || result.stdout.trim() || `exit ${result.status}`,
      names: null,
      ok: false,
    }
  }

  try {
    const parsed = JSON.parse(result.stdout || '[]')
    return {
      error: null,
      names: Array.isArray(parsed) ? parsed.map((secret) => secret.name).filter(Boolean) : [],
      ok: true,
    }
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : String(error),
      names: null,
      ok: false,
    }
  }
}

/** Extracts the secret source and handling rows from the release runbook. */
export function parseSecretChecklist(markdown) {
  const rows = new Map()
  for (const line of markdown.replace(/\r\n?/gu, '\n').split('\n')) {
    const match = line.match(/^\|\s*`([A-Z0-9_]+)`\s*\|\s*([^|]+?)\s*\|\s*([^|]+?)\s*\|$/u)
    if (!match) continue
    rows.set(match[1], {
      handling: match[3].trim(),
      source: match[2].trim(),
    })
  }
  return rows
}

/** Builds a name-only handoff report for release-secret setup. */
export function buildReleaseSecretHandoff({
  configuredNames = null,
  markdown = readRunbook(),
} = {}) {
  const rows = parseSecretChecklist(markdown)
  const configured = configuredNames ? new Set(configuredNames) : null
  const expected = [
    ...REQUIRED_RELEASE_SECRETS.map((name) => ({ name, required: true })),
    ...OPTIONAL_RELEASE_SECRETS.map((name) => ({ name, required: false })),
  ]

  return expected.map(({ name, required }) => {
    const row = rows.get(name)
    if (!row?.source || !row?.handling) {
      throw new Error(`docs/RELEASE-RUNBOOK.md Secret Source Checklist is missing a complete row for ${name}`)
    }

    return {
      handling: row.handling,
      name,
      required,
      source: row.source,
      status: configured ? (configured.has(name) ? 'configured' : 'missing') : 'unknown',
    }
  })
}

/** Formats release-secret setup state without printing secret values. */
export function formatReleaseSecretHandoff(entries, { liveError = null, repo = DEFAULT_REPO } = {}) {
  const lines = [
    `[release-secrets] repo=${repo}`,
    `[release-secrets] value-safety=name-only; secret values are never printed or stored by this command`,
  ]

  if (liveError) {
    lines.push(`[release-secrets] secret-name-inspection=unavailable: ${liveError}`)
  } else if (entries.some((entry) => entry.status !== 'unknown')) {
    const missing = entries.filter((entry) => entry.status === 'missing').length
    const configured = entries.filter((entry) => entry.status === 'configured').length
    lines.push(`[release-secrets] secret-name-inspection=ok configured=${configured} missing=${missing}`)
  } else {
    lines.push('[release-secrets] secret-name-inspection=skipped')
  }

  for (const section of [
    ['Required secrets', true],
    ['Optional secret', false],
  ]) {
    const [title, required] = section
    lines.push('', `${title}:`)
    for (const entry of entries.filter((candidate) => candidate.required === required)) {
      lines.push(`- [${entry.status}] ${entry.name}`)
      lines.push(`  source: ${entry.source}`)
      lines.push(`  handling: ${entry.handling}`)
    }
  }

  lines.push(
    '',
    `Set missing names with the GitHub web UI or: gh secret set SECRET_NAME --repo ${repo}`,
    'Use stdin or the interactive prompt for values; never put secret values directly in command arguments.',
  )
  return lines.join('\n')
}

function runSelfTest() {
  const markdown = [
    '| Secret | Value source | Handling note |',
    '| --- | --- | --- |',
    ...[...REQUIRED_RELEASE_SECRETS, ...OPTIONAL_RELEASE_SECRETS].map((name) => (
      `| \`${name}\` | ${name} source. | ${name} handling. |`
    )),
  ].join('\n')
  const entries = buildReleaseSecretHandoff({
    configuredNames: ['APPLE_ID', 'TAURI_SIGNING_PRIVATE_KEY_PASSWORD'],
    markdown,
  })
  const output = formatReleaseSecretHandoff(entries, { repo: 'example/repo' })

  if (!output.includes('[configured] APPLE_ID') || !output.includes('[missing] APPLE_CERTIFICATE')) {
    throw new Error('self-test expected configured and missing statuses')
  }
  if (!output.includes('value-safety=name-only')) {
    throw new Error('self-test expected value-safety boundary')
  }
  if (!output.includes('gh secret set SECRET_NAME --repo example/repo')) {
    throw new Error('self-test expected safe gh secret set guidance')
  }
  if (!entries.some((entry) => entry.name === 'TAURI_SIGNING_PRIVATE_KEY_PASSWORD' && !entry.required)) {
    throw new Error('self-test expected optional updater password row')
  }

  const incomplete = '| Secret | Value source | Handling note |\n| --- | --- | --- |'
  try {
    buildReleaseSecretHandoff({ markdown: incomplete })
    throw new Error('self-test expected incomplete checklist to fail')
  } catch (error) {
    if (!String(error).includes('Secret Source Checklist is missing')) throw error
  }

  console.log('[release-secrets] self-test ok')
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  try {
    const args = parseArgs(process.argv.slice(2))
    if (args.selfTest) {
      runSelfTest()
    } else {
      const live = args.skipLive ? { error: null, names: null, ok: false } : ghSecretNames(args.repo)
      const entries = buildReleaseSecretHandoff({ configuredNames: live.ok ? live.names : null })
      console.log(formatReleaseSecretHandoff(entries, {
        liveError: args.skipLive ? null : live.error,
        repo: args.repo,
      }))
    }
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error))
    process.exit(1)
  }
}
