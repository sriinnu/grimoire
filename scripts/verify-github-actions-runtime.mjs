#!/usr/bin/env node
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url))
const REPO_ROOT = resolve(SCRIPT_DIR, '..')

// Actions may be referenced by tag (`@v6`) or pinned to a commit SHA with the
// version as a trailing comment (`@<sha>  # v6.1.0`), which is how workflows
// pin third-party code. Both forms count as that major.
const ACTIONS = ['actions/checkout', 'actions/setup-node', 'pnpm/action-setup']
const EXPECTED_MAJOR = 6
const LEGACY_MAJOR = 4

const WORKFLOWS = ['.github/workflows/ci.yml', '.github/workflows/release.yml']

const CI_STEP_TIMEOUTS = [
  ['Native Tauri Link Smoke', 25],
  ['Native Tauri Startup Smoke', 15],
  ['Frontend Tests', 20],
  ['Markdown Editor Parity JS', 10],
  ['Markdown Editor Parity Swift', 10],
  ['Install Playwright Browsers', 10],
  ['Browser Smoke Chromium', 15],
  ['Browser Smoke WebKit Core', 15],
  ['Rust Lint', 20],
]

function readText(path) {
  return readFileSync(resolve(REPO_ROOT, path), 'utf8').replace(/\r\n?/gu, '\n')
}

function fail(message) {
  throw new Error(`[github-actions-runtime] ${message}`)
}

function assertContains(path, text, expected) {
  if (!text.includes(expected)) {
    fail(`${path} must contain ${expected}`)
  }
}

function usesMajor(text, action, major) {
  const name = action.replace(/[.*+?^${}()|[\]\\/]/gu, '\\$&')
  const pattern = new RegExp(
    `${name}@(?:v${major}(?![0-9])|[0-9a-f]{40}[ \\t]+#[ \\t]*v${major}(?![0-9]))`,
    'u',
  )
  return pattern.test(text)
}

function assertNotContains(path, text, forbidden) {
  if (text.includes(forbidden)) {
    fail(`${path} must not contain ${forbidden}`)
  }
}

function getStepBlock(path, text, stepName) {
  const marker = `- name: ${stepName}`
  const start = text.indexOf(marker)

  if (start === -1) {
    fail(`${path} must contain CI step "${stepName}"`)
  }

  const next = text.indexOf('\n      - name:', start + marker.length)
  return text.slice(start, next === -1 ? text.length : next)
}

function assertStepTimeout(path, text, stepName, minutes) {
  const block = getStepBlock(path, text, stepName)
  const timeout = `timeout-minutes: ${minutes}`

  if (!block.includes(timeout)) {
    fail(`${path} step "${stepName}" must set ${timeout}`)
  }
}

function verifyWorkflow(path) {
  const text = readText(path)

  for (const action of ACTIONS) {
    if (!usesMajor(text, action, EXPECTED_MAJOR)) {
      fail(`${path} must use ${action}@v${EXPECTED_MAJOR} (tag or SHA pinned with a # v${EXPECTED_MAJOR}.x comment)`)
    }
    if (usesMajor(text, action, LEGACY_MAJOR)) {
      fail(`${path} must not use ${action}@v${LEGACY_MAJOR}`)
    }
  }

  assertContains(path, text, "node-version: '24'")
  assertNotContains(path, text, "node-version: '20'")
}

try {
  for (const workflow of WORKFLOWS) {
    verifyWorkflow(workflow)
  }
  const ci = readText('.github/workflows/ci.yml')
  assertContains('.github/workflows/ci.yml', ci, 'Native Tauri Link Smoke')
  assertContains('.github/workflows/ci.yml', ci, 'pnpm test:native-tauri-link')
  assertContains('.github/workflows/ci.yml', ci, 'Native Tauri Startup Smoke')
  assertContains('.github/workflows/ci.yml', ci, 'pnpm test:native-tauri-startup')
  for (const [stepName, timeoutMinutes] of CI_STEP_TIMEOUTS) {
    assertStepTimeout('.github/workflows/ci.yml', ci, stepName, timeoutMinutes)
  }
  console.log('[github-actions-runtime] ok')
} catch (error) {
  const message = error instanceof Error ? error.message : String(error)
  console.error(message)
  process.exit(1)
}
