#!/usr/bin/env node
import { existsSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url))
const REPO_ROOT = resolve(SCRIPT_DIR, '..')
const APP_PATH = resolve(REPO_ROOT, 'src-tauri/target/release/bundle/macos/Grimoire.app')

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
    throw new Error('Local macOS app builds require macOS')
  }

  run('node', ['scripts/clean-tauri-bundles.mjs'])
  run('pnpm', [
    'tauri',
    'build',
    '--bundles',
    'app',
    '--config',
    '{"bundle":{"createUpdaterArtifacts":false}}',
  ])

  if (!existsSync(APP_PATH)) {
    throw new Error(`Expected app bundle was not created: ${APP_PATH}`)
  }

  run('codesign', ['--force', '--deep', '--sign', '-', APP_PATH])
  run('node', ['scripts/verify-release-artifacts.mjs', '--app', APP_PATH, '--require-codesign'])
}

try {
  main()
} catch (error) {
  const message = error instanceof Error ? error.message : String(error)
  console.error(`macOS app build failed: ${message}`)
  process.exitCode = 1
}
