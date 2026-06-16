import { describe, expect, it } from 'vitest'
import type { VaultEntry } from '../types'
import type { NoteGraph } from './noteGraph'
import {
  filterGraphByNodeTypes,
  filterGraphEdges,
  GRAPH_CENTER_X,
  GRAPH_CENTER_Y,
  GRAPH_VIEWBOX_HEIGHT,
  GRAPH_VIEWBOX_WIDTH,
  graphTypeStats,
  layoutGraph,
  limitGraphForDisplay,
  MAX_VISIBLE_GRAPH_NODES,
  scopeGraph,
} from './graphDisplay'

function graphFixture(): NoteGraph {
  return {
    nodes: [
      { id: 'alpha', path: 'alpha.md', title: 'Alpha', type: 'Project', degree: 2, active: true },
      { id: 'beta', path: 'beta.md', title: 'Beta', type: 'Note', degree: 1, active: false },
      { id: 'gamma', path: 'gamma.md', title: 'Gamma', type: 'Note', degree: 1, active: false },
      { id: 'delta', path: 'delta.md', title: 'Delta', type: 'Note', degree: 0, active: false },
    ],
    edges: [
      { id: 'alpha-beta', source: 'alpha', target: 'beta', label: 'relatedTo', kind: 'relationship' },
      { id: 'alpha-gamma', source: 'alpha', target: 'gamma', label: 'Wikilink', kind: 'body-link' },
    ],
  }
}

function entry(overrides: Partial<VaultEntry>): VaultEntry {
  return {
    path: overrides.path ?? '/vault/note.md',
    filename: overrides.filename ?? 'note.md',
    title: overrides.title ?? 'Note',
    isA: overrides.isA ?? 'Note',
    aliases: [],
    belongsTo: [],
    relatedTo: [],
    status: null,
    archived: false,
    modifiedAt: null,
    createdAt: null,
    fileSize: 0,
    snippet: '',
    wordCount: 0,
    relationships: {},
    icon: overrides.icon ?? null,
    color: overrides.color ?? null,
    order: null,
    sidebarLabel: null,
    template: null,
    sort: null,
    view: null,
    visible: null,
    organized: false,
    favorite: false,
    favoriteIndex: null,
    listPropertiesDisplay: [],
    outgoingLinks: [],
    properties: {},
    hasH1: true,
  }
}

describe('graphDisplay', () => {
  it('scopes the graph to the active neighborhood', () => {
    const scoped = scopeGraph(graphFixture(), 'neighborhood')

    expect(scoped.nodes.map((node) => node.id)).toEqual(['alpha', 'beta', 'gamma'])
    expect(scoped.edges).toHaveLength(2)
  })

  it('filters edges without dropping visible nodes', () => {
    const filtered = filterGraphEdges(graphFixture(), 'relationship')

    expect(filtered.nodes).toHaveLength(4)
    expect(filtered.edges.map((edge) => edge.id)).toEqual(['alpha-beta'])
  })

  it('filters incoming and outgoing edges around the active node', () => {
    const incoming = filterGraphEdges(graphFixture(), 'incoming')
    const outgoing = filterGraphEdges(graphFixture(), 'outgoing')

    expect(incoming.edges).toEqual([])
    expect(outgoing.edges.map((edge) => edge.id)).toEqual(['alpha-beta', 'alpha-gamma'])
  })

  it('filters hidden node types and keeps only visible edges', () => {
    const filtered = filterGraphByNodeTypes(graphFixture(), new Set(['Note']))

    expect(filtered.nodes.map(node => node.id)).toEqual(['alpha'])
    expect(filtered.edges).toHaveLength(0)
  })

  it('counts graph node types with their colors', () => {
    const stats = graphTypeStats(graphFixture(), [
      entry({ title: 'Project', isA: 'Type', color: 'green' }),
    ])

    expect(stats.map(stat => [stat.type, stat.count])).toEqual([
      ['Note', 3],
      ['Project', 1],
    ])
    expect(stats.find(stat => stat.type === 'Project')?.color).toBe('var(--accent-green)')
  })

  it('keeps large graph rendering bounded', () => {
    const graph: NoteGraph = {
      nodes: Array.from({ length: MAX_VISIBLE_GRAPH_NODES + 12 }, (_, index) => ({
        id: `note-${index}`,
        path: `note-${index}.md`,
        title: `Note ${index}`,
        type: 'Note',
        degree: index,
        active: index === 0,
      })),
      edges: [],
    }

    expect(limitGraphForDisplay(graph).nodes).toHaveLength(MAX_VISIBLE_GRAPH_NODES)
  })

  it('keeps all large graph coordinates inside the SVG label-safe viewport', () => {
    const graph: NoteGraph = {
      nodes: Array.from({ length: MAX_VISIBLE_GRAPH_NODES }, (_, index) => ({
        id: `note-${index}`,
        path: `note-${index}.md`,
        title: `Note ${index}`,
        type: 'Note',
        degree: index,
        active: index === 0,
      })),
      edges: [],
    }

    const layout = layoutGraph(graph, [])

    for (const node of layout.nodes) {
      expect(node.x).toBeGreaterThanOrEqual(78)
      expect(node.x).toBeLessThanOrEqual(GRAPH_VIEWBOX_WIDTH - 78)
      expect(node.y).toBeGreaterThanOrEqual(78)
      expect(node.y).toBeLessThanOrEqual(GRAPH_VIEWBOX_HEIGHT - 78)
    }
  })

  it('spaces compact neighborhood nodes far enough from the active center', () => {
    const graph: NoteGraph = {
      nodes: Array.from({ length: 9 }, (_, index) => ({
        id: `note-${index}`,
        path: `note-${index}.md`,
        title: `Note ${index}`,
        type: 'Note',
        degree: index,
        active: index === 0,
      })),
      edges: [],
    }

    const layout = layoutGraph(graph, [])
    const ringDistances = layout.nodes.slice(1).map((node) =>
      Math.hypot(node.x - GRAPH_CENTER_X, node.y - GRAPH_CENTER_Y)
    )

    expect(Math.min(...ringDistances)).toBeGreaterThanOrEqual(180)
  })

  it('lays out the active node first and applies custom type color', () => {
    const layout = layoutGraph(graphFixture(), [
      entry({ title: 'Project', isA: 'Type', color: 'green' }),
    ])
    const active = layout.nodes[0]

    expect(active.id).toBe('alpha')
    expect(active.x).toBe(GRAPH_CENTER_X)
    expect(active.y).toBe(GRAPH_CENTER_Y)
    expect(active.color).toBe('var(--accent-green)')
  })
})
