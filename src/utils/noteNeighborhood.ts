import type { VaultEntry } from '../types'
import { buildNoteGraphCached, type NoteGraphEdgeKind } from './noteGraph'

/** One direct neighbor of the active note, ready for the ambient map. */
export interface NeighborhoodLink {
  path: string
  title: string
  type: string
  kind: NoteGraphEdgeKind
  label: string
  degree: number
  mutual: boolean
}

/** The active note's one-hop neighborhood, split by direction. */
export interface NoteNeighborhood {
  incoming: NeighborhoodLink[]
  outgoing: NeighborhoodLink[]
  incomingOverflow: number
  outgoingOverflow: number
  total: number
}

export const NEIGHBORHOOD_SIDE_LIMIT = 6

function upgradeLink(existing: NeighborhoodLink | undefined, next: NeighborhoodLink): NeighborhoodLink {
  if (!existing) return next
  // Frontmatter relationships explain the connection; a plain wikilink does not.
  if (existing.kind === 'body-link' && next.kind === 'relationship') return { ...next, mutual: existing.mutual }
  return existing
}

function rankLinks(links: Map<string, NeighborhoodLink>): NeighborhoodLink[] {
  return [...links.values()].sort((a, b) => b.degree - a.degree || a.title.localeCompare(b.title))
}

/**
 * Derives the active note's direct neighborhood from document truth only:
 * resolved wikilinks and frontmatter relationships. Mutual connections live in
 * the outgoing column so "Linked here" stays purely other pages pointing in.
 */
export function buildNoteNeighborhood(entries: VaultEntry[], activePath: string | null): NoteNeighborhood {
  const empty: NoteNeighborhood = { incoming: [], outgoing: [], incomingOverflow: 0, outgoingOverflow: 0, total: 0 }
  if (!activePath) return empty

  const graph = buildNoteGraphCached(entries)
  const nodeById = new Map(graph.nodes.map((node) => [node.id, node]))
  if (!nodeById.has(activePath)) return empty

  const incoming = new Map<string, NeighborhoodLink>()
  const outgoing = new Map<string, NeighborhoodLink>()

  for (const edge of graph.edges) {
    const neighborId = edge.source === activePath ? edge.target : edge.target === activePath ? edge.source : null
    if (!neighborId) continue
    const node = nodeById.get(neighborId)
    if (!node) continue

    const link: NeighborhoodLink = {
      path: node.path,
      title: node.title,
      type: node.type,
      kind: edge.kind,
      label: edge.label,
      degree: node.degree,
      mutual: false,
    }
    const side = edge.source === activePath ? outgoing : incoming
    side.set(neighborId, upgradeLink(side.get(neighborId), link))
  }

  for (const [id, link] of outgoing) {
    if (incoming.has(id)) {
      outgoing.set(id, { ...link, mutual: true })
      incoming.delete(id)
    }
  }

  const rankedIncoming = rankLinks(incoming)
  const rankedOutgoing = rankLinks(outgoing)

  return {
    incoming: rankedIncoming.slice(0, NEIGHBORHOOD_SIDE_LIMIT),
    outgoing: rankedOutgoing.slice(0, NEIGHBORHOOD_SIDE_LIMIT),
    incomingOverflow: Math.max(0, rankedIncoming.length - NEIGHBORHOOD_SIDE_LIMIT),
    outgoingOverflow: Math.max(0, rankedOutgoing.length - NEIGHBORHOOD_SIDE_LIMIT),
    total: rankedIncoming.length + rankedOutgoing.length,
  }
}
