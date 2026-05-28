/**
 * AI contextual chat — builds a structured context snapshot from the active note,
 * open tabs, vault metadata, and optional explicit note references.
 */

import type { VaultEntry } from '../types'
import { isLocalOnlyTypeName, resolveEntryLocalityPolicy } from '../lib/localityPolicy'
import type { AgentGraphContext } from './agentGraphContext'
import { wikilinkTarget, resolveEntry } from './wikilink'
import { splitFrontmatter } from './wikilinks'

/** Extract only the body text from raw file content (strips YAML frontmatter). */
function extractBody(rawContent: string): string {
  const [, body] = splitFrontmatter(rawContent)
  return body.trim()
}

/** Resolve a link target string to a VaultEntry by matching title, aliases, or filename stem.
 *  Delegates to the unified resolveEntry for consistent matching. */
export function resolveTarget(target: string, entries: VaultEntry[]): VaultEntry | undefined {
  return resolveEntry(entries, target)
}

/** Collect first-degree linked notes from the active entry. */
export function collectLinkedEntries(
  active: VaultEntry,
  entries: VaultEntry[],
): VaultEntry[] {
  const seen = new Set<string>([active.path])
  const linked: VaultEntry[] = []

  const addTarget = (target: string) => {
    const entry = resolveTarget(target, entries)
    if (entry && !resolveEntryLocalityPolicy(entry).localOnly && !seen.has(entry.path)) {
      seen.add(entry.path)
      linked.push(entry)
    }
  }

  for (const target of active.outgoingLinks) {
    addTarget(target)
  }

  for (const refs of Object.values(active.relationships)) {
    for (const ref of refs) {
      addTarget(wikilinkTarget(ref))
    }
  }

  for (const ref of active.belongsTo) {
    addTarget(wikilinkTarget(ref))
  }
  for (const ref of active.relatedTo) {
    addTarget(wikilinkTarget(ref))
  }

  return linked
}

/** A note reference from the user's [[wikilink]] selection in the chat input. */
export interface NoteReference {
  title: string
  path: string
  type: string | null
}

/** Lightweight note summary for the context snapshot. */
export interface NoteListItem {
  path: string
  title: string
  type: string
}

/** Parameters for building the structured context snapshot. */
export interface ContextSnapshotParams {
  activeEntry: VaultEntry
  /** Direct content of the active note from the editor tab (most reliable source). */
  activeNoteContent?: string
  openTabs?: VaultEntry[]
  noteList?: NoteListItem[]
  noteListFilter?: { type: string | null; query: string }
  entries: VaultEntry[]
  graphContext?: AgentGraphContext
  references?: NoteReference[]
}

function entryFrontmatter(e: VaultEntry): Record<string, unknown> {
  const fm: Record<string, unknown> = {}
  if (e.isA) fm.type = e.isA
  if (e.status) fm.status = e.status
  // Owner and cadence are now stored in properties, not first-class fields
  const owner = e.properties?.Owner ?? e.properties?.owner
  const cadence = e.properties?.Cadence ?? e.properties?.cadence
  if (owner) fm.owner = typeof owner === 'string' ? owner : String(owner)
  if (cadence) fm.cadence = typeof cadence === 'string' ? cadence : String(cadence)
  return fm
}

const MAX_NOTE_LIST_ITEMS = 100
const LOCAL_ONLY_BODY_PLACEHOLDER = '[Local-only note protected — body omitted from AI context.]'

function visibleEntryByTarget(target: string, entries: VaultEntry[]): VaultEntry | null {
  const entry = entries.find((candidate) => candidate.path === target) ?? resolveTarget(target, entries)
  if (!entry || resolveEntryLocalityPolicy(entry).localOnly) return null
  return entry
}

function visibleRelationshipRefs(refs: string[], entries: VaultEntry[]): string[] {
  return refs.filter((ref) => visibleEntryByTarget(wikilinkTarget(ref), entries) !== null)
}

function entryFrontmatterForAgents(e: VaultEntry, entries: VaultEntry[]): Record<string, unknown> {
  const fm = entryFrontmatter(e)
  const belongsTo = visibleRelationshipRefs(e.belongsTo, entries)
  const relatedTo = visibleRelationshipRefs(e.relatedTo, entries)
  const relationships = Object.fromEntries(
    Object.entries(e.relationships)
      .map(([key, refs]) => [key, visibleRelationshipRefs(refs, entries)] as const)
      .filter(([, refs]) => refs.length > 0),
  )
  if (belongsTo.length > 0) fm.belongsTo = belongsTo
  if (relatedTo.length > 0) fm.relatedTo = relatedTo
  if (Object.keys(relationships).length > 0) fm.relationships = relationships
  return fm
}

