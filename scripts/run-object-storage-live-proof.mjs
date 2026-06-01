#!/usr/bin/env node
import { spawnSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { redactedReport } from './object-storage-proof-report.mjs'

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
    reportPath: null,
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
    if (arg === '--report') {
      const reportPath = argv[index + 1]
      if (!reportPath?.trim()) throw new Error('--report requires a path')
      options.reportPath = reportPath
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

function envStateMap(env, keys) {
  return Object.fromEntries(keys.map((key) => [key, env[key]?.trim() ? 'set' : 'missing']))
}

function envState(env, keys) {
  return Object.entries(envStateMap(env, keys)).map(([key, state]) => `${key}=${state}`).join(', ')
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

function printPlan(plans, env = process.env) {
  for (const plan of plans) {
    const { provider } = plan
    console.log(`[object-storage-live] ${provider.label}`)
    console.log(`  gate: ${provider.gate}=${plan.enabled ? '1' : 'missing'}`)
    console.log(`  required: ${envState(env, provider.required)}`)
    if (provider.optional.length > 0) console.log(`  optional: ${envState(env, provider.optional)}`)
    console.log(`  test: ${provider.test}`)
  }
}

function run(options, env = process.env) {
  const plans = selectedProviders(options.provider).map((id) => planProvider(env, id))
  const enabledPlans = plans.filter((plan) => plan.enabled)
  const report = buildReport(options, plans, env)
  const finish = (status, message) => {
    report.summary.status = status
    report.summary.message = message
    report.finished_at = new Date().toISOString()
    writeReport(options.reportPath, report)
  }

  if (options.dryRun) {
    printPlan(plans, env)
    for (const result of report.providers) result.status = result.enabled ? 'ready' : 'gate_missing'
    finish('dry_run', 'No provider proof was run.')
    return 0
  }

  if (enabledPlans.length === 0) {
    const message = 'No live object-storage proof gates are enabled.'
    for (const result of report.providers) result.status = 'gate_missing'
    if (options.requireEnabled) {
      finish('failed', message)
      throw new Error(message)
    }
    console.log(`[object-storage-live] skipped: ${message}`)
    finish('skipped', message)
    return 0
  }

  let failed = null
  for (const plan of enabledPlans) {
    const providerResult = report.providers.find((result) => result.id === plan.id)
    if (plan.missing.length > 0) {
      providerResult.status = 'missing_config'
      providerResult.message = `Missing required env: ${plan.missing.join(', ')}`
      failed = `${plan.provider.label} live proof is gated on ${plan.provider.gate}=1 but missing: ${plan.missing.join(', ')}`
    } else {
      providerResult.status = 'ready'
    }
  }
  if (failed) {
    finish('failed', failed)
    throw new Error(failed)
  }

  for (const plan of enabledPlans) {
    const providerResult = report.providers.find((result) => result.id === plan.id)
    console.log(`[object-storage-live] running ${plan.provider.label} live provider preview/apply/pull proof`)
    providerResult.status = 'running'
    try {
      runCargoTest(plan.provider.test)
      providerResult.status = 'passed'
      providerResult.message = 'Provider preview/apply/pull proof passed.'
    } catch (error) {
      providerResult.status = 'failed'
      providerResult.message = error instanceof Error ? error.message : String(error)
      failed = `${plan.provider.label} live provider proof failed`
      break
    }
  }
  finish(failed ? 'failed' : 'passed', failed ?? 'All enabled live provider proofs passed.')
  if (failed) throw new Error(failed)
  return 0
}

function buildReport(options, plans, env) {
  return {
    schema: 'grimoire-object-storage-live-proof-v1',
    generated_at: new Date().toISOString(),
    finished_at: null,
    provider_filter: options.provider,
    summary: {
      status: 'planned',
      message: 'Provider live proof has not run yet.',
    },
    providers: plans.map((plan) => ({
      id: plan.id,
      label: plan.provider.label,
      enabled: plan.enabled,
      gate: {
        name: plan.provider.gate,
        state: plan.enabled ? 'set' : 'missing',
      },
      required: envStateMap(env, plan.provider.required),
      optional: envStateMap(env, plan.provider.optional),
      test: plan.provider.test,
      status: 'planned',
      message: null,
    })),
  }
}

function writeReport(reportPath, report) {
  if (!reportPath) return
  const target = resolve(REPO_ROOT, reportPath)
  mkdirSync(dirname(target), { recursive: true })
  writeFileSync(target, `${JSON.stringify(redactedReport(report), null, 2)}\n`)
  console.log(`[object-storage-live] wrote redacted proof report: ${target}`)
}

function runSelfTest() {
  const env = {
    GRIMOIRE_AZURE_CONTAINER: 'secret-container-for-report-test',
    GRIMOIRE_AZURE_LIVE_WRITE_PROOF: '1',
    GRIMOIRE_AZURE_STORAGE_ACCOUNT: 'secret-account-for-report-test',
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
  const temp = mkdtempSync(join(tmpdir(), 'grimoire-object-storage-proof-'))
  const dryRunReport = join(temp, 'dry-run.json')
  run({ dryRun: true, provider: 'all', requireEnabled: false, reportPath: dryRunReport, selfTest: false }, env)
  const dryRunJson = readFileSync(dryRunReport, 'utf8')
  if (
    dryRunJson.includes('secret-account-for-report-test')
    || dryRunJson.includes('secret-container-for-report-test')
  ) {
    throw new Error('self-test expected proof report to redact configured env values')
  }
  const parsed = JSON.parse(dryRunJson)
  if (parsed.summary.status !== 'dry_run' || parsed.providers[1].required.GRIMOIRE_AZURE_CONTAINER !== 'set') {
    throw new Error('self-test expected dry-run proof report with set/missing state')
  }
  const failureReport = buildReport({ provider: 'all' }, plans, env)
  failureReport.summary.status = 'failed'
  failureReport.summary.message = 'failed at /Users/sriinnu/.aws with token=abc and s3://secret-bucket'
  failureReport.providers[0].status = 'failed'
  failureReport.providers[0].message = 'preview auth failed with AWS_SECRET_ACCESS_KEY and /Users/sriinnu/.aws'
  failureReport.providers[1].status = 'missing_config'
  failureReport.providers[1].message = 'Azure account secret-account-for-report-test was rejected'
  const failureReportPath = join(temp, 'failure.json')
  writeReport(failureReportPath, failureReport)
  const failureJson = readFileSync(failureReportPath, 'utf8')
  if (
    failureJson.includes('/Users/')
    || failureJson.includes('s3://secret-bucket')
    || failureJson.includes('AWS_SECRET_ACCESS_KEY')
    || failureJson.includes('token=abc')
    || failureJson.includes('secret-account-for-report-test')
  ) {
    throw new Error('self-test expected written failure report to redact raw provider messages')
  }
  const parsedFailure = JSON.parse(failureJson)
  if (
    parsedFailure.providers[0].failure_kind !== 'auth'
    || parsedFailure.providers[0].failure_stage !== 'preview'
    || parsedFailure.providers[1].failure_kind !== 'config'
    || parsedFailure.providers[1].failure_stage !== 'config'
  ) {
    throw new Error('self-test expected sanitized failure kind and stage evidence')
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
