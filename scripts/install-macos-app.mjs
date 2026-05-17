#!/usr/bin/env node
import { cpSync, existsSync, rmSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url))
const REPO_ROOT = resolve(SCRIPT_DIR, '..')
const SOURCE_APP_PATH = resolve(REPO_ROOT, 'src-tauri/target/release/bundle/macos/Grimoire.app')
const APPLICATIONS_APP_PATH = '/Applications/Grimoire.app'

function hasArg(name) {
  return process.argv.includes(name)
}

function run(command, args) {
  const result = spawnSync(command, args, {
    cwd: REPO_ROOT,
    stdio: 'inherit',
  })

  if (result.status !== 0) {
    throw new Error(`${command} ${args.join(' ')} failed`)
  }
}

function main() {
  if (process.platform !== 'darwin') {
    throw new Error('Installing into /Applications requires macOS')
  }

  if (!hasArg('--skip-build')) {
    run('node', ['scripts/build-macos-local-app.mjs'])
  }

  if (!existsSync(SOURCE_APP_PATH)) {
    throw new Error(`Build the app first: ${SOURCE_APP_PATH}`)
  }

  rmSync(APPLICATIONS_APP_PATH, { recursive: true, force: true })
  cpSync(SOURCE_APP_PATH, APPLICATIONS_APP_PATH, { recursive: true, verbatimSymlinks: true })
  run('codesign', ['--force', '--deep', '--sign', '-', APPLICATIONS_APP_PATH])
  run('node', [
    'scripts/verify-release-artifacts.mjs',
    '--app',
    APPLICATIONS_APP_PATH,
    '--require-codesign',
  ])

  console.log(`Installed ${APPLICATIONS_APP_PATH}`)
}

try {
  main()
} catch (error) {
  const message = error instanceof Error ? error.message : String(error)
  console.error(`macOS app install failed: ${message}`)
  process.exitCode = 1
}
