import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useVaultBridge } from './useVaultBridge'
import type { VaultEntry } from '../types'

function makeEntry(path: string, title = 'Test'): VaultEntry {
  return { path, title, filename: path.split('/').pop()!, content: '', outgoingLinks: [], snippet: '', wordCount: 0, isA: 'Note', status: null, createdAt: null, modifiedAt: null, icon: null, tags: [] } as unknown as VaultEntry
}

function expectVaultDerivedStateReloaded(options: {
  reloadEntries: ReturnType<typeof vi.fn>
  reloadFolders: ReturnType<typeof vi.fn>
  reloadViews: ReturnType<typeof vi.fn>
}) {
  const { reloadEntries, reloadFolders, reloadViews } = options
  expect(reloadEntries).toHaveBeenCalledOnce()
  expect(reloadFolders).toHaveBeenCalledOnce()
  expect(reloadViews).toHaveBeenCalledOnce()
}

describe('useVaultBridge', () => {
  const onSelectNote = vi.fn()
  let reloadVaultSoft: ReturnType<typeof vi.fn>
  let reloadVault: ReturnType<typeof vi.fn>
  let reloadFolders: ReturnType<typeof vi.fn>
  let reloadViews: ReturnType<typeof vi.fn>
  let closeAllTabs: ReturnType<typeof vi.fn>
  let replaceActiveTab: ReturnType<typeof vi.fn>
  let hasUnsavedChanges: ReturnType<typeof vi.fn>

  beforeEach(() => {
    vi.clearAllMocks()
    reloadVaultSoft = vi.fn().mockResolvedValue([])
    reloadVault = vi.fn().mockResolvedValue([])
    reloadFolders = vi.fn()
    reloadViews = vi.fn()
    closeAllTabs = vi.fn()
    replaceActiveTab = vi.fn().mockResolvedValue(undefined)
    hasUnsavedChanges = vi.fn(() => false)
  })

  function renderBridge(
    entries: VaultEntry[] = [],
    activeTabPath: string | null = null,
    overrides: Partial<{
      hasUnsavedChanges: typeof hasUnsavedChanges
    }> = {},
  ) {
    const entriesByPath = new Map(entries.map(e => [e.path, e]))
    return renderHook(() =>
      useVaultBridge({
        entriesByPath,
        resolvedPath: '/vault',
        reloadVaultSoft,
        reloadVault,
        reloadFolders,
        reloadViews,
        closeAllTabs,
        replaceActiveTab,
        hasUnsavedChanges: overrides.hasUnsavedChanges ?? hasUnsavedChanges,
        onSelectNote,
        activeTabPath,
      }),
    )
  }

  it('opens a note by path when entry exists', () => {
    const entry = makeEntry('/vault/note.md')
    const { result } = renderBridge([entry])

    act(() => { result.current.openNoteByPath('/vault/note.md') })

    expect(onSelectNote).toHaveBeenCalledWith(entry)
    expect(reloadVaultSoft).not.toHaveBeenCalled()
  })

  it('opens a note by relative path', () => {
    const entry = makeEntry('/vault/note.md')
    const { result } = renderBridge([entry])

    act(() => { result.current.openNoteByPath('note.md') })

    expect(onSelectNote).toHaveBeenCalledWith(entry)
  })

  it('reloads vault when entry not found', async () => {
    const fresh = makeEntry('/vault/new.md')
    reloadVaultSoft.mockResolvedValue([fresh])
    const { result } = renderBridge([])

    await act(async () => { result.current.openNoteByPath('/vault/new.md') })

    expect(reloadVaultSoft).toHaveBeenCalled()
    expect(onSelectNote).toHaveBeenCalledWith(fresh)
  })

  it('handlePulseOpenNote opens existing entry', () => {
    const entry = makeEntry('/vault/pulse.md')
    const { result } = renderBridge([entry])

    act(() => { result.current.handlePulseOpenNote('pulse.md') })

    expect(onSelectNote).toHaveBeenCalledWith(entry)
  })

  it('handlePulseOpenNote does nothing for missing entry', () => {
    const { result } = renderBridge([])

    act(() => { result.current.handlePulseOpenNote('missing.md') })

    expect(onSelectNote).not.toHaveBeenCalled()
  })

  it('handleAgentFileCreated reloads and opens created note', async () => {
    const fresh = makeEntry('/vault/created.md')
    reloadVaultSoft.mockResolvedValue([fresh])
    const { result } = renderBridge([])

    await act(async () => { result.current.handleAgentFileCreated('created.md') })

    // The known path is forwarded so gitignored files are re-parsed too.
    expect(reloadVaultSoft).toHaveBeenCalledWith(['created.md'])
    expect(onSelectNote).toHaveBeenCalledWith(fresh)
  })

  it('handleAgentFileModified refreshes the active tab with fresh disk content', async () => {
    const fresh = makeEntry('/vault/active.md', 'Fresh active')
    reloadVaultSoft.mockResolvedValue([fresh])
    const { result } = renderBridge([], '/vault/active.md')

    await act(async () => { result.current.handleAgentFileModified('active.md') })

    expectVaultDerivedStateReloaded({ reloadEntries: reloadVaultSoft, reloadFolders, reloadViews })
    // The known path is forwarded so gitignored files are re-parsed too.
    expect(reloadVaultSoft).toHaveBeenCalledWith(['active.md'])
    expect(closeAllTabs).toHaveBeenCalledOnce()
    expect(replaceActiveTab).toHaveBeenCalledWith(fresh)
  })

  it('handleAgentFileModified still refreshes vault-derived UI for other notes', async () => {
    const active = makeEntry('/vault/other.md', 'Other')
    reloadVaultSoft.mockResolvedValue([active])
    const { result } = renderBridge([], '/vault/other.md')

    await act(async () => { result.current.handleAgentFileModified('active.md') })

    expectVaultDerivedStateReloaded({ reloadEntries: reloadVaultSoft, reloadFolders, reloadViews })
    expect(closeAllTabs).not.toHaveBeenCalled()
    expect(replaceActiveTab).toHaveBeenCalledWith(active)
  })

  it('keeps unsaved active note content intact while reloading agent changes', async () => {
    const fresh = makeEntry('/vault/active.md', 'Fresh active')
    reloadVaultSoft.mockResolvedValue([fresh])
    const hasUnsaved = vi.fn((path: string) => path === '/vault/active.md')
    const { result } = renderBridge([], '/vault/active.md', { hasUnsavedChanges: hasUnsaved })

    await act(async () => { result.current.handleAgentFileModified('active.md') })

    expectVaultDerivedStateReloaded({ reloadEntries: reloadVaultSoft, reloadFolders, reloadViews })
    expect(closeAllTabs).not.toHaveBeenCalled()
    expect(replaceActiveTab).not.toHaveBeenCalled()
  })

  it('handleAgentVaultChanged falls back to the hard reload for pathless bulk changes', async () => {
    const fresh = makeEntry('/vault/active.md', 'Fresh active')
    reloadVault.mockResolvedValue([fresh])
    const { result } = renderBridge([], '/vault/active.md')

    await act(async () => { result.current.handleAgentVaultChanged() })

    // Without knowing which files changed, only the full rescan stays correct
    // for gitignored files, so the pathless bulk event must not soft-reload.
    expectVaultDerivedStateReloaded({ reloadEntries: reloadVault, reloadFolders, reloadViews })
    expect(reloadVaultSoft).not.toHaveBeenCalled()
    expect(closeAllTabs).not.toHaveBeenCalled()
    expect(replaceActiveTab).toHaveBeenCalledWith(fresh)
  })

  it('keeps the tab session untouched when the soft reload aborts', async () => {
    // A transient IPC failure resolves to null — never an empty entry list.
    reloadVaultSoft.mockResolvedValue(null)
    const { result } = renderBridge([], '/vault/active.md')

    await act(async () => { result.current.handleAgentFileModified('active.md') })

    expect(closeAllTabs).not.toHaveBeenCalled()
    expect(replaceActiveTab).not.toHaveBeenCalled()
  })

  it('does not open anything when the reload behind openNoteByPath aborts', async () => {
    reloadVaultSoft.mockResolvedValue(null)
    const { result } = renderBridge([])

    await act(async () => { result.current.openNoteByPath('/vault/new.md') })

    expect(onSelectNote).not.toHaveBeenCalled()
  })
})
