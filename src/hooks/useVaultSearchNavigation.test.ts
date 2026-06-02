import { act, renderHook, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { VaultOption } from '../components/status-bar/types'
import type { SearchResult, VaultEntry } from '../types'
import { useSearchResultNavigation, useVaultSearchScopes } from './useVaultSearchNavigation'

const makeEntry = (overrides: Partial<VaultEntry> = {}): VaultEntry => ({
  path: '/active/note.md',
  filename: 'note.md',
  title: 'Active Note',
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
  ...overrides,
})

const makeSearchResult = (overrides: Partial<SearchResult> = {}): SearchResult => ({
  title: 'Search Hit',
  path: '/active/note.md',
  snippet: '',
  score: 1,
  noteType: null,
  ...overrides,
})

describe('useVaultSearchScopes', () => {
  it('keeps available vaults and prepends the active vault when it is not in the saved list', () => {
    const vaults: VaultOption[] = [
      { label: 'Work', path: '/work' },
      { label: 'Missing', path: '/missing', available: false },
      { label: 'Blank', path: '   ' },
    ]

    const { result } = renderHook(() => useVaultSearchScopes({
      activeVaultLabel: 'Current',
      allVaults: vaults,
      resolvedPath: '/current',
    }))

    expect(result.current).toEqual([
      { path: '/current', label: 'Current' },
      { path: '/work', label: 'Work' },
    ])
  })

  it('derives a label from the active path when the switcher has no label yet', () => {
    const { result } = renderHook(() => useVaultSearchScopes({
      allVaults: [],
      resolvedPath: '/Users/sriinnu/Vaults/Research',
    }))

    expect(result.current).toEqual([
      { path: '/Users/sriinnu/Vaults/Research', label: 'Research' },
    ])
  })
})

describe('useSearchResultNavigation', () => {
  it('opens active-vault results immediately', () => {
    const entry = makeEntry()
    const onOpenEntry = vi.fn()
    const onSwitchVault = vi.fn()
    const onToast = vi.fn()
    const { result } = renderHook(() => useSearchResultNavigation({
      entries: [entry],
      isLoading: false,
      onOpenEntry,
      onSwitchVault,
      onToast,
      resolvedPath: '/active',
    }))

    act(() => {
      result.current(makeSearchResult())
    })

    expect(onOpenEntry).toHaveBeenCalledWith(entry)
    expect(onSwitchVault).not.toHaveBeenCalled()
    expect(onToast).not.toHaveBeenCalled()
  })

  it('switches vaults for cross-vault results and opens after the target vault loads', async () => {
    const targetEntry = makeEntry({ path: '/work/plan.md', title: 'Work Plan' })
    const onOpenEntry = vi.fn()
    const onSwitchVault = vi.fn()
    const onToast = vi.fn()
    const { result, rerender } = renderHook(
      ({ entries, isLoading, resolvedPath }) => useSearchResultNavigation({
        entries,
        isLoading,
        onOpenEntry,
        onSwitchVault,
        onToast,
        resolvedPath,
      }),
      {
        initialProps: {
          entries: [makeEntry()],
          isLoading: false,
          resolvedPath: '/active',
        },
      },
    )

    act(() => {
      result.current(makeSearchResult({
        path: '/work/plan.md',
        vaultPath: '/work',
        vaultLabel: 'Work',
      }))
    })

    expect(onSwitchVault).toHaveBeenCalledWith('/work')
    expect(onOpenEntry).not.toHaveBeenCalled()

    rerender({
      entries: [targetEntry],
      isLoading: false,
      resolvedPath: '/work',
    })

    await waitFor(() => {
      expect(onOpenEntry).toHaveBeenCalledWith(targetEntry)
    })
    expect(onToast).not.toHaveBeenCalled()
  })

  it('shows a toast when a same-vault search result is not loaded', () => {
    const onOpenEntry = vi.fn()
    const onSwitchVault = vi.fn()
    const onToast = vi.fn()
    const { result } = renderHook(() => useSearchResultNavigation({
      entries: [],
      isLoading: false,
      onOpenEntry,
      onSwitchVault,
      onToast,
      resolvedPath: '/active',
    }))

    act(() => {
      result.current(makeSearchResult({ title: 'Missing Note' }))
    })

    expect(onOpenEntry).not.toHaveBeenCalled()
    expect(onSwitchVault).not.toHaveBeenCalled()
    expect(onToast).toHaveBeenCalledWith('Search result is not loaded in this vault: Missing Note')
  })
})
