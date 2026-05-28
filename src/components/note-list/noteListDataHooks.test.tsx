import { renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { ModifiedFile, VaultEntry, ViewFile } from '../../types'
import { loadSortPreferences, saveSortPreferences } from '../../utils/noteListSorting'
import { useChangeStatusResolver, useNoteListData } from './noteListDataHooks'
import { useNoteListSort } from './noteListSortHooks'

const localStorageMock = (() => {
  let store: Record<string, string> = {}
  return {
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => { store[key] = value }),
    removeItem: vi.fn((key: string) => { delete store[key] }),
    clear: vi.fn(() => { store = {} }),
  }
})()

vi.stubGlobal('localStorage', localStorageMock)

function makeEntry(overrides: Partial<VaultEntry> = {}): VaultEntry {
  return {
    path: '/vault/note/a.md',
    filename: 'a.md',
    title: 'Alpha',
    isA: 'Note',
    aliases: [],
    belongsTo: [],
    relatedTo: [],
    status: null,
    archived: false,
    modifiedAt: 1,
    createdAt: 1,
    fileSize: 100,
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

describe('note list data hooks', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorageMock.clear()
  })

  it('uses shared prefiltered entries for sorted note-list data', () => {
    const alpha = makeEntry({ path: '/vault/note/a.md', filename: 'a.md', title: 'Alpha' })
    const beta = makeEntry({ path: '/vault/note/b.md', filename: 'b.md', title: 'Beta' })

    const { result } = renderHook(() => useNoteListData({
      entries: [alpha, beta],
      prefilteredEntries: [beta],
      selection: { kind: 'filter', filter: 'all' },
      query: '',
      listSort: 'title',
      listDirection: 'asc',
      modifiedPathSet: new Set<string>(),
      modifiedSuffixes: [],
    }))

    expect(result.current.searched.map((entry) => entry.title)).toEqual(['Beta'])
  })

  it('derives sortable properties from shared prefiltered entries only', () => {
    const alpha = makeEntry({
      path: '/vault/note/a.md',
      filename: 'a.md',
      properties: { priority: 'high' },
      title: 'Alpha',
    })
    const beta = makeEntry({
      path: '/vault/note/b.md',
      filename: 'b.md',
      properties: { owner: 'sriinnu' },
      title: 'Beta',
    })

    const { result } = renderHook(() => useNoteListSort({
      entries: [alpha, beta],
      prefilteredEntries: [beta],
      selection: { kind: 'filter', filter: 'all' },
      modifiedPathSet: new Set<string>(),
      modifiedSuffixes: [],
    }))

    expect(result.current.customProperties).toEqual(['owner'])
  })

  it('does not migrate or clear legacy list sorting without type persistence', async () => {
    const typeDocument = makeEntry({
      path: '/vault/types/project.md',
      filename: 'project.md',
      isA: 'Type',
      sort: null,
      title: 'Project',
    })
    const onUpdateViewDefinition = vi.fn()
    const view: ViewFile = {
      filename: 'focus.view',
      definition: { name: 'Focus', icon: null, color: null, filters: { all: [] }, sort: null },
    }

    saveSortPreferences({ __list__: { option: 'title', direction: 'asc' } })
    renderHook(() => useNoteListSort({
      entries: [typeDocument],
      selection: { kind: 'sectionGroup', label: 'Projects', type: 'Project' },
      modifiedPathSet: new Set<string>(),
      modifiedSuffixes: [],
      onUpdateViewDefinition,
      views: [view],
    }))

    await waitFor(() => {
      expect(loadSortPreferences().__list__).toEqual({ option: 'title', direction: 'asc' })
    })
    expect(onUpdateViewDefinition).not.toHaveBeenCalled()
  })

  it('does not guess change status from ambiguous duplicate filenames', () => {
    const modifiedFiles: ModifiedFile[] = [
      { path: '/vault/alpha/index.md', relativePath: 'alpha/index.md', status: 'modified' },
      { path: '/vault/beta/index.md', relativePath: 'beta/index.md', status: 'deleted' },
    ]

    const { result } = renderHook(() => useChangeStatusResolver(true, modifiedFiles))

    expect(result.current('/mirror/alpha/index.md')).toBe('modified')
    expect(result.current('/mirror/beta/index.md')).toBe('deleted')
    expect(result.current('/mirror/unknown/index.md')).toBeUndefined()
  })
})
