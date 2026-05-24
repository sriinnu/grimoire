import { describe, expect, it } from 'vitest'
import type { VaultEntry } from '../types'
import {
  buildAskContextCapsulePreview,
  buildContextCapsulePackagePreview,
  buildContextCapsulePreview,
} from './contextCapsule'

function entry(overrides: Partial<VaultEntry> = {}): VaultEntry {
  return {
    path: '/vault/project/grimoire.md',
    filename: 'grimoire.md',
    title: 'Grimoire',
    isA: 'Project',
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
    hasH1: true,
    fileKind: 'markdown',
    ...overrides,
  }
}

describe('buildContextCapsulePreview', () => {
  it('builds a ready package from active, linked, open-tab, and list context', () => {
    const active = entry({
      outgoingLinks: ['Research'],
      relationships: { related_to: ['[[Research]]'] },
    })
    const linked = entry({
      path: '/vault/research.md',
      filename: 'research.md',
      title: 'Research',
      isA: 'Note',
    })
    const openTab = entry({
      path: '/vault/plan.md',
      filename: 'plan.md',
      title: 'Plan',
      isA: 'Plan',
    })

    const preview = buildContextCapsulePreview({
      activeEntry: active,
      entries: [active, linked, openTab],
      graphContext: {
        state: 'ready',
        nodes: [
          { active: true, degree: 1, path: active.path, title: active.title, type: 'Project' },
          { active: false, degree: 1, path: linked.path, title: linked.title, type: 'Note' },
        ],
        edges: [{
          kind: 'wikilink',
          label: 'wikilink',
          sourcePath: active.path,
          sourceTitle: active.title,
          targetPath: linked.path,
          targetTitle: linked.title,
        }],
        omitted: {
          protectedEdges: 1,
          protectedNodes: 1,
          truncatedEdges: 0,
          truncatedNodes: 0,
        },
        totals: {
          visibleEdges: 1,
          visibleNodes: 2,
        },
      },
      linkedEntries: [linked],
      openTabs: [active, openTab],
      noteList: [
        { path: active.path, title: active.title, type: 'Project' },
        { path: linked.path, title: linked.title, type: 'Note' },
      ],
    })

    expect(preview.state).toBe('ready')
    expect(preview.title).toBe('Grimoire capsule')
    expect(preview.includedNotes.map((note) => note.title)).toEqual(['Grimoire', 'Research', 'Plan'])
    expect(preview.counts).toMatchObject({
      linkedNotes: 1,
      noteListItems: 2,
      openTabs: 2,
      selectedNotes: 3,
      exclusions: 0,
    })
    expect(preview.projectMap.relationshipEdges).toBe(2)
    expect(preview.projectMap.graphNodes).toBe(2)
    expect(preview.projectMap.graphEdges).toBe(1)
    expect(preview.projectMap.graphOmitted).toBe(2)
  })

  it('withholds protected active notes without leaking title or path', () => {
    const protectedEntry = entry({
      path: '/vault/dreams/river.md',
      title: 'River Dream',
      isA: 'Dream',
    })

    const preview = buildContextCapsulePreview({
      activeEntry: protectedEntry,
      entries: [protectedEntry],
    })

    expect(preview.state).toBe('protected')
    expect(preview.title).toBe('Protected capsule')
    expect(preview.includedNotes).toEqual([])
    expect(JSON.stringify(preview)).not.toContain('River Dream')
    expect(JSON.stringify(preview)).not.toContain('/vault/dreams/river.md')
    expect(preview.exclusions).toEqual([
      { label: 'Protected active note', reason: 'Local-only' },
    ])
  })

  it('counts local-only linked notes, tabs, list rows, and filters as exclusions', () => {
    const active = entry()
    const hidden = entry({
      path: '/vault/journal/daily.md',
      filename: 'daily.md',
      title: 'Daily',
      isA: 'Journal',
    })

    const preview = buildContextCapsulePreview({
      activeEntry: active,
      entries: [active, hidden],
      linkedEntries: [hidden],
      openTabs: [hidden],
      noteList: [{ path: hidden.path, title: hidden.title, type: 'Journal' }],
      noteListFilter: { type: 'Journal', query: hidden.path },
    })

    expect(preview.state).toBe('ready')
    expect(preview.counts.exclusions).toBe(4)
    expect(preview.counts.selectedNotes).toBe(1)
    expect(JSON.stringify(preview)).not.toContain('Daily')
    expect(preview.exclusions.map((item) => item.label)).toEqual([
      'Linked local-only notes',
      'Open local-only tabs',
      'Note-list local-only rows',
      'Private note-list filter',
    ])
  })

  it('turns a dashboard ask package into an inspectable capsule', () => {
    const preview = buildAskContextCapsulePreview({
      kind: 'dashboard-ask',
      prompt: 'what needs attention?',
      references: [{ path: '/vault/projects/grimoire.md', title: 'Grimoire', type: 'Project' }],
      sourceLabels: ['Grimoire', 'Grimoire Memory'],
      memoryReferences: [{
        confidence: 'medium',
        lastSeen: '2026-05-24',
        path: '/vault/memory/grimoire.md',
        sourceLabels: ['[[Grimoire]]'],
        title: 'Grimoire Memory',
      }],
      visibleCount: 6,
      withheld: { protectedMemories: 1, protectedNotes: 2 },
    })

    expect(preview.title).toBe('Dashboard ask capsule')
    expect(preview.includedNotes.map((note) => [note.kind, note.title])).toEqual([
      ['ask-reference', 'Grimoire'],
      ['memory', 'Grimoire Memory'],
    ])
    expect(preview.counts).toMatchObject({
      noteListItems: 6,
      selectedNotes: 2,
      exclusions: 2,
    })
    expect(preview.exclusions).toEqual([
      { label: 'Dashboard local-only notes', reason: '2 withheld' },
      { label: 'Dashboard local-only memory records', reason: '1 withheld' },
    ])
  })

  it('turns a graph Council package into an inspectable capsule', () => {
    const preview = buildAskContextCapsulePreview({
      kind: 'graph-council',
      prompt: 'ask graph council',
      references: [{ path: '/vault/beta.md', title: 'Beta', type: 'Reference' }],
      sourceLabels: ['Beta'],
      memoryReferences: [],
      visibleCount: 2,
      withheld: { protectedMemories: 0, protectedNotes: 1 },
      graph: { protectedEdges: 2, truncatedEdges: 1, truncatedNodes: 0, visibleEdges: 3, visibleNodes: 2 },
    })

    expect(preview.title).toBe('Graph Council capsule')
    expect(preview.projectMap).toMatchObject({ graphEdges: 3, graphNodes: 2, graphOmitted: 4 })
    expect(preview.exclusions).toEqual([
      { label: 'Graph local-only notes', reason: '1 withheld' },
      { label: 'Graph local-only links', reason: '2 withheld' },
      { label: 'Graph trimmed items', reason: '1 withheld' },
    ])
  })
})