function agentVisibleNoteListItem(item: NoteListItem, entries: VaultEntry[]): NoteListItem | null {
  const entry = visibleEntryByTarget(item.path, entries)
  if (!entry) return null
  return item
}

function noteListFilterForAgents(
  filter: ContextSnapshotParams['noteListFilter'],
  entries: VaultEntry[],
): ContextSnapshotParams['noteListFilter'] | null {
  if (!filter) return null
  const type = filter.type && !isLocalOnlyTypeName(filter.type) ? filter.type : null
  const queryEntry = filter.query ? visibleEntryByTarget(filter.query, entries) : null
  const query = queryEntry ? queryEntry.title : ''
  return type || query ? { type, query } : null
}

function graphContextForAgents(graphContext?: AgentGraphContext): Record<string, unknown> | null {
  if (!graphContext || graphContext.state === 'empty') return null
  const base = {
    state: graphContext.state,
    omitted: graphOmissionsForAgents(graphContext.omitted),
    totals: graphContext.totals,
  }
  if (graphContext.state === 'protected-active') return base
  return {
    ...base,
    nodes: graphContext.nodes.map((node) => ({
      active: node.active,
      degree: node.degree,
      path: node.path,
      title: node.title,
      type: node.type,
    })),
    edges: graphContext.edges.map((edge) => ({
      kind: edge.kind,
      label: edge.label,
      sourcePath: edge.sourcePath,
      sourceTitle: edge.sourceTitle,
      targetPath: edge.targetPath,
      targetTitle: edge.targetTitle,
    })),
  }
}

function graphOmissionsForAgents(omitted: AgentGraphContext['omitted']): Record<string, unknown> {
  return {
    localOnly: omitted.protectedNodes + omitted.protectedEdges > 0 ? 'held-by-policy' : 'none',
    truncatedEdges: omitted.truncatedEdges,
    truncatedNodes: omitted.truncatedNodes,
  }
}

function addLocalOnlyOmission(
  snapshot: Record<string, unknown>,
  key: string,
  omitted: number,
): void {
  if (omitted <= 0) return
  snapshot.localOnlyOmitted = {
    ...(snapshot.localOnlyOmitted as Record<string, string> | undefined),
    [key]: 'held-by-policy',
  }
}

