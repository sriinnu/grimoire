import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useVaultPortabilityActions } from './useVaultPortabilityActions'
import type {
  BearDatabaseImportSummary,
  DayOneDatabaseImportSummary,
  DiscoveredApp,
} from '../utils/appStoreImport'

const BEAR_STORE_PATH = '/Users/sri/Library/Group Containers/9K33E3U3T4.net.shinyfrog.bear/Application Data/database.sqlite'
const DAY_ONE_STORE_PATH = '/Users/sri/Library/Group Containers/5U8NS4GX82.dayoneapp2/Data/Documents/DayOne.sqlite'

const bearWithStore: DiscoveredApp = {
  id: 'bear',
  name: 'Bear',
  installed: true,
  store_found: true,
  store_path: BEAR_STORE_PATH,
  support: 'full',
}

const dayOneWithStore: DiscoveredApp = {
  id: 'day-one',
  name: 'Day One',
  installed: true,
  store_found: true,
  store_path: DAY_ONE_STORE_PATH,
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

function dayOneSummary(dryRun: boolean): DayOneDatabaseImportSummary {
  return {
    source_store: DAY_ONE_STORE_PATH,
    imported_root: '/vault/imports/day-one',
    report_path: dryRun ? null : '/vault/imports/day-one/import-report.md',
    entries_imported: 5,
    skipped_empty: 2,
    skipped_trashed: 1,
    failed_entries: 0,
    journals: ['Daily', 'Reflections'],
    sample_titles: ['Morning Pages', 'Evening Walk'],
    dry_run: dryRun,
  }
}

const appStoreMocks = vi.hoisted(() => ({
  actualDiscover: undefined as undefined | (() => Promise<DiscoveredApp[]>),
  discoverImportableApps: vi.fn<() => Promise<DiscoveredApp[]>>(),
  importBearDatabase: vi.fn(),
  importDayOneDatabase: vi.fn(),
}))

vi.mock('../utils/appStoreImport', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../utils/appStoreImport')>()
  appStoreMocks.actualDiscover = actual.discoverImportableApps
  return {
    ...actual,
    discoverImportableApps: appStoreMocks.discoverImportableApps,
    importBearDatabase: appStoreMocks.importBearDatabase,
    importDayOneDatabase: appStoreMocks.importDayOneDatabase,
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
    appStoreMocks.importDayOneDatabase.mockResolvedValue(dayOneSummary(true))
  })

  it('falls back to mock discovery (all apps absent) outside the Tauri runtime', async () => {
    const { result } = renderActions()

    await waitFor(() => expect(result.current.installedApps).toHaveLength(3))

    const ids = result.current.installedApps.map((app) => app.id)
    expect(ids).toEqual(['bear', 'day-one', 'apple-notes'])
    expect(result.current.installedApps.every((app) => !app.installed && !app.store_found)).toBe(true)
  })

  it('refuses a Bear database preview when no store was discovered', async () => {
    const { result, setToastMessage } = renderActions()
    await waitFor(() => expect(result.current.installedApps).toHaveLength(3))

    act(() => result.current.handlePreviewBearDatabase())

    await waitFor(() => expect(setToastMessage).toHaveBeenLastCalledWith('Bear database not found on this Mac'))
    expect(appStoreMocks.importBearDatabase).not.toHaveBeenCalled()
  })

  it('refuses a Day One database preview when no store was discovered', async () => {
    const { result, setToastMessage } = renderActions()
    await waitFor(() => expect(result.current.installedApps).toHaveLength(3))

    act(() => result.current.handlePreviewBearDatabase('day-one'))

    await waitFor(() => expect(setToastMessage).toHaveBeenLastCalledWith('Day One database not found on this Mac'))
    expect(appStoreMocks.importDayOneDatabase).not.toHaveBeenCalled()
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

  it('previews the Day One database as a dry run without reloading the vault', async () => {
    appStoreMocks.discoverImportableApps.mockResolvedValue([dayOneWithStore])
    const { result, reloadVault, setToastMessage } = renderActions()
    await waitFor(() => expect(result.current.installedApps).toHaveLength(1))

    act(() => result.current.handlePreviewBearDatabase('day-one'))

    await waitFor(() => expect(appStoreMocks.importDayOneDatabase).toHaveBeenCalledWith('/vault', DAY_ONE_STORE_PATH, true))
    await waitFor(() => expect(setToastMessage).toHaveBeenLastCalledWith(
      'Preview: 5 entries from the Day One database, skipped 2 empty and 1 trashed; local-only report will be written',
    ))
    expect(appStoreMocks.importBearDatabase).not.toHaveBeenCalled()
    expect(reloadVault).not.toHaveBeenCalled()
  })

  it('imports the Day One database directly and reloads the vault', async () => {
    appStoreMocks.discoverImportableApps.mockResolvedValue([dayOneWithStore])
    appStoreMocks.importDayOneDatabase.mockResolvedValue(dayOneSummary(false))
    const { result, loadModifiedFiles, reloadFolders, reloadVault, setToastMessage } = renderActions()
    await waitFor(() => expect(result.current.installedApps).toHaveLength(1))

    act(() => result.current.handleImportBearDatabase('day-one'))

    await waitFor(() => expect(appStoreMocks.importDayOneDatabase).toHaveBeenCalledWith('/vault', DAY_ONE_STORE_PATH, false))
    await waitFor(() => expect(setToastMessage).toHaveBeenLastCalledWith(
      'Imported 5 entries from the Day One database, skipped 2 empty and 1 trashed',
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

  it('surfaces Day One database import failures as toasts', async () => {
    appStoreMocks.discoverImportableApps.mockResolvedValue([dayOneWithStore])
    appStoreMocks.importDayOneDatabase.mockRejectedValue(new Error('macOS denied access to the store'))
    const { result, reloadVault, setToastMessage } = renderActions()
    await waitFor(() => expect(result.current.installedApps).toHaveLength(1))

    act(() => result.current.handleImportBearDatabase('day-one'))

    await waitFor(() => expect(setToastMessage).toHaveBeenLastCalledWith('Import failed: macOS denied access to the store'))
    expect(reloadVault).not.toHaveBeenCalled()
    expect(result.current.portabilityBusyAction).toBeNull()
  })
})
