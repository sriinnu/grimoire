import { describe, expect, it } from 'vitest'
import type { VaultEntry } from '../types'
import { buildAskContextPackage, buildGraphAskContextPackage } from './askContextPackage'

function entry(path: string, title: string, overrides: Partial<VaultEntry> = {}): VaultEntry {
  return {
    path,
    filename: path.split('/').pop() ?? 'note.md',
    title,
    isA: 'Note',
    aliases: [],
    belongsTo: [],
    relatedTo: [],
    status: null,
    archived: false,
    modifiedAt: 1,
    createdAt: 1,
    fileSize: 0,
    snippet: '',
    wordCount: 0,
    relationships: {},
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
    outgoingLinks: [],
    properties: {},
    hasH1: false,
    fileKind: 'markdown',
    ...overrides,
  }
}

describe('askContextPackage', () => {
  it('builds one shared dashboard ask package from public notes', () => {
    const publicProject = entry('/vault/projects/public.md', 'Public Project', {
      isA: 'Project',
      modifiedAt: 20,
    })
    const memory = entry('/vault/memory/public-memory.md', 'Public Memory', {
      isA: 'Memory',
      properties: {
        source_note: '[[Public Project]]',
        confidence: 'medium',
        last_seen: '2026-05-24',
      },
    })

    const contextPackage = buildAskContextPackage({
      entries: [publicProject, memory],
      prompt: 'what needs attention?',
    })

    expect(contextPackage).toMatchObject({
      kind: 'dashboard-ask',
      prompt: 'what needs attention?',
      references: [{ title: 'Public Project', path: '/vault/projects/public.md', type: 'Project' }],
      sourceLabels: ['Public Project'],
      visibleCount: 1,
      withheld: { protectedMemories: 1, protectedNotes: 0 },
    })
    expect(contextPackage.memoryReferences).toEqual([])
    expect(JSON.stringify(contextPackage)).not.toContain('Public Memory')
  })

  it('counts local-only notes and memories without leaking their labels or paths', () => {
    const publicProject = entry('/vault/projects/public.md', 'Public Project', {
      isA: 'Project',
      modifiedAt: 20,
    })
    const protectedDream = entry('/vault/dreams/river.md', 'River Dream', {
      isA: 'Dream',
      modifiedAt: 30,
    })
    const protectedMemory = entry('/vault/private/secret-memory.md', 'Secret Memory', {
      isA: 'Memory',
      properties: {
        locality: 'local',
        source_note: '[[Public Project]]',
      },
    })

    const contextPackage = buildAskContextPackage({
      entries: [publicProject, protectedDream, protectedMemory],
      prompt: 'summarize public work',
    })

    expect(contextPackage.references).toEqual([{ title: 'Public Project', path: '/vault/projects/public.md', type: 'Project' }])
    expect(contextPackage.memoryReferences).toEqual([])
    expect(contextPackage.withheld).toEqual({ protectedMemories: 1, protectedNotes: 1 })
    expect(JSON.stringify(contextPackage)).not.toContain('River Dream')
    expect(JSON.stringify(contextPackage)).not.toContain('secret-memory')
    expect(JSON.stringify(contextPackage)).not.toContain('Secret Memory')
  })

  it('builds graph Council packages without protected labels or paths', () => {
    const contextPackage = buildGraphAskContextPackage({
      prompt: 'ask the council',
      selectedReference: { path: '/vault/beta.md', title: 'Beta', type: 'Reference' },
      agentGraphContext: {
        edges: [{
          kind: 'body-link',
          label: 'Wikilink',
          sourcePath: '/vault/beta.md',
          sourceTitle: 'Beta',
          targetPath: '/vault/delta.md',
          targetTitle: 'Delta',
        }],
        nodes: [
          { active: true, degree: 2, path: '/vault/beta.md', title: 'Beta', type: 'Reference' },
          { active: false, degree: 1, path: '/vault/delta.md', title: 'Delta', type: 'Reference' },
        ],
        omitted: { protectedEdges: 1, protectedNodes: 1, truncatedEdges: 0, truncatedNodes: 0 },
        state: 'ready',
        totals: { visibleEdges: 2, visibleNodes: 2 },
      },
    })

    expect(contextPackage).toMatchObject({
      kind: 'graph-council',
      references: [
        { path: '/vault/beta.md', title: 'Beta', type: 'Reference' },
        { path: '/vault/delta.md', title: 'Delta', type: 'Reference' },
      ],
      withheld: { protectedMemories: 0, protectedNotes: 1 },
      graph: {
        edges: [{ kind: 'body-link', label: 'Wikilink', sourceTitle: 'Beta', targetTitle: 'Delta' }],
        protectedEdges: 1,
        visibleEdges: 1,
        visibleNodes: 2,
      },
    })
    expect(JSON.stringify(contextPackage)).not.toContain('Secret')
  })

  it('keeps duplicate graph source labels distinct by path', () => {
    const contextPackage = buildGraphAskContextPackage({
      prompt: 'ask the council',
      selectedReference: { path: '/vault/projects/index.md', title: 'Index', type: 'Note' },
      agentGraphContext: {
        edges: [{
          kind: 'body-link',
          label: 'Wikilink',
          sourcePath: '/vault/projects/index.md',
          sourceTitle: 'Index',
          targetPath: '/vault/archive/index.md',
          targetTitle: 'Index',
        }],
        nodes: [
          { active: true, degree: 1, path: '/vault/projects/index.md', title: 'Index', type: 'Note' },
          { active: false, degree: 1, path: '/vault/archive/index.md', title: 'Index', type: 'Note' },
        ],
        omitted: { protectedEdges: 0, protectedNodes: 0, truncatedEdges: 0, truncatedNodes: 0 },
        state: 'ready',
        totals: { visibleEdges: 1, visibleNodes: 2 },
      },
    })

    expect(contextPackage.sourceLabels).toEqual([
      'Index - projects/index.md',
      'Index - archive/index.md',
    ])
    expect(contextPackage.graph?.edges).toEqual([{
      kind: 'body-link',
      label: 'Wikilink',
      sourceTitle: 'Index - projects/index.md',
      targetTitle: 'Index - archive/index.md',
    }])
    expect(contextPackage.references).toHaveLength(2)
  })
})
