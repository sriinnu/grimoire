import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { REQUIRED_RELEASE_SECRETS } from './release-preflight.mjs'

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url))
const REPO_ROOT = resolve(SCRIPT_DIR, '..')
const OPTIONAL_RELEASE_SECRET_ROWS = ['TAURI_SIGNING_PRIVATE_KEY_PASSWORD']

function readRunbook() {
  return readFileSync(resolve(REPO_ROOT, 'docs/RELEASE-RUNBOOK.md'), 'utf8').replace(/\r\n?/gu, '\n')
}

function releaseRunbookSecretRows() {
  const rows = new Map()
  for (const line of readRunbook().split('\n')) {
    const match = line.match(/^\|\s*`([A-Z0-9_]+)`\s*\|\s*([^|]+?)\s*\|\s*([^|]+?)\s*\|$/u)
    if (!match) continue
    rows.set(match[1], {
      handling: match[3].trim(),
      source: match[2].trim(),
    })
  }
  return rows
}

/** Verifies the release runbook names every release secret with safe handling notes. */
export function assertReleaseSecretChecklistCoversRequiredSecrets(fail) {
  const rows = releaseRunbookSecretRows()
  const expectedSecrets = [...REQUIRED_RELEASE_SECRETS, ...OPTIONAL_RELEASE_SECRET_ROWS]
  for (const secret of expectedSecrets) {
    const row = rows.get(secret)
    if (!row) fail(`docs/RELEASE-RUNBOOK.md Secret Source Checklist must include ${secret}`)
    if (!row.source || row.source === '-') {
      fail(`docs/RELEASE-RUNBOOK.md Secret Source Checklist must describe the value source for ${secret}`)
    }
    if (!row.handling || row.handling === '-') {
      fail(`docs/RELEASE-RUNBOOK.md Secret Source Checklist must describe the handling note for ${secret}`)
    }
  }
}
