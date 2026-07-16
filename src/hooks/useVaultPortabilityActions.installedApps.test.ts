import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useVaultPortabilityActions } from './useVaultPortabilityActions'
import type { BearDatabaseImportSummary, DiscoveredApp } from '../utils/appStoreImport'

const BEAR_STORE_PATH = '/Users/sri/Library/Group Containers/9K33E3U3T4.net.shinyfrog.bear/Application Data/database.sqlite'

const bearWithStore: DiscoveredApp = {
  id: 'bear',
  name: 'Bear',
  installed: true,
  store_found: true,
  store_path: BEAR_STORE_PATH,
  support: 'full',
}

function bearSummary(dryRun: boolean): BearDatabaseImportSummary {
  return {
    source_store: BEAR_STORE_PATH,
    imported_root: '/vault/imports/bear-database',
    report_path: dryRun ? null : '/vault/imports/bear-database/import-report.md',
    notes_imported: 3,
    skipped_trashed: 1,
    skipped_encrypted: 2,
    failed_notes: 0,
    sample_titles: ['Daily Plan', 'Reading Notes', 'Untitled'],
    dry_run: dryRun,
  }
}

const appStoreMocks = vi.hoisted(() => ({
  actualDiscover: undefined as undefined | (() => Promise<DiscoveredApp[]>),
  discoverImportableApps: vi.fn<() => Promise<DiscoveredApp[]>>(),
  importBearDatabase: vi.fn(),
}))

vi.mock('../utils/appStoreImport', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../utils/appStoreImport')>()
  appStoreMocks.actualDiscover = actual.discoverImportableApps
  return {
    ...actual,
    discoverImportableApps: appStoreMocks.discoverImportableApps,
    importBearDatabase: appStoreMocks.importBearDatabase,
  }
})

function renderActions(resolvedPath = '/vault') {
  const reloadVault = vi.fn(() => Promise.resolve())
  const reloadFolders = vi.fn(() => Promise.resolve())
  const loadModifiedFiles = vi.fn(() => Promise.resolve())
  const setToastMessage = vi.fn()
  const hook = renderHook(() => useVaultPortabilityActions({
    resolvedPath,
    reloadVault,
    reloadFolders,
    loadModifiedFiles,
    setToastMessage,
  }))
  return { ...hook, loadModifiedFiles, reloadFolders, reloadVault, setToastMessage }
}

describe('useVaultPortabilityActions installed app imports', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Default to the real discovery path so the mock-Tauri fallback stays covered.
    appStoreMocks.discoverImportableApps.mockImplementation(() => appStoreMocks.actualDiscover!())
    appStoreMocks.importBearDatabase.mockResolvedValue(bearSummary(true))
  })

  it('falls back to mock discovery (both apps absent) outside the Tauri runtime', async () => {
    const { result } = renderActions()

    await waitFor(() => expect(result.current.installedApps).toHaveLength(2))

    const ids = result.current.installedApps.map((app) => app.id)
    expect(ids).toEqual(['bear', 'apple-notes'])
    expect(result.current.installedApps.every((app) => !app.installed && !app.store_found)).toBe(true)
  })

  it('refuses a Bear database preview when no store was discovered', async () => {
    const { result, setToastMessage } = renderActions()
    await waitFor(() => expect(result.current.installedApps).toHaveLength(2))

    act(() => result.current.handlePreviewBearDatabase())

    await waitFor(() => expect(setToastMessage).toHaveBeenLastCalledWith('Bear database not found on this Mac'))
    expect(appStoreMocks.importBearDatabase).not.toHaveBeenCalled()
  })

  it('previews the Bear database as a dry run without reloading the vault', async () => {
    appStoreMocks.discoverImportableApps.mockResolvedValue([bearWithStore])
    const { result, reloadVault, setToastMessage } = renderActions()
    await waitFor(() => expect(result.current.installedApps).toHaveLength(1))

    act(() => result.current.handlePreviewBearDatabase())

    await waitFor(() => expect(appStoreMocks.importBearDatabase).toHaveBeenCalledWith('/vault', BEAR_STORE_PATH, true))
    await waitFor(() => expect(setToastMessage).toHaveBeenLastCalledWith(
      'Preview: 3 notes from the Bear database, skipped 1 trashed and 2 encrypted; local-only report will be written',
    ))
    expect(reloadVault).not.toHaveBeenCalled()
  })

  it('imports the Bear database directly and reloads the vault', async () => {
    appStoreMocks.discoverImportableApps.mockResolvedValue([bearWithStore])
    appStoreMocks.importBearDatabase.mockResolvedValue(bearSummary(false))
    const { result, loadModifiedFiles, reloadFolders, reloadVault, setToastMessage } = renderActions()
    await waitFor(() => expect(result.current.installedApps).toHaveLength(1))

    act(() => result.current.handleImportBearDatabase())

    await waitFor(() => expect(appStoreMocks.importBearDatabase).toHaveBeenCalledWith('/vault', BEAR_STORE_PATH, false))
    await waitFor(() => expect(setToastMessage).toHaveBeenLastCalledWith(
      'Imported 3 notes from the Bear database, skipped 1 trashed and 2 encrypted',
    ))
    expect(reloadVault).toHaveBeenCalledOnce()
    expect(reloadFolders).toHaveBeenCalledOnce()
    expect(loadModifiedFiles).toHaveBeenCalledOnce()
  })

  it('surfaces Bear database import failures as toasts', async () => {
    appStoreMocks.discoverImportableApps.mockResolvedValue([bearWithStore])
    appStoreMocks.importBearDatabase.mockRejectedValue(new Error('macOS denied access to the store'))
    const { result, reloadVault, setToastMessage } = renderActions()
    await waitFor(() => expect(result.current.installedApps).toHaveLength(1))

    act(() => result.current.handleImportBearDatabase())

    await waitFor(() => expect(setToastMessage).toHaveBeenLastCalledWith('Import failed: macOS denied access to the store'))
    expect(reloadVault).not.toHaveBeenCalled()
    expect(result.current.portabilityBusyAction).toBeNull()
  })
})
