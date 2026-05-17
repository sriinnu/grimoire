#!/usr/bin/env node
import { createHash } from 'node:crypto'
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
import { dirname, join, relative, resolve } from 'node:path'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url))
const REPO_ROOT = resolve(SCRIPT_DIR, '..')
const SOURCE_ICON_PATH = resolve(REPO_ROOT, 'src-tauri/icons/icon.icns')

function formatPath(path) {
  const relativePath = relative(REPO_ROOT, path)
  return relativePath.startsWith('..') ? path : relativePath
}

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: options.cwd ?? REPO_ROOT,
    encoding: 'utf8',
    stdio: options.stdio ?? 'pipe',
  })

  if (result.status !== 0 && !options.allowFailure) {
    const stderr = result.stderr ? `\n${result.stderr.trim()}` : ''
    throw new Error(`${command} ${args.join(' ')} failed${stderr}`)
  }

  return result
}

function sha256(path) {
  return createHash('sha256').update(readFileSync(path)).digest('hex')
}

function assertExists(path, label) {
  if (!existsSync(path)) {
    throw new Error(`${label} does not exist: ${formatPath(path)}`)
  }
}

function assertIconMatchesSource(iconPath, label) {
  assertExists(iconPath, `${label} icon`)

  const expectedHash = sha256(SOURCE_ICON_PATH)
  const actualHash = sha256(iconPath)
  if (actualHash !== expectedHash) {
    throw new Error(
      `${label} has stale icon ${formatPath(iconPath)}\n`
      + `expected ${expectedHash}\n`
      + `actual   ${actualHash}`,
    )
  }
}

function walkFiles(root) {
  if (!existsSync(root)) return []

  const files = []
  const entries = readdirSync(root, { withFileTypes: true })
  for (const entry of entries) {
    const path = join(root, entry.name)
    if (entry.isDirectory()) {
      files.push(...walkFiles(path))
    } else if (entry.isFile()) {
      files.push(path)
    }
  }

  return files
}

function findApps(root) {
  if (!existsSync(root)) return []

  const apps = []
  const entries = readdirSync(root, { withFileTypes: true })
  for (const entry of entries) {
    const path = join(root, entry.name)
    if (entry.isDirectory() && entry.name.endsWith('.app')) {
      apps.push(path)
      continue
    }
    if (entry.isDirectory()) apps.push(...findApps(path))
  }

  return apps
}

function verifyCodesign(appPath) {
  if (process.platform !== 'darwin') {
    throw new Error('codesign verification requires macOS')
  }

  run('codesign', ['--verify', '--deep', '--strict', '--verbose=4', appPath])
}

function verifyApp(appPath, options = {}) {
  const resolvedAppPath = resolve(appPath)
  assertExists(resolvedAppPath, 'Application bundle')

  const iconPath = join(resolvedAppPath, 'Contents/Resources/icon.icns')
  assertIconMatchesSource(iconPath, `${formatPath(resolvedAppPath)}`)

  if (options.requireCodesign) verifyCodesign(resolvedAppPath)
  console.log(`ok app ${formatPath(resolvedAppPath)}`)
}

function verifyUpdater(tarballPath, options = {}) {
  const resolvedTarballPath = resolve(tarballPath)
  assertExists(resolvedTarballPath, 'Updater tarball')

  const tempDir = mkdtempSync(join(tmpdir(), 'grimoire-updater-'))
  try {
    run('tar', ['-xzf', resolvedTarballPath, '-C', tempDir])
    const apps = findApps(tempDir)
    if (apps.length !== 1) {
      throw new Error(`${formatPath(resolvedTarballPath)} contains ${apps.length} app bundles`)
    }
    verifyApp(apps[0], options)
    console.log(`ok updater ${formatPath(resolvedTarballPath)}`)
  } finally {
    rmSync(tempDir, { recursive: true, force: true })
  }
}

function verifyDmg(dmgPath, options = {}) {
  if (process.platform !== 'darwin') {
    throw new Error('DMG verification requires macOS')
  }

  const resolvedDmgPath = resolve(dmgPath)
  assertExists(resolvedDmgPath, 'DMG')

  const mountPoint = mkdtempSync(join(tmpdir(), 'grimoire-dmg-'))
  let attached = false
  try {
    run('hdiutil', ['attach', resolvedDmgPath, '-readonly', '-nobrowse', '-mountpoint', mountPoint])
    attached = true
    const apps = findApps(mountPoint)
    if (apps.length !== 1) {
      throw new Error(`${formatPath(resolvedDmgPath)} contains ${apps.length} app bundles`)
    }
    verifyApp(apps[0], options)
    console.log(`ok dmg ${formatPath(resolvedDmgPath)}`)
  } finally {
    if (attached) run('hdiutil', ['detach', mountPoint], { allowFailure: true })
    rmSync(mountPoint, { recursive: true, force: true })
  }
}

