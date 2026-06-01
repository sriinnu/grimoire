import type { VaultEntry } from '../types'
import type { AskContextPackage } from './askContextPackage'
import { isLocalOnlyTypeName, resolveEntryLocalityPolicy } from './localityPolicy'
import type { NoteListItem } from '../utils/ai-context'
import type { AgentGraphContext } from '../utils/agentGraphContext'
import { buildContextCapsulePackageFromPreview } from './contextCapsulePackage'

/** Lifecycle state for an inspectable context capsule preview. */
export type ContextCapsuleState = 'empty' | 'protected' | 'ready'

/** Source role for a note included in a context capsule. */
export type ContextCapsuleNoteKind = 'active' | 'linked' | 'open-tab' | 'ask-reference' | 'memory'

/** Source-safe note reference that may be shown before an agent handoff. */
export interface ContextCapsuleNote {
  kind: ContextCapsuleNoteKind
  title: string
  type: string
  path: string
}

/** Counted context that was withheld from a capsule preview. */
export interface ContextCapsuleExclusion {
  label: string
  reason: string
}

/** Source-safe package summary for agent handoff review. */
export interface ContextCapsulePreview {
  state: ContextCapsuleState
  title: string
  handoffIntent?: string
  includedNotes: ContextCapsuleNote[]
  exclusions: ContextCapsuleExclusion[]
  rules: string[]
  counts: {
    linkedNotes: number
    noteListItems: number
    openTabs: number
    selectedNotes: number
    exclusions: number
  }
  projectMap: {
    graphEdges: number
    graphNodes: number
    graphOmitted: number
    relationshipEdges: number
  }
}

/** Inputs used to derive a source-safe context capsule preview. */
export interface ContextCapsuleInput {
  activeEntry?: VaultEntry | null
  entries: VaultEntry[]
  linkedEntries?: VaultEntry[]
  graphContext?: AgentGraphContext
  noteList?: NoteListItem[]
  noteListFilter?: { type: string | null; query: string }
  openTabs?: VaultEntry[]
}

/** Read-only Markdown package derived from a sanitized context capsule preview. */
export interface ContextCapsulePackagePreview {
  title: string
  markdown: string
  preflight: {
    heldLocalCount: number
    sourceCount: number
    trimmedCount: number
  }
  protectedContext: boolean
  reviewReceipt: string
}

const BASE_RULES = [
  'Markdown and frontmatter only',
  'Local-only notes withheld',
  'Preview before handoff',
]

const UNSAFE_MEMORY_REFERENCE_SEGMENTS = new Set([
  'dream',
  'dreams',
  'health',
  'journal',
  'journals',
  'local-only',
  'private',
  'therapy',
])

/** Builds an inspectable, local-first agent context package preview. */
export function buildContextCapsulePreview({
  activeEntry,
  entries,
  linkedEntries = [],
  graphContext,
  noteList = [],
  noteListFilter,
  openTabs = [],
}: ContextCapsuleInput): ContextCapsulePreview {
  if (!activeEntry) return emptyCapsule()

  const activePolicy = resolveEntryLocalityPolicy(activeEntry)
  if (activePolicy.localOnly) {
    return protectedCapsule(activePolicy.badgeLabel)
  }

  const includedNotes = uniqueNotes([
    capsuleNote(activeEntry, 'active'),
    ...linkedEntries.map((entry) => visibleCapsuleNote(entry, 'linked')).filter(isCapsuleNote),
    ...openTabs
      .filter((entry) => entry.path !== activeEntry.path)
      .map((entry) => visibleCapsuleNote(entry, 'open-tab'))
      .filter(isCapsuleNote),
  ])
  const linkedOmitted = linkedEntries.filter((entry) => resolveEntryLocalityPolicy(entry).localOnly).length
  const tabOmitted = openTabs
    .filter((entry) => entry.path !== activeEntry.path)
    .filter((entry) => resolveEntryLocalityPolicy(entry).localOnly).length
  const visibleNoteListCount = noteList.filter((item) => visibleNoteListItem(item, entries)).length
  const noteListOmitted = noteList.length - visibleNoteListCount
  const filterOmitted = noteListFilterOmitted(noteListFilter, entries)
  const exclusions = [
    ...countExclusion(linkedOmitted, 'Linked local-only notes'),
    ...countExclusion(tabOmitted, 'Open local-only tabs'),
    ...countExclusion(noteListOmitted, 'Note-list local-only rows'),
    ...countExclusion(filterOmitted, 'Private note-list filter'),
  ]

  return {
    state: 'ready',
    title: `${activeEntry.title} capsule`,
    includedNotes,
    exclusions,
    rules: BASE_RULES,
    counts: {
      linkedNotes: linkedEntries.length - linkedOmitted,
      noteListItems: visibleNoteListCount,
      openTabs: openTabs.length - tabOmitted,
      selectedNotes: includedNotes.length,
      exclusions: exclusions.length,
    },
    projectMap: {
      graphEdges: safeGraphEdges(graphContext),
      graphNodes: safeGraphNodes(graphContext),
      graphOmitted: safeGraphOmitted(graphContext),
      relationshipEdges: relationshipEdgeCount(activeEntry),
    },
  }
}

