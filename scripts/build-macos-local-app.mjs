#!/usr/bin/env node
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { stampMacOsLaunchServicesMetadata } from './app-bundle-launchservices.mjs'

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url))
const REPO_ROOT = resolve(SCRIPT_DIR, '..')
const APP_PATH = resolve(REPO_ROOT, 'src-tauri/target/release/bundle/macos/Grimoire.app')
const PACKAGE_JSON = resolve(REPO_ROOT, 'package.json')
const TAURI_CONFIG = resolve(REPO_ROOT, 'src-tauri/tauri.conf.json')
const CARGO_TOML = resolve(REPO_ROOT, 'src-tauri/Cargo.toml')
const CARGO_LOCK = resolve(REPO_ROOT, 'src-tauri/Cargo.lock')

function run(command, args) {
  const result = spawnSync(command, args, {
    cwd: REPO_ROOT,
    stdio: 'inherit',
  })

  if (result.status !== 0) {
    throw new Error(`${command} ${args.join(' ')} failed`)
  }
}

function runAllowFailure(command, args) {
  spawnSync(command, args, {
    cwd: REPO_ROOT,
    stdio: 'ignore',
  })
}

function packageVersion() {
  return JSON.parse(readFileSync(PACKAGE_JSON, 'utf8')).version
}

function snapshotVersionFiles() {
  return [PACKAGE_JSON, TAURI_CONFIG, CARGO_TOML, CARGO_LOCK]
    .filter((path) => existsSync(path))
    .map((path) => ({ contents: readFileSync(path, 'utf8'), path }))
}

function restoreVersionFiles(snapshot) {
  for (const file of snapshot) {
    writeFileSync(file.path, file.contents)
  }
}

function removeLegacyLaunchServicesKeys(appPath) {
  runAllowFailure('/usr/libexec/PlistBuddy', [
    '-c',
    'Delete :LSRequiresCarbon',
    resolve(appPath, 'Contents/Info.plist'),
  ])
}

function main() {
  if (process.platform !== 'darwin') {
    throw new Error('Local macOS app builds require macOS')
  }

  const versionSnapshot = snapshotVersionFiles()
  let bundleVerified = false

  try {
    run('node', ['scripts/bump-build-version.mjs'])
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

    removeLegacyLaunchServicesKeys(APP_PATH)
    stampMacOsLaunchServicesMetadata(APP_PATH)
    run('codesign', ['--force', '--deep', '--sign', '-', APP_PATH])
    run('node', ['scripts/verify-release-artifacts.mjs', '--app', APP_PATH, '--require-codesign'])
    run('node', [
      'scripts/verify-app-bundle-version.mjs',
      '--app',
      APP_PATH,
      '--expected-version',
      packageVersion(),
    ])
    bundleVerified = true
  } finally {
    if (!bundleVerified) restoreVersionFiles(versionSnapshot)
  }
}

try {
  main()
} catch (error) {
  const message = error instanceof Error ? error.message : String(error)
  console.error(`macOS app build failed: ${message}`)
  process.exitCode = 1
}
