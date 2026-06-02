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
  REQUIRED_CI_RUNNERS,
  REQUIRED_MAC_UPDATER_PLATFORMS,
  REQUIRED_TOPICS,
  findBlockers,
  releasePreflightSummary,
} from './public-readiness-evaluation.mjs'
import {
  collectLiveState as collectReleasePreflightLiveState,
  collectLocalState as collectReleasePreflightLocalState,
  evaluatePreflight as evaluateReleasePreflight,
} from './release-preflight.mjs'
import { printReleaseNextActions, releaseNextActions } from './release-next-actions.mjs'

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

function runSelfTest() {
  const readyState = {
    branch: 'main',
    ci: {
      annotations: [],
      jobs: REQUIRED_CI_RUNNERS.map((runner, id) => ({
        conclusion: 'success',
        id,
        name: `Build, Test, And Lint (${runner})`,
        status: 'completed',
      })),
      run: { conclusion: 'success', head_sha: 'signed-test-head', id: 1, status: 'completed' },
      stepCount: 12,
    },
    feeds: Object.fromEntries(CHANNELS.map((channel) => [channel, {
      json: {
        platforms: Object.fromEntries(REQUIRED_MAC_UPDATER_PLATFORMS.map((platform) => [platform, {
          signature: `${channel}-${platform}-signature`,
          url: `https://example.com/${channel}/${platform}.tar.gz`,
        }])),
      },
      status: 200,
    }])),
    headSignature: { commit: 'signed-test-head', detail: 'Good "git" signature', verified: true },
    publicReadiness: 'Public release is ready.',
    readme: 'Run from source or download from GitHub Releases.',
    releases: CHANNELS.map((channel) => ({
      assets: [
        { name: `Grimoire-${channel}-aarch64.app.tar.gz` },
        { name: `Grimoire-${channel}-aarch64.app.tar.gz.sig` },
        { name: `Grimoire-${channel}-aarch64.dmg` },
        { name: `Grimoire-${channel}-x86_64.app.tar.gz` },
        { name: `Grimoire-${channel}-x86_64.app.tar.gz.sig` },
        { name: `Grimoire-${channel}-x86_64.dmg` },
      ],
      prerelease: channel === 'alpha',
      tag_name: `${channel}-v1.0.0`,
    })),
    releasePreflight: { blockers: [], warnings: [] },
    repo: { private: false, topics: REQUIRED_TOPICS },
    starterHead: 'abc123',
    starterBundle: { configured: true, sourceExists: true },
    starterMirror: { checked: true, changed: [], localOnly: [], publicOnly: [] },
    starterRepo: { private: false },
    workingTree: { clean: true, detail: 'clean', paths: [] },
  }

  const blockedState = {
    ...readyState,
    ci: {
      annotations: [{
        annotation_level: 'failure',
        message: 'The job was not started because recent account payments have failed or your spending limit needs to be increased',
      }],
      jobs: [],
      run: { conclusion: 'failure', head_sha: 'signed-test-head', id: 2, status: 'completed' },
      stepCount: 0,
    },
    feeds: { alpha: { status: 404 }, stable: { status: 404 } },
    publicReadiness: 'Grimoire is not ready for public release.',
    releases: [],
    releasePreflight: {
      blockers: [
        'GitHub Pages is not configured for this repository.',
        'Release secrets missing: APPLE_CERTIFICATE, TAURI_SIGNING_PRIVATE_KEY.',
      ],
      warnings: ['TAURI_SIGNING_PRIVATE_KEY_PASSWORD is absent; this is okay only if the updater key has no password.'],
    },
    repo: { private: true, topics: [] },
  }

  if (findBlockers(readyState).blockers.length !== 0) throw new Error('ready fixture should have no blockers')
  const blockedResult = findBlockers(blockedState)
  if (blockedResult.blockers.length < 5) throw new Error('blocked fixture should report multiple blockers')
  if (!blockedResult.blockers.some((blocker) => blocker.includes('spending limit'))) {
    throw new Error('blocked fixture should report hosted CI billing/spending annotation')
  }
  const staleCiResult = findBlockers({
    ...readyState,
    ci: { ...readyState.ci, run: { ...readyState.ci.run, head_sha: 'other-head' } },
  })
  if (!staleCiResult.blockers.some((blocker) => blocker.includes('not signed HEAD'))) {
    throw new Error('stale CI fixture should report CI head mismatch')
  }
  const missingRunnerResult = findBlockers({
    ...readyState,
    ci: { ...readyState.ci, jobs: readyState.ci.jobs.slice(0, 1) },
  })
  if (!missingRunnerResult.blockers.some((blocker) => blocker.includes('lacks successful pinned runner jobs'))) {
    throw new Error('missing CI runner fixture should report incomplete matrix proof')
  }
  const incompleteFeedResult = findBlockers({
    ...readyState,
    feeds: { ...readyState.feeds, stable: { json: { platforms: { 'darwin-aarch64': { signature: 'sig', url: 'url' } } }, status: 200 } },
  })
  if (!incompleteFeedResult.blockers.some((blocker) => blocker.includes('missing macOS updater payloads'))) {
    throw new Error('incomplete updater feed fixture should report missing macOS payloads')
  }
  if (!blockedResult.blockers.some((blocker) => blocker.includes('Release preflight'))) {
    throw new Error('blocked fixture should surface release preflight blockers')
  }
  const blockedActions = releaseNextActions(blockedResult.blockers)
  if (!blockedActions.some((action) => action.includes('Set the GitHub repository release secrets'))) {
    throw new Error('blocked fixture should print missing release-secret next actions')
  }
  if (!blockedActions.some((action) => action.includes('stable-vYYYY.M.D'))) {
    throw new Error('blocked fixture should print stable release next actions')
  }
  const githubSignature = githubCommitVerificationProof({
    commit: { verification: { reason: 'valid', verified: true } },
    sha: 'github-verified-head',
  })
  if (!githubSignature?.verified || githubSignature.commit !== 'github-verified-head') {
    throw new Error('GitHub verification fixture should produce signed head proof')
  }
  const githubUnsignedSignature = githubCommitVerificationProof({
    commit: { verification: { reason: 'unsigned', verified: false } },
    sha: 'github-unsigned-head',
  })
  if (githubUnsignedSignature?.verified !== false || githubUnsignedSignature.detail !== 'unsigned') {
    throw new Error('GitHub verification fixture should preserve unverified proof detail')
  }
  const driftResult = findBlockers({
    ...readyState,
    starterMirror: { checked: true, changed: ['grimoire-feature-tour.md'], localOnly: [], publicOnly: [] },
  })
  if (!driftResult.blockers.some((blocker) => blocker.includes('Starter vault public clone'))) {
    throw new Error('starter drift fixture should report public starter mismatch')
  }
  const missingStarterBundleResult = findBlockers({
    ...readyState,
    starterBundle: { configured: false, sourceExists: true },
  })
  if (!missingStarterBundleResult.blockers.some((blocker) => blocker.includes('starter-vault fallback'))) {
    throw new Error('missing starter bundle fixture should report packaged fallback blocker')
  }
  const unsignedResult = findBlockers({
    ...readyState,
    headSignature: { commit: 'unsigned-test-head', detail: 'No signature', verified: false },
  })
  if (!unsignedResult.blockers.some((blocker) => blocker.includes('good git signature'))) {
    throw new Error('unsigned fixture should report missing git signature')
  }
  const dirtyResult = findBlockers({
    ...readyState,
    workingTree: { clean: false, detail: '2 changed path(s)', paths: ['M README.md', '?? tmp.md'] },
  })
  if (!dirtyResult.blockers.some((blocker) => blocker.includes('Working tree is not clean'))) {
    throw new Error('dirty fixture should report uncommitted changes')
  }
  console.log('[public-readiness-audit] self-test ok')
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
    runSelfTest()
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
