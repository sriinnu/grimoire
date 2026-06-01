#!/usr/bin/env node
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { spawnSync } from 'node:child_process'

const DEFAULT_REPO = 'sriinnu/grimoire'
const DEFAULT_STARTER_REPO = 'sriinnu/grimoire-getting-started'
const REQUIRED_TOPICS = [
  'ai-agents',
  'desktop-app',
  'knowledge-graph',
  'local-first',
  'local-first-ai',
  'markdown',
  'notes',
  'personal-knowledge-management',
  'pkm',
  'tauri',
  'zettelkasten',
]
const CHANNELS = ['stable', 'alpha']
const FEED_URLS = {
  alpha: 'https://sriinnu.github.io/grimoire/alpha/latest.json',
  stable: 'https://sriinnu.github.io/grimoire/stable/latest.json',
}

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

function topicNames(repo) {
  const names = repo.topics ?? repo.repositoryTopics ?? []
  return names.map((topic) => (typeof topic === 'string' ? topic : topic.name)).filter(Boolean)
}

function releaseChannel(release) {
  const tag = String(release.tag_name ?? '')
  if (release.prerelease === true || tag.startsWith('alpha-v')) return 'alpha'
  if (tag.startsWith('stable-v')) return 'stable'
  return null
}

function assetNames(release) {
  return (release.assets ?? []).map((asset) => String(asset.name ?? ''))
}

function hasArchAsset(names, arch, suffix) {
  const archPattern = arch === 'arm64'
    ? /(?:aarch64|arm64|apple-silicon|silicon)/iu
    : /(?:x86_64|x64|intel)/iu
  return names.some((name) => archPattern.test(name) && name.endsWith(suffix))
}

function hasCompleteMacAssets(release) {
  const names = assetNames(release)
  return ['arm64', 'x64'].every((arch) => (
    hasArchAsset(names, arch, '.dmg')
    && hasArchAsset(names, arch, '.app.tar.gz')
    && hasArchAsset(names, arch, '.app.tar.gz.sig')
  ))
}

function latestRun(runsPayload) {
  return Array.isArray(runsPayload.workflow_runs) ? runsPayload.workflow_runs[0] ?? null : null
}

function jobStepCount(jobsPayload) {
  if (!Array.isArray(jobsPayload.jobs)) return null
  return jobsPayload.jobs.reduce((total, job) => total + (Array.isArray(job.steps) ? job.steps.length : 0), 0)
}

function checkRunAnnotations(repoName, jobsPayload) {
  if (!Array.isArray(jobsPayload.jobs)) return []

  return jobsPayload.jobs.flatMap((job) => {
    const annotations = ghJsonOptional(`repos/${repoName}/check-runs/${job.id}/annotations?per_page=100`)
    if (!Array.isArray(annotations)) return []
    return annotations.map((annotation) => ({ ...annotation, jobName: job.name }))
  })
}

function annotationMessages(annotations, level) {
  return Array.from(new Set(
    (annotations ?? [])
      .filter((annotation) => annotation.annotation_level === level)
      .map((annotation) => String(annotation.message ?? '').trim())
      .filter(Boolean),
  ))
}

function sentence(text) {
  return /[.!?]$/u.test(text) ? text : `${text}.`
}

function findBlockers(state) {
  const blockers = []
  const warnings = []

  if (state.repo.private) blockers.push('Repository is still private.')

  const topics = new Set(topicNames(state.repo))
  const missingTopics = REQUIRED_TOPICS.filter((topic) => !topics.has(topic))
  if (missingTopics.length > 0) blockers.push(`Repository topics missing: ${missingTopics.join(', ')}.`)

  if (state.starterRepo.private) blockers.push('Starter vault repository is private.')
  if (!state.starterHead) blockers.push('Starter vault public HEAD could not be resolved.')

  if (!state.ci.run) {
    blockers.push(`No GitHub Actions run found for ${state.branch}.`)
  } else if (state.ci.run.conclusion !== 'success') {
    const stepNote = state.ci.stepCount === 0 ? ' with zero executed steps' : ''
    blockers.push(`Latest GitHub Actions run ${state.ci.run.id} is ${state.ci.run.conclusion ?? state.ci.run.status}${stepNote}.`)
    for (const message of annotationMessages(state.ci.annotations, 'failure')) {
      blockers.push(`Hosted CI failure annotation: ${sentence(message)}`)
    }
    for (const message of annotationMessages(state.ci.annotations, 'notice')) {
      warnings.push(`Hosted CI notice: ${sentence(message)}`)
    }
  }

  for (const channel of CHANNELS) {
    const release = state.releases.find((candidate) => releaseChannel(candidate) === channel)
    if (!release) {
      blockers.push(`No ${channel} GitHub Release exists.`)
      continue
    }
    if (!hasCompleteMacAssets(release)) {
      blockers.push(`${channel} release ${release.tag_name} is missing complete macOS DMG/updater/signature assets for both architectures.`)
    }
  }

  for (const channel of CHANNELS) {
    const feed = state.feeds[channel]
    if (!feed || feed.status !== 200) {
      blockers.push(`${channel} update feed is unavailable: HTTP ${feed?.status ?? 'missing'}.`)
      continue
    }
    if (!feed.json?.platforms || Object.keys(feed.json.platforms).length === 0) {
      blockers.push(`${channel} update feed does not contain updater platforms.`)
    }
  }

  if (/https?:\/\/[^\s)]+Grimoire\.app\.tar\.gz/iu.test(state.readme)) {
    blockers.push('README still advertises a direct Grimoire.app.tar.gz URL.')
  }

  if (blockers.length > 0 && !state.publicReadiness.includes('Grimoire is not ready to make public')) {
    blockers.push('Public readiness docs do not clearly say the app is not public-ready.')
  }

  if (blockers.length === 0 && state.publicReadiness.includes('not ready to make public')) {
    warnings.push('Public readiness docs still say not ready; update them before making the repository public.')
  }

  return { blockers, warnings }
}

