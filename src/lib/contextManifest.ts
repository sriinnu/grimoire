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
import type { ModifiedFile, VaultEntry } from '../types'
import { isLocalOnlyPath, resolveEntryLocalityPolicy } from './localityPolicy'
import type { CodeSymbolSnapshot } from './codeIntelligence'
import type { ChitraguptaRecallAttachment } from './chitraguptaContext'

export interface ContextManifestWorkspaceSnapshot {
  /**
   * Git status is deliberately metadata-only at this layer. Diff contents are
   * added later only through an explicit, reviewed source selection.
   */
  modifiedFiles?: readonly ModifiedFile[]
  /** Used exclusively to apply the Locality Firewall to Git metadata. */
  entries?: readonly VaultEntry[]
  /** Syntax facts are added only after the user explicitly inspects the active code file. */
  codeSymbols?: CodeSymbolSnapshot | null
  /** Path paired with `codeSymbols`; never inferred from unrelated open files. */
  activeCodePath?: string
  /** Explicitly built recall evidence. Excerpts are held by the caller until a separate handoff approval. */
  chitraguptaRecall?: ChitraguptaRecallAttachment | null
}

export type { ContextManifestV1 }

interface ContextManifestFromCapsuleInput {
  preview: ContextCapsulePreview
  manifestId: string
  requestId: string
  createdAt: string
  intent?: ContextIntentV1
  maximumTokens?: number
  pinnedSourceIds?: ReadonlySet<string>
  excludedSourceIds?: ReadonlySet<string>
  workspace?: ContextManifestWorkspaceSnapshot
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
  workspace,
}: ContextManifestFromCapsuleInput): ContextManifestV1 {
  const sourceItems = preview.includedNotes.map(contextItem)
  const includedItems = sourceItems.filter(item => !excludedSourceIds.has(item.id))
  const pinned = includedItems
    .filter(item => pinnedSourceIds.has(item.id))
    .map(item => withTokenEstimate({
      ...item,
      selectedBecause: [...item.selectedBecause, 'user pin'],
      retrievalChannels: [...item.retrievalChannels, 'user-pin'],
    }))
  const recalled = [
    ...includedItems.filter(item => !pinnedSourceIds.has(item.id)),
    ...collectChitraguptaRecallContext(workspace?.chitraguptaRecall),
  ]
  const workspaceContext = collectWorkspaceContext(workspace)
  const compacted = compactContextItems({
    maximumTokens,
    recalled,
    code: workspaceContext.items,
    pinned,
  })
  const policyBlocks = [
    ...preview.exclusions.map(item => `${item.label}: ${item.reason}`),
    ...workspaceContext.policyBlocks,
  ]
  const budget = createContextBudgetV1(maximumTokens, compacted.usedTokens, compacted.compactedTokens)
  if (!budget) throw new Error('Context Manifest token budget must be a non-negative integer')

  const manifest: ContextManifestV1 = {
    schemaVersion: CONTEXT_MANIFEST_SCHEMA_VERSION,
    id: manifestId,
    requestId,
    createdAt,
    intent,
    live: liveContext(preview, workspaceContext.paths),
    recalled: compacted.recalled,
    code: compacted.code,
    pinned: compacted.pinned,
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
      ...compacted.omitted.map((item) => ({
        id: item.id,
        kind: item.kind,
        uri: item.uri,
        reason: `Compacted to fit the ${maximumTokens}-token metadata budget`,
        permission: 'blocked' as const,
      })),
    ],
    budget,
    warnings: {
      stale: [],
      contradictions: [],
      weakEvidence: compacted.omitted.length > 0
        ? [`Token budget compacted ${compacted.omitted.length} reviewed metadata ${compacted.omitted.length === 1 ? 'item' : 'items'}`]
        : [],
      policyBlocks,
    },
    provenance: [...compacted.recalled, ...compacted.code, ...compacted.pinned]
      .map(item => ({ kind: item.kind, uri: item.uri })),
  }

  const errors = validateContextManifestV1(manifest)
  if (errors.length > 0) throw new Error(`Invalid Context Manifest: ${errors.join('; ')}`)
  return manifest
}

export function contextCapsuleSourceId(note: ContextCapsuleNote): string {
  return `capsule:${note.kind}:${note.path}`
}

function contextItem(note: ContextCapsuleNote): ContextItemV1 {
  return withTokenEstimate({
    id: contextCapsuleSourceId(note),
    kind: sourceKind(note.kind),
    uri: `vault:///${encodeURI(note.path)}`,
    score: note.kind === 'active' ? 1 : 0.75,
    selectedBecause: [selectionReason(note.kind)],
    retrievalChannels: ['context-capsule'],
    scope: 'vault',
    confidence: 1,
    permission: 'allowed',
  })
}

function liveContext(preview: ContextCapsulePreview, gitDiffs: string[]): ContextManifestV1['live'] {
  const active = preview.includedNotes.find(note => note.kind === 'active')
  return {
    activeFile: active?.path,
    openFiles: preview.includedNotes.filter(note => note.kind === 'open-tab').map(note => note.path),
    gitDiffs,
    terminalErrors: [],
  }
}

