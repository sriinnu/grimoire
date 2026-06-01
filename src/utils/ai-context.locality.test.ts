import { describe, expect, it } from 'vitest'
import type { VaultEntry } from '../types'
import { buildContextSnapshot } from './ai-context'

function entry(overrides: Partial<VaultEntry> = {}): VaultEntry {
  return {
    path: '/vault/Notes/test.md',
    filename: 'test.md',
    title: 'Test',
    isA: 'Note',
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
    hasH1: false,
    fileKind: 'markdown',
    ...overrides,
  }
}

function snapshotJson(prompt: string): Record<string, unknown> {
  return JSON.parse(prompt.split('```json\n')[1].split('\n```')[0])
}

describe('ai-context locality policy', () => {
  it('redacts active local-only note body, title, path, and frontmatter', () => {
    const active = entry({
      path: '/vault/Dreams/hidden.md',
      title: 'Hidden Dream',
      isA: 'Dream',
      wordCount: 12,
      properties: { local_only: true, mood: 'strange' },
    })
    const prompt = buildContextSnapshot({
      activeEntry: active,
      entries: [active],
      activeNoteContent: '---\ntitle: Hidden Dream\nlocal_only: true\n---\nsecret body',
    })
    const json = snapshotJson(prompt)
    const activeNote = json.activeNote as Record<string, unknown>

    expect(activeNote.path).toBe('[local-only path withheld]')
    expect(activeNote.title).toBe('[local-only title withheld]')
    expect(activeNote.type).toBe('Protected')
    expect(activeNote.frontmatter).toEqual({})
    expect(activeNote.locality).toEqual({ localOnly: true, badgeLabel: 'Local-only' })
    expect(activeNote.body).toContain('body omitted')
    expect(activeNote.wordCount).toBeNull()
    expect(prompt).not.toContain('secret body')
    expect(prompt).not.toContain('Hidden Dream')
    expect(prompt).toContain('Never read, summarize, export, sync, upload, or transmit')
  })

  it('omits local-only open tabs, note-list rows, and references', () => {
    const active = entry({ path: '/vault/Notes/active.md', title: 'Active' })
    const privateNote = entry({
      path: '/vault/Private/secret.md',
      title: 'Secret',
      properties: { local_only: true },
    })
    const publicNote = entry({ path: '/vault/Notes/public.md', title: 'Public' })
    const prompt = buildContextSnapshot({
      activeEntry: active,
      entries: [active, privateNote, publicNote],
      openTabs: [active, privateNote, publicNote],
      noteList: [
        { path: privateNote.path, title: privateNote.title, type: 'Note' },
        { path: publicNote.path, title: publicNote.title, type: 'Note' },
      ],
      references: [
        { path: privateNote.path, title: privateNote.title, type: 'Note' },
        { path: publicNote.path, title: publicNote.title, type: 'Note' },
      ],
    })
    const json = snapshotJson(prompt)

    expect(JSON.stringify(json)).not.toContain('Secret')
    expect(JSON.stringify(json)).toContain('Public')
    expect(json.vault).toEqual({ types: ['Note'], totalNotes: 2 })
    expect(json.localOnlyOmitted).toEqual({
      noteList: 'held-by-policy',
      referencedNotes: 'held-by-policy',
    })
    expect(json.openTabs).toEqual([{ path: publicNote.path, title: 'Public', type: 'Note', frontmatter: { type: 'Note' } }])
  })

  it('keeps protected graph neighborhoods label-free in the prompt snapshot', () => {
    const active = entry({
      path: '/vault/Dreams/hidden.md',
      title: 'Hidden Dream',
      isA: 'Dream',
    })
    const prompt = buildContextSnapshot({
      activeEntry: active,
      entries: [active],
      graphContext: {
        state: 'protected-active',
        nodes: [],
        edges: [],
        omitted: {
          protectedEdges: 2,
          protectedNodes: 1,
          truncatedEdges: 0,
          truncatedNodes: 0,
        },
        totals: {
          visibleEdges: 0,
          visibleNodes: 0,
        },
      },
    })
    const json = snapshotJson(prompt)

    expect(json.graphNeighborhood).toEqual({
      state: 'protected-active',
      omitted: {
        localOnly: 'held-by-policy',
        truncatedEdges: 0,
        truncatedNodes: 0,
      },
      totals: {
        visibleEdges: 0,
        visibleNodes: 0,
      },
    })
    expect(prompt).not.toContain('Hidden Dream')
    expect(prompt).not.toContain('/vault/Dreams/hidden.md')
  })
})
