import {
  starterMirrorDriftSummary,
  starterMirrorHasDrift,
} from './public-readiness-starter-mirror.mjs'

export const REQUIRED_TOPICS = [
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

export const CHANNELS = ['stable', 'alpha']
export const REQUIRED_CI_RUNNERS = ['macos-15', 'ubuntu-24.04', 'windows-2025-vs2026']

export const FEED_URLS = {
  alpha: 'https://sriinnu.github.io/grimoire/alpha/latest.json',
  stable: 'https://sriinnu.github.io/grimoire/stable/latest.json',
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

function annotationMessages(annotations, level) {
  return Array.from(new Set(
    (annotations ?? [])
      .filter((annotation) => annotation.annotation_level === level)
      .map((annotation) => String(annotation.message ?? '').trim())
      .filter(Boolean),
  ))
}

function successfulCiRunners(ci) {
  const jobs = Array.isArray(ci?.jobs) ? ci.jobs : []
  return new Set(jobs.flatMap((job) => {
    if (job.conclusion !== 'success') return []
    const label = String(job.name ?? '')
    return REQUIRED_CI_RUNNERS.filter((runner) => label.includes(runner))
  }))
}

function sentence(text) {
  return /[.!?]$/u.test(text) ? text : `${text}.`
}

export function releasePreflightSummary(preflight) {
  const blockers = preflight?.blockers?.length ?? 0
  const warnings = preflight?.warnings?.length ?? 0

  if (blockers === 0 && warnings === 0) return 'ok'
  if (blockers > 0) return `${blockers} blocker(s), ${warnings} warning(s)`
  return `${warnings} warning(s)`
}

export function findBlockers(state) {
  const blockers = []
  const warnings = []

  if (state.repo.private) blockers.push('Repository is still private.')

  const topics = new Set(topicNames(state.repo))
  const missingTopics = REQUIRED_TOPICS.filter((topic) => !topics.has(topic))
  if (missingTopics.length > 0) blockers.push(`Repository topics missing: ${missingTopics.join(', ')}.`)

  if (!state.headSignature?.verified) {
    blockers.push(`Current branch HEAD does not have a good git signature: ${state.headSignature?.detail ?? 'missing signature proof'}.`)
  }
  if (!state.workingTree?.clean) {
    blockers.push(`Working tree is not clean: ${state.workingTree?.detail ?? 'missing working-tree proof'}.`)
  }

  if (state.starterRepo.private) blockers.push('Starter vault repository is private.')
  if (!state.starterHead) blockers.push('Starter vault public HEAD could not be resolved.')
  if (starterMirrorHasDrift(state.starterMirror)) {
    blockers.push(`Starter vault public clone does not match demo-vault-v2: ${starterMirrorDriftSummary(state.starterMirror)}.`)
  }

  if (!state.ci.run) {
    blockers.push(`No CI workflow run found for ${state.branch}.`)
  } else if (state.ci.run.conclusion !== 'success') {
    const stepNote = state.ci.stepCount === 0 ? ' with zero executed steps' : ''
    blockers.push(`Latest CI workflow run ${state.ci.run.id} is ${state.ci.run.conclusion ?? state.ci.run.status}${stepNote}.`)
    for (const message of annotationMessages(state.ci.annotations, 'failure')) {
      blockers.push(`Hosted CI failure annotation: ${sentence(message)}`)
    }
    for (const message of annotationMessages(state.ci.annotations, 'notice')) {
      warnings.push(`Hosted CI notice: ${sentence(message)}`)
    }
  }
  if (state.ci.run && state.headSignature?.commit && state.ci.run.head_sha !== state.headSignature.commit) {
    blockers.push(`Latest CI workflow run ${state.ci.run.id} is for ${state.ci.run.head_sha ?? 'unknown head'}, not signed HEAD ${state.headSignature.commit}.`)
  }
  if (state.ci.run?.conclusion === 'success') {
    const successful = successfulCiRunners(state.ci)
    const missing = REQUIRED_CI_RUNNERS.filter((runner) => !successful.has(runner))
    if (missing.length > 0) blockers.push(`Latest CI workflow run ${state.ci.run.id} lacks successful pinned runner jobs: ${missing.join(', ')}.`)
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

  for (const blocker of state.releasePreflight?.blockers ?? []) {
    blockers.push(`Release preflight: ${sentence(blocker)}`)
  }
  for (const warning of state.releasePreflight?.warnings ?? []) {
    warnings.push(`Release preflight: ${sentence(warning)}`)
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
