import type { VaultEntry } from '../../types'
import type { ParsedFrontmatter } from '../../utils/frontmatter'
import { resolveInverseRelationshipLabel } from '../../utils/inverseRelationshipLabels'
import { humanizePropertyKey } from '../../utils/propertyLabels'
import { resolveEntry, wikilinkDisplay, wikilinkTarget } from '../../utils/wikilink'
import type { BacklinkItem, ReferencedByItem } from '../InspectorPanels'
import { extractRelationshipRefs } from './relationshipPanelModel'
import { resolveRef } from './shared'

export type ConnectionDirection = 'out' | 'in' | 'both'
export type ConnectionFilter = 'all' | 'out' | 'in'

export interface ConnectionRow {
  /** Stable identity: the target path, or the raw target for pages that do not exist yet. */
  key: string
  entry: VaultEntry | null
  title: string
  /** What to hand to onNavigate. */
  target: string
  direction: ConnectionDirection
  /** Typed relationship labels, outgoing first, deduped and humanized. */
  labels: string[]
}

interface Draft {
  entry: VaultEntry | null
  title: string
  target: string
  out: boolean
  in: boolean
  labels: Set<string>
}

function draftFor(map: Map<string, Draft>, key: string, seed: Omit<Draft, 'out' | 'in' | 'labels'>): Draft {
  const existing = map.get(key)
  if (existing) return existing
  const created: Draft = { ...seed, out: false, in: false, labels: new Set() }
  map.set(key, created)
  return created
}

function addOutgoingTyped(map: Map<string, Draft>, self: VaultEntry, entries: VaultEntry[], frontmatter: ParsedFrontmatter) {
  for (const group of extractRelationshipRefs(frontmatter)) {
    const label = humanizePropertyKey(group.key)
    for (const ref of group.refs) {
      const resolved = resolveRef(ref, entries)
      if (resolved?.path === self.path) continue
      const target = wikilinkTarget(ref)
      const key = resolved?.path ?? `missing:${target.toLowerCase()}`
      const draft = draftFor(map, key, { entry: resolved ?? null, title: resolved?.title ?? wikilinkDisplay(ref), target: resolved?.title ?? target })
      draft.out = true
      draft.labels.add(label)
    }
  }
}

function addOutgoingBody(map: Map<string, Draft>, self: VaultEntry, entries: VaultEntry[]) {
  for (const link of self.outgoingLinks) {
    const resolved = resolveEntry(entries, link)
    if (resolved?.path === self.path) continue
    const key = resolved?.path ?? `missing:${link.toLowerCase()}`
    const draft = draftFor(map, key, { entry: resolved ?? null, title: resolved?.title ?? wikilinkDisplay(link), target: resolved?.title ?? link })
    draft.out = true
  }
}

function addIncoming(map: Map<string, Draft>, referencedBy: ReferencedByItem[], backlinks: BacklinkItem[]) {
  for (const item of referencedBy) {
    const draft = draftFor(map, item.entry.path, { entry: item.entry, title: item.entry.title, target: item.entry.title })
    draft.in = true
    draft.labels.add(resolveInverseRelationshipLabel(item.viaKey, item.entry))
  }
  for (const item of backlinks) {
    const draft = draftFor(map, item.entry.path, { entry: item.entry, title: item.entry.title, target: item.entry.title })
    draft.in = true
  }
}

/**
 * One list for everything this page touches or is touched by: typed
 * frontmatter relationships and body wikilinks out, referenced-by and
 * backlinks in. Deduped by target; a page linked both ways shows once as ↔.
 */
export function buildConnections({
  entry,
  entries,
  frontmatter,
  referencedBy,
  backlinks,
}: {
  entry: VaultEntry
  entries: VaultEntry[]
  frontmatter: ParsedFrontmatter | null
  referencedBy: ReferencedByItem[]
  backlinks: BacklinkItem[]
}): ConnectionRow[] {
  const map = new Map<string, Draft>()
  if (frontmatter) addOutgoingTyped(map, entry, entries, frontmatter)
  addOutgoingBody(map, entry, entries)
  addIncoming(map, referencedBy, backlinks)

  return [...map.entries()]
    .map(([key, draft]) => ({
      key,
      entry: draft.entry,
      title: draft.title,
      target: draft.target,
      direction: draft.out && draft.in ? 'both' : draft.out ? 'out' : 'in',
      labels: [...draft.labels],
    }) satisfies ConnectionRow)
    .sort((a, b) => {
      // Existing pages before missing ones, then by title.
      if ((a.entry === null) !== (b.entry === null)) return a.entry === null ? 1 : -1
      return a.title.localeCompare(b.title)
    })
}

export function filterConnections(rows: ConnectionRow[], filter: ConnectionFilter): ConnectionRow[] {
  if (filter === 'all') return rows
  return rows.filter((row) => row.direction === 'both' || row.direction === filter)
}

export function countConnections(rows: ConnectionRow[]): { all: number; out: number; in: number } {
  let out = 0
  let incoming = 0
  for (const row of rows) {
    if (row.direction !== 'in') out += 1
    if (row.direction !== 'out') incoming += 1
  }
  return { all: rows.length, out, in: incoming }
}

export const CONNECTION_GLYPHS: Record<ConnectionDirection, { glyph: string; label: string }> = {
  out: { glyph: '→', label: 'Links out' },
  in: { glyph: '←', label: 'Linked here' },
  both: { glyph: '↔', label: 'Linked both ways' },
}
