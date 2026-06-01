import type { VaultEntry } from '../types'
import type { NoteReference } from '../utils/ai-context'
import type { AgentGraphContext } from '../utils/agentGraphContext'
import { sortByModified } from '../utils/noteListSorting'
import { buildSourceLabelMap, buildSourceLabels } from '../utils/sourceLabels'
import { buildMemoryLedgerRecord, isMemoryLedgerEntry, memoryReferenceLabel, type MemoryLedgerRecord } from './memoryLedger'
import { resolveEntryLocalityPolicy } from './localityPolicy'

export interface AskContextMemoryReference {
  confidence: string | number | null
  contradictionLabels: string[]
  lastSeen: string | null
  path: string
  sourceLabels: string[]
  title: string
}

export interface AskContextIntent {
  kind: 'crystallize-memory'
  label: string
  origin: 'daily-thread'
  reviewMode: 'review-before-write'
  sourcePolicy: 'public-references-only'
  target: 'markdown-memory'
}

export interface AskContextPackage {
  graph?: {
    edges?: Array<{
      kind: string
      label: string
      sourceTitle: string
      targetTitle: string
    }>
    protectedEdges: number
    truncatedEdges: number
    truncatedNodes: number
    visibleEdges: number
    visibleNodes: number
  }
  kind: 'dashboard-ask' | 'graph-council'
  prompt: string
  references: NoteReference[]
  sourceLabels: string[]
  memoryReferences: AskContextMemoryReference[]
  intent?: AskContextIntent | null
  visibleCount: number
  withheld: {
    protectedMemories: number
    protectedNotes: number
  }
}

interface AskContextPackageParams {
  entries: VaultEntry[]
  limit?: number
  prompt: string
}

function canEnterAskContext(entry: VaultEntry): boolean {
  if (entry.archived || entry.isA === 'Type') return false
  if (isMemoryLedgerEntry(entry)) return false
  return !entry.fileKind || entry.fileKind === 'markdown'
}

/** Builds the shared source-safe context package for dashboard-originated asks. */
export function buildAskContextPackage({
  entries,
  limit = 5,
  prompt,
}: AskContextPackageParams): AskContextPackage {
  const visibleEntries: VaultEntry[] = []
  let protectedNotes = 0

  for (const entry of entries) {
    if (!canEnterAskContext(entry)) continue
    if (resolveEntryLocalityPolicy(entry).localOnly) {
      protectedNotes += 1
      continue
    }
    visibleEntries.push(entry)
  }

  const references = visibleEntries
    .sort(sortByModified)
    .slice(0, limit)
    .map(toNoteReference)
  const memoryResult = findAskMemoryReferences(entries, references)
  const sourceLabels = buildSourceLabels([
    ...references.map((reference) => reference.title),
    ...memoryResult.references.map((memory) => memory.title),
  ].map((title) => ({ path: title, title })))

  return {
    kind: 'dashboard-ask',
    prompt,
    references,
    sourceLabels,
    memoryReferences: memoryResult.references,
    visibleCount: visibleEntries.length,
    withheld: {
      protectedMemories: memoryResult.protectedCount,
      protectedNotes,
    },
  }
}

