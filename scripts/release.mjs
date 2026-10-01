#!/usr/bin/env node
// One command to ship Grimoire.
//
//   pnpm release            patch bump, stable channel
//   pnpm release --minor    minor bump
//   pnpm release --major    major bump
//   pnpm release --alpha    alpha channel (prerelease, alpha updater feed)
//   pnpm release --dry-run  preflight + plan, writes nothing
//   pnpm release --tag-only version already on main, just tag + watch
//   pnpm release --no-wait  push the tag and return without watching CI
//
// What it does, in order:
//   1. Preflight: on main, clean, in sync with origin, gh authenticated, the
//      seven release secrets exist, `release:preflight` passes, CI is green on
//      the main head.
//   2. Bumps the version in package.json, tauri.conf.json, Cargo.toml and
//      Cargo.lock, commits on chore/release-vX.Y.Z, pushes, opens a PR, waits
//      for checks, squash-merges it (main refuses direct pushes by policy).
//   3. Tags the merged main head with a signed stable-vX.Y.Z or alpha-vX.Y.Z.
//      Pushing the tag starts release.yml, which builds every platform, signs
//      and notarizes the macOS bundles with the repository secrets, uploads
//      the assets to a GitHub Release, and republishes the updater feeds.
//   4. Watches that workflow, then replaces the placeholder release notes with
//      a changelog grouped by commit type.
//
// Nothing here touches Apple credentials; notarization runs only in CI.
import { spawnSync } from 'node:child_process'
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { REQUIRED_RELEASE_SECRETS } from './release-preflight.mjs'
import { VERSION_FILES, bumpVersion, nextVersion, readCurrentVersion } from './bump-build-version.mjs'

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url))
const REPO_ROOT = resolve(SCRIPT_DIR, '..')
const REPO = 'sriinnu/grimoire'
const RELEASE_WORKFLOW = 'release.yml'
const CI_WORKFLOW = 'ci.yml'
const PAGES_URL = 'https://sriinnu.github.io/grimoire/'

const COMMIT_GROUPS = [
  ['feat', 'Features'],
  ['fix', 'Fixes'],
  ['perf', 'Performance'],
  ['refactor', 'Refactoring'],
  ['docs', 'Documentation'],
  ['build', 'Build'],
  ['ci', 'CI'],
  ['test', 'Tests'],
  ['style', 'Style'],
  ['chore', 'Chores'],
]

// ---------------------------------------------------------------------------
// Pure helpers (covered by --self-test)
// ---------------------------------------------------------------------------

export function parseArgs(argv) {
  const args = {
    mode: 'patch',
    channel: 'stable',
    dryRun: false,
    tagOnly: false,
    wait: true,
    selfTest: false,
  }
  for (const arg of argv) {
    if (arg === '--') continue
    else if (arg === '--patch') args.mode = 'patch'
    else if (arg === '--minor') args.mode = 'minor'
    else if (arg === '--major') args.mode = 'major'
    else if (arg === '--alpha') args.channel = 'alpha'
    else if (arg === '--stable') args.channel = 'stable'
    else if (arg === '--dry-run') args.dryRun = true
    else if (arg === '--tag-only') args.tagOnly = true
    else if (arg === '--no-wait') args.wait = false
    else if (arg === '--self-test') args.selfTest = true
    else throw new Error(`Unknown argument: ${arg}`)
  }
  return args
}

/** stable-v0.1.468 or alpha-v0.1.468; release.yml triggers on both prefixes. */
export function releaseTag(version, channel) {
  return `${channel === 'alpha' ? 'alpha' : 'stable'}-v${version}`
}

export function releaseBranch(version) {
  return `chore/release-v${version}`
}

