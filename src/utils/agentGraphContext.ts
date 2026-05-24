import type { VaultEntry } from '../types'
import { resolveEntryLocalityPolicy } from '../lib/localityPolicy'
import { buildNoteGraph, type NoteGraph } from './noteGraph'

/** Source-safe graph node exposed to agent previews. */
export interface AgentGraphNode {
  active: boolean
  degree: number
  path: string
  title: string
  type: string
}

/** Source-safe graph edge exposed to agent previews. */
export interface AgentGraphEdge {
  kind: NoteGraph['edges'][number]['kind']
  label: string
  sourcePath: string
  sourceTitle: string
  targetPath: string
  targetTitle: string
}

/** Redacted graph neighborhood for an inspectable agent handoff. */
export interface AgentGraphContext {
  edges: AgentGraphEdge[]
  omitted: {
    protectedEdges: number
    protectedNodes: number
    truncatedEdges: number
    truncatedNodes: number
  }
  nodes: AgentGraphNode[]
  state: 'empty' | 'protected-active' | 'ready'
  totals: {
    visibleEdges: number
    visibleNodes: number
  }
}

interface AgentGraphContextParams {
  activeEntry?: VaultEntry | null
  edgeLimit?: number
  entries: VaultEntry[]
  graph?: NoteGraph
  nodeLimit?: number
}

const DEFAULT_NODE_LIMIT = 12
const DEFAULT_EDGE_LIMIT = 18

/** Builds a source-safe graph neighborhood for agent/capsule handoff previews. */
export function buildAgentGraphContext({
  activeEntry,
  edgeLimit = DEFAULT_EDGE_LIMIT,
  entries,
  graph: providedGraph,
  nodeLimit = DEFAULT_NODE_LIMIT,
}: AgentGraphContextParams): AgentGraphContext {
  if (!activeEntry) return emptyGraphContext()

  const graphEntries = entries.some((entry) => entry.path === activeEntry.path)
    ? entries
    : [activeEntry, ...entries]
  const graph = markGraphPackageRoot(
    providedGraph ?? buildNoteGraph(graphEntries, activeEntry.path),
    activeEntry.path,
  )
  const protectedPaths = protectedEntryPaths(graphEntries)
  const activeProtected = protectedPaths.has(activeEntry.path)
  const protectedNodeCount = graph.nodes.filter((node) => protectedPaths.has(node.path)).length
  const visibleGraph = filterProtectedGraph(graph, protectedPaths)
  const protectedEdges = graph.edges.length - visibleGraph.edges.length

  if (activeProtected) {
    return {
      ...emptyGraphContext(),
      state: 'protected-active',
      omitted: {
        protectedEdges,
        protectedNodes: protectedNodeCount,
        truncatedEdges: 0,
        truncatedNodes: 0,
      },
    }
  }

  const neighborhoodIds = visibleNeighborhoodIds(visibleGraph, activeEntry.path)
  const neighborhoodNodes = visibleGraph.nodes.filter((node) => neighborhoodIds.has(node.id))
  const neighborhoodEdges = visibleGraph.edges.filter((edge) => (
    neighborhoodIds.has(edge.source) && neighborhoodIds.has(edge.target)
  ))
  const sortedNodes = sortAgentGraphNodes(neighborhoodNodes).slice(0, nodeLimit)
  const shownIds = new Set(sortedNodes.map((node) => node.id))
  const sortedEdges = neighborhoodEdges
    .filter((edge) => shownIds.has(edge.source) && shownIds.has(edge.target))
    .slice(0, edgeLimit)
  const titleByPath = new Map(graphEntries.map((entry) => [entry.path, entry.title]))

  return {
    edges: sortedEdges.map((edge) => ({
      kind: edge.kind,
      label: edge.label,
      sourcePath: edge.source,
      sourceTitle: titleByPath.get(edge.source) ?? edge.source,
      targetPath: edge.target,
      targetTitle: titleByPath.get(edge.target) ?? edge.target,
    })),
    omitted: {
      protectedEdges,
      protectedNodes: protectedNodeCount,
      truncatedEdges: Math.max(0, neighborhoodEdges.length - sortedEdges.length),
      truncatedNodes: Math.max(0, neighborhoodNodes.length - sortedNodes.length),
    },
    nodes: sortedNodes.map((node) => ({
      active: node.active,
      degree: node.degree,
      path: node.path,
      title: node.title,
      type: node.type,
    })),
    state: 'ready',
    totals: {
      visibleEdges: visibleGraph.edges.length,
      visibleNodes: visibleGraph.nodes.length,
    },
  }
}

function emptyGraphContext(): AgentGraphContext {
  return {
    edges: [],
    omitted: {
      protectedEdges: 0,
      protectedNodes: 0,
      truncatedEdges: 0,
      truncatedNodes: 0,
    },
    nodes: [],
    state: 'empty',
    totals: {
      visibleEdges: 0,
      visibleNodes: 0,
    },
  }
}

function protectedEntryPaths(entries: VaultEntry[]): Set<string> {
  return new Set(
    entries
      .filter((entry) => resolveEntryLocalityPolicy(entry).localOnly)
      .map((entry) => entry.path),
  )
}

function filterProtectedGraph(graph: NoteGraph, protectedPaths: Set<string>): NoteGraph {
  return {
    nodes: graph.nodes.filter((node) => !protectedPaths.has(node.id)),
    edges: graph.edges.filter((edge) => !protectedPaths.has(edge.source) && !protectedPaths.has(edge.target)),
  }
}

function markGraphPackageRoot(graph: NoteGraph, activePath: string): NoteGraph {
  return {
    edges: graph.edges,
    nodes: graph.nodes.map((node) => ({ ...node, active: node.path === activePath })),
  }
}

function visibleNeighborhoodIds(graph: NoteGraph, activePath: string): Set<string> {
  const ids = new Set<string>([activePath])
  for (const edge of graph.edges) {
    if (edge.source === activePath) ids.add(edge.target)
    if (edge.target === activePath) ids.add(edge.source)
  }
  return ids
}

function sortAgentGraphNodes(nodes: NoteGraph['nodes']): NoteGraph['nodes'] {
  return [...nodes].sort((left, right) => {
    if (left.active !== right.active) return left.active ? -1 : 1
    if (left.degree !== right.degree) return right.degree - left.degree
    return left.title.localeCompare(right.title)
  })
}
