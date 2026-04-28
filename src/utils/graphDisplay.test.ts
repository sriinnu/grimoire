import { describe, expect, it } from 'vitest'
import type { VaultEntry } from '../types'
import type { NoteGraph } from './noteGraph'
import {
  filterGraphEdges,
  GRAPH_CENTER_X,
  GRAPH_CENTER_Y,
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