/** Groups conventional-commit subjects into a Markdown changelog. */
export function buildReleaseNotes({ version, channel, commits, previousTag, tag }) {
  const groups = new Map(COMMIT_GROUPS.map(([type, heading]) => [type, { heading, lines: [] }]))
  const other = []
  for (const raw of commits) {
    const subject = raw.trim()
    if (!subject || /^chore\(release\):/u.test(subject)) continue
    const match = subject.match(/^([a-z]+)(?:\(([^)]*)\))?!?:\s*(.+)$/u)
    if (!match || !groups.has(match[1])) {
      other.push(`- ${subject}`)
      continue
    }
    const scope = match[2] ? `**${match[2]}:** ` : ''
    groups.get(match[1]).lines.push(`- ${scope}${match[3]}`)
  }

  const sections = []
  for (const { heading, lines } of groups.values()) {
    if (lines.length) sections.push(`### ${heading}\n${lines.join('\n')}`)
  }
  if (other.length) sections.push(`### Other\n${other.join('\n')}`)
  if (!sections.length) sections.push('_No commits since the previous release._')

  const range = previousTag ? `${previousTag}...${tag}` : tag
  const channelLine = channel === 'alpha' ? 'Alpha build. Expect rough edges.' : 'Stable build.'
  return [
    `## Grimoire ${version}`,
    '',
    channelLine,
    '',
    ...sections,
    '',
    `Full diff: https://github.com/${REPO}/compare/${range}`,
    '',
  ].join('\n')
}

// ---------------------------------------------------------------------------
// Shell plumbing
// ---------------------------------------------------------------------------

function sh(command, args, { cwd = REPO_ROOT, allowFailure = false, inherit = false, env } = {}) {
  const result = spawnSync(command, args, {
    cwd,
    encoding: 'utf8',
    stdio: inherit ? 'inherit' : 'pipe',
    env: env ? { ...process.env, ...env } : process.env,
  })
  const stdout = (result.stdout ?? '').trim()
  const stderr = (result.stderr ?? '').trim()
  if (result.status !== 0 && !allowFailure) {
    const detail = stderr || stdout || `exit ${result.status}`
    throw new Error(`${command} ${args.join(' ')} failed:\n${detail}`)
  }
  return { ok: result.status === 0, stdout, stderr }
}

const git = (...args) => sh('git', args).stdout
const gh = (...args) => sh('gh', args).stdout

function ghJsonFields(args, fields) {
  return JSON.parse(gh(...args, '--json', fields) || 'null')
}

function step(title) {
  console.log(`\n▶ ${title}`)
}

function ok(line) {
  console.log(`  ✓ ${line}`)
}

function sleep(ms) {
  return new Promise((done) => setTimeout(done, ms))
}

// ---------------------------------------------------------------------------
// Phases
// ---------------------------------------------------------------------------

function preflight({ tagOnly }) {
  step('Preflight')

  sh('gh', ['auth', 'status'])
  ok('gh is authenticated')

  const branch = git('rev-parse', '--abbrev-ref', 'HEAD')
  if (branch !== 'main') throw new Error(`Release from main, not ${branch}.`)
  if (git('status', '--porcelain')) throw new Error('Working tree is not clean.')
  git('fetch', '--quiet', '--tags', 'origin', 'main')
  const local = git('rev-parse', 'HEAD')
  const remote = git('rev-parse', 'origin/main')
  if (local !== remote) throw new Error('main is not in sync with origin/main. Pull or push first.')
  ok(`main at ${local.slice(0, 7)}, clean, in sync with origin`)

  const secretNames = new Set(ghJsonFields(['secret', 'list', '--repo', REPO], 'name').map((entry) => entry.name))
  const missing = REQUIRED_RELEASE_SECRETS.filter((name) => !secretNames.has(name))
  if (missing.length) {
    throw new Error(
      `Release secrets missing on ${REPO}: ${missing.join(', ')}.\n` +
      'Notarization and updater signing run in CI and need them. Run `pnpm release:secrets` for the handoff list.',
    )
  }
  ok('all release secrets are present on the repository')

  sh('pnpm', ['release:preflight'], { inherit: true })
  ok('release:preflight passed')

  if (!tagOnly) {
    const runs = ghJsonFields(
      ['run', 'list', '--repo', REPO, '--workflow', CI_WORKFLOW, '--branch', 'main', '--commit', local, '--limit', '1'],
      'status,conclusion,url',
    )
    const run = runs[0]
    if (!run || run.status !== 'completed' || run.conclusion !== 'success') {
      throw new Error(`CI on main head ${local.slice(0, 7)} is not green (${run ? `${run.status}/${run.conclusion}` : 'no run found'}).`)
    }
    ok(`CI green on ${local.slice(0, 7)}`)
  }

  return { head: local }
}

