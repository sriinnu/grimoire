import { describe, expect, it } from 'vitest'
import type { VaultEntry } from '../types'
import { buildAgentGraphContext } from './agentGraphContext'
import { buildGraphCouncilPrompt } from './graphCouncilPrompt'
import type { PositionedGraphNode } from './graphDisplay'

function entry(overrides: Partial<VaultEntry>): VaultEntry {
  return {
    path: overrides.path ?? `/vault/${overrides.filename ?? 'note.md'}`,
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

function node(overrides: Partial<PositionedGraphNode>): PositionedGraphNode {
  return {
    id: overrides.id ?? overrides.path ?? '/vault/note.md',
    path: overrides.path ?? '/vault/note.md',
    title: overrides.title ?? 'Note',
    type: overrides.type ?? 'Note',
    degree: overrides.degree ?? 1,
    active: overrides.active ?? false,
    neighborhood: overrides.neighborhood ?? true,
    color: 'var(--primary)',
    lightColor: 'var(--primary)',
    x: 100,
    y: 100,
  }
}

describe('graphCouncilPrompt', () => {
  it('builds a source-safe council prompt and references for public graph nodes', () => {
    const active = entry({ filename: 'alpha.md', title: 'Alpha', outgoingLinks: ['Beta'] })
    const beta = entry({ filename: 'beta.md', title: 'Beta', isA: 'Reference' })
    const context = buildAgentGraphContext({ activeEntry: active, entries: [active, beta] })

    const prompt = buildGraphCouncilPrompt({
      agentGraphContext: context,
      selectedEntry: beta,
      selectedNode: node({ path: beta.path, title: 'Beta', type: 'Reference', degree: 1 }),
    })

    expect(prompt.text).toContain('[[Beta]]')
    expect(prompt.text).toContain('2 visible notes')
    expect(prompt.references).toEqual([
      { path: beta.path, title: 'Beta', type: 'Reference' },
      { path: active.path, title: 'Alpha', type: 'Note' },
    ])
  })

  it('does not leak protected selected-node labels or paths into the prompt', () => {
    const publicNote = entry({ filename: 'public.md', title: 'Public Note', outgoingLinks: ['Secret Dream'] })
    const protectedDream = entry({
      filename: 'dream.md',
      title: 'Secret Dream',
      isA: 'Dream',
      properties: { locality: 'local-only' },
    })
    const context = buildAgentGraphContext({
      activeEntry: publicNote,
      entries: [publicNote, protectedDream],
    })

    const prompt = buildGraphCouncilPrompt({
      agentGraphContext: context,
      selectedEntry: protectedDream,
      selectedNode: node({ path: protectedDream.path, title: 'Secret Dream', type: 'Dream' }),
    })

    expect(prompt.references).toEqual([])
    expect(prompt.text).toContain('protected labels')
    expect(prompt.text).not.toContain('Secret Dream')
    expect(prompt.text).not.toContain('/vault/dream.md')
  })

  it('summarizes held and trimmed graph context without exposing local-only nodes', () => {
    const active = entry({ filename: 'alpha.md', title: 'Alpha', outgoingLinks: ['Beta', 'Hidden Dream'] })
    const beta = entry({ filename: 'beta.md', title: 'Beta' })
    const hidden = entry({ filename: 'dream.md', title: 'Hidden Dream', isA: 'Dream' })
    const context = buildAgentGraphContext({
      activeEntry: active,
      edgeLimit: 0,
      entries: [active, beta, hidden],
      nodeLimit: 1,
    })

    const prompt = buildGraphCouncilPrompt({
      agentGraphContext: context,
      selectedEntry: active,
      selectedNode: node({ path: active.path, title: 'Alpha', active: true }),
    })

    expect(prompt.text).toContain('held local')
    expect(prompt.text).toContain('trimmed')
    expect(prompt.text).not.toContain('Hidden Dream')
  })
})
