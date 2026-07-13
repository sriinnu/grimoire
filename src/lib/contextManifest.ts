import {
  CONTEXT_MANIFEST_SCHEMA_VERSION,
  createContextBudgetV1,
  type ContextIntentV1,
  type ContextItemV1,
  type ContextManifestV1,
  type ContextSourceKindV1,
  validateContextManifestV1,
} from '@grimoire/product-contracts'
import type { ContextCapsuleNote, ContextCapsulePreview } from './contextCapsule'

interface ContextManifestFromCapsuleInput {
  preview: ContextCapsulePreview
  manifestId: string
  requestId: string
  createdAt: string
  intent?: ContextIntentV1
  maximumTokens?: number
  pinnedSourceIds?: ReadonlySet<string>
  excludedSourceIds?: ReadonlySet<string>
}

/**
 * Adapts the existing Locality Firewall-aware Context Capsule into the first
 * versioned Context Manifest. It never re-reads note bodies or bypasses capsule
 * exclusions.
 */
export function buildContextManifestFromCapsule({
  preview,
  manifestId,
  requestId,
  createdAt,
  intent = 'explain',
  maximumTokens = 8_000,
  pinnedSourceIds = new Set(),
  excludedSourceIds = new Set(),
}: ContextManifestFromCapsuleInput): ContextManifestV1 {
  const sourceItems = preview.includedNotes.map(contextItem)
  const includedItems = sourceItems.filter(item => !excludedSourceIds.has(item.id))
  const pinned = includedItems
    .filter(item => pinnedSourceIds.has(item.id))
    .map(item => ({
      ...item,
      selectedBecause: [...item.selectedBecause, 'user pin'],
      retrievalChannels: [...item.retrievalChannels, 'user-pin'],
    }))
  const recalled = includedItems.filter(item => !pinnedSourceIds.has(item.id))
  const policyBlocks = preview.exclusions.map(item => `${item.label}: ${item.reason}`)
  const budget = createContextBudgetV1(maximumTokens, 0)
  if (!budget) throw new Error('Context Manifest maximum token budget must be a non-negative integer')

  const manifest: ContextManifestV1 = {
    schemaVersion: CONTEXT_MANIFEST_SCHEMA_VERSION,
    id: manifestId,
    requestId,
    createdAt,
    intent,
    live: liveContext(preview),
    recalled,
    code: [],
    pinned,
    excluded: [
      ...sourceItems
        .filter(item => excludedSourceIds.has(item.id))
        .map(item => ({
          id: item.id,
          kind: item.kind,
          uri: item.uri,
          reason: 'user excluded',
          permission: 'blocked' as const,
        })),
      ...preview.exclusions.map((item, index) => ({
        id: `policy-block-${index + 1}`,
        kind: 'other' as const,
        uri: `grimoire://locality-firewall/${index + 1}`,
        reason: `${item.label}: ${item.reason}`,
        permission: 'blocked' as const,
      })),
    ],
    budget,
    warnings: { stale: [], contradictions: [], weakEvidence: [], policyBlocks },
    provenance: includedItems.map(item => ({ kind: item.kind, uri: item.uri })),
  }

  const errors = validateContextManifestV1(manifest)
  if (errors.length > 0) throw new Error(`Invalid Context Manifest: ${errors.join('; ')}`)
  return manifest
}

export function contextCapsuleSourceId(note: ContextCapsuleNote): string {
  return `capsule:${note.kind}:${note.path}`
}

function contextItem(note: ContextCapsuleNote): ContextItemV1 {
  return {
    id: contextCapsuleSourceId(note),
    kind: sourceKind(note.kind),
    uri: `vault:///${encodeURI(note.path)}`,
    score: note.kind === 'active' ? 1 : 0.75,
    tokenCount: 0,
    selectedBecause: [selectionReason(note.kind)],
    retrievalChannels: ['context-capsule'],
    scope: 'vault',
    confidence: 1,
    permission: 'allowed',
  }
}

function liveContext(preview: ContextCapsulePreview): ContextManifestV1['live'] {
  const active = preview.includedNotes.find(note => note.kind === 'active')
  return {
    activeFile: active?.path,
    openFiles: preview.includedNotes.filter(note => note.kind === 'open-tab').map(note => note.path),
    gitDiffs: [],
    terminalErrors: [],
  }
}

function sourceKind(kind: ContextCapsuleNote['kind']): ContextSourceKindV1 {
  if (kind === 'active') return 'active-file'
  if (kind === 'open-tab') return 'open-file'
  if (kind === 'memory') return 'memory'
  return 'other'
}

function selectionReason(kind: ContextCapsuleNote['kind']): string {
  if (kind === 'active') return 'active note'
  if (kind === 'open-tab') return 'open tab'
  if (kind === 'linked') return 'linked note'
  if (kind === 'memory') return 'memory reference'
  return 'explicit ask reference'
}