/** Build a structured context snapshot as a system prompt for Claude. */
export function buildContextSnapshot(params: ContextSnapshotParams): string {
  const { activeEntry, activeNoteContent, openTabs, noteList, noteListFilter, entries, graphContext, references } = params
  const activeLocality = resolveEntryLocalityPolicy(activeEntry)

  const rawContent = activeNoteContent || ''
  let body = extractBody(rawContent)

  // Defence-in-depth: when body is empty but the note has content on disk,
  // include an explicit instruction in the body field itself (more reliable
  // than a preamble instruction that Claude might skip).
  if (!body && activeEntry.wordCount > 0) {
    body = `[Content not available in editor context — use get_note("${activeEntry.path}") to read the full note (${activeEntry.wordCount} words)]`
  }
  if (activeLocality.localOnly) {
    body = LOCAL_ONLY_BODY_PLACEHOLDER
  }

  const activeNoteLocality = activeLocality.localOnly
    ? { localOnly: true, badgeLabel: activeLocality.badgeLabel }
    : activeLocality

  const snapshot: Record<string, unknown> = {
    activeNote: {
      path: activeLocality.localOnly ? '[local-only path withheld]' : activeEntry.path,
      title: activeLocality.localOnly ? '[local-only title withheld]' : activeEntry.title,
      type: activeLocality.localOnly ? 'Protected' : activeEntry.isA ?? 'Note',
      frontmatter: activeLocality.localOnly ? {} : entryFrontmatterForAgents(activeEntry, entries),
      locality: activeNoteLocality,
      body,
      wordCount: activeLocality.localOnly ? null : activeEntry.wordCount,
    },
  }

  const otherTabs = openTabs?.filter(t => t.path !== activeEntry.path && !resolveEntryLocalityPolicy(t).localOnly)
  if (otherTabs && otherTabs.length > 0) {
    snapshot.openTabs = otherTabs.map(t => ({
      path: t.path,
      title: t.title,
      type: t.isA ?? 'Note',
      frontmatter: entryFrontmatterForAgents(t, entries),
    }))
  }

  if (noteList && noteList.length > 0) {
    const visibleItems = noteList
      .map((item) => agentVisibleNoteListItem(item, entries))
      .filter((item): item is NoteListItem => item !== null)
    const items = visibleItems.slice(0, MAX_NOTE_LIST_ITEMS)
    if (items.length > 0) snapshot.noteList = items
    if (visibleItems.length > MAX_NOTE_LIST_ITEMS) {
      snapshot.noteListTruncated = { shown: MAX_NOTE_LIST_ITEMS, total: visibleItems.length }
    }
    const omitted = noteList.length - visibleItems.length
    addLocalOnlyOmission(snapshot, 'noteList', omitted)
  }

  const visibleNoteListFilter = noteListFilterForAgents(noteListFilter, entries)
  if (visibleNoteListFilter) {
    snapshot.noteListFilter = visibleNoteListFilter
  }

  const visibleGraphContext = graphContextForAgents(graphContext)
  if (visibleGraphContext) {
    snapshot.graphNeighborhood = visibleGraphContext
  }

  const visibleEntries = entries.filter((entry) => !resolveEntryLocalityPolicy(entry).localOnly)
  const types = new Set<string>()
  for (const e of visibleEntries) {
    if (e.isA) types.add(e.isA)
  }
  snapshot.vault = {
    types: [...types].sort(),
    totalNotes: visibleEntries.length,
  }

  if (references && references.length > 0) {
    const visibleReferences = references.filter((ref) => {
      return visibleEntryByTarget(ref.path, entries) !== null
    })
    if (visibleReferences.length > 0) {
      snapshot.referencedNotes = visibleReferences.map(ref => ({
        path: ref.path,
        title: ref.title,
        type: ref.type ?? 'Note',
      }))
    }
    const omitted = references.length - visibleReferences.length
    addLocalOnlyOmission(snapshot, 'referencedNotes', omitted)
  }

  const preamble = [
    'You are an AI assistant integrated into Grimoire, a personal knowledge management app.',
    'The user is viewing a specific note. Use the structured context below to answer questions accurately.',
    'You can also use MCP tools to search, read, create, or edit notes in the vault.',
    'Never read, summarize, export, sync, upload, or transmit notes marked local-only unless the user explicitly authorizes that exact action.',
    'If graphNeighborhood is present, treat it as source-safe graph context only; do not infer hidden local-only node titles or paths from omissions.',
    'If the body field is empty but wordCount is > 0, the content may be stale — use get_note to read the full note from disk.',
    'When you mention or reference a note by name, always use [[Note Title]] wikilink syntax so the user can click to open it.',
  ].join('\n')

  return `${preamble}\n\n## Context Snapshot\n\`\`\`json\n${JSON.stringify(snapshot, null, 2)}\n\`\`\``
}

/** Legacy: Build a contextual system prompt (text-based). */
export function buildContextualPrompt(
  active: VaultEntry,
  linkedEntries: VaultEntry[],
): string {
  const activeLocality = resolveEntryLocalityPolicy(active)
  const visibleLinkedEntries = linkedEntries.filter((entry) => !resolveEntryLocalityPolicy(entry).localOnly)
  const parts: string[] = [
    'You are an AI assistant integrated into Grimoire, a personal knowledge management app.',
    'The user is viewing a specific note. Use the note and its linked context to answer questions accurately.',
    'You can also use MCP tools to search, read, create, or edit notes in the vault.',
    'Never read, summarize, export, sync, upload, or transmit notes marked local-only unless the user explicitly authorizes that exact action.',
    '',
    `## Active Note: ${activeLocality.localOnly ? '[local-only title withheld]' : active.title}`,
    `Type: ${activeLocality.localOnly ? 'Protected' : active.isA ?? 'Note'} | Path: ${activeLocality.localOnly ? '[local-only path withheld]' : active.path}`,
  ]

  if (visibleLinkedEntries.length > 0) {
    parts.push('', '## Linked Notes')
    for (const entry of visibleLinkedEntries) {
      parts.push(
        '',
        `### ${entry.title} (${entry.isA ?? 'Note'})`,
      )
    }
  }

  return parts.join('\n')
}