/** Converts a dashboard ask package into the same inspectable capsule surface. */
export function buildAskContextCapsulePreview(contextPackage: AskContextPackage): ContextCapsulePreview {
  const graph = contextPackage.graph
  const graphProtectedEdges = graph?.protectedEdges ?? 0
  const graphTrimmed = (graph?.truncatedNodes ?? 0) + (graph?.truncatedEdges ?? 0)
  const safeReferences = contextPackage.references.filter(isSafePackageReference)
  const safeMemoryReferences = contextPackage.memoryReferences.filter(isSafeMemoryReference)
  const withheldInjectedNotes = contextPackage.references.length - safeReferences.length
  const withheldInjectedMemories = contextPackage.memoryReferences.length - safeMemoryReferences.length
  const includedNotes = uniqueNotes([
    ...safeReferences.map((reference) => ({
      kind: 'ask-reference' as const,
      path: reference.path,
      title: reference.title,
      type: reference.type ?? 'Note',
    })),
    ...safeMemoryReferences.map((memory) => ({
      kind: 'memory' as const,
      path: memory.path,
      title: memory.title,
      type: 'Memory',
    })),
  ])
  const exclusions = [
    ...countExclusion(
      contextPackage.withheld.protectedNotes + withheldInjectedNotes,
      packageExclusionLabel(contextPackage, 'notes'),
    ),
    ...countExclusion(
      contextPackage.withheld.protectedMemories + withheldInjectedMemories,
      packageExclusionLabel(contextPackage, 'memories'),
    ),
    ...countExclusion(graphProtectedEdges, 'Graph local-only links'),
    ...countExclusion(graphTrimmed, 'Graph trimmed items'),
  ]
  const graphPackage = contextPackage.kind === 'graph-council'

  return {
    state: 'ready',
    title: graphPackage ? 'Graph Council capsule' : 'Dashboard ask capsule',
    handoffIntent: contextPackage.intent?.label,
    includedNotes,
    exclusions,
    rules: [...BASE_RULES, graphPackage ? 'Graph Council package' : 'Dashboard ask package'],
    counts: {
      linkedNotes: 0,
      noteListItems: contextPackage.visibleCount,
      openTabs: 0,
      selectedNotes: includedNotes.length,
      exclusions: exclusions.length,
    },
    projectMap: {
      graphEdges: graph?.visibleEdges ?? 0,
      graphNodes: graph?.visibleNodes ?? 0,
      graphOmitted: contextPackage.withheld.protectedNotes + graphProtectedEdges + graphTrimmed,
      relationshipEdges: 0,
    },
  }
}

function isSafePackageReference(reference: AskContextPackage['references'][number]): boolean {
  return !resolveEntryLocalityPolicy({
    isA: reference.type,
    path: reference.path,
    properties: {},
  }).localOnly
}

function isSafeMemoryReference(reference: AskContextPackage['memoryReferences'][number]): boolean {
  return !pathHasUnsafeMemorySegment(reference.path)
}

function packageExclusionLabel(contextPackage: AskContextPackage, kind: 'memories' | 'notes'): string {
  if (contextPackage.kind === 'graph-council') {
    return kind === 'notes' ? 'Graph local-only notes' : 'Graph local-only memory records'
  }
  return kind === 'notes' ? 'Dashboard local-only notes' : 'Dashboard local-only memory records'
}