async function collectLiveState(options) {
  const branch = options.branch ?? currentBranch()
  const repo = ghJson(`repos/${options.repo}`)
  const starterRepo = ghJson(`repos/${options.starterRepo}`)
  const starterUrl = `https://github.com/${options.starterRepo}.git`
  const starterHead = run('git', ['ls-remote', starterUrl, 'HEAD'], { allowFailure: true }).split(/\s+/)[0] ?? ''
  const runsPayload = ghJson(`repos/${options.repo}/actions/runs?branch=${encodeURIComponent(branch)}&per_page=1`)
  const runPayload = latestRun(runsPayload)
  const jobsPayload = runPayload ? ghJson(`repos/${options.repo}/actions/runs/${runPayload.id}/jobs?per_page=100`) : { jobs: [] }
  const releases = ghJson(`repos/${options.repo}/releases?per_page=20`)
  const feeds = Object.fromEntries(await Promise.all(
    CHANNELS.map(async (channel) => [channel, await fetchFeed(FEED_URLS[channel])]),
  ))

  return {
    branch,
    ci: {
      annotations: checkRunAnnotations(options.repo, jobsPayload),
      run: runPayload,
      stepCount: jobStepCount(jobsPayload),
    },
    feeds,
    publicReadiness: readFileSync(resolve('docs/PUBLIC-READINESS.md'), 'utf8'),
    readme: readFileSync(resolve('README.md'), 'utf8'),
    releases,
    repo,
    starterHead,
    starterRepo,
  }
}

function runSelfTest() {
  const readyState = {
    branch: 'main',
    ci: { annotations: [], run: { conclusion: 'success', id: 1, status: 'completed' }, stepCount: 12 },
    feeds: {
      alpha: { json: { platforms: { 'darwin-aarch64': {} } }, status: 200 },
      stable: { json: { platforms: { 'darwin-aarch64': {} } }, status: 200 },
    },
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
    repo: { private: false, topics: REQUIRED_TOPICS },
    starterHead: 'abc123',
    starterRepo: { private: false },
  }

  const blockedState = {
    ...readyState,
    ci: {
      annotations: [{
        annotation_level: 'failure',
        message: 'The job was not started because recent account payments have failed or your spending limit needs to be increased',
      }],
      run: { conclusion: 'failure', id: 2, status: 'completed' },
      stepCount: 0,
    },
    feeds: { alpha: { status: 404 }, stable: { status: 404 } },
    publicReadiness: 'Grimoire is not ready to make public.',
    releases: [],
    repo: { private: true, topics: [] },
  }

  if (findBlockers(readyState).blockers.length !== 0) throw new Error('ready fixture should have no blockers')
  const blockedResult = findBlockers(blockedState)
  if (blockedResult.blockers.length < 5) throw new Error('blocked fixture should report multiple blockers')
  if (!blockedResult.blockers.some((blocker) => blocker.includes('spending limit'))) {
    throw new Error('blocked fixture should report hosted CI billing/spending annotation')
  }
  console.log('[public-readiness-audit] self-test ok')
}

function printReport(state, result) {
  console.log(`[public-readiness-audit] repo=${state.repo.full_name ?? DEFAULT_REPO} branch=${state.branch}`)
  console.log(`[public-readiness-audit] latest-ci=${state.ci.run?.id ?? 'none'} conclusion=${state.ci.run?.conclusion ?? 'none'} steps=${state.ci.stepCount ?? 'unknown'}`)
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
