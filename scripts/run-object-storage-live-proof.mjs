#!/usr/bin/env node
import { spawnSync } from 'node:child_process'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url))
const REPO_ROOT = resolve(SCRIPT_DIR, '..')

const PROVIDERS = {
  s3: {
    gate: 'GRIMOIRE_S3_LIVE_WRITE_PROOF',
    label: 'S3',
    optional: ['GRIMOIRE_S3_REGION', 'GRIMOIRE_S3_PREFIX'],
    required: ['GRIMOIRE_S3_BUCKET'],
    test: 'vault::object_storage_live_provider_sync_tests::s3_live_provider_sync_preview_apply_and_pull_is_explicitly_gated',
  },
  azure: {
    gate: 'GRIMOIRE_AZURE_LIVE_WRITE_PROOF',
    label: 'Azure Blob',
    optional: ['GRIMOIRE_AZURE_PREFIX'],
    required: ['GRIMOIRE_AZURE_STORAGE_ACCOUNT', 'GRIMOIRE_AZURE_CONTAINER'],
    test: 'vault::object_storage_live_provider_sync_tests::azure_live_provider_sync_preview_apply_and_pull_is_explicitly_gated',
  },
}

function parseArgs(argv) {
  const options = {
    dryRun: false,
    provider: 'all',
    requireEnabled: false,
    selfTest: false,
  }

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index]
    if (arg === '--') continue
    if (arg === '--dry-run') {
      options.dryRun = true
      continue
    }
    if (arg === '--require-enabled') {
      options.requireEnabled = true
      continue
    }
    if (arg === '--self-test') {
      options.selfTest = true
      continue
    }
    if (arg === '--provider') {
      const provider = argv[index + 1]
      if (!provider || !['all', 's3', 'azure'].includes(provider)) {
        throw new Error('--provider must be all, s3, or azure')
      }
      options.provider = provider
      index += 1
      continue
    }
    throw new Error(`Unknown option: ${arg}`)
  }

  return options
}

function selectedProviders(provider) {
  return provider === 'all' ? Object.keys(PROVIDERS) : [provider]
}

function isEnabled(env, provider) {
  return env[provider.gate] === '1'
}

function missingRequired(env, provider) {
  return provider.required.filter((key) => !env[key]?.trim())
}

function envState(env, keys) {
  return keys.map((key) => `${key}=${env[key]?.trim() ? 'set' : 'missing'}`).join(', ')
}

function testCommand(testName) {
  return [
    'test',
    '--manifest-path',
    'src-tauri/Cargo.toml',
    '--lib',
    testName,
    '--',
    '--ignored',
    '--exact',
    '--nocapture',
  ]
}

function runCargoTest(testName) {
  const args = testCommand(testName)
  const result = spawnSync('cargo', args, {
    cwd: REPO_ROOT,
    stdio: 'inherit',
  })

  if (result.status !== 0) {
    throw new Error(`cargo ${args.join(' ')} failed`)
  }
}

function planProvider(env, id) {
  const provider = PROVIDERS[id]
  const enabled = isEnabled(env, provider)
  const missing = enabled ? missingRequired(env, provider) : []
  return {
    enabled,
    id,
    missing,
    provider,
  }
}

function printPlan(plans) {
  for (const plan of plans) {
    const { provider } = plan
    console.log(`[object-storage-live] ${provider.label}`)
    console.log(`  gate: ${provider.gate}=${plan.enabled ? '1' : 'missing'}`)
    console.log(`  required: ${envState(process.env, provider.required)}`)
    if (provider.optional.length > 0) console.log(`  optional: ${envState(process.env, provider.optional)}`)
    console.log(`  test: ${provider.test}`)
  }
}

function run(options, env = process.env) {
  const plans = selectedProviders(options.provider).map((id) => planProvider(env, id))
  const enabledPlans = plans.filter((plan) => plan.enabled)

  if (options.dryRun) {
    printPlan(plans)
    return 0
  }

  if (enabledPlans.length === 0) {
    const message = 'No live object-storage proof gates are enabled.'
    if (options.requireEnabled) throw new Error(message)
    console.log(`[object-storage-live] skipped: ${message}`)
    return 0
  }

  for (const plan of enabledPlans) {
    if (plan.missing.length > 0) {
      throw new Error(`${plan.provider.label} live proof is gated on ${plan.provider.gate}=1 but missing: ${plan.missing.join(', ')}`)
    }
  }

  for (const plan of enabledPlans) {
    console.log(`[object-storage-live] running ${plan.provider.label} live provider preview/apply/pull proof`)
    runCargoTest(plan.provider.test)
  }
  return 0
}

function runSelfTest() {
  const env = {
    GRIMOIRE_AZURE_CONTAINER: 'vault',
    GRIMOIRE_AZURE_LIVE_WRITE_PROOF: '1',
    GRIMOIRE_AZURE_STORAGE_ACCOUNT: 'acct',
    GRIMOIRE_S3_LIVE_WRITE_PROOF: '1',
  }
  const plans = selectedProviders('all').map((id) => planProvider(env, id))
  if (!plans.find((plan) => plan.id === 's3')?.missing.includes('GRIMOIRE_S3_BUCKET')) {
    throw new Error('self-test expected missing S3 bucket')
  }
  if (plans.find((plan) => plan.id === 'azure')?.missing.length !== 0) {
    throw new Error('self-test expected Azure required env to be present')
  }
  const command = testCommand(PROVIDERS.s3.test).join(' ')
  if (!command.includes('--ignored --exact --nocapture')) {
    throw new Error('self-test expected ignored exact cargo invocation')
  }
  console.log('self-test passed')
}

try {
  const options = parseArgs(process.argv.slice(2))
  if (options.selfTest) runSelfTest()
  else process.exitCode = run(options)
} catch (error) {
  console.error(`[object-storage-live] ${error instanceof Error ? error.message : String(error)}`)
  process.exitCode = 1
}
