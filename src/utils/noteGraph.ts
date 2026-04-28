import type { VaultEntry } from '../types'
import { resolveEntry, wikilinkTarget } from './wikilink'

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

function resolveTarget(entries: VaultEntry[], target: string): VaultEntry | undefined {
  if (!target) return undefined
  return resolveEntry(entries, target)
}

/** Builds the note graph from frontmatter relationships and body wikilinks. */
export function buildNoteGraph(entries: VaultEntry[], activePath: string | null = null): NoteGraph {
  const edges: NoteGraphEdge[] = []
  const seen = new Set<string>()
  const degree = new Map<string, number>()

  for (const entry of entries) {
    const links = [
      ...relationshipEntries(entry).map((link) => ({ ...link, kind: 'relationship' as const })),
      ...bodyLinkEntries(entry).map((link) => ({ ...link, kind: 'body-link' as const })),
    ]

    for (const link of links) {
      const target = resolveTarget(entries, link.target)
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
