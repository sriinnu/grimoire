#!/usr/bin/env node
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { verifyRelationshipDocs } from './public-readiness-doc-relationship-checks.mjs'

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url))
const REPO_ROOT = resolve(SCRIPT_DIR, '..')

function readText(path) {
  return readFileSync(resolve(REPO_ROOT, path), 'utf8').replace(/\r\n?/gu, '\n')
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

function assertTrimmedEquals(path, expected, label = expected) {
  const text = readText(path).trim()
  if (text !== expected.trim()) {
    fail(`${path} must exactly match: ${label}`)
  }
}

function assertNotMatch(path, pattern, label) {
  const text = readText(path)
  if (pattern.test(text)) {
    fail(`${path} must not contain ${label}`)
  }
}

function assertMatch(path, pattern, label) {
  const text = readText(path)
  if (!pattern.test(text)) {
    fail(`${path} must contain ${label}`)
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
  assertContains('docs/PUBLIC-READINESS.md', 'Grimoire\'s source repository is public, but the app is not ready for public')
  assertContains('docs/PUBLIC-READINESS.md', '| Public binary release | Blocked |')
  assertContains('docs/PUBLIC-READINESS.md', '| Update feed | Blocked |')
  assertContains('docs/PUBLIC-READINESS.md', '| README status badges | Verified |')
  assertContains('docs/PUBLIC-READINESS.md', '| Public doc hygiene | Verified |')
  assertContains('docs/PUBLIC-READINESS.md', 'local working notes are ignored and removed from Git tracking')
  assertContains('docs/PUBLIC-READINESS.md', '`CLAUDE.md` is only a compatibility shim to `AGENTS.md`')
  assertContains('docs/PUBLIC-READINESS.md', 'root vault type stubs')
  assertContains('docs/PUBLIC-READINESS.md', 'public Markdown, JSON, TOML, or YAML files reference known local-only docs')
  assertContains('docs/PUBLIC-READINESS.md', 'The only allowed tracked importer `.env` fixtures must contain sanitized `KEY=redacted` assignments.')
  assertContains('README.md', '[Docs Index](docs/README.md)')
  assertContains('README.md', '[docs/RELEASE-RUNBOOK.md](docs/RELEASE-RUNBOOK.md)')
  assertContains('README.md', '[Release Runbook](docs/RELEASE-RUNBOOK.md)')
  assertContains('docs/README.md', 'Local working notes are kept out of Git.')
  assertContains('docs/README.md', '[Public Readiness](PUBLIC-READINESS.md)')
  assertContains('docs/README.md', '[Release Runbook](RELEASE-RUNBOOK.md)')
  assertContains('docs/GETTING-STARTED.md', '[RELEASE-RUNBOOK.md](RELEASE-RUNBOOK.md)')
  assertTrimmedEquals(
    'CLAUDE.md',
    '@AGENTS.md\n\nThis file is a Claude Code compatibility shim. Keep shared agent instructions in `AGENTS.md`.',
    'a short Claude Code compatibility shim',
  )
  assertContains('docs/PUBLIC-READINESS.md', '| CI runner images | Ready |')
  assertContains('docs/PUBLIC-READINESS.md', '`macos-15`, `ubuntu-24.04`, and `windows-2025-vs2026`')
  assertContains('README.md', 'https://img.shields.io/badge/source-public-blue')
  assertContains('README.md', 'https://img.shields.io/badge/main%20CI-not%20green%20yet-orange')
  assertContains('README.md', 'Hosted CI')
  assertContains('README.md', 'Live-audited, not hardcoded here')
  assertContains('README.md', 'readiness-branch CI must be checked with the audit command')
  assertContains('docs/PUBLIC-READINESS.md', '| Source setup doctor | Verified |')
  assertContains('docs/PUBLIC-READINESS.md', 'pnpm 10+, Windows MSVC Rust host, Microsoft C++ Build Tools, Windows WebView2 runtime warnings, and Linux pkg-config checks')
  assertContains('docs/PUBLIC-READINESS.md', 'libxdo/xdo, OpenSSL, librsvg, and AppIndicator/Ayatana')
  assertContains('README.md', 'checks for the MSVC Rust host and')
  assertContains('README.md', 'warns when the evergreen WebView2')
  assertContains('README.md', 'needs Node, pnpm 10+, and Git')
  assertContains('README.md', 'pkg-config visibility for WebKitGTK 4.1, GTK 3, libsoup 3, JavaScriptCoreGTK')
  assertContains('docs/GETTING-STARTED.md', 'checks Windows native setup for the MSVC Rust host')
  assertContains('docs/GETTING-STARTED.md', 'warns when the evergreen WebView2')
  assertContains('docs/GETTING-STARTED.md', 'On Linux it verifies the pkg-config packages')
  assertContains('docs/GETTING-STARTED.md', 'Node.js 20+, pnpm 10+, and Git')
  assertContains('docs/GETTING-STARTED.md', 'xdotool')
  assertContains('docs/GETTING-STARTED.md', 'libxdo-devel')
  assertContains('docs/GETTING-STARTED.md', 'libxdo-dev')
  assertContains('scripts/doctor-public-source.mjs', 'Windows Rust MSVC host')
  assertContains('scripts/doctor-public-source.mjs', 'Microsoft C++ Build Tools')
  assertContains('scripts/doctor-public-source.mjs', "packages: ['libxdo', 'xdo']")
  assertContains('scripts/doctor-public-source.mjs', 'AppIndicator/Ayatana AppIndicator')
  assertContains('scripts/doctor-public-source.mjs', 'librsvg-2.0')
  assertContains('docs/PUBLIC-READINESS.md', '| Starter showcase structure | Verified |')
  assertContains('docs/PUBLIC-READINESS.md', 'Sidebar Spotlight project-text fixture')
  assertContains('docs/PUBLIC-READINESS.md', 'Journal/Dream/Event Time Loom substrate')
  assertContains('docs/PUBLIC-READINESS.md', 'requires every advertised surface row to link to a real demo note')
  assertContains('docs/PUBLIC-READINESS.md', 'not a claim that every advertised app surface is feature-complete')
  assertContains('docs/PUBLIC-READINESS.md', 'shallow-clones the public starter repo and compares its tracked content against `demo-vault-v2/`')
  assertContains('docs/PUBLIC-READINESS.md', 'packaged bundled fallback is present')
  assertContains('docs/PUBLIC-READINESS.md', 'packaged apps copy the bundled')
  assertContains('src-tauri/tauri.conf.json', '"../demo-vault-v2/**/*": "starter-vault/"')
  assertContains('docs/PUBLIC-READINESS.md', 'signed 2026-06-02 content refresh `bb9f94c`')
  assertNotMatch('docs/PUBLIC-READINESS.md', /254e687/u, 'the superseded starter-vault head')
  assertNotMatch('docs/PUBLIC-READINESS.md', /b3c9170/u, 'the superseded starter-vault head')
  assertContains('docs/PUBLIC-READINESS.md', 'including signed HEAD proof, clean worktree proof, CI workflow run/head/matrix proof, macOS updater platform payload proof, starter-vault mirror drift, and release-preflight blockers')
  assertContains('scripts/audit-public-readiness.mjs', 'compareStarterMirror')
  assertContains('scripts/audit-public-readiness.mjs', 'readStarterBundleProof')
  assertContains('scripts/public-readiness-evaluation.mjs', 'Packaged starter-vault fallback is not configured')
  assertContains('scripts/public-readiness-evaluation.mjs', 'Starter vault public clone does not match demo-vault-v2')
  assertContains('scripts/public-readiness-starter-mirror.mjs', 'export function compareStarterMirror')
  assertContains('scripts/audit-public-readiness.mjs', 'readHeadSignatureProof')
  assertContains('scripts/public-readiness-evaluation.mjs', 'Current branch HEAD does not have a good git signature')
  assertContains('scripts/public-readiness-git-proof.mjs', 'export function readHeadSignatureProof')
  assertContains('scripts/public-readiness-git-proof.mjs', 'export function readWorkingTreeProof')
  assertContains('scripts/public-readiness-evaluation.mjs', 'Working tree is not clean')
  assertContains('scripts/public-readiness-evaluation.mjs', 'Release preflight:')
  assertContains('scripts/public-readiness-evaluation.mjs', 'export function releasePreflightSummary')
  assertContains('scripts/release-next-actions.mjs', 'export function releaseNextActions')
  assertContains('scripts/release-next-actions.mjs', 'Set the GitHub repository release secrets')
  assertContains('scripts/audit-public-readiness.mjs', 'printReleaseNextActions')
  assertContains('scripts/release-preflight.mjs', 'printReleaseNextActions')
  assertContains('docs/README.md', '[Contributing](../CONTRIBUTING.md)')
  assertContains('docs/README.md', '[Security](../SECURITY.md)')
  assertContains('docs/README.md', '[Licensing](../LICENSING.md)')
  assertContains('docs/PUBLIC-READINESS.md', '| Public doc links | Verified |')
  assertContains('docs/PUBLIC-READINESS.md', '| Signed branch HEAD | Verified |')
  assertContains('docs/PUBLIC-READINESS.md', '| Clean release tree | Verified |')
  assertContains('docs/PUBLIC-READINESS.md', 'checks that the current branch HEAD has a good Git signature before public release can pass')
  assertContains('docs/PUBLIC-READINESS.md', 'signed but dirty local tree cannot pass public release readiness')
  assertContains('docs/PUBLIC-READINESS.md', '| Live readiness audit | Verified |')
  assertContains('docs/PUBLIC-READINESS.md', '| Release preflight | Blocked |')
  assertContains('docs/PUBLIC-READINESS.md', '| Release runbook | Ready |')
  assertContains('docs/PUBLIC-READINESS.md', '[RELEASE-RUNBOOK.md](RELEASE-RUNBOOK.md)')
  assertContains('docs/PUBLIC-READINESS.md', 'execution checklist, not release evidence')
  assertContains('docs/PUBLIC-READINESS.md', 'GitHub Pages is configured in workflow mode')
  assertContains('docs/PUBLIC-READINESS.md', 'the remaining release-preflight blockers directly')
  assertContains('docs/PUBLIC-READINESS.md', '| Release Pages generator | Locally verified |')
  assertContains('docs/PUBLIC-READINESS.md', 'a generic Mac browser sees an explicit architecture choice')
  assertContains('docs/ARCHITECTURE.md', 'scripts/release-pages-core.mjs')
  assertContains('docs/ARCHITECTURE.md', 'scripts/release-pages-self-test.mjs')
  assertContains('docs/ARCHITECTURE.md', 'Intel choice')
  assertContains('scripts/release-pages-core.mjs', 'macDownloadCount > 1')
  assertContains('scripts/release-pages-self-test.mjs', 'stable-intel-signature')
  assertContains('docs/PUBLIC-READINESS.md', 'GitHub Pages is enabled for workflow deployments')
  assertContains('docs/PUBLIC-READINESS.md', 'Manual update checks do not present this as a broken install')
  assertContains('src/hooks/useUpdater.ts', 'Public Grimoire updates are not published yet. Run from source for now.')
  assertContains('src/hooks/useUpdater.test.ts', 'explains missing public update feeds without treating source builds as broken')
  assertContains('src/hooks/useUpdater.test.ts', 'maps not-found update errors to the missing feed message')
  assertContains('docs/PUBLIC-READINESS.md', '| Settings platform copy | Verified |')
  assertContains('docs/PUBLIC-READINESS.md', 'Windows Credential Manager')
  assertContains('docs/PUBLIC-READINESS.md', 'Linux Secret Service/keyring')
  assertContains('docs/PUBLIC-READINESS.md', 'browser smoke coverage through the same bottom-bar action')
  assertContains('package.json', 'tests/smoke/vault-switcher-bottom-bar.spec.ts')
  assertContains('tests/smoke/vault-switcher-bottom-bar.spec.ts', 'bottom bar open-local-folder action switches to the picked vault @smoke')
  assertMatch(
    'docs/PUBLIC-READINESS.md',
    /\| Secrets \| Locally verified \| `node scripts\/scan-secrets\.mjs --all` completed without findings across [0-9,]+ files on 2026-06-02\. \|/u,
    'secret-scan evidence with a file count',
  )
  assertMatch(
    'docs/PUBLIC-READINESS.md',
    /The branch pre-push gate is the local evidence lane: local-only audit, Rust platform guards, public-readiness docs, public doc links, release pages self-test, starter vault showcase, production build, the frontend test suite, and any change-scoped editor or Rust lanes required by the hook\./u,
    'durable local pre-push evidence without a self-staling test count',
  )
  assertContains(
    'docs/PUBLIC-READINESS.md',
    'Current signed HEAD and clean-tree proof come from `pnpm audit:public-readiness -- --branch docs/public-readiness-truth`, not from self-staling commit hashes or hardcoded test counts in this file.',
    'durable current-head evidence boundary',
  )
  assertContains('docs/PUBLIC-READINESS.md', 'hardcoded test counts')
  assertContains('docs/PUBLIC-READINESS.md', 'Rust platform guards')
  assertContains('docs/PUBLIC-READINESS.md', 'ws_bridge_spawn_failure_keeps_startup_optional')
  assertContains('docs/PUBLIC-READINESS.md', 'Release-mode lookup no longer falls back to the source checkout')
  assertContains('docs/PUBLIC-READINESS.md', 'Node lookup now parses multi-line `where` output')
  assertContains('docs/GETTING-STARTED.md', 'Node.js must be discoverable on `PATH`')
  assertContains(
    'docs/PUBLIC-READINESS.md',
    'Fresh packaged Windows/Linux/macOS launch evidence is still required before calling the bridge fully verified',
  )
  assertContains('src-tauri/src/lib_tests.rs', 'fn ws_bridge_spawn_failure_keeps_startup_optional()')
  assertContains('package.json', '"doctor:source": "node scripts/doctor-public-source.mjs"')
  assertContains('package.json', '"test:doctor-source": "node scripts/doctor-public-source.mjs --self-test"')
  assertContains('README.md', 'pnpm test:public-doc-links')
  assertContains('package.json', '"test:public-doc-links": "node scripts/verify-public-doc-links.mjs"')
  assertContains('package.json', '"test:public-doc-links:self": "node scripts/verify-public-doc-links.mjs --self-test"')
  assertContains('.github/workflows/ci.yml', 'pnpm test:public-doc-links')
  assertContains('.github/workflows/ci.yml', 'libxdo-dev')
  assertContains('README.md', 'pnpm release:preflight')
  assertContains('docs/GETTING-STARTED.md', 'pnpm release:preflight')
  assertContains('docs/RELEASE-RUNBOOK.md', 'APPLE_CERTIFICATE')
  assertContains('docs/RELEASE-RUNBOOK.md', 'TAURI_SIGNING_PRIVATE_KEY')
  assertContains('docs/RELEASE-RUNBOOK.md', 'gh secret set')
  assertContains('docs/RELEASE-RUNBOOK.md', 'git tag -s alpha-vYYYY.M.D.N')
  assertContains('docs/RELEASE-RUNBOOK.md', 'git tag -s stable-vYYYY.M.D')
  assertContains('docs/RELEASE-RUNBOOK.md', 'pnpm audit:public-readiness -- --branch main')
  assertContains('docs/RELEASE-RUNBOOK.md', 'Next actions')
  assertContains('package.json', '"release:preflight": "node scripts/release-preflight.mjs"')
  assertContains('package.json', '"test:release-preflight": "node scripts/release-preflight.mjs --self-test"')
  assertContains('README.md', 'pnpm audit:public-readiness -- --branch main')
  assertContains('package.json', '"audit:public-readiness": "node scripts/audit-public-readiness.mjs"')
  assertContains('package.json', '"test:public-readiness-audit": "node scripts/audit-public-readiness.mjs --self-test"')
  assertContains(
    'docs/PUBLIC-READINESS.md',
    'This section records how to verify hosted CI, not a frozen latest commit.',
    'durable hosted CI evidence boundary',
  )
  assertContains(
    'docs/PUBLIC-READINESS.md',
    'live readiness audit reports the current run id, conclusion or in-progress',
    'live hosted CI audit evidence',
  )
  assertContains(
    'docs/PUBLIC-READINESS.md',
    'A pending run, failed run, stale-head run, missing',
    'hosted CI non-green evidence boundary',
  )
  assertContains('package.json', '"test:github-actions-runtime": "node scripts/verify-github-actions-runtime.mjs"')
  assertContains('.github/workflows/ci.yml', 'pnpm test:github-actions-runtime')
  assertContains('docs/PUBLIC-READINESS.md', 'GitHub Actions runtime versions')
  assertNotMatch('docs/PUBLIC-READINESS.md', /96b9c74/u, 'the superseded local-check commit hash')
  assertNotMatch('docs/PUBLIC-READINESS.md', /97b824f7839ab94ef09b07a6b95f767936de262f/u, 'the superseded starter-vault head')
  assertNotMatch('README.md', /https?:\/\/[^\s)]+Grimoire\.app\.tar\.gz/iu, 'a public Grimoire.app.tar.gz URL')
  assertNotMatch('README.md', /actions\/workflows\/(?:ci|release)\.yml\/badge\.svg/iu, 'dynamic GitHub Actions badges before main CI is green')
  assertNotMatch('README.md', /codecov\.io\/gh\/sriinnu\/grimoire\/graph\/badge\.svg/iu, 'dynamic Codecov badge before coverage publication is verified')
  assertNotMatch('README.md', /codescene\.io\/projects\/76865\/status-badges/iu, 'dynamic CodeScene badge before CodeScene access is verified')
}

function verifyReleaseWorkflowTruth() {
  const hasWindowsRelease = releaseWorkflowHasPlatform(/windows-latest|windows-20\d\d|^\s+windows:/imu)
  const hasLinuxRelease = releaseWorkflowHasPlatform(/ubuntu-latest|ubuntu-2\d\.\d\d|^\s+linux:/imu)

  if (hasWindowsRelease || hasLinuxRelease) {
    fail('release.yml now includes non-macOS release jobs; update the public readiness docs and this guard with verified artifact evidence')
  }

  assertMatch(
    '.github/workflows/ci.yml',
    /os:\s*\[macos-15,\s*ubuntu-24\.04,\s*windows-2025-vs2026\]/u,
    'the pinned public CI runner matrix',
  )
  assertNotMatch('.github/workflows/ci.yml', /\b(?:macos|ubuntu|windows)-latest\b/u, 'moving latest runner labels')
  assertContains('.github/workflows/release.yml', 'runs-on: macos-15', 'pinned macOS release runner')
  assertNotMatch('.github/workflows/release.yml', /\bmacos-latest\b/u, 'moving macOS latest release runner')
  assertContains(
    'README.md',
    'source-build targets, not public-support claims, until hosted CI and platform QA',
    'macOS-only release workflow disclaimer',
  )
  assertContains(
    'docs/GETTING-STARTED.md',
    'current release workflow only builds macOS artifacts after signing',
    'Getting Started macOS-only release workflow disclaimer',
  )
  assertContains(
    'docs/PUBLIC-READINESS.md',
    '| OS packaging | Partial | macOS source development is locally verified. Linux and Windows are intended source-development targets, but they are not public-support claims until hosted CI and fresh platform QA prove them. The tracked release workflow currently produces macOS artifacts only after signing secrets are configured. |',
    'Public Readiness OS packaging row',
  )
  assertContains(
    'docs/PUBLIC-READINESS.md',
    '| Windows native run | Needs recheck | Windows `pnpm tauri dev` runs on `main` exposed two source-portability bugs:',
    'Public Readiness Windows native run row',
  )
  assertContains(
    'README.md',
    'the current source tree contains guards for those paths',
    'durable Windows guard wording in README',
  )
  assertContains(
    'docs/GETTING-STARTED.md',
    'The current source includes\nguards for the macOS-only paths',
    'durable Windows guard wording in Getting Started',
  )
  assertContains(
    'docs/PUBLIC-READINESS.md',
    'The current source contains cfg guards for the macOS-only paths',
    'durable Windows guard wording in Public Readiness',
  )
  assertContains(
    'README.md',
    "bundles SQLite through `rusqlite` instead of requiring a separate Windows\nSQLite import library",
    'durable Windows SQLite linker wording in README',
  )
  assertContains(
    'docs/GETTING-STARTED.md',
    "bundles SQLite through `rusqlite` instead of\nrequiring a separately installed Windows SQLite import library",
    'durable Windows SQLite linker wording in Getting Started',
  )
  assertContains(
    'docs/PUBLIC-READINESS.md',
    'bundles SQLite through `rusqlite`\'s `bundled` feature instead of requiring a system SQLite import library',
    'durable Windows SQLite linker wording in Public Readiness',
  )
  assertNotMatch('README.md', /this branch contains those cfg guards/iu, 'branch-specific Windows guard wording')
  assertNotMatch('docs/GETTING-STARTED.md', /Use the public-readiness branch for those guards/iu, 'branch-specific Windows guard wording')
  assertContains(
    'docs/PUBLIC-READINESS.md',
    'uses `pnpm test:rust-platform-guards` to fail if those regressions return',
    'Public Readiness Rust platform guard evidence',
  )
  assertContains(
    'docs/GETTING-STARTED.md',
    '`pnpm test:rust-platform-guards` statically guards the known macOS-only',
    'Getting Started Rust platform guard caveat',
  )
  assertContains(
    'package.json',
    '"test:rust-platform-guards": "node scripts/verify-rust-platform-guards.mjs"',
    'Rust platform guard script',
  )
  assertContains(
    'package.json',
    '"test:rust-platform-guards:self": "node scripts/verify-rust-platform-guards.mjs --self-test"',
    'Rust platform guard self-test script',
  )
  assertContains(
    '.husky/pre-push',
    'pnpm test:rust-platform-guards',
    'pre-push Rust platform guard',
  )
  assertContains(
    '.github/workflows/ci.yml',
    'pnpm test:rust-platform-guards:self',
    'CI Rust platform guard self-test',
  )
  assertContains(
    '.github/workflows/ci.yml',
    'pnpm test:rust-platform-guards',
    'CI Rust platform guard',
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

try {
  verifyBinaryInstallTruth()
  verifyReleaseWorkflowTruth()
  verifyRelationshipDocs()
  console.log('[public-readiness-docs] ok')
} catch (error) {
  const message = error instanceof Error ? error.message : String(error)
  console.error(message)
  process.exit(1)
}
