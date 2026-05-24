import type { VaultEntry } from '../types'
import type { NoteReference } from '../utils/ai-context'
import type { AgentGraphContext } from '../utils/agentGraphContext'
import { sortByModified } from '../utils/noteListHelpers'
import { buildMemoryLedgerRecord, isMemoryLedgerEntry, type MemoryLedgerRecord } from './memoryLedger'
import { resolveEntryLocalityPolicy } from './localityPolicy'

export interface AskContextMemoryReference {
  confidence: string | number | null
  lastSeen: string | null
  path: string
  sourceLabels: string[]
  title: string
}

export interface AskContextPackage {
  graph?: {
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
  const sourceLabels = uniqueLabels([
    ...references.map((reference) => reference.title),
    ...memoryResult.references.map((memory) => memory.title),
  ])

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

  return {
    graph: {
      protectedEdges: agentGraphContext.omitted.protectedEdges,
      truncatedEdges: agentGraphContext.omitted.truncatedEdges,
      truncatedNodes: agentGraphContext.omitted.truncatedNodes,
      visibleEdges: agentGraphContext.edges.length,
      visibleNodes: agentGraphContext.nodes.length,
    },
    kind: 'graph-council',
    prompt,
    references,
    sourceLabels: uniqueLabels(references.map((reference) => reference.title)),
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
    records.push({
      confidence: record.confidence,
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

function uniqueLabels(labels: string[]): string[] {
  return [...new Set(labels.filter((label) => label.trim().length > 0))]
}

function uniqueReferences(references: NoteReference[]): NoteReference[] {
  const byPath = new Map<string, NoteReference>()
  for (const reference of references) {
    if (!byPath.has(reference.path)) byPath.set(reference.path, reference)
  }
  return [...byPath.values()]
}
