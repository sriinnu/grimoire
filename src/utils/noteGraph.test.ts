import { describe, expect, it } from 'vitest'
import type { VaultEntry } from '../types'
import { buildNoteGraph, filterGraphByQuery } from './noteGraph'

function entry(overrides: Partial<VaultEntry>): VaultEntry {
  return {
    path: overrides.path ?? `/vault/${overrides.filename ?? 'note.md'}`,
    filename: overrides.filename ?? 'note.md',
    title: overrides.title ?? 'Note',
    isA: overrides.isA ?? 'Note',
    aliases: overrides.aliases ?? [],
    belongsTo: [],
    relatedTo: [],
    status: null,
    archived: false,
    modifiedAt: null,
    createdAt: null,
    fileSize: 0,
    snippet: '',
    wordCount: 0,
    relationships: overrides.relationships ?? {},
    icon: null,
    color: null,
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
    outgoingLinks: overrides.outgoingLinks ?? [],
    properties: {},
    hasH1: true,
  }
}

describe('noteGraph', () => {
  it('builds edges from relationships and body wikilinks', () => {
    const project = entry({ filename: 'project.md', title: 'Project' })
    const person = entry({ filename: 'person.md', title: 'Person' })
    const note = entry({
      filename: 'note.md',
      title: 'Note',
      relationships: { Owner: ['[[Person]]'] },
      outgoingLinks: ['Project'],
    })

    const graph = buildNoteGraph([note, project, person], note.path)

    expect(graph.nodes.find((node) => node.path === note.path)?.active).toBe(true)
    expect(graph.edges).toEqual(expect.arrayContaining([
      expect.objectContaining({ source: note.path, target: person.path, kind: 'relationship', label: 'Owner' }),
      expect.objectContaining({ source: note.path, target: project.path, kind: 'body-link', label: 'Wikilink' }),
    ]))
  })

  it('resolves path-style, alias, and humanized wikilink targets through the graph index', () => {
    const source = entry({
      filename: 'source.md',
      title: 'Source',
      outgoingLinks: ['areas/deep-work', 'work-alias', 'Daily Review'],
    })
    const pathTarget = entry({
      path: '/vault/areas/deep-work.md',
      filename: 'deep-work.md',
      title: 'Deep Work',
    })
    const aliasTarget = entry({
      filename: 'alias-target.md',
      title: 'Alias Target',
      aliases: ['work-alias'],
    })
    const humanizedTarget = entry({
      filename: 'daily-review.md',
      title: 'Daily Review',
    })

    const graph = buildNoteGraph([source, pathTarget, aliasTarget, humanizedTarget])

    expect(graph.edges.map((edge) => edge.target).sort()).toEqual([
      aliasTarget.path,
      humanizedTarget.path,
      pathTarget.path,
    ].sort())
  })

  it('filters matches plus immediate neighbors', () => {
    const alpha = entry({ filename: 'alpha.md', title: 'Alpha', outgoingLinks: ['Beta'] })
    const beta = entry({ filename: 'beta.md', title: 'Beta' })
    const gamma = entry({ filename: 'gamma.md', title: 'Gamma' })

    const filtered = filterGraphByQuery(buildNoteGraph([alpha, beta, gamma]), 'alpha')

    expect(filtered.nodes.map((node) => node.title).sort()).toEqual(['Alpha', 'Beta'])
    expect(filtered.edges).toHaveLength(1)
  })
})
