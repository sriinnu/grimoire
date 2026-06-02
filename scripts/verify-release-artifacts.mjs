#!/usr/bin/env node
import { createHash } from 'node:crypto'
import {
  existsSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, relative, resolve } from 'node:path'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { assertAppBundleVersion } from './app-bundle-version.mjs'

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url))
const REPO_ROOT = resolve(SCRIPT_DIR, '..')
export const SOURCE_ICON_PATH = resolve(REPO_ROOT, 'src-tauri/icons/icon.icns')
const FORBIDDEN_FIXTURE_STRINGS = [
  '/Users/',
  '/Users/mock',
  'demo-vault',
  'demo-vault-v2',
  'mock-content',
  'mock-handlers',
  'MOCK_CONTENT',
]
const WINDOWS_ARTIFACT_EXTENSIONS = ['.exe', '.msi']
const LINUX_ARTIFACT_EXTENSIONS = ['.AppImage', '.deb', '.rpm']

function readPackageVersion() {
  const packageJson = JSON.parse(readFileSync(resolve(REPO_ROOT, 'package.json'), 'utf8'))
  return packageJson.version
}

function formatPath(path) {
  const relativePath = relative(REPO_ROOT, path)
  return relativePath.startsWith('..') ? path : relativePath
}

export function run(command, args, options = {}) {
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

function readPlistValue(plistPath, key) {
  const content = readFileSync(plistPath, 'utf8')
  const pattern = new RegExp(`<key>${key}</key>\\s*<string>([^<]+)</string>`)
  return content.match(pattern)?.[1] ?? null
}

function hasPlistKey(plistPath, key) {
  const content = readFileSync(plistPath, 'utf8')
  return new RegExp(`<key>${key}</key>`).test(content)
}

function assertLaunchableAppBundle(appPath) {
  const plistPath = join(appPath, 'Contents/Info.plist')
  assertExists(plistPath, 'App Info.plist')

  if (hasPlistKey(plistPath, 'LSRequiresCarbon')) {
    throw new Error(`${formatPath(appPath)} has legacy LSRequiresCarbon set; LaunchServices may reject it`)
  }

  const executable = readPlistValue(plistPath, 'CFBundleExecutable')
  if (!executable) {
    throw new Error(`${formatPath(appPath)} Info.plist is missing CFBundleExecutable`)
  }

  const executablePath = join(appPath, 'Contents/MacOS', executable)
  assertExists(executablePath, 'App executable')
  if (process.platform !== 'win32' && (statSync(executablePath).mode & 0o111) === 0) {
    throw new Error(`${formatPath(executablePath)} is not executable`)
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

function assertNoMockFixtures(root, label) {
  assertExists(root, label)

  const violations = []
  for (const file of walkFiles(root)) {
    const content = readFileSync(file)
    for (const needle of FORBIDDEN_FIXTURE_STRINGS) {
      if (content.includes(Buffer.from(needle))) {
        violations.push(`${formatPath(file)} contains ${needle}`)
      }
    }
  }

  if (violations.length > 0) {
    throw new Error(
      `${label} contains browser-only mock fixture strings:\n`
      + violations.slice(0, 20).join('\n'),
    )
  }
}

function assertFileHasNoMockFixtures(file, label) {
  const content = readFileSync(file)
  const violations = FORBIDDEN_FIXTURE_STRINGS
    .filter((needle) => content.includes(Buffer.from(needle)))
    .map((needle) => `${formatPath(file)} contains ${needle}`)

  if (violations.length > 0) {
    throw new Error(
      `${label} contains browser-only mock fixture strings:\n`
      + violations.join('\n'),
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

export function verifyApp(appPath, options = {}) {
  const resolvedAppPath = resolve(appPath)
  assertExists(resolvedAppPath, 'Application bundle')
  assertLaunchableAppBundle(resolvedAppPath)

  const iconPath = join(resolvedAppPath, 'Contents/Resources/icon.icns')
  assertIconMatchesSource(iconPath, `${formatPath(resolvedAppPath)}`)
  assertNoMockFixtures(join(resolvedAppPath, 'Contents/Resources'), `${formatPath(resolvedAppPath)} resources`)
  if (options.expectedVersion) assertAppBundleVersion(resolvedAppPath, options.expectedVersion)

  if (options.requireCodesign) verifyCodesign(resolvedAppPath)
  console.log(`ok app ${formatPath(resolvedAppPath)}`)
}

export function verifyWebBuild(webDir) {
  const resolvedWebDir = resolve(webDir)
  assertNoMockFixtures(resolvedWebDir, 'Web build')
  console.log(`ok web ${formatPath(resolvedWebDir)}`)
}

export function verifyGenericArtifact(artifactPath, label) {
  const resolvedArtifactPath = resolve(artifactPath)
  assertExists(resolvedArtifactPath, label)
  if (statSync(resolvedArtifactPath).size === 0) {
    throw new Error(`${label} is empty: ${formatPath(resolvedArtifactPath)}`)
  }
  assertFileHasNoMockFixtures(resolvedArtifactPath, label)
  console.log(`ok artifact ${formatPath(resolvedArtifactPath)}`)
}

function hasAnySuffix(path, suffixes) {
  return suffixes.some((suffix) => path.endsWith(suffix))
}

export function verifyUpdater(tarballPath, options = {}) {
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

export function verifyBundleDirectory(bundleDir, options = {}) {
  const resolvedBundleDir = resolve(bundleDir)
  assertExists(resolvedBundleDir, 'Bundle directory')

  const files = walkFiles(resolvedBundleDir)
  const directApps = findApps(resolvedBundleDir)
    .filter((path) => dirname(path) === resolvedBundleDir || path.includes('/macos/'))
  const tarballs = files.filter((path) => path.endsWith('.app.tar.gz'))
  const dmgs = files.filter((path) => path.endsWith('.dmg'))
  const windowsInstallers = files.filter((path) => hasAnySuffix(path, WINDOWS_ARTIFACT_EXTENSIONS))
  const linuxPackages = files.filter((path) => hasAnySuffix(path, LINUX_ARTIFACT_EXTENSIONS))
  const artifacts = directApps.length + tarballs.length + dmgs.length + windowsInstallers.length + linuxPackages.length

  if (artifacts === 0) {
    throw new Error(`No app, updater tarball, DMG, Windows installer, or Linux package artifacts found in ${formatPath(resolvedBundleDir)}`)
  }

  for (const app of directApps) verifyApp(app, options)
  for (const tarball of tarballs) verifyUpdater(tarball, options)
  for (const dmg of dmgs) verifyDmg(dmg, options)
  for (const installer of windowsInstallers) verifyGenericArtifact(installer, 'Windows installer')
  for (const linuxPackage of linuxPackages) verifyGenericArtifact(linuxPackage, 'Linux package')
}

function parseArgs(argv) {
  const config = {
    apps: [],
    bundleDirs: [],
    dmgs: [],
    requireCodesign: false,
    selfTest: false,
    tarballs: [],
    webDirs: [],
    expectedVersion: null,
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
      case '--expected-version':
        config.expectedVersion = nextValue(arg, index)
        index += 1
        break
      case '--self-test':
        config.selfTest = true
        break
      case '--updater':
        config.tarballs.push(nextValue(arg, index))
        index += 1
        break
      case '--web-dir':
        config.webDirs.push(nextValue(arg, index))
        index += 1
        break
      default:
        throw new Error(`Unknown argument: ${arg}`)
    }
  }

  if (
    !config.selfTest
    && !config.apps.length
    && !config.bundleDirs.length
    && !config.dmgs.length
    && !config.tarballs.length
    && !config.webDirs.length
  ) {
    config.bundleDirs.push(resolve(REPO_ROOT, 'src-tauri/target/release/bundle'))
  }

  return config
}

async function main() {
  assertExists(SOURCE_ICON_PATH, 'Source icon')
  const config = parseArgs(process.argv.slice(2))
  if (config.selfTest) {
    const { runReleaseArtifactSelfTest } = await import('./verify-release-artifacts-self-test.mjs')
    runReleaseArtifactSelfTest()
    return
  }

  const options = {
    expectedVersion: config.expectedVersion ?? readPackageVersion(),
    requireCodesign: config.requireCodesign,
  }
  for (const bundleDir of config.bundleDirs) verifyBundleDirectory(bundleDir, options)
  for (const app of config.apps) verifyApp(app, options)
  for (const tarball of config.tarballs) verifyUpdater(tarball, options)
  for (const dmg of config.dmgs) verifyDmg(dmg, options)
  for (const webDir of config.webDirs) verifyWebBuild(webDir)
}

try {
  main().catch((error) => {
    const message = error instanceof Error ? error.message : String(error)
    console.error(`release artifact verification failed: ${message}`)
    process.exitCode = 1
  })
} catch (error) {
  const message = error instanceof Error ? error.message : String(error)
  console.error(`release artifact verification failed: ${message}`)
  process.exitCode = 1
}