function pathHasUnsafeMemorySegment(path: string): boolean {
  return path
    .split(/[\\/]/)
    .map((segment) => segment.trim().toLowerCase())
    .some((segment) => UNSAFE_MEMORY_REFERENCE_SEGMENTS.has(segment))
}

/** Builds a review-only Markdown package from a source-safe capsule preview. */
export function buildContextCapsulePackagePreview(preview: ContextCapsulePreview): ContextCapsulePackagePreview {
  return buildContextCapsulePackageFromPreview(preview)
}

function emptyCapsule(): ContextCapsulePreview {
  return {
    state: 'empty',
    title: 'No active capsule',
    includedNotes: [],
    exclusions: [],
    rules: BASE_RULES,
    counts: {
      linkedNotes: 0,
      noteListItems: 0,
      openTabs: 0,
      selectedNotes: 0,
      exclusions: 0,
    },
    projectMap: {
      graphEdges: 0,
      graphNodes: 0,
      graphOmitted: 0,
      relationshipEdges: 0,
    },
  }
}

function protectedCapsule(reason: string): ContextCapsulePreview {
  const exclusions = [{ label: 'Protected active note', reason }]
  return {
    state: 'protected',
    title: 'Protected capsule',
    includedNotes: [],
    exclusions,
    rules: [...BASE_RULES, 'Active note withheld'],
    counts: {
      linkedNotes: 0,
      noteListItems: 0,
      openTabs: 0,
      selectedNotes: 0,
      exclusions: exclusions.length,
    },
    projectMap: {
      graphEdges: 0,
      graphNodes: 0,
      graphOmitted: 0,
      relationshipEdges: 0,
    },
  }
}

function safeGraphNodes(graphContext?: AgentGraphContext): number {
  return graphContext?.state === 'ready' ? graphContext.nodes.length : 0
}

function safeGraphEdges(graphContext?: AgentGraphContext): number {
  return graphContext?.state === 'ready' ? graphContext.edges.length : 0
}

function safeGraphOmitted(graphContext?: AgentGraphContext): number {
  if (!graphContext || graphContext.state === 'empty') return 0
  return Object.values(graphContext.omitted).reduce((total, count) => total + count, 0)
}

function visibleCapsuleNote(entry: VaultEntry, kind: ContextCapsuleNoteKind): ContextCapsuleNote | null {
  if (resolveEntryLocalityPolicy(entry).localOnly) return null
  return capsuleNote(entry, kind)
}

function capsuleNote(entry: VaultEntry, kind: ContextCapsuleNoteKind): ContextCapsuleNote {
  return {
    kind,
    title: entry.title,
    type: entry.isA ?? 'Note',
    path: entry.path,
  }
}

function uniqueNotes(notes: ContextCapsuleNote[]): ContextCapsuleNote[] {
  const seen = new Set<string>()
  return notes.filter((note) => {
    if (seen.has(note.path)) return false
    seen.add(note.path)
    return true
  })
}

function visibleNoteListItem(item: NoteListItem, entries: VaultEntry[]): boolean {
  const entry = entries.find((candidate) => candidate.path === item.path)
  return !!entry && !resolveEntryLocalityPolicy(entry).localOnly
}

function noteListFilterOmitted(
  filter: ContextCapsuleInput['noteListFilter'],
  entries: VaultEntry[],
): number {
  if (!filter) return 0
  if (filter.type && isLocalOnlyTypeName(filter.type)) return 1
  if (!filter.query) return 0
  const queryEntry = entries.find((entry) => entry.path === filter.query || entry.title === filter.query)
  return queryEntry && resolveEntryLocalityPolicy(queryEntry).localOnly ? 1 : 0
}

function countExclusion(count: number, label: string): ContextCapsuleExclusion[] {
  if (count <= 0) return []
  return [{
    label,
    reason: `${count} withheld`,
  }]
}

function relationshipEdgeCount(entry: VaultEntry): number {
  const relationshipValues = Object.values(entry.relationships ?? {}).reduce((total, refs) => total + refs.length, 0)
  return [
    entry.outgoingLinks?.length ?? 0,
    entry.belongsTo?.length ?? 0,
    entry.relatedTo?.length ?? 0,
    relationshipValues,
  ].reduce((total, count) => total + count, 0)
}

function isCapsuleNote(note: ContextCapsuleNote | null): note is ContextCapsuleNote {
  return note !== null
}
