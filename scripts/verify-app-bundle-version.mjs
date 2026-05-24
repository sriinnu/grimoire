#!/usr/bin/env node
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'

function readPlistValue(plistPath, key) {
  const content = readFileSync(plistPath, 'utf8')
  const match = new RegExp(`<key>${key}</key>\\s*<string>([^<]+)</string>`).exec(content)
  return match?.[1] ?? null
}

function assertAppBundleVersion(appPath, expectedVersion) {
  const resolvedAppPath = resolve(appPath)
  const plistPath = join(resolvedAppPath, 'Contents/Info.plist')
  if (!existsSync(plistPath)) {
    throw new Error(`Missing app Info.plist: ${plistPath}`)
  }

  const shortVersion = readPlistValue(plistPath, 'CFBundleShortVersionString')
  const bundleVersion = readPlistValue(plistPath, 'CFBundleVersion')
  if (shortVersion !== expectedVersion) {
    throw new Error(`Expected CFBundleShortVersionString ${expectedVersion}, found ${shortVersion ?? 'missing'}`)
  }
  if (bundleVersion && bundleVersion !== expectedVersion) {
    throw new Error(`Expected CFBundleVersion ${expectedVersion}, found ${bundleVersion}`)
  }

  console.log(`ok app version ${resolvedAppPath}: ${expectedVersion}`)
}

function nextValue(args, optionName, index) {
  const value = args[index + 1]
  if (!value || value.startsWith('--')) throw new Error(`${optionName} requires a value`)
  return value
}

function parseArgs(args) {
  const config = { appPath: null, expectedVersion: null, selfTest: false }
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index]
    if (arg === '--app') {
      config.appPath = nextValue(args, arg, index)
      index += 1
    } else if (arg === '--expected-version') {
      config.expectedVersion = nextValue(args, arg, index)
      index += 1
    } else if (arg === '--self-test') {
      config.selfTest = true
    } else {
      throw new Error(`Unknown argument: ${arg}`)
    }
  }
  return config
}

function writeTestPlist(appPath, version) {
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
}

function runSelfTest() {
  const tempDir = mkdtempSync(join(tmpdir(), 'grimoire-app-version-'))
  try {
    const appPath = join(tempDir, 'Grimoire.app')
    writeTestPlist(appPath, '7.8.9')
    assertAppBundleVersion(appPath, '7.8.9')

    let failedAsExpected = false
    try {
      assertAppBundleVersion(appPath, '7.8.10')
    } catch {
      failedAsExpected = true
    }
    if (!failedAsExpected) throw new Error('Self-test did not reject a stale app version')
    console.log('self-test passed')
  } finally {
    rmSync(tempDir, { recursive: true, force: true })
  }
}

try {
  const config = parseArgs(process.argv.slice(2))
  if (config.selfTest) {
    runSelfTest()
  } else if (config.appPath && config.expectedVersion) {
    assertAppBundleVersion(config.appPath, config.expectedVersion)
  } else {
    throw new Error('--app and --expected-version are required')
  }
} catch (error) {
  const message = error instanceof Error ? error.message : String(error)
  console.error(`app bundle version verification failed: ${message}`)
  process.exitCode = 1
}