function previousReleaseTag(beforeRef) {
  const byPrefix = sh('git', ['describe', '--tags', '--abbrev=0', '--match', 'stable-v*', '--match', 'alpha-v*', `${beforeRef}^`], { allowFailure: true })
  if (byPrefix.ok && byPrefix.stdout) return byPrefix.stdout
  const anyTag = sh('git', ['describe', '--tags', '--abbrev=0', `${beforeRef}^`], { allowFailure: true })
  return anyTag.ok && anyTag.stdout ? anyTag.stdout : null
}

function bumpAndMerge({ mode, dryRun }) {
  const from = readCurrentVersion()
  const to = nextVersion(from, mode)
  const branch = releaseBranch(to)

  step(`Version ${from} → ${to}`)
  if (dryRun) {
    ok(`would bump ${VERSION_FILES.join(', ')}`)
    ok(`would commit on ${branch}, open a PR, wait for checks, squash-merge`)
    return { version: to }
  }

  git('switch', '--create', branch)
  bumpVersion(mode)
  git('add', ...VERSION_FILES)
  git('commit', '--quiet', '--message', `chore(release): v${to}`)
  ok(`committed chore(release): v${to} on ${branch}`)

  step('Push release branch and open PR')
  sh('git', ['push', '--set-upstream', 'origin', branch], { inherit: true })
  const prUrl = gh(
    'pr', 'create', '--repo', REPO, '--base', 'main', '--head', branch,
    '--title', `chore(release): v${to}`,
    '--body', `Version bump for the ${to} release. Merging this and tagging the merge commit publishes the release.`,
  )
  ok(`PR opened: ${prUrl}`)

  step('Wait for PR checks')
  sh('gh', ['pr', 'checks', prUrl, '--repo', REPO, '--watch', '--fail-fast'], { inherit: true })
  ok('checks green')

  step('Squash-merge')
  sh('gh', ['pr', 'merge', prUrl, '--repo', REPO, '--squash', '--delete-branch'], { inherit: true })
  git('switch', 'main')
  git('pull', '--quiet', '--ff-only', 'origin', 'main')
  const merged = readCurrentVersion()
  if (merged !== to) throw new Error(`main carries ${merged} after merge, expected ${to}.`)
  ok(`main is at ${git('rev-parse', '--short', 'HEAD')} with version ${to}`)

  return { version: to }
}

function tagAndPush({ version, channel, dryRun }) {
  const tag = releaseTag(version, channel)
  step(`Tag ${tag}`)
  if (dryRun) {
    ok(`would create signed tag ${tag} on main and push it (starts ${RELEASE_WORKFLOW})`)
    return { tag }
  }

  const existing = sh('git', ['rev-parse', '--verify', '--quiet', `refs/tags/${tag}`], { allowFailure: true })
  if (existing.ok) throw new Error(`Tag ${tag} already exists locally. Bump again or delete it deliberately.`)
  git('tag', '--sign', '--message', `Grimoire ${version}`, tag)
  sh('git', ['push', 'origin', tag], { inherit: true })
  ok(`pushed ${tag}; ${RELEASE_WORKFLOW} is starting`)
  return { tag }
}

async function findReleaseRun(tag) {
  for (let attempt = 0; attempt < 24; attempt += 1) {
    const runs = ghJsonFields(
      ['run', 'list', '--repo', REPO, '--workflow', RELEASE_WORKFLOW, '--branch', tag, '--limit', '1'],
      'databaseId,status,url',
    )
    if (runs[0]) return runs[0]
    await sleep(5000)
  }
  throw new Error(`No ${RELEASE_WORKFLOW} run appeared for ${tag} after two minutes.`)
}

async function watchAndAnnotate({ tag, version, channel, wait }) {
  step('Release workflow')
  const run = await findReleaseRun(tag)
  ok(`run ${run.databaseId}: ${run.url}`)
  if (!wait) {
    console.log('  … not waiting (--no-wait). Release notes stay as the workflow placeholder.')
    return
  }
  sh('gh', ['run', 'watch', String(run.databaseId), '--repo', REPO, '--exit-status'], { inherit: true })
  ok('all platforms built, signed, notarized, uploaded, pages deployed')

  step('Release notes')
  const previousTag = previousReleaseTag(tag)
  const range = previousTag ? `${previousTag}..${tag}` : tag
  const commits = git('log', '--no-merges', '--format=%s', range).split('\n')
  const notes = buildReleaseNotes({ version, channel, commits, previousTag, tag })
  const notesPath = join(mkdtempSync(join(tmpdir(), 'grimoire-release-')), 'notes.md')
  writeFileSync(notesPath, notes)
  gh('release', 'edit', tag, '--repo', REPO, '--notes-file', notesPath, '--title', `Grimoire ${version}`)
  ok(`notes written from ${commits.filter(Boolean).length} commits since ${previousTag ?? 'the beginning'}`)

  const releaseUrl = gh('release', 'view', tag, '--repo', REPO, '--json', 'url', '--jq', '.url')
  console.log(`\n🎉 Grimoire ${version} (${channel}) is out.`)
  console.log(`   Release: ${releaseUrl}`)
  console.log(`   Downloads: ${PAGES_URL}`)
  console.log(`   Updater feed: ${PAGES_URL}${channel}/latest.json`)
}

