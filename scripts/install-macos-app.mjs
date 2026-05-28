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
const INSTALL_WAIT_MS = 8000
const PROCESS_POLL_MS = 250
const sleepBuffer = new SharedArrayBuffer(4)
const sleepArray = new Int32Array(sleepBuffer)

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

function assertSingletonInstall(applicationsDir = '/Applications') {
  const apps = readdirSync(applicationsDir)
    .filter(name => name.startsWith('Grimoire') && name.endsWith('.app'))
    .sort()
  if (apps.length !== 1 || apps[0] !== APP_NAME) {
    throw new Error(`Refusing non-singleton Grimoire install set: ${apps.join(', ') || 'none'}`)
  }
}

function assertNoDuplicateGrimoireApps(applicationsDir = '/Applications') {
  const duplicates = readdirSync(applicationsDir)
    .filter(name => name.startsWith('Grimoire') && name.endsWith('.app') && name !== APP_NAME)
    .sort()
  if (duplicates.length > 0) {
    throw new Error(`Refusing duplicate Grimoire app bundles before install: ${duplicates.join(', ')}`)
  }
}

function quitRunningApp() {
  const script = `tell application id "${APP_BUNDLE_ID}" to quit`
  spawnSync('osascript', ['-e', script], { stdio: 'ignore' })
}

function sleepSync(ms) {
  Atomics.wait(sleepArray, 0, 0, ms)
}

function runningInstalledAppProcesses(appPath = APPLICATIONS_APP_PATH) {
  const marker = `${resolve(appPath)}/Contents/MacOS/`
  const result = spawnSync('ps', ['-Ao', 'pid=,args='], { encoding: 'utf8' })
  if (result.status !== 0) {
    throw new Error('Could not inspect running Grimoire processes before install')
  }

  return result.stdout
    .split('\n')
    .map(line => line.trim())
    .filter(Boolean)
    .filter(line => line.includes(marker))
    .map(line => {
      const [pid, ...args] = line.split(/\s+/)
      return { command: args.join(' '), pid }
    })
}

function waitForInstalledAppToExit(appPath = APPLICATIONS_APP_PATH, timeoutMs = INSTALL_WAIT_MS) {
  const startedAt = Date.now()
  while (Date.now() - startedAt < timeoutMs) {
    const running = runningInstalledAppProcesses(appPath)
    if (running.length === 0) return
    sleepSync(PROCESS_POLL_MS)
  }

  const running = runningInstalledAppProcesses(appPath)
  const pids = running.map(entry => entry.pid).join(', ')
  throw new Error(`Grimoire is still running from ${appPath}${pids ? ` (pid ${pids})` : ''}`)
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
  assertNoDuplicateGrimoireApps(applicationsDir)

  if (!skipSystemActions) {
    quitRunningApp()
    waitForInstalledAppToExit(applicationsAppPath)
  }

  rmSync(applicationsAppPath, { recursive: true, force: true })
  cpSync(sourceAppPath, applicationsAppPath, { recursive: true, verbatimSymlinks: true })
  assertSingletonInstall(applicationsDir)

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
    writeTestApp(join(applicationsDir, 'Grimoire Copy.app'), '8.9.10', 'duplicate-build')
    let rejectedDuplicate = false
    try {
      assertSingletonInstall(applicationsDir)
    } catch {
      rejectedDuplicate = true
    }
    if (!rejectedDuplicate) throw new Error('Self-test accepted duplicate Grimoire app bundles')
    writeTestApp(sourceAppPath, '8.9.11', 'blocked-build')
    let rejectedDuplicateBeforeMutation = false
    try {
      installBuiltApp({
        applicationsDir,
        applicationsAppPath,
        expectedVersion: '8.9.11',
        skipSystemActions: true,
        sourceAppPath,
      })
    } catch {
      rejectedDuplicateBeforeMutation = true
    }
    if (!rejectedDuplicateBeforeMutation) {
      throw new Error('Self-test installed while duplicate Grimoire bundles existed')
    }
    if (existsSync(join(installedContents, 'blocked-build'))) {
      throw new Error('Self-test mutated canonical app before rejecting duplicate bundles')
    }
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
