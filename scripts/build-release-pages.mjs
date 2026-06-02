#!/usr/bin/env node
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { buildReleasePages } from './release-pages-core.mjs'
import { runReleasePagesSelfTest } from './release-pages-self-test.mjs'

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url))
const REPO_ROOT = resolve(SCRIPT_DIR, '..')

function parseArgs(argv) {
  const config = {
    outputDir: resolve(REPO_ROOT, '.release-pages/public'),
    releasesJson: null,
    selfTest: false,
    token: process.env.GH_TOKEN ?? '',
  }

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index]
    const value = argv[index + 1]
    if (arg === '--self-test') config.selfTest = true
    else if (arg === '--output-dir' && value) {
      config.outputDir = resolve(value)
      index += 1
    } else if (arg === '--releases-json' && value) {
      config.releasesJson = resolve(value)
      index += 1
    } else {
      throw new Error(`Unknown or incomplete argument: ${arg}`)
    }
  }

  if (!config.selfTest && !config.releasesJson) {
    throw new Error('--releases-json is required')
  }

  return config
}

try {
  const config = parseArgs(process.argv.slice(2))
  if (config.selfTest) await runReleasePagesSelfTest()
  else await buildReleasePages(config)
} catch (error) {
  const message = error instanceof Error ? error.message : String(error)
  console.error(`[release-pages] ${message}`)
  process.exitCode = 1
}