function collectWorkspaceContext(workspace?: ContextManifestWorkspaceSnapshot): {
  items: ContextItemV1[]
  paths: string[]
  policyBlocks: string[]
} {
  const entriesByPath = new Map((workspace?.entries ?? []).map(entry => [entry.path, entry]))
  const items: ContextItemV1[] = []
  const paths: string[] = []
  let withheldLocalCount = 0

  for (const file of workspace?.modifiedFiles ?? []) {
    const entry = entriesByPath.get(file.path)
    // Files without a VaultEntry (deleted notes still in git status, attachments)
    // fall back to the path lane so protected folders never leak through Git metadata.
    const localOnly = entry
      ? resolveEntryLocalityPolicy(entry).localOnly
      : isLocalOnlyPath(file.path) || isLocalOnlyPath(file.relativePath)
    if (localOnly) {
      withheldLocalCount += 1
      continue
    }

    const path = file.relativePath || file.path
    paths.push(path)
    items.push(withTokenEstimate({
      id: `git-diff:${file.path}`,
      kind: 'git-diff',
      uri: `git-diff:///${encodeURI(path)}`,
      score: 0.8,
      selectedBecause: [`working tree ${file.status}`],
      retrievalChannels: ['workspace-git'],
      scope: 'vault',
      confidence: 0.8,
      permission: 'allowed',
    }))
  }

  const syntaxItems = collectCodeSymbolContext(workspace?.codeSymbols, workspace?.activeCodePath)
  return {
    items: [...items, ...syntaxItems],
    paths,
    policyBlocks: withheldLocalCount > 0
      ? [`Git changes withheld by Locality Firewall: ${withheldLocalCount} local-only ${withheldLocalCount === 1 ? 'file' : 'files'}`]
      : [],
  }
}

function collectCodeSymbolContext(snapshot?: CodeSymbolSnapshot | null, path?: string): ContextItemV1[] {
  if (!snapshot?.supported || !path) return []
  return snapshot.symbols.map(symbol => withTokenEstimate({
    id: `symbol:${path}:${symbol.line}:${symbol.column}:${symbol.name}`,
    kind: 'symbol' as const,
    uri: `symbol:///${encodeURI(path)}#L${symbol.line}`,
    score: 0.9,
    selectedBecause: ['user inspected active code file'],
    retrievalChannels: ['tree-sitter'],
    scope: 'vault',
    confidence: snapshot.parseErrorCount === 0 ? 1 : 0.8,
    permission: 'allowed' as const,
  }))
}

function collectChitraguptaRecallContext(
  attachment?: ChitraguptaRecallAttachment | null,
): ContextItemV1[] {
  const requestId = attachment?.requestId
  if (!attachment || !requestId) return []
  return (attachment.items ?? []).map((item, index) => withTokenEstimate({
    id: `chitragupta-recall:${requestId}:${index + 1}`,
    kind: 'memory' as const,
    uri: `chitragupta://recall/${encodeURIComponent(requestId)}/${index + 1}`,
    score: item.score ?? 0.6,
    selectedBecause: ['user built Chitragupta recall in Context Inspector'],
    retrievalChannels: ['chitragupta-context.build', 'memory.unified_recall'],
    scope: 'project',
    confidence: attachment.degraded ? 0.5 : 0.8,
    permission: 'allowed' as const,
  }))
}

function compactContextItems({
  maximumTokens,
  recalled,
  code,
  pinned,
}: {
  maximumTokens: number
  recalled: ContextItemV1[]
  code: ContextItemV1[]
  pinned: ContextItemV1[]
}): {
  recalled: ContextItemV1[]
  code: ContextItemV1[]
  pinned: ContextItemV1[]
  omitted: ContextItemV1[]
  usedTokens: number
  compactedTokens: number
} {
  const candidates = [
    ...pinned.map(item => ({ bucket: 'pinned' as const, item })),
    ...code.map(item => ({ bucket: 'code' as const, item })),
    ...recalled.map(item => ({ bucket: 'recalled' as const, item })),
  ]
  const kept = { recalled: [] as ContextItemV1[], code: [] as ContextItemV1[], pinned: [] as ContextItemV1[] }
  const omitted: ContextItemV1[] = []
  let usedTokens = 0
  let compactedTokens = 0

  for (const candidate of candidates) {
    if (usedTokens + candidate.item.tokenCount > maximumTokens) {
      omitted.push(candidate.item)
      compactedTokens += candidate.item.tokenCount
      continue
    }
    kept[candidate.bucket].push(candidate.item)
    usedTokens += candidate.item.tokenCount
  }

  return { ...kept, omitted, usedTokens, compactedTokens }
}

/**
 * The manifest never reads a source body by itself. This is the estimated
 * prompt cost of the reviewed source metadata it actually serializes, not an
 * invented estimate of a file the user has not permitted us to read.
 */
function withTokenEstimate(item: Omit<ContextItemV1, 'tokenCount'>): ContextItemV1 {
  return {
    ...item,
    tokenCount: Math.max(1, Math.ceil(JSON.stringify(item).length / 4)),
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
