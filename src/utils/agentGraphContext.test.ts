import { describe, expect, it } from 'vitest'
import type { VaultEntry } from '../types'
import { buildAgentGraphContext } from './agentGraphContext'

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
    properties: overrides.properties ?? {},
    hasH1: true,
  }
}

describe('agentGraphContext', () => {
  it('builds a source-safe active graph neighborhood', () => {
    const active = entry({ filename: 'active.md', title: 'Active', outgoingLinks: ['Public', 'Dream'] })
    const publicNeighbor = entry({ filename: 'public.md', title: 'Public', outgoingLinks: ['Second'] })
    const secondHop = entry({ filename: 'second.md', title: 'Second' })
    const dream = entry({ filename: 'dream.md', title: 'Hidden Dream', isA: 'Dream' })

    const context = buildAgentGraphContext({
      activeEntry: active,
      entries: [active, publicNeighbor, secondHop, dream],
    })

    expect(context.state).toBe('ready')
    expect(context.nodes.map((node) => node.title)).toEqual(['Active', 'Public'])
    expect(context.edges).toEqual([
      expect.objectContaining({
        sourceTitle: 'Active',
        targetTitle: 'Public',
        kind: 'body-link',
      }),
    ])
    expect(context.omitted.protectedNodes).toBe(1)
    expect(context.omitted.protectedEdges).toBe(1)
    expect(JSON.stringify(context)).not.toContain('Hidden Dream')
  })

  it('withholds every label and path when the active note is protected', () => {
    const active = entry({ filename: 'dream.md', title: 'Hidden Dream', isA: 'Dream', outgoingLinks: ['Public'] })
    const publicNeighbor = entry({ filename: 'public.md', title: 'Public' })

    const context = buildAgentGraphContext({
      activeEntry: active,
      entries: [active, publicNeighbor],
    })

    expect(context.state).toBe('protected-active')
    expect(context.nodes).toEqual([])
    expect(context.edges).toEqual([])
    expect(context.omitted.protectedNodes).toBe(1)
    expect(JSON.stringify(context)).not.toContain('Hidden Dream')
    expect(JSON.stringify(context)).not.toContain('/vault/dream.md')
  })

  it('still protects an active note that is not present in the entry list yet', () => {
    const active = entry({ filename: 'draft-dream.md', title: 'Unsaved Dream', isA: 'Dream' })

    const context = buildAgentGraphContext({
      activeEntry: active,
      entries: [],
    })

    expect(context.state).toBe('protected-active')
    expect(JSON.stringify(context)).not.toContain('Unsaved Dream')
  })

  it('reports node and edge truncation without leaking protected neighbors', () => {
    const active = entry({
      filename: 'active.md',
      title: 'Active',
      outgoingLinks: ['One', 'Two', 'Three'],
    })
    const one = entry({ filename: 'one.md', title: 'One' })
    const two = entry({ filename: 'two.md', title: 'Two' })
    const three = entry({ filename: 'three.md', title: 'Three' })

    const context = buildAgentGraphContext({
      activeEntry: active,
      entries: [active, one, two, three],
      edgeLimit: 1,
      nodeLimit: 2,
    })

    expect(context.nodes).toHaveLength(2)
    expect(context.edges).toHaveLength(1)
    expect(context.omitted.truncatedNodes).toBe(2)
    expect(context.omitted.truncatedEdges).toBe(2)
  })
})
