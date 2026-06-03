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
export const REQUIRED_CI_STEP_PROOFS = [
  { runners: REQUIRED_CI_RUNNERS, step: 'Native Tauri Link Smoke' },
  { runners: ['macos-15'], step: 'Browser Smoke Chromium' },
  { runners: ['macos-15'], step: 'Browser Smoke WebKit Core' },
]
export const REQUIRED_CI_STEPS = REQUIRED_CI_STEP_PROOFS.map((proof) => proof.step)
export const REQUIRED_UPDATER_PLATFORMS = [
  'darwin-aarch64',
  'darwin-x86_64',
  'windows-x86_64',
  'linux-x86_64',
]

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

function hasWindowsAssets(release) {
  const names = assetNames(release)
  return names.some((name) => /(?:^|[-_.])(x64|x86_64|amd64)(?:[-_.]|$)/iu.test(name) && /\.(?:exe|msi)$/iu.test(name))
    && names.some((name) => /(?:^|[-_.])(x64|x86_64|amd64)(?:[-_.]|$)/iu.test(name) && /\.(?:exe|msi)\.sig$/iu.test(name))
}

function hasLinuxAssets(release) {
  const names = assetNames(release)
  return names.some((name) => /(?:^|[-_.])(x64|x86_64|amd64)(?:[-_.]|$)/iu.test(name) && /\.AppImage$/u.test(name))
    && names.some((name) => /(?:^|[-_.])(x64|x86_64|amd64)(?:[-_.]|$)/iu.test(name) && /\.AppImage\.sig$/u.test(name))
}

function missingUpdaterPlatforms(feed) {
  const platforms = feed?.json?.platforms
  if (!platforms) return REQUIRED_UPDATER_PLATFORMS
  return REQUIRED_UPDATER_PLATFORMS.filter((platform) => {
    const payload = platforms[platform]
    return !payload?.url || !payload?.signature
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

function successfulCiRunners(ci) {
  const jobs = Array.isArray(ci?.jobs) ? ci.jobs : []
  return new Set(jobs.flatMap((job) => {
    if (job.conclusion !== 'success') return []
    const label = String(job.name ?? '')
    return REQUIRED_CI_RUNNERS.filter((runner) => label.includes(runner))
  }))
}

function jobForRunner(ci, runner) {
  const jobs = Array.isArray(ci?.jobs) ? ci.jobs : []
  return jobs.find((job) => String(job.name ?? '').includes(runner))
}

function hasSuccessfulStep(job, stepName) {
  const steps = Array.isArray(job?.steps) ? job.steps : []
  return steps.some((step) => step.name === stepName && step.conclusion === 'success')
}

function missingRequiredCiStepRunners(ci, proof) {
  return proof.runners.filter((runner) => !hasSuccessfulStep(jobForRunner(ci, runner), proof.step))
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
  if (!state.starterBundle?.configured) {
    blockers.push('Packaged starter-vault fallback is not configured in tauri.conf.json.')
  }
  if (!state.starterBundle?.sourceExists) {
    blockers.push('Bundled starter-vault source mirror is missing required demo-vault-v2 files.')
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
    for (const proof of REQUIRED_CI_STEP_PROOFS) {
      const missingStepRunners = missingRequiredCiStepRunners(state.ci, proof)
      if (missingStepRunners.length > 0) {
        blockers.push(`Latest CI workflow run ${state.ci.run.id} lacks successful "${proof.step}" proof on: ${missingStepRunners.join(', ')}.`)
      }
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
    if (!hasWindowsAssets(release)) {
      blockers.push(`${channel} release ${release.tag_name} is missing Windows x64 installer/signature assets.`)
    }
    if (!hasLinuxAssets(release)) {
      blockers.push(`${channel} release ${release.tag_name} is missing Linux x64 AppImage/signature assets.`)
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
      continue
    }
    const missing = missingUpdaterPlatforms(feed)
    if (missing.length > 0) {
      blockers.push(`${channel} update feed is missing required updater payloads: ${missing.join(', ')}.`)
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

  const saysNotReadyForPublicRelease = /not ready for public\s+release/iu.test(state.publicReadiness)
  if (blockers.length > 0 && !saysNotReadyForPublicRelease) {
    blockers.push('Public readiness docs do not clearly say the app is not ready for public release.')
  }

  if (blockers.length === 0 && saysNotReadyForPublicRelease) {
    warnings.push('Public readiness docs still say not ready; update them before announcing a public release.')
  }

  return { blockers, warnings }
}
