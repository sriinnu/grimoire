#!/usr/bin/env node
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url))
const REPO_ROOT = resolve(SCRIPT_DIR, '..')

function parseArgs(argv) {
  const args = {
    output: null,
    selfTest: false,
  }

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index]
    const value = argv[index + 1]
    if (arg === '--self-test') args.selfTest = true
    else if (arg === '--output' && value) {
      args.output = resolve(value)
      index += 1
    } else {
      throw new Error(`Unknown or incomplete argument: ${arg}`)
    }
  }

  return args
}

function readPackageVersion() {
  return JSON.parse(readFileSync(resolve(REPO_ROOT, 'package.json'), 'utf8')).version
}

export function sourceReleaseTag(version, sha) {
  const shortSha = sha.slice(0, 7)
  return `source-v${version}-${shortSha}`
}

export function sourceReleaseTitle(version, sha) {
  return `Grimoire source ${version} (${sha.slice(0, 7)})`
}

export function sourceReleaseBody({ repo, runId, sha, version }) {
  const shortSha = sha.slice(0, 7)
  const runUrl = repo && runId ? `https://github.com/${repo}/actions/runs/${runId}` : null
  const sourceUrl = repo ? `https://github.com/${repo}/tree/${sha}` : null

  return `# Grimoire source ${version} (${shortSha})

This is a source-evaluation release for Grimoire.

## What This Is

- Public source snapshot for reviewers and contributors.
- The correct target for GitHub \`/releases/latest\` while signed desktop installers are not published.
- A pointer to source setup, public-readiness truth, and the release runbook.

## What This Is Not

- Not a signed desktop installer release.
- Not a stable or alpha updater-feed release.
- Not proof that packaged Windows, Linux, or macOS launch support is complete.

Public binary installers and update feeds are not published from this release.

## Evaluate From Source

\`\`\`bash
git clone https://github.com/${repo ?? 'sriinnu/grimoire'}.git
cd grimoire
corepack enable
pnpm install
pnpm doctor:source -- --mode browser
pnpm dev
\`\`\`

Use \`pnpm doctor:source -- --mode native\` and \`pnpm tauri dev\` when you need native file-IO proof.

## Evidence

- Version: \`${version}\`
- Commit: \`${sha}\`${sourceUrl ? `\n- Source: ${sourceUrl}` : ''}
${runUrl ? `- Workflow run: ${runUrl}\n` : ''}- Release runbook: see \`docs/RELEASE-RUNBOOK.md\`
`
}

function runSelfTest() {
  const body = sourceReleaseBody({
    repo: 'sriinnu/grimoire',
    runId: '123',
    sha: 'abcdef1234567890',
    version: '0.1.390',
  })

  if (sourceReleaseTag('0.1.390', 'abcdef1234567890') !== 'source-v0.1.390-abcdef1') {
    throw new Error('source tag should include version and short sha')
  }
  if (!body.includes('correct target for GitHub `/releases/latest`')) {
    throw new Error('release notes should explain latest release purpose')
  }
  if (!body.includes('Not a signed desktop installer release.')) {
    throw new Error('release notes should preserve installer boundary')
  }
  if (!body.includes('Public binary installers and update feeds are not published from this release.')) {
    throw new Error('release notes should preserve updater boundary')
  }

  console.log('[source-release-notes] self-test ok')
}

try {
  const args = parseArgs(process.argv.slice(2))
  if (args.selfTest) {
    runSelfTest()
  } else {
    if (!args.output) throw new Error('--output is required')
    const version = readPackageVersion()
    const sha = process.env.GITHUB_SHA ?? 'local'
    const body = sourceReleaseBody({
      repo: process.env.GITHUB_REPOSITORY ?? 'sriinnu/grimoire',
      runId: process.env.GITHUB_RUN_ID ?? '',
      sha,
      version,
    })
    mkdirSync(dirname(args.output), { recursive: true })
    writeFileSync(args.output, body)
    console.log(sourceReleaseTag(version, sha))
  }
} catch (error) {
  const message = error instanceof Error ? error.message : String(error)
  console.error(`[source-release-notes] ${message}`)
  process.exitCode = 1
}