describe('buildContextCapsulePackagePreview', () => {
  it('creates a review-only Markdown package from visible capsule context', () => {
    const active = entry({
      title: 'Grimoire',
      outgoingLinks: ['Research'],
      relationships: { related_to: ['[[Research]]'] },
    })
    const linked = entry({
      path: '/vault/private/daily.md',
      title: 'Daily',
      isA: 'Journal',
    })
    const visible = entry({
      path: '/vault/research.md',
      title: 'Research',
      isA: 'Note',
    })
    const preview = buildContextCapsulePreview({
      activeEntry: active,
      entries: [active, linked, visible],
      linkedEntries: [visible, linked],
      noteList: [{ path: linked.path, title: linked.title, type: 'Journal' }],
    })

    const pack = buildContextCapsulePackagePreview(preview)

    expect(pack.title).toBe('Context Capsule Package')
    expect(pack.protectedContext).toBe(false)
    expect(pack.markdown).toContain('# Context Capsule Package')
    expect(pack.markdown).toContain('Source 1: active / Project / Grimoire')
    expect(pack.markdown).toContain('Source 2: linked / Note / Research')
    expect(pack.markdown).toContain('## Graph Neighborhood')
    expect(pack.markdown).toContain('Source-safe graph notes: 0')
    expect(pack.markdown).toContain('Linked local-only notes: 1 withheld')
    expect(pack.markdown).toContain('Re-check Locality Firewall before agent handoff')
    expect(pack.markdown).not.toContain('Daily')
    expect(pack.markdown).not.toContain('/vault/private')
  })

  it('keeps protected active capsule packages free of protected labels', () => {
    const protectedEntry = entry({
      path: '/vault/dreams/river.md',
      title: 'River Dream',
      isA: 'Dream',
    })
    const preview = buildContextCapsulePreview({
      activeEntry: protectedEntry,
      entries: [protectedEntry],
    })

    const pack = buildContextCapsulePackagePreview(preview)

    expect(pack.title).toBe('Protected Context Capsule')
    expect(pack.protectedContext).toBe(true)
    expect(pack.markdown).toContain('Protected active context stayed local')
    expect(pack.markdown).toContain('- None')
    expect(pack.markdown).not.toContain('River Dream')
    expect(pack.markdown).not.toContain('/vault/dreams/river.md')
  })
})