// ---------------------------------------------------------------------------
// Self-test
// ---------------------------------------------------------------------------

function assertEqual(actual, expected, label) {
  const a = JSON.stringify(actual)
  const e = JSON.stringify(expected)
  if (a !== e) throw new Error(`${label}: expected ${e}, got ${a}`)
}

function runSelfTest() {
  assertEqual(parseArgs([]).mode, 'patch', 'default mode')
  assertEqual(parseArgs(['--minor', '--alpha', '--dry-run']).channel, 'alpha', 'alpha channel')
  assertEqual(parseArgs(['--minor']).mode, 'minor', 'minor mode')
  assertEqual(parseArgs(['--no-wait']).wait, false, 'no-wait')
  let threw = false
  try { parseArgs(['--bogus']) } catch { threw = true }
  assertEqual(threw, true, 'unknown flag rejected')

  assertEqual(releaseTag('0.1.468', 'stable'), 'stable-v0.1.468', 'stable tag')
  assertEqual(releaseTag('0.1.468', 'alpha'), 'alpha-v0.1.468', 'alpha tag')
  assertEqual(releaseBranch('0.1.468'), 'chore/release-v0.1.468', 'branch name')
  assertEqual(nextVersion('0.1.467', 'patch'), '0.1.468', 'patch bump')
  assertEqual(nextVersion('0.1.467', 'minor'), '0.2.1', 'minor bump')

  const notes = buildReleaseNotes({
    version: '0.1.468',
    channel: 'stable',
    previousTag: 'stable-v0.1.467',
    tag: 'stable-v0.1.468',
    commits: [
      'feat(index): resolved backlinks',
      'fix: wikilinks in table cells',
      'chore(release): v0.1.468',
      'Update License section in README.md (#72)',
      'perf(index): one SQLite index per vault',
    ],
  })
  if (!notes.includes('### Features\n- **index:** resolved backlinks')) throw new Error('feature grouping')
  if (!notes.includes('### Fixes\n- wikilinks in table cells')) throw new Error('fix grouping')
  if (!notes.includes('### Other\n- Update License section')) throw new Error('other grouping')
  if (notes.includes('chore(release)')) throw new Error('release commit should be dropped')
  if (!notes.includes('compare/stable-v0.1.467...stable-v0.1.468')) throw new Error('compare link')
  if (!notes.startsWith('## Grimoire 0.1.468')) throw new Error('heading')

  const empty = buildReleaseNotes({ version: '1.0.1', channel: 'alpha', previousTag: null, tag: 'alpha-v1.0.1', commits: [] })
  if (!empty.includes('No commits since')) throw new Error('empty notes')
  if (!empty.includes('Alpha build')) throw new Error('alpha line')

  console.log('release.mjs self-test passed')
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const args = parseArgs(process.argv.slice(2))
  if (args.selfTest) {
    runSelfTest()
    return
  }

  console.log(`Grimoire release · ${args.channel} · ${args.tagOnly ? 'tag only' : `${args.mode} bump`}${args.dryRun ? ' · DRY RUN' : ''}`)
  preflight(args)

  const version = args.tagOnly ? readCurrentVersion() : bumpAndMerge(args).version
  const { tag } = tagAndPush({ version, channel: args.channel, dryRun: args.dryRun })

  if (args.dryRun) {
    console.log(`\nDry run complete. Would publish Grimoire ${version} as ${tag}.`)
    return
  }
  await watchAndAnnotate({ tag, version, channel: args.channel, wait: args.wait })
}

const invokedDirectly = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)
if (invokedDirectly) {
  main().catch((error) => {
    console.error(`\n✗ ${error.message}`)
    process.exit(1)
  })
}