function verifyBundleDirectory(bundleDir, options = {}) {
  const resolvedBundleDir = resolve(bundleDir)
  assertExists(resolvedBundleDir, 'Bundle directory')

  const directApps = findApps(resolvedBundleDir)
    .filter((path) => dirname(path) === resolvedBundleDir || path.includes('/macos/'))
  const tarballs = walkFiles(resolvedBundleDir).filter((path) => path.endsWith('.app.tar.gz'))
  const dmgs = walkFiles(resolvedBundleDir).filter((path) => path.endsWith('.dmg'))
  const artifacts = directApps.length + tarballs.length + dmgs.length

  if (artifacts === 0) {
    throw new Error(`No app, updater tarball, or DMG artifacts found in ${formatPath(resolvedBundleDir)}`)
  }

  for (const app of directApps) verifyApp(app, options)
  for (const tarball of tarballs) verifyUpdater(tarball, options)
  for (const dmg of dmgs) verifyDmg(dmg, options)
}

function parseArgs(argv) {
  const config = {
    apps: [],
    bundleDirs: [],
    dmgs: [],
    requireCodesign: false,
    selfTest: false,
    tarballs: [],
  }

  function nextValue(optionName, index) {
    const value = argv[index + 1]
    if (!value || value.startsWith('--')) {
      throw new Error(`${optionName} requires a path`)
    }
    return value
  }

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index]
    switch (arg) {
      case '--app':
        config.apps.push(nextValue(arg, index))
        index += 1
        break
      case '--bundle-dir':
        config.bundleDirs.push(nextValue(arg, index))
        index += 1
        break
      case '--dmg':
        config.dmgs.push(nextValue(arg, index))
        index += 1
        break
      case '--require-codesign':
        config.requireCodesign = true
        break
      case '--self-test':
        config.selfTest = true
        break
      case '--updater':
        config.tarballs.push(nextValue(arg, index))
        index += 1
        break
      default:
        throw new Error(`Unknown argument: ${arg}`)
    }
  }

  if (!config.selfTest && !config.apps.length && !config.bundleDirs.length && !config.dmgs.length && !config.tarballs.length) {
    config.bundleDirs.push(resolve(REPO_ROOT, 'src-tauri/target/release/bundle'))
  }

  return config
}

function copySourceIconToApp(appPath) {
  const resources = join(appPath, 'Contents/Resources')
  mkdirSync(resources, { recursive: true })
  cpSync(SOURCE_ICON_PATH, join(resources, 'icon.icns'))
}

function runSelfTest() {
  const tempDir = mkdtempSync(join(tmpdir(), 'grimoire-artifacts-test-'))
  try {
    const appPath = join(tempDir, 'Grimoire.app')
    copySourceIconToApp(appPath)
    verifyApp(appPath)

    const tarballPath = join(tempDir, 'Grimoire.app.tar.gz')
    run('tar', ['-czf', tarballPath, '-C', tempDir, 'Grimoire.app'])
    verifyUpdater(tarballPath)

    const staleAppPath = join(tempDir, 'Stale.app')
    copySourceIconToApp(staleAppPath)
    writeFileSync(join(staleAppPath, 'Contents/Resources/icon.icns'), 'stale')

    let failedAsExpected = false
    try {
      verifyApp(staleAppPath)
    } catch {
      failedAsExpected = true
    }

    if (!failedAsExpected) {
      throw new Error('Self-test did not reject a stale app icon')
    }

    console.log('self-test passed')
  } finally {
    rmSync(tempDir, { recursive: true, force: true })
  }
}

function main() {
  assertExists(SOURCE_ICON_PATH, 'Source icon')
  const config = parseArgs(process.argv.slice(2))
  if (config.selfTest) {
    runSelfTest()
    return
  }

  const options = { requireCodesign: config.requireCodesign }
  for (const bundleDir of config.bundleDirs) verifyBundleDirectory(bundleDir, options)
  for (const app of config.apps) verifyApp(app, options)
  for (const tarball of config.tarballs) verifyUpdater(tarball, options)
  for (const dmg of config.dmgs) verifyDmg(dmg, options)
}

try {
  main()
} catch (error) {
  const message = error instanceof Error ? error.message : String(error)
  console.error(`release artifact verification failed: ${message}`)
  process.exitCode = 1
}
