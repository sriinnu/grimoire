#!/usr/bin/env node
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url))
const REPO_ROOT = resolve(SCRIPT_DIR, '..')

function readText(path) {
  return readFileSync(resolve(REPO_ROOT, path), 'utf8')
}

function fail(message) {
  throw new Error(`[public-readiness-docs] ${message}`)
}

function assertContains(path, expected, label = expected) {
  const text = readText(path)
  if (!text.includes(expected)) {
    fail(`${path} must contain: ${label}`)
  }
}

function assertNotMatch(path, pattern, label) {
  const text = readText(path)
  if (pattern.test(text)) {
    fail(`${path} must not contain ${label}`)
  }
}

function releaseWorkflowHasPlatform(platformPattern) {
  return platformPattern.test(readText('.github/workflows/release.yml'))
}

function verifyBinaryInstallTruth() {
  assertContains('README.md', 'There is no public packaged release yet.')
  assertContains('README.md', 'Public binary installers are not published yet.')
  assertContains('docs/GETTING-STARTED.md', 'Public binary installers are not published')
  assertContains('docs/PUBLIC-READINESS.md', 'Grimoire is not ready to make public for general users yet.')
  assertContains('docs/PUBLIC-READINESS.md', '| Public binary release | Blocked |')
  assertContains('docs/PUBLIC-READINESS.md', '| Update feed | Blocked |')
  assertContains('docs/PUBLIC-READINESS.md', '| Release Pages generator | Locally verified |')
  assertNotMatch('README.md', /https?:\/\/[^\s)]+Grimoire\.app\.tar\.gz/iu, 'a public Grimoire.app.tar.gz URL')
}

function verifyReleaseWorkflowTruth() {
  const hasWindowsRelease = releaseWorkflowHasPlatform(/windows-latest|windows-20\d\d|^\s+windows:/imu)
  const hasLinuxRelease = releaseWorkflowHasPlatform(/ubuntu-latest|ubuntu-2\d\.\d\d|^\s+linux:/imu)

  if (hasWindowsRelease || hasLinuxRelease) {
    fail('release.yml now includes non-macOS release jobs; update the public readiness docs and this guard with verified artifact evidence')
  }

  assertContains(
    'README.md',
    'currently macOS-only once signing secrets are configured; Linux and Windows are',
    'macOS-only release workflow disclaimer',
  )
  assertContains(
    'docs/GETTING-STARTED.md',
    'current release workflow only builds macOS artifacts after signing',
    'Getting Started macOS-only release workflow disclaimer',
  )
  assertContains(
    'docs/PUBLIC-READINESS.md',
    '| OS packaging | Partial | Source development targets macOS, Linux, and Windows. The tracked release workflow currently produces macOS artifacts only after signing secrets are configured. |',
    'Public Readiness OS packaging row',
  )
  assertContains(
    '.github/workflows/release.yml',
    'node scripts/build-release-pages.mjs --releases-json .release-pages/releases.json --output-dir .release-pages/public',
    'release Pages generation step',
  )
  assertContains(
    'package.json',
    '"test:release-pages": "node scripts/build-release-pages.mjs --self-test"',
    'release pages self-test script',
  )
}

function verifyAdrIndexTruth() {
  assertContains(
    'docs/adr/README.md',
    '| [0083](0083-dual-architecture-macos-release-artifacts.md) | Dual-architecture macOS release artifacts | superseded -> [0100](0100-public-release-packaging-truth.md) |',
    'ADR-0083 superseded by ADR-0100',
  )
  assertContains(
    'docs/adr/README.md',
    '| [0100](0100-public-release-packaging-truth.md) | Public release packaging truth | active |',
    'ADR-0100 index entry',
  )
  assertContains(
    'docs/adr/0100-public-release-packaging-truth.md',
    'Windows and Linux remain source-build targets until release jobs, artifacts, manifests, and verification are implemented and proven.',
    'ADR-0100 public release boundary',
  )
  assertContains(
    'docs/adr/README.md',
    '| [0101](0101-release-pages-and-updater-manifest-publication.md) | Release Pages and updater manifest publication | active |',
    'ADR-0101 index entry',
  )
  assertContains(
    'docs/adr/0101-release-pages-and-updater-manifest-publication.md',
    'Missing release assets produce fallback download pages, not fake updater',
    'ADR-0101 updater manifest boundary',
  )
}

try {
  verifyBinaryInstallTruth()
  verifyReleaseWorkflowTruth()
  verifyAdrIndexTruth()
  console.log('[public-readiness-docs] ok')
} catch (error) {
  const message = error instanceof Error ? error.message : String(error)
  console.error(message)
  process.exit(1)
}
