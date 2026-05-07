import type { VaultEntry } from '../types'
import type { NoteGraph, NoteGraphEdgeKind } from './noteGraph'
import { buildTypeEntryMap, getTypeColor, getTypeLightColor } from './typeColors'

export type GraphScope = 'neighborhood' | 'vault'
export type GraphEdgeFilter = 'all' | NoteGraphEdgeKind | 'incoming' | 'outgoing'

export interface PositionedGraphNode {
  id: string
  path: string
  title: string
  type: string
  degree: number
  active: boolean
  neighborhood: boolean
  color: string
  lightColor: string
  x: number
  y: number
}

export interface GraphLayout {
  nodes: PositionedGraphNode[]
  edges: NoteGraph['edges']
}

export interface GraphTypeStat {
  color: string
  count: number
  lightColor: string
  type: string
}

export const GRAPH_VIEWBOX_WIDTH = 1000
export const GRAPH_VIEWBOX_HEIGHT = 620
export const GRAPH_CENTER_X = GRAPH_VIEWBOX_WIDTH / 2
export const GRAPH_CENTER_Y = GRAPH_VIEWBOX_HEIGHT / 2
export const MAX_VISIBLE_GRAPH_NODES = 180

function sortNodesForLayout(graph: NoteGraph): NoteGraph['nodes'] {
  return [...graph.nodes].sort((a, b) => {
    if (a.active !== b.active) return a.active ? -1 : 1
    if (a.degree !== b.degree) return b.degree - a.degree
    return a.title.localeCompare(b.title)
  })
}

function activeNeighborhood(graph: NoteGraph): Set<string> {
  const active = graph.nodes.find((node) => node.active)
  if (!active) return new Set()

  const ids = new Set([active.id])
  for (const edge of graph.edges) {
    if (edge.source === active.id) ids.add(edge.target)
    if (edge.target === active.id) ids.add(edge.source)
  }
  return ids
}

function ringPosition(index: number, total: number): Pick<PositionedGraphNode, 'x' | 'y'> {
  if (index === 0) return { x: GRAPH_CENTER_X, y: GRAPH_CENTER_Y }

  let ringStart = 1
  let ringIndex = 0
  let capacity = 12
  while (index >= ringStart + capacity) {
    ringStart += capacity
    ringIndex += 1
    capacity = 12 + ringIndex * 8
  }

  const position = index - ringStart
  const nodesInRing = Math.max(1, Math.min(capacity, total - ringStart))
  const offset = (-Math.PI / 2) + (ringIndex % 2 === 0 ? 0 : Math.PI / nodesInRing)
  const angle = offset + (position / nodesInRing) * Math.PI * 2
  const radius = 118 + ringIndex * 104

  return {
    x: GRAPH_CENTER_X + Math.cos(angle) * radius,
    y: GRAPH_CENTER_Y + Math.sin(angle) * radius,
  }
}

/** Returns the active note plus its directly connected notes for local graph focus. */
export function scopeGraph(graph: NoteGraph, scope: GraphScope): NoteGraph {
  if (scope === 'vault') return graph

  const visible = activeNeighborhood(graph)
  if (visible.size === 0) return graph

  return {
    nodes: graph.nodes.filter((node) => visible.has(node.id)),
    edges: graph.edges.filter((edge) => visible.has(edge.source) && visible.has(edge.target)),
  }
}

/** Caps huge graphs to the most connected and active-adjacent notes for SVG rendering. */
export function limitGraphForDisplay(graph: NoteGraph): NoteGraph {
  if (graph.nodes.length <= MAX_VISIBLE_GRAPH_NODES) return graph

  const neighborhood = activeNeighborhood(graph)
  const visibleIds = new Set(
    [...graph.nodes]
      .sort((a, b) => {
        if (a.active !== b.active) return a.active ? -1 : 1
        if (neighborhood.has(a.id) !== neighborhood.has(b.id)) return neighborhood.has(a.id) ? -1 : 1
        if (a.degree !== b.degree) return b.degree - a.degree
        return a.title.localeCompare(b.title)
      })
      .slice(0, MAX_VISIBLE_GRAPH_NODES)
      .map((node) => node.id),
  )

  return {
    nodes: graph.nodes.filter((node) => visibleIds.has(node.id)),
    edges: graph.edges.filter((edge) => visibleIds.has(edge.source) && visibleIds.has(edge.target)),
  }
}

