import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useVaultPortabilityActions } from './useVaultPortabilityActions'

const capsuleMocks = vi.hoisted(() => ({
  pickJsonCapsuleImportFile: vi.fn(),
  pickSqliteCapsuleImportFile: vi.fn(),
  previewPortabilityCapsuleImport: vi.fn(),
  importPortabilityCapsuleIntoVault: vi.fn(),
  formatPortabilityCapsuleImportPreviewToast: vi.fn(() => 'capsule preview toast'),
  formatPortabilityCapsuleImportToast: vi.fn(() => 'capsule import toast'),
}))

vi.mock('../utils/portabilityCapsuleImport', () => capsuleMocks)

function renderActions() {
  const reloadVault = vi.fn(() => Promise.resolve())
  const reloadFolders = vi.fn(() => Promise.resolve())
  const loadModifiedFiles = vi.fn(() => Promise.resolve())
  const setToastMessage = vi.fn()
  const hook = renderHook(() => useVaultPortabilityActions({
    resolvedPath: '/vault',
    reloadVault,
    reloadFolders,
    loadModifiedFiles,
    setToastMessage,
  }))
  return { ...hook, loadModifiedFiles, reloadFolders, reloadVault, setToastMessage }
}

describe('useVaultPortabilityActions capsule imports', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    capsuleMocks.pickJsonCapsuleImportFile.mockResolvedValue('/exports/grimoire.json')
    capsuleMocks.pickSqliteCapsuleImportFile.mockResolvedValue('/exports/grimoire.sqlite')
    capsuleMocks.previewPortabilityCapsuleImport.mockImplementation((_vaultPath: string, sourcePath: string) => Promise.resolve({
      source_path: sourcePath,
      planned_import_root: '/vault/imports/grimoire',
      notes_to_copy: 2,
      assets_to_copy: 1,
      skipped_files: 1,
      failed_files: 0,
      writes_local_only_report: true,
    }))
    capsuleMocks.importPortabilityCapsuleIntoVault.mockResolvedValue({
      imported_root: '/vault/imports/grimoire',
      report_path: '/vault/imports/grimoire/import-report.md',
      notes_copied: 2,
      assets_copied: 1,
      skipped_files: 1,
      failed_files: 0,
    })
  })

  it('previews JSON capsules into the Import Autopsy state', async () => {
    const { result, setToastMessage } = renderActions()

    act(() => result.current.handlePreviewJsonCapsule())

    await waitFor(() => expect(capsuleMocks.previewPortabilityCapsuleImport)
      .toHaveBeenCalledWith('/vault', '/exports/grimoire.json', 'json'))
    await waitFor(() => expect(result.current.lastImportPreview?.sourceId).toBe('json-capsule-preview'))
    expect(setToastMessage).toHaveBeenLastCalledWith('capsule preview toast')
  })

  it('imports SQLite capsules locally and reloads vault surfaces', async () => {
    const { result, loadModifiedFiles, reloadFolders, reloadVault, setToastMessage } = renderActions()
    act(() => result.current.handlePreviewSqliteCapsule())
    await waitFor(() => expect(result.current.lastImportPreview?.sourceId).toBe('sqlite-capsule-preview'))

    act(() => result.current.handleImportSqliteCapsule())

    await waitFor(() => expect(capsuleMocks.importPortabilityCapsuleIntoVault)
      .toHaveBeenCalledWith('/vault', '/exports/grimoire.sqlite', 'sqlite'))
    await waitFor(() => expect(reloadVault).toHaveBeenCalledOnce())
    expect(reloadFolders).toHaveBeenCalledOnce()
    expect(loadModifiedFiles).toHaveBeenCalledOnce()
    expect(setToastMessage).toHaveBeenLastCalledWith('capsule import toast')
  })
})
