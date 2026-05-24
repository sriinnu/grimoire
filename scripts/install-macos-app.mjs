#!/usr/bin/env node
import {
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import { basename, dirname, join, resolve } from 'node:path'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url))
const REPO_ROOT = resolve(SCRIPT_DIR, '..')
const SOURCE_APP_PATH = resolve(REPO_ROOT, 'src-tauri/target/release/bundle/macos/Grimoire.app')
const PACKAGE_JSON = resolve(REPO_ROOT, 'package.json')
const APP_BUNDLE_ID = 'com.sriinnu.grimoire'
const APP_NAME = 'Grimoire.app'
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

function packageVersion() {
  return JSON.parse(readFileSync(PACKAGE_JSON, 'utf8')).version
}

function assertCanonicalDestination(appPath, applicationsDir = '/Applications') {
  const resolvedAppPath = resolve(appPath)
  if (basename(resolvedAppPath) !== APP_NAME || dirname(resolvedAppPath) !== resolve(applicationsDir)) {
    throw new Error(`Refusing non-canonical install destination: ${resolvedAppPath}`)
  }
}

function quitRunningApp() {
  const script = `tell application id "${APP_BUNDLE_ID}" to quit`
  spawnSync('osascript', ['-e', script], { stdio: 'ignore' })
}

function verifyInstalledVersion(appPath, expectedVersion) {
  run('node', [
    'scripts/verify-app-bundle-version.mjs',
    '--app',
    appPath,
    '--expected-version',
    expectedVersion,
  ])
}

function installBuiltApp({
  applicationsDir = '/Applications',
  applicationsAppPath = APPLICATIONS_APP_PATH,
  expectedVersion = packageVersion(),
  skipSystemActions = false,
  sourceAppPath = SOURCE_APP_PATH,
} = {}) {
  assertCanonicalDestination(applicationsAppPath, applicationsDir)
  if (!existsSync(sourceAppPath)) {
    throw new Error(`Build the app first: ${sourceAppPath}`)
  }

  if (!skipSystemActions) quitRunningApp()

  rmSync(applicationsAppPath, { recursive: true, force: true })
  cpSync(sourceAppPath, applicationsAppPath, { recursive: true, verbatimSymlinks: true })

  if (!skipSystemActions) {
    run('codesign', ['--force', '--deep', '--sign', '-', applicationsAppPath])
    run('node', [
      'scripts/verify-release-artifacts.mjs',
      '--app',
      applicationsAppPath,
      '--require-codesign',
    ])
  }

  verifyInstalledVersion(applicationsAppPath, expectedVersion)
  console.log(`Installed ${applicationsAppPath}`)
}

function writeTestApp(appPath, version, marker) {
  const contents = join(appPath, 'Contents')
  mkdirSync(contents, { recursive: true })
  writeFileSync(join(contents, 'Info.plist'), [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<plist version="1.0">',
    '<dict>',
    '<key>CFBundleShortVersionString</key>',
    `<string>${version}</string>`,
    '<key>CFBundleVersion</key>',
    `<string>${version}</string>`,
    '</dict>',
    '</plist>',
    '',
  ].join('\n'))
  writeFileSync(join(contents, marker), marker)
}

function runSelfTest() {
  const tempDir = mkdtempSync(join(tmpdir(), 'grimoire-install-app-'))
  try {
    const applicationsDir = join(tempDir, 'Applications')
    const sourceAppPath = join(tempDir, 'build', APP_NAME)
    const applicationsAppPath = join(applicationsDir, APP_NAME)
    writeTestApp(sourceAppPath, '8.9.10', 'new-build')
    writeTestApp(applicationsAppPath, '0.0.1', 'stale-build')

    installBuiltApp({
      applicationsDir,
      applicationsAppPath,
      expectedVersion: '8.9.10',
      skipSystemActions: true,
      sourceAppPath,
    })

    const installedContents = join(applicationsAppPath, 'Contents')
    if (existsSync(join(installedContents, 'stale-build'))) {
      throw new Error('Self-test left the stale app bundle in place')
    }
    if (!existsSync(join(installedContents, 'new-build'))) {
      throw new Error('Self-test did not install the new app bundle')
    }
    const installedApps = readdirSync(applicationsDir).filter(name => name.endsWith('.app'))
    if (installedApps.join(',') !== APP_NAME) {
      throw new Error(`Self-test created duplicate apps: ${installedApps.join(', ')}`)
    }

    let rejectedBadPath = false
    try {
      assertCanonicalDestination(join(applicationsDir, 'Grimoire 2.app'), applicationsDir)
    } catch {
      rejectedBadPath = true
    }
    if (!rejectedBadPath) throw new Error('Self-test accepted a non-canonical app name')
    console.log('self-test passed')
  } finally {
    rmSync(tempDir, { recursive: true, force: true })
  }
}

function main() {
  if (hasArg('--self-test')) {
    runSelfTest()
    return
  }

  if (process.platform !== 'darwin') {
    throw new Error('Installing into /Applications requires macOS')
  }

  if (!hasArg('--skip-build')) {
    run('node', ['scripts/build-macos-local-app.mjs'])
  }

  installBuiltApp()
}

try {
  main()
} catch (error) {
  const message = error instanceof Error ? error.message : String(error)
  console.error(`macOS app install failed: ${message}`)
  process.exitCode = 1
}
