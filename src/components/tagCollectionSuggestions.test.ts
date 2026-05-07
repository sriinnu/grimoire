import { describe, expect, it, vi } from 'vitest'
import { buildTagCollectionSuggestionItems } from './tagCollectionSuggestions'
import type { VaultEntry } from '../types'

function entry(overrides: Partial<VaultEntry>): VaultEntry {
  return {
    aliases: [],
    archived: false,
    belongsTo: [],
    color: null,
    createdAt: null,
    favorite: false,
    favoriteIndex: null,
    fileKind: 'markdown',
    fileSize: 0,
    filename: 'note.md',
    hasH1: true,
    icon: null,
    isA: 'Note',
    listPropertiesDisplay: [],
    modifiedAt: null,
    order: null,
    organized: false,
    outgoingLinks: [],
    path: '/vault/note.md',
    properties: {},
    relationships: {},
    relatedTo: [],
    sidebarLabel: null,
    snippet: '',
    sort: null,
    status: null,
    template: null,
    title: 'Note',
    view: null,
    visible: true,
    wordCount: 0,
    ...overrides,
  }
}

describe('buildTagCollectionSuggestionItems', () => {
  it('suggests existing tags from properties, snippets, and collection-like entries', () => {
    const insertTag = vi.fn()
    const items = buildTagCollectionSuggestionItems([
      entry({ properties: { tags: 'ai, writing' } }),
      entry({ snippet: 'rough #ai note' }),
      entry({ isA: 'Collection', title: 'Projects' }),
    ], 'a', insertTag)

    expect(items.map(item => item.title)).toEqual(expect.arrayContaining(['#ai']))
    expect(items.map(item => item.title)).not.toContain('#Projects')

    items.find(item => item.title === '#ai')?.onItemClick()
    expect(insertTag).toHaveBeenCalledWith('ai')
  })

  it('offers a create-new tag row when no exact tag matches', () => {
    const items = buildTagCollectionSuggestionItems([
      entry({ properties: { tags: 'ai' } }),
    ], 'journal', vi.fn())

    expect(items[0]).toMatchObject({
      title: '#journal',
      noteType: 'New tag',
    })
  })

  it('normalizes create-new tags to body-tag-safe text', () => {
    const insertTag = vi.fn()
    const items = buildTagCollectionSuggestionItems([], '#new research thread', insertTag)

    expect(items[0]).toMatchObject({
      title: '#new-research-thread',
      noteType: 'New tag',
    })

    items[0]?.onItemClick()
    expect(insertTag).toHaveBeenCalledWith('new-research-thread')
  })
})