/** Builds an inspectable source-safe package for graph-originated Council asks. */
export function buildGraphAskContextPackage({
  agentGraphContext,
  prompt,
  selectedReference,
}: {
  agentGraphContext: AgentGraphContext
  prompt: string
  selectedReference?: NoteReference | null
}): AskContextPackage {
  const references = uniqueReferences([
    ...(selectedReference ? [selectedReference] : []),
    ...agentGraphContext.nodes.map((node) => ({
      path: node.path,
      title: node.title,
      type: node.type,
    })),
  ])
  const labelsByPath = buildSourceLabelMap(references)

  return {
    graph: {
      edges: agentGraphContext.edges.map((edge) => ({
        kind: edge.kind,
        label: edge.label,
        sourceTitle: labelsByPath.get(edge.sourcePath) ?? edge.sourceTitle,
        targetTitle: labelsByPath.get(edge.targetPath) ?? edge.targetTitle,
      })),
      protectedEdges: agentGraphContext.omitted.protectedEdges,
      truncatedEdges: agentGraphContext.omitted.truncatedEdges,
      truncatedNodes: agentGraphContext.omitted.truncatedNodes,
      visibleEdges: agentGraphContext.edges.length,
      visibleNodes: agentGraphContext.nodes.length,
    },
    kind: 'graph-council',
    prompt,
    references,
    sourceLabels: buildSourceLabels(references),
    memoryReferences: [],
    visibleCount: agentGraphContext.nodes.length,
    withheld: {
      protectedMemories: 0,
      protectedNotes: agentGraphContext.omitted.protectedNodes,
    },
  }
}

function toNoteReference(entry: VaultEntry): NoteReference {
  return {
    path: entry.path,
    title: entry.title,
    type: entry.isA,
  }
}

function findAskMemoryReferences(
  entries: VaultEntry[],
  references: NoteReference[],
): { protectedCount: number; references: AskContextMemoryReference[] } {
  const referenceTargets = referenceTargetSet(references)
  const protectedTargets = protectedReferenceTargetSet(entries)
  const records: AskContextMemoryReference[] = []
  let protectedCount = 0

  for (const entry of entries) {
    if (!isMemoryLedgerEntry(entry)) continue
    const record = buildMemoryLedgerRecord(entry)
    if (!recordMatchesTargets(record, referenceTargets)) continue
    if (resolveEntryLocalityPolicy(entry).localOnly) {
      protectedCount += 1
      continue
    }
    const contradictionLabels = safeContradictionLabels(record, protectedTargets)
    protectedCount += record.contradicts.length - contradictionLabels.length
    records.push({
      confidence: record.confidence,
      contradictionLabels,
      lastSeen: record.lastSeen,
      path: record.path,
      sourceLabels: record.sources,
      title: record.title,
    })
  }

  return {
    protectedCount,
    references: records.slice(0, 3),
  }
}

function referenceTargetSet(references: NoteReference[]): Set<string> {
  return new Set(references.flatMap((reference) => [
    reference.title,
    reference.path,
    reference.path.replace(/\.md$/i, ''),
    reference.path.split('/').pop()?.replace(/\.md$/i, '') ?? '',
  ]).map(normalizeReference).filter(Boolean))
}

function protectedReferenceTargetSet(entries: VaultEntry[]): Set<string> {
  return new Set(entries
    .filter((entry) => resolveEntryLocalityPolicy(entry).localOnly)
    .flatMap((entry) => [
      entry.title,
      entry.filename,
      entry.filename.replace(/\.md$/i, ''),
      entry.path,
      entry.path.replace(/\.md$/i, ''),
      entry.path.split('/').pop()?.replace(/\.md$/i, '') ?? '',
    ])
    .map(normalizeReference)
    .filter(Boolean))
}

function safeContradictionLabels(record: MemoryLedgerRecord, protectedTargets: Set<string>): string[] {
  return record.contradicts
    .filter((target) => !protectedTargets.has(normalizeReference(target)))
    .map(memoryReferenceLabel)
}

function recordMatchesTargets(record: MemoryLedgerRecord, referenceTargets: Set<string>): boolean {
  return [...record.sources, ...record.contradicts]
    .map(normalizeReference)
    .some((target) => referenceTargets.has(target))
}

function normalizeReference(value: string): string {
  return value
    .replace(/^\[\[/, '')
    .replace(/\]\]$/, '')
    .split('|')[0]
    .replace(/\.md$/i, '')
    .trim()
    .toLowerCase()
}

function uniqueReferences(references: NoteReference[]): NoteReference[] {
  const byPath = new Map<string, NoteReference>()
  for (const reference of references) {
    if (!byPath.has(reference.path)) byPath.set(reference.path, reference)
  }
  return [...byPath.values()]
}
