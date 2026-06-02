import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

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

function assertNotMatch(path, pattern, label) {
  const text = readText(path)
  if (pattern.test(text)) {
    fail(`${path} must not contain ${label}`)
  }
}

function verifyAiCollaboratorBoundary() {
  const gatedCapabilities = 'memory, recall, wiki, graph, ingest, diagnostics, and source-backed write suggestions'
  assertContains(
    'README.md',
    `Chitragupta MCP ${gatedCapabilities} remain readiness-gated contract work`,
    'README Chitragupta MCP readiness boundary',
  )
  assertContains(
    'docs/PUBLIC-READINESS.md',
    'Public docs separate CLI agent chat/tooling from Chitragupta MCP memory,',
    'Public Readiness AI docs boundary checklist item',
  )
  assertContains(
    'docs/PUBLIC-READINESS.md',
    'recall, wiki, graph, ingest, and diagnostics readiness.',
    'Public Readiness AI docs boundary checklist continuation',
  )
  assertContains(
    'docs/PUBLIC-READINESS.md',
    'source-backed write suggestions are not public-ready yet and remain contract-gated',
    'Public Readiness AI collaborators row',
  )
  assertContains(
    'docs/CHITRAGUPTA-GRIMOIRE-MCP-CONTRACT.md',
    'That is not the same as this MCP contract being ready.',
    'Chitragupta CLI versus MCP contract boundary',
  )
  assertContains(
    'demo-vault-v2/grimoire-agent-council.md',
    'The current Council is not claiming that every external agent has actually run.',
    'demo Agent Council honesty boundary',
  )
  assertContains(
    'demo-vault-v2/grimoire-local-agent-map.md',
    '| Chitragupta CLI | Route/status disclosure and local chat handoff | Local intent is not approval |',
    'demo Chitragupta CLI lane boundary',
  )
  assertContains(
    'demo-vault-v2/grimoire-local-agent-map.md',
    '| Chitragupta MCP | Memory, recall, wiki, graph, ingest, diagnostics, and source-backed writes | Contract-gated; not live in the public demo |',
    'demo Chitragupta MCP gated lane boundary',
  )
}

function verifyAdrIndexTruth() {
  assertContains(
    'docs/adr/0080-cross-platform-desktop-release-artifacts-and-portable-vault-names.md',
    'status: superseded',
    'ADR-0080 superseded status',
  )
  assertContains(
    'docs/adr/0080-cross-platform-desktop-release-artifacts-and-portable-vault-names.md',
    'earlier release intent, not current public install evidence',
    'ADR-0080 public evidence disclaimer',
  )
  assertNotMatch(
    'docs/adr/0080-cross-platform-desktop-release-artifacts-and-portable-vault-names.md',
    /^status:\s*active\s*$/imu,
    'active status in superseded ADR-0080',
  )
  assertContains(
    'docs/adr/0083-dual-architecture-macos-release-artifacts.md',
    'status: superseded',
    'ADR-0083 superseded status',
  )
  assertContains(
    'docs/adr/0083-dual-architecture-macos-release-artifacts.md',
    'earlier release intent, not current public install evidence',
    'ADR-0083 public evidence disclaimer',
  )
  assertNotMatch(
    'docs/adr/0083-dual-architecture-macos-release-artifacts.md',
    /^status:\s*active\s*$/imu,
    'active status in superseded ADR-0083',
  )
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

export function verifyRelationshipDocs() {
  verifyAiCollaboratorBoundary()
  verifyAdrIndexTruth()
}
