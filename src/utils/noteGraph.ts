import type { VaultEntry } from '../types'
import { wikilinkTarget } from './wikilink'

export type NoteGraphEdgeKind = 'relationship' | 'body-link'

/** A note node rendered in the vault relationship graph. */
export interface NoteGraphNode {
  id: string
  path: string
  title: string
  type: string
  degree: number
  active: boolean
}

/** A directed connection between two graph notes. */
export interface NoteGraphEdge {
  id: string
  source: string
  target: string
  label: string
  kind: NoteGraphEdgeKind
}

/** Immutable graph data derived from vault metadata and markdown links. */
export interface NoteGraph {
  nodes: NoteGraphNode[]
  edges: NoteGraphEdge[]
}

interface GraphTargetIndex {
  entries: VaultEntry[]
  filename: Map<string, VaultEntry>
  alias: Map<string, VaultEntry>
  title: Map<string, VaultEntry>
}

function cleanTarget(value: string): string {
  return wikilinkTarget(value).trim()
}

function addEdge(
  edges: NoteGraphEdge[],
  seen: Set<string>,
  edge: Omit<NoteGraphEdge, 'id'>,
): void {
  if (edge.source === edge.target) return

  const id = `${edge.source}->${edge.target}:${edge.kind}:${edge.label}`
  if (seen.has(id)) return

  seen.add(id)
  edges.push({ ...edge, id })
}

function relationshipEntries(entry: VaultEntry): Array<{ label: string; target: string }> {
  return Object.entries(entry.relationships ?? {}).flatMap(([label, refs]) =>
    refs.map((ref) => ({ label, target: cleanTarget(ref) })),
  )
}

function bodyLinkEntries(entry: VaultEntry): Array<{ label: string; target: string }> {
  return (entry.outgoingLinks ?? []).map((target) => ({
    label: 'Wikilink',
    target: cleanTarget(target),
  }))
}

function rememberFirst(map: Map<string, VaultEntry>, key: string, entry: VaultEntry): void {
  if (key && !map.has(key)) map.set(key, entry)
}

function buildGraphTargetIndex(entries: VaultEntry[]): GraphTargetIndex {
  const filename = new Map<string, VaultEntry>()
  const alias = new Map<string, VaultEntry>()
  const title = new Map<string, VaultEntry>()

  for (const entry of entries) {
    const stem = entry.filename.replace(/\.md$/u, '').toLowerCase()
    rememberFirst(filename, stem, entry)
    rememberFirst(title, entry.title.toLowerCase(), entry)
    for (const entryAlias of entry.aliases) {
      rememberFirst(alias, entryAlias.toLowerCase(), entry)
    }
  }

  return { entries, filename, alias, title }
}

function resolvePathTarget(index: GraphTargetIndex, normalizedTarget: string): VaultEntry | undefined {
  const suffix = `/${normalizedTarget}.md`
  return index.entries.find((entry) => entry.path.toLowerCase().endsWith(suffix))
}

function resolveTarget(index: GraphTargetIndex, target: string): VaultEntry | undefined {
  if (!target) return undefined

  const exactTarget = target.includes('|') ? target.split('|')[0] : target
  const normalizedTarget = exactTarget.toLowerCase()
  const lastSegment = exactTarget.includes('/')
    ? (exactTarget.split('/').pop() ?? exactTarget).toLowerCase()
    : normalizedTarget
  const humanizedTarget = lastSegment.replace(/-/gu, ' ')

  return (
    exactTarget.includes('/') ? resolvePathTarget(index, normalizedTarget) : undefined
  )
    ?? index.filename.get(normalizedTarget)
    ?? index.filename.get(lastSegment)
    ?? index.alias.get(normalizedTarget)
    ?? index.title.get(normalizedTarget)
    ?? index.title.get(lastSegment)
    ?? (humanizedTarget === lastSegment ? undefined : index.title.get(humanizedTarget))
}

/** Builds the note graph from frontmatter relationships and body wikilinks. */
export function buildNoteGraph(entries: VaultEntry[], activePath: string | null = null): NoteGraph {
  const edges: NoteGraphEdge[] = []
  const seen = new Set<string>()
  const degree = new Map<string, number>()
  const targetIndex = buildGraphTargetIndex(entries)

  for (const entry of entries) {
    const links = [
      ...relationshipEntries(entry).map((link) => ({ ...link, kind: 'relationship' as const })),
      ...bodyLinkEntries(entry).map((link) => ({ ...link, kind: 'body-link' as const })),
    ]

    for (const link of links) {
      const target = resolveTarget(targetIndex, link.target)
      if (!target) continue

      addEdge(edges, seen, {
        source: entry.path,
        target: target.path,
        label: link.label,
        kind: link.kind,
      })
    }
  }

  for (const edge of edges) {
    degree.set(edge.source, (degree.get(edge.source) ?? 0) + 1)
    degree.set(edge.target, (degree.get(edge.target) ?? 0) + 1)
  }

  const nodes = entries.map((entry) => ({
    id: entry.path,
    path: entry.path,
    title: entry.title,
    type: entry.isA ?? 'Note',
    degree: degree.get(entry.path) ?? 0,
    active: entry.path === activePath,
  }))

  return { nodes, edges }
}

/** Returns nodes matching the graph query plus their immediate neighbors. */
export function filterGraphByQuery(graph: NoteGraph, query: string): NoteGraph {
  const needle = query.trim().toLowerCase()
  if (!needle) return graph

  const directMatches = new Set(
    graph.nodes
      .filter((node) =>
        node.title.toLowerCase().includes(needle)
        || node.type.toLowerCase().includes(needle),
      )
      .map((node) => node.id),
  )
  const visible = new Set(directMatches)

  for (const edge of graph.edges) {
    if (directMatches.has(edge.source)) visible.add(edge.target)
    if (directMatches.has(edge.target)) visible.add(edge.source)
  }

  return {
    nodes: graph.nodes.filter((node) => visible.has(node.id)),
    edges: graph.edges.filter((edge) => visible.has(edge.source) && visible.has(edge.target)),
  }
}
