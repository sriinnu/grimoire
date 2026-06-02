#!/usr/bin/env node
import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { spawnSync } from 'node:child_process'
import {
  compareStarterMirror,
  starterMirrorDriftSummary,
} from './public-readiness-starter-mirror.mjs'
import {
  headSignatureSummary,
  readHeadSignatureProof,
  readWorkingTreeProof,
  workingTreeSummary,
} from './public-readiness-git-proof.mjs'
import {
  CHANNELS,
  FEED_URLS,
  findBlockers,
  releasePreflightSummary,
} from './public-readiness-evaluation.mjs'
import {
  collectLiveState as collectReleasePreflightLiveState,
  collectLocalState as collectReleasePreflightLocalState,
  evaluatePreflight as evaluateReleasePreflight,
} from './release-preflight.mjs'
import { printReleaseNextActions } from './release-next-actions.mjs'
import { runPublicReadinessAuditSelfTest } from './audit-public-readiness-self-test.mjs'

const DEFAULT_REPO = 'sriinnu/grimoire'
const DEFAULT_STARTER_REPO = 'sriinnu/grimoire-getting-started'

function parseArgs(argv) {
  const args = {
    branch: null,
    repo: DEFAULT_REPO,
    selfTest: false,
    starterRepo: DEFAULT_STARTER_REPO,
  }

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index]
    if (arg === '--') continue
    if (arg === '--self-test') args.selfTest = true
    else if (arg === '--branch') args.branch = argv[++index] ?? null
    else if (arg === '--repo') args.repo = argv[++index] ?? args.repo
    else if (arg === '--starter-repo') args.starterRepo = argv[++index] ?? args.starterRepo
    else throw new Error(`Unknown argument: ${arg}`)
  }

  return args
}

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: options.cwd ?? process.cwd(),
    encoding: 'utf8',
    stdio: 'pipe',
  })

  if (result.status !== 0 && !options.allowFailure) {
    const detail = result.stderr.trim() || result.stdout.trim() || `exit ${result.status}`
    throw new Error(`${command} ${args.join(' ')} failed: ${detail}`)
  }

  return result.stdout.trim()
}

function currentBranch() {
  return run('git', ['branch', '--show-current'], { allowFailure: true }) || 'main'
}

function ghJson(endpoint) {
  return JSON.parse(run('gh', ['api', endpoint]))
}

function ghJsonOptional(endpoint) {
  const result = spawnSync('gh', ['api', endpoint], {
    cwd: process.cwd(),
    encoding: 'utf8',
    stdio: 'pipe',
  })

  if (result.status !== 0) return null
  return JSON.parse(result.stdout.trim() || 'null')
}

function githubCommitVerificationProof(commitPayload, fallbackCommit = null) {
  const commit = commitPayload?.sha ?? fallbackCommit
  const verification = commitPayload?.commit?.verification
  if (!commit || !verification) return null

  return {
    commit,
    detail: verification.reason ?? 'GitHub verification payload did not include a reason.',
    source: 'github',
    verified: verification.verified === true,
  }
}

function githubVerifiedHeadProof(repoName, branch) {
  const branchPayload = ghJsonOptional(`repos/${repoName}/branches/${encodeURIComponent(branch)}`)
  const commit = branchPayload?.commit?.sha ?? null
  if (!commit) return null

  const commitPayload = ghJsonOptional(`repos/${repoName}/commits/${commit}`)
  return githubCommitVerificationProof(commitPayload, commit)
}

function readStarterBundleProof() {
  const config = JSON.parse(readFileSync(resolve('src-tauri/tauri.conf.json'), 'utf8'))
  const resources = config.bundle?.resources ?? {}
  const configured = Object.entries(resources).some(([source, destination]) => (
    String(source).includes('../demo-vault-v2/**/*')
    && String(destination) === 'starter-vault/'
  ))

  return {
    configured,
    sourceExists: existsSync(resolve('demo-vault-v2/.fixture-manifest.json'))
      && existsSync(resolve('demo-vault-v2/grimoire-start-here.md')),
  }
}

async function fetchFeed(url) {
  try {
    const response = await fetch(url, { redirect: 'follow' })
    const text = await response.text()
    let json = null
    try {
      json = JSON.parse(text)
    } catch {
      json = null
    }
    return { json, status: response.status }
  } catch (error) {
    return { error: error instanceof Error ? error.message : String(error), json: null, status: 0 }
  }
}

function latestRun(runsPayload) {
  return Array.isArray(runsPayload.workflow_runs) ? runsPayload.workflow_runs[0] ?? null : null
}

function jobStepCount(jobsPayload) {
  if (!Array.isArray(jobsPayload.jobs)) return null
  return jobsPayload.jobs.reduce((total, job) => total + (Array.isArray(job.steps) ? job.steps.length : 0), 0)
}

