import {
  CHANNELS,
  REQUIRED_CI_STEPS,
  REQUIRED_CI_RUNNERS,
  REQUIRED_TOPICS,
  REQUIRED_UPDATER_PLATFORMS,
  findBlockers,
} from './public-readiness-evaluation.mjs'
import { releaseNextActions, releaseResultNextActions } from './release-next-actions.mjs'

function readyState() {
  return {
    branch: 'main',
    ci: {
      annotations: [],
      jobs: REQUIRED_CI_RUNNERS.map((runner, id) => ({
        conclusion: 'success',
        id,
        name: `Build, Test, And Lint (${runner})`,
        steps: REQUIRED_CI_STEPS.map((step) => ({
          conclusion: 'success',
          name: step,
          status: 'completed',
        })),
        status: 'completed',
      })),
      run: { conclusion: 'success', head_sha: 'signed-test-head', id: 1, status: 'completed' },
      stepCount: 12,
    },
    feeds: Object.fromEntries(CHANNELS.map((channel) => [channel, {
      json: {
        platforms: Object.fromEntries(REQUIRED_UPDATER_PLATFORMS.map((platform) => [platform, {
          signature: `${channel}-${platform}-signature`,
          url: `https://example.com/${channel}/${platform}.tar.gz`,
        }])),
      },
      status: 200,
    }])),
    headSignature: { commit: 'signed-test-head', detail: 'Good "git" signature', verified: true },
    publicReadiness: 'Public release is ready.',
    readme: 'Run from source or download from GitHub Releases.',
    releasePreflight: { blockers: [], warnings: [] },
    releases: CHANNELS.map((channel) => ({
      assets: [
        { name: `Grimoire-${channel}-aarch64.app.tar.gz` },
        { name: `Grimoire-${channel}-aarch64.app.tar.gz.sig` },
        { name: `Grimoire-${channel}-aarch64.dmg` },
        { name: `Grimoire-${channel}-x86_64.app.tar.gz` },
        { name: `Grimoire-${channel}-x86_64.app.tar.gz.sig` },
        { name: `Grimoire-${channel}-x86_64.dmg` },
        { name: `Grimoire-${channel}-x64-setup.exe` },
        { name: `Grimoire-${channel}-x64-setup.exe.sig` },
        { name: `grimoire-${channel}-amd64.AppImage` },
        { name: `grimoire-${channel}-amd64.AppImage.sig` },
      ],
      prerelease: channel === 'alpha',
      tag_name: `${channel}-v1.0.0`,
    })),
    repo: { private: false, topics: REQUIRED_TOPICS },
    starterBundle: { configured: true, sourceExists: true },
    starterHead: 'abc123',
    starterMirror: { checked: true, changed: [], localOnly: [], publicOnly: [] },
    starterRepo: { private: false },
    workingTree: { clean: true, detail: 'clean', paths: [] },
  }
}

