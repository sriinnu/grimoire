#!/usr/bin/env node
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url))
const REPO_ROOT = resolve(SCRIPT_DIR, '..')

const EXPECTED_ACTIONS = [
  'actions/checkout@v6',
  'actions/setup-node@v6',
  'pnpm/action-setup@v6',
]

const LEGACY_ACTIONS = [
  'actions/checkout@v4',
  'actions/setup-node@v4',
  'pnpm/action-setup@v4',
]

const WORKFLOWS = ['.github/workflows/ci.yml', '.github/workflows/release.yml']

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

function assertNotContains(path, text, forbidden) {
  if (text.includes(forbidden)) {
    fail(`${path} must not contain ${forbidden}`)
  }
}

function verifyWorkflow(path) {
  const text = readText(path)

  for (const action of EXPECTED_ACTIONS) {
    assertContains(path, text, action)
  }

  for (const action of LEGACY_ACTIONS) {
    assertNotContains(path, text, action)
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
  assertContains('.github/workflows/ci.yml', ci, 'timeout-minutes: 25')
  console.log('[github-actions-runtime] ok')
} catch (error) {
  const message = error instanceof Error ? error.message : String(error)
  console.error(message)
  process.exit(1)
}
