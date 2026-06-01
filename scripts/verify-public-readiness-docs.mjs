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
  assertContains('README.md', 'pnpm doctor:source')
  assertContains('docs/GETTING-STARTED.md', 'pnpm doctor:source')
  assertContains('README.md', 'Public binary installers are not published yet.')
  assertContains('docs/GETTING-STARTED.md', 'Public binary installers are not published')
  assertContains('docs/PUBLIC-READINESS.md', 'Grimoire is not ready to make public for general users yet.')
  assertContains('docs/PUBLIC-READINESS.md', '| Public binary release | Blocked |')
  assertContains('docs/PUBLIC-READINESS.md', '| Update feed | Blocked |')
  assertContains('docs/PUBLIC-READINESS.md', '| README status badges | Verified |')
  assertContains('README.md', 'https://img.shields.io/badge/repository-private%20until%20ready-lightgrey')
  assertContains('README.md', 'https://img.shields.io/badge/hosted%20CI-blocked%20before%20checkout-red')
  assertContains('docs/PUBLIC-READINESS.md', '| Source setup doctor | Verified |')
  assertContains('docs/PUBLIC-READINESS.md', '| Public doc links | Verified |')
  assertContains('docs/PUBLIC-READINESS.md', '| Live readiness audit | Verified |')
  assertContains('docs/PUBLIC-READINESS.md', '| Release preflight | Blocked |')
  assertContains('docs/PUBLIC-READINESS.md', '| Release Pages generator | Locally verified |')
  assertContains('package.json', '"doctor:source": "node scripts/doctor-public-source.mjs"')
  assertContains('package.json', '"test:doctor-source": "node scripts/doctor-public-source.mjs --self-test"')
  assertContains('README.md', 'pnpm test:public-doc-links')
  assertContains('package.json', '"test:public-doc-links": "node scripts/verify-public-doc-links.mjs"')
  assertContains('package.json', '"test:public-doc-links:self": "node scripts/verify-public-doc-links.mjs --self-test"')
  assertContains('.github/workflows/ci.yml', 'pnpm test:public-doc-links')
  assertContains('README.md', 'pnpm release:preflight')
  assertContains('docs/GETTING-STARTED.md', 'pnpm release:preflight')
  assertContains('package.json', '"release:preflight": "node scripts/release-preflight.mjs"')
  assertContains('package.json', '"test:release-preflight": "node scripts/release-preflight.mjs --self-test"')
  assertContains('README.md', 'pnpm audit:public-readiness -- --branch main')
  assertContains('package.json', '"audit:public-readiness": "node scripts/audit-public-readiness.mjs"')
  assertContains('package.json', '"test:public-readiness-audit": "node scripts/audit-public-readiness.mjs --self-test"')
  assertContains(
    'docs/PUBLIC-READINESS.md',
    'fails before checkout while waiting for the hosted runner to come online',
    'hosted CI runner-startup blocker evidence',
  )
  assertContains(
    'docs/PUBLIC-READINESS.md',
    'This section records representative hosted CI evidence.',
    'representative hosted CI evidence boundary',
  )
  assertNotMatch('README.md', /https?:\/\/[^\s)]+Grimoire\.app\.tar\.gz/iu, 'a public Grimoire.app.tar.gz URL')
  assertNotMatch('README.md', /actions\/workflows\/(?:ci|release)\.yml\/badge\.svg/iu, 'dynamic GitHub Actions badges before hosted CI is green')
  assertNotMatch('README.md', /codecov\.io\/gh\/sriinnu\/grimoire\/graph\/badge\.svg/iu, 'dynamic Codecov badge before coverage publication is verified')
  assertNotMatch('README.md', /codescene\.io\/projects\/76865\/status-badges/iu, 'dynamic CodeScene badge before CodeScene access is verified')
  assertNotMatch('docs/PUBLIC-READINESS.md', /billing|spending-limit/iu, 'unverified hosted CI billing/spending claims')
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
    'APPLE_ID, APPLE_PASSWORD, and APPLE_TEAM_ID are required for notarized public release builds.',
    'release workflow notarization guard',
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