/** Filters rendered graph edges while preserving the current visible node set. */
export function filterGraphEdges(graph: NoteGraph, filter: GraphEdgeFilter): NoteGraph {
  if (filter === 'all') return graph
  if (filter === 'incoming' || filter === 'outgoing') {
    const active = graph.nodes.find((node) => node.active)
    if (!active) return graph
    const edges = graph.edges.filter((edge) => (
      filter === 'incoming' ? edge.target === active.id : edge.source === active.id
    ))
    return { nodes: graph.nodes, edges }
  }
  return { nodes: graph.nodes, edges: graph.edges.filter((edge) => edge.kind === filter) }
}

/** Filters nodes and edges by hidden note types. */
export function filterGraphByNodeTypes(graph: NoteGraph, hiddenTypes: ReadonlySet<string>): NoteGraph {
  if (hiddenTypes.size === 0) return graph
  const visibleIds = new Set(
    graph.nodes
      .filter(node => !hiddenTypes.has(node.type))
      .map(node => node.id),
  )
  return {
    nodes: graph.nodes.filter(node => visibleIds.has(node.id)),
    edges: graph.edges.filter(edge => visibleIds.has(edge.source) && visibleIds.has(edge.target)),
  }
}

/** Counts relationship and wikilink edges for graph controls and legends. */
export function edgeStats(graph: NoteGraph): { relationships: number; wikilinks: number } {
  return graph.edges.reduce(
    (stats, edge) => {
      if (edge.kind === 'relationship') stats.relationships += 1
      if (edge.kind === 'body-link') stats.wikilinks += 1
      return stats
    },
    { relationships: 0, wikilinks: 0 },
  )
}

/** Counts visible nodes by type and attaches their graph colors. */
export function graphTypeStats(graph: NoteGraph, entries: VaultEntry[]): GraphTypeStat[] {
  const typeEntryMap = buildTypeEntryMap(entries)
  const counts = new Map<string, number>()
  for (const node of graph.nodes) {
    counts.set(node.type, (counts.get(node.type) ?? 0) + 1)
  }
  return Array.from(counts, ([type, count]) => {
    const typeEntry = typeEntryMap[type] ?? typeEntryMap[type.toLowerCase()]
    return {
      color: getTypeColor(type, typeEntry?.color),
      count,
      lightColor: getTypeLightColor(type, typeEntry?.color),
      type,
    }
  }).sort((left, right) => right.count - left.count || left.type.localeCompare(right.type))
}

/** Produces deterministic radial coordinates and type-aware colors for graph nodes. */
export function layoutGraph(graph: NoteGraph, entries: VaultEntry[]): GraphLayout {
  const neighborhood = activeNeighborhood(graph)
  const typeEntryMap = buildTypeEntryMap(entries)
  const nodes = sortNodesForLayout(graph).map((node, index) => {
    const typeEntry = typeEntryMap[node.type] ?? typeEntryMap[node.type.toLowerCase()]
    return {
      ...node,
      ...ringPosition(index, graph.nodes.length),
      neighborhood: neighborhood.has(node.id),
      color: getTypeColor(node.type, typeEntry?.color),
      lightColor: getTypeLightColor(node.type, typeEntry?.color),
    }
  })

  return { nodes, edges: graph.edges }
}

/** Shortens SVG labels without changing the underlying note title. */
export function truncateGraphLabel(label: string): string {
  return label.length > 22 ? `${label.slice(0, 21)}...` : label
}