function ciJobs(jobsPayload) {
  if (!Array.isArray(jobsPayload.jobs)) return []
  return jobsPayload.jobs.map((job) => ({
    conclusion: job.conclusion ?? null,
    id: job.id,
    name: job.name ?? '',
    status: job.status ?? null,
  }))
}

function checkRunAnnotations(repoName, jobsPayload) {
  if (!Array.isArray(jobsPayload.jobs)) return []

  return jobsPayload.jobs.flatMap((job) => {
    const annotations = ghJsonOptional(`repos/${repoName}/check-runs/${job.id}/annotations?per_page=100`)
    if (!Array.isArray(annotations)) return []
    return annotations.map((annotation) => ({ ...annotation, jobName: job.name }))
  })
}

async function collectLiveState(options) {
  const branch = options.branch ?? currentBranch()
  const repo = ghJson(`repos/${options.repo}`)
  const starterRepo = ghJson(`repos/${options.starterRepo}`)
  const starterUrl = `https://github.com/${options.starterRepo}.git`
  const starterHead = run('git', ['ls-remote', starterUrl, 'HEAD'], { allowFailure: true }).split(/\s+/)[0] ?? ''
  const starterMirror = compareStarterMirror(starterUrl)
  const runsPayload = ghJson(`repos/${options.repo}/actions/workflows/ci.yml/runs?branch=${encodeURIComponent(branch)}&per_page=1`)
  const runPayload = latestRun(runsPayload)
  const jobsPayload = runPayload ? ghJson(`repos/${options.repo}/actions/runs/${runPayload.id}/jobs?per_page=100`) : { jobs: [] }
  const releases = ghJson(`repos/${options.repo}/releases?per_page=20`)
  const releasePreflight = evaluateReleasePreflight({
    ...collectReleasePreflightLocalState(),
    live: collectReleasePreflightLiveState(options.repo),
  })
  const feeds = Object.fromEntries(await Promise.all(
    CHANNELS.map(async (channel) => [channel, await fetchFeed(FEED_URLS[channel])]),
  ))

  return {
    branch,
    ci: {
      annotations: checkRunAnnotations(options.repo, jobsPayload),
      jobs: ciJobs(jobsPayload),
      run: runPayload,
      stepCount: jobStepCount(jobsPayload),
    },
    feeds,
    headSignature: githubVerifiedHeadProof(options.repo, branch) ?? readHeadSignatureProof(),
    publicReadiness: readFileSync(resolve('docs/PUBLIC-READINESS.md'), 'utf8'),
    readme: readFileSync(resolve('README.md'), 'utf8'),
    releases,
    releasePreflight,
    repo,
    starterHead,
    starterBundle: readStarterBundleProof(),
    starterMirror,
    starterRepo,
    workingTree: readWorkingTreeProof(),
  }
}

function printReport(state, result) {
  console.log(`[public-readiness-audit] repo=${state.repo.full_name ?? DEFAULT_REPO} branch=${state.branch}`)
  console.log(`[public-readiness-audit] latest-ci=${state.ci.run?.id ?? 'none'} conclusion=${state.ci.run?.conclusion ?? 'none'} steps=${state.ci.stepCount ?? 'unknown'}`)
  console.log(`[public-readiness-audit] head-signature=${headSignatureSummary(state.headSignature)}`)
  console.log(`[public-readiness-audit] working-tree=${workingTreeSummary(state.workingTree)}`)
  console.log(`[public-readiness-audit] starter-mirror=${starterMirrorDriftSummary(state.starterMirror)}`)
  console.log(`[public-readiness-audit] starter-bundle=${state.starterBundle?.configured && state.starterBundle?.sourceExists ? 'configured' : 'missing'}`)
  console.log(`[public-readiness-audit] release-preflight=${releasePreflightSummary(state.releasePreflight)}`)
  for (const channel of CHANNELS) {
    console.log(`[public-readiness-audit] ${channel}-feed=${state.feeds[channel]?.status ?? 'missing'}`)
  }
  if (result.warnings.length > 0) {
    console.log('\nWarnings:')
    for (const warning of result.warnings) console.log(`- ${warning}`)
  }
  if (result.blockers.length === 0) {
    console.log('\nNo public-readiness blockers found.')
    return
  }
  console.log('\nBlockers:')
  for (const blocker of result.blockers) console.log(`- ${blocker}`)
  printReleaseNextActions(result.blockers)
}

async function main() {
  const args = parseArgs(process.argv.slice(2))
  if (args.selfTest) {
    runPublicReadinessAuditSelfTest(githubCommitVerificationProof)
    return
  }

  const state = await collectLiveState(args)
  const result = findBlockers(state)
  printReport(state, result)
  if (result.blockers.length > 0) process.exit(1)
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error)
  console.error(`[public-readiness-audit] ${message}`)
  process.exit(1)
})
