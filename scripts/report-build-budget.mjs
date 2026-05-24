#!/usr/bin/env node
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { dirname, extname, join, resolve } from 'node:path'
import { gzipSync } from 'node:zlib'
import { fileURLToPath } from 'node:url'

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url))
const REPO_ROOT = resolve(SCRIPT_DIR, '..')
const DEFAULT_DIST_DIR = resolve(REPO_ROOT, 'dist/assets')
const APP_SHELL_GZIP_BUDGET_KIB = 380
const NEXT_TARGET_KIB = 320
const STRETCH_TARGET_KIB = 250

function kib(bytes) {
  return bytes / 1024
}

function formatKib(bytes) {
  return `${kib(bytes).toFixed(2)} KiB`
}

function readAssetFiles(dir) {
  if (!existsSync(dir)) {
    throw new Error(`Build assets directory not found: ${dir}`)
  }

  return readdirSync(dir)
    .filter((filename) => extname(filename) === '.js')
    .map((filename) => {
      const path = join(dir, filename)
      const source = readFileSync(path)
      return {
        filename,
        gzipBytes: gzipSync(source).byteLength,
        rawBytes: statSync(path).size,
      }
    })
    .sort((a, b) => b.gzipBytes - a.gzipBytes)
}

function findAppShellAsset(files) {
  const indexAsset = files.find((file) => /^index-[\w-]+\.js$/u.test(file.filename))
  return indexAsset ?? files[0]
}

function reportBuildBudget({ distDir = DEFAULT_DIST_DIR, fail = true } = {}) {
  const files = readAssetFiles(distDir)
  const appShell = findAppShellAsset(files)
  if (!appShell) throw new Error(`No JavaScript build assets found in ${distDir}`)

  const overBudget = kib(appShell.gzipBytes) > APP_SHELL_GZIP_BUDGET_KIB
  const headline = [
    `[build-budget] app shell ${appShell.filename}:`,
    `${formatKib(appShell.gzipBytes)} gzip / ${formatKib(appShell.rawBytes)} raw`,
    `(budget <= ${APP_SHELL_GZIP_BUDGET_KIB} KiB, next <= ${NEXT_TARGET_KIB} KiB, stretch <= ${STRETCH_TARGET_KIB} KiB)`,
  ].join(' ')

  console.log(headline)
  console.log('[build-budget] largest JS assets:')
  for (const file of files.slice(0, 6)) {
    console.log(`  - ${file.filename}: ${formatKib(file.gzipBytes)} gzip / ${formatKib(file.rawBytes)} raw`)
  }

  if (overBudget && fail) {
    throw new Error(`App shell gzip budget exceeded: ${formatKib(appShell.gzipBytes)} > ${APP_SHELL_GZIP_BUDGET_KIB} KiB`)
  }
}

try {
  reportBuildBudget({ fail: process.env.GRIMOIRE_BUILD_BUDGET_WARN_ONLY !== '1' })
} catch (error) {
  const message = error instanceof Error ? error.message : String(error)
  console.error(`[build-budget] ${message}`)
  process.exitCode = 1
}
