#!/usr/bin/env node
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { assertAppBundleVersion, writeTestAppInfoPlist } from './app-bundle-version.mjs'

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

function runSelfTest() {
  const tempDir = mkdtempSync(join(tmpdir(), 'grimoire-app-version-'))
  try {
    const appPath = join(tempDir, 'Grimoire.app')
    writeTestAppInfoPlist(appPath, '7.8.9')
    assertAppBundleVersion(appPath, '7.8.9')

    let failedAsExpected = false
    try {
      assertAppBundleVersion(appPath, '7.8.10')
    } catch {
      failedAsExpected = true
    }
    if (!failedAsExpected) throw new Error('Self-test did not reject a stale app version')

    const missingBundleVersionAppPath = join(tempDir, 'MissingBundleVersion.app')
    writeTestAppInfoPlist(missingBundleVersionAppPath, '7.8.9', { includeBundleVersion: false })
    let missingBundleVersionFailedAsExpected = false
    try {
      assertAppBundleVersion(missingBundleVersionAppPath, '7.8.9')
    } catch {
      missingBundleVersionFailedAsExpected = true
    }
    if (!missingBundleVersionFailedAsExpected) {
      throw new Error('Self-test did not reject a missing CFBundleVersion')
    }
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
    console.log(`ok app version ${resolve(config.appPath)}: ${config.expectedVersion}`)
  } else {
    throw new Error('--app and --expected-version are required')
  }
} catch (error) {
  const message = error instanceof Error ? error.message : String(error)
  console.error(`app bundle version verification failed: ${message}`)
  process.exitCode = 1
}