export function runPublicReadinessAuditSelfTest(githubCommitVerificationProof) {
  const ready = readyState()
  const blockedState = {
    ...ready,
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
    releasePreflight: {
      blockers: [
        'GitHub Pages is not configured for this repository.',
        'Release secrets missing: APPLE_CERTIFICATE, TAURI_SIGNING_PRIVATE_KEY.',
      ],
      warnings: ['TAURI_SIGNING_PRIVATE_KEY_PASSWORD is absent; this is okay only if the updater key has no password.'],
    },
    releases: [],
    repo: { private: true, topics: [] },
  }

  if (findBlockers(ready).blockers.length !== 0) throw new Error('ready fixture should have no blockers')
  const blockedResult = findBlockers(blockedState)
  if (blockedResult.blockers.length < 5) throw new Error('blocked fixture should report multiple blockers')
  if (!blockedResult.blockers.some((blocker) => blocker.includes('spending limit'))) {
    throw new Error('blocked fixture should report hosted CI billing/spending annotation')
  }

  assertFixtureBlocker({ ...ready, ci: { ...ready.ci, run: { ...ready.ci.run, head_sha: 'other-head' } } }, 'not signed HEAD')
  assertFixtureBlocker({ ...ready, ci: { ...ready.ci, jobs: ready.ci.jobs.slice(0, 1) } }, 'lacks successful pinned runner jobs')
  assertFixtureBlocker({
    ...ready,
    ci: {
      ...ready.ci,
      jobs: ready.ci.jobs.map((job) => (
        job.name.includes('windows-2025-vs2026')
          ? { ...job, steps: job.steps.map((step) => ({ ...step, conclusion: 'failure' })) }
          : job
      )),
    },
  }, 'Native Tauri Link Smoke')
  assertFixtureBlocker({
    ...ready,
    ci: {
      ...ready.ci,
      jobs: ready.ci.jobs.map((job) => (
        job.name.includes('ubuntu-24.04')
          ? { ...job, steps: job.steps.filter((step) => step.name !== 'Native Tauri Startup Smoke') }
          : job
      )),
    },
  }, 'Native Tauri Startup Smoke')
  assertFixtureBlocker({
    ...ready,
    ci: {
      ...ready.ci,
      jobs: ready.ci.jobs.map((job) => (
        job.name.includes('macos-15')
          ? { ...job, steps: job.steps.filter((step) => step.name !== 'Browser Smoke Chromium') }
          : job
      )),
    },
  }, 'Browser Smoke Chromium')
  const windowsWithoutBrowserSmoke = findBlockers({
    ...ready,
    ci: {
      ...ready.ci,
      jobs: ready.ci.jobs.map((job) => (
        job.name.includes('windows-2025-vs2026')
          ? { ...job, steps: job.steps.filter((step) => !step.name.startsWith('Browser Smoke')) }
          : job
      )),
    },
  })
  if (windowsWithoutBrowserSmoke.blockers.some((blocker) => blocker.includes('Browser Smoke'))) {
    throw new Error('Windows skipped browser smoke should not block public readiness')
  }
  assertFixtureBlocker({
    ...ready,
    feeds: { ...ready.feeds, stable: { json: { platforms: { 'darwin-aarch64': { signature: 'sig', url: 'url' } } }, status: 200 } },
  }, 'missing required updater payloads')
  assertFixtureBlocker({
    ...ready,
    starterMirror: { checked: true, changed: ['grimoire-feature-tour.md'], localOnly: [], publicOnly: [] },
  }, 'Starter vault public clone')
  assertFixtureBlocker({ ...ready, starterBundle: { configured: false, sourceExists: true } }, 'starter-vault fallback')
  assertFixtureBlocker({ ...ready, headSignature: { commit: 'unsigned-test-head', detail: 'No signature', verified: false } }, 'good git signature')
  assertFixtureBlocker({ ...ready, workingTree: { clean: false, detail: '2 changed path(s)', paths: ['M README.md', '?? tmp.md'] } }, 'Working tree is not clean')

  if (!blockedResult.blockers.some((blocker) => blocker.includes('Release preflight'))) {
    throw new Error('blocked fixture should surface release preflight blockers')
  }
  const blockedActions = releaseNextActions(blockedResult.blockers)
  if (!blockedActions.some((action) => action.includes('Set the GitHub repository release secrets'))) {
    throw new Error('blocked fixture should print missing release-secret next actions')
  }
  if (!blockedActions.some((action) => action.includes('pnpm release:secrets'))) {
    throw new Error('blocked fixture should print release-secret handoff next actions')
  }
  if (!blockedActions.some((action) => action.includes('stable-vYYYY.M.D'))) {
    throw new Error('blocked fixture should print stable release next actions')
  }
  if (!releaseResultNextActions(blockedResult).some((action) => action.includes('TAURI_SIGNING_PRIVATE_KEY_PASSWORD'))) {
    throw new Error('blocked fixture should print optional updater password warning next actions')
  }
  assertNextActionFor('Repository is still private.', 'Make the GitHub repository public')
  assertNextActionFor('Repository topics missing: ai-agents, local-first.', 'Add the missing GitHub repository topics')
  assertNextActionFor('Current branch HEAD does not have a good git signature: No signature.', 'Create or merge a signed commit')
  assertNextActionFor('Release secrets missing: APPLE_CERTIFICATE.', 'pnpm release:secrets')
  assertNextActionFor('Starter vault repository is private.', 'Make the starter vault repository public')
  assertNextActionFor('Starter vault public HEAD could not be resolved.', 'Publish or restore the public starter vault HEAD')
  assertNextActionFor('Packaged starter-vault fallback is not configured in tauri.conf.json.', 'Configure the packaged starter-vault fallback')
  assertNextActionFor('Bundled starter-vault source mirror is missing required demo-vault-v2 files.', 'Restore the bundled starter-vault source mirror')
  assertNextActionFor('stable release stable-v2026.6.3 is missing complete macOS DMG/updater/signature assets for both architectures.', 'Fix the stable GitHub Release assets')
  assertNextActionFor('alpha release alpha-v2026.6.3.1 is missing Windows x64 installer/signature assets.', 'Fix the alpha GitHub Release assets')
  assertNextActionFor('stable update feed does not contain updater platforms.', 'Regenerate the stable and alpha Pages updater feeds')
  assertNextActionFor('README still advertises a direct Grimoire.app.tar.gz URL.', 'Remove stale direct binary download links from README')
  assertNextActionFor('Public readiness docs do not clearly say the app is not ready for public release.', 'Update PUBLIC-READINESS.md to match the current audit result')
  assertNextActionFor('Public readiness docs still say not ready; update them before announcing a public release.', 'Update PUBLIC-READINESS.md to match the current audit result')

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
  console.log('[public-readiness-audit] self-test ok')
}

function assertFixtureBlocker(state, text) {
  if (!findBlockers(state).blockers.some((blocker) => blocker.includes(text))) {
    throw new Error(`fixture should report ${text}`)
  }
}

function assertNextActionFor(blocker, text) {
  const actions = releaseNextActions([blocker])
  if (!actions.some((action) => action.includes(text))) {
    throw new Error(`blocker should print a next action containing "${text}": ${blocker}`)
  }
}
