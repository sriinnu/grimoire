import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { MarkdownZipExportResult } from '../lib/vaultPortability'
import type { VaultExportProgressEvent } from '../utils/vaultExport'
import { useVaultPortabilityActions } from './useVaultPortabilityActions'

const markdownMocks = vi.hoisted(() => ({
  pickMarkdownImportFolder: vi.fn(),
  pickBearImportFolder: vi.fn(),
  pickMarkdownZipImportFile: vi.fn(),
  pickJournalImportSource: vi.fn(),
  pickAppImportSource: vi.fn(),
  previewMarkdownFolderImport: vi.fn(),
  previewMarkdownZipImport: vi.fn(),
  previewJournalExportIntoVault: vi.fn(),
  previewAppExportIntoVault: vi.fn(),
  importMarkdownFolderIntoVaultWithProgress: vi.fn(),
  importMarkdownZipIntoVaultWithProgress: vi.fn(),
  importJournalExportIntoVaultWithProgress: vi.fn(),
  importAppExportIntoVaultWithProgress: vi.fn(),
  cancelPortabilityOperation: vi.fn(),
  formatMarkdownImportPreviewToast: vi.fn(),
  formatMarkdownImportToast: vi.fn(),
}))

const vaultExportMocks = vi.hoisted(() => ({
  exportMarkdownZip: vi.fn(),
  exportStaticHtmlArchive: vi.fn(),
  exportPortabilityCapsule: vi.fn(),
  previewPortabilityCapsule: vi.fn(),
  exportMarkdownZipWithProgress: vi.fn(),
  exportStaticHtmlArchiveWithProgress: vi.fn(),
  formatMarkdownZipExportToast: vi.fn(() => 'zip toast'),
  formatStaticHtmlExportToast: vi.fn(() => 'html toast'),
  formatPortabilityCapsulePreviewToast: vi.fn(() => 'capsule preview toast'),
  formatPortabilityCapsuleExportToast: vi.fn(() => 'capsule export toast'),
  pickMarkdownZipExportTarget: vi.fn(),
  pickStaticHtmlArchiveTarget: vi.fn(),
  pickJsonSnapshotExportTarget: vi.fn(),
  pickSqliteSnapshotExportTarget: vi.fn(),
}))

const objectStorageMocks = vi.hoisted(() => ({
  applyObjectStoragePullWithProgress: vi.fn(),
  applyObjectStoragePush: vi.fn(),
  applyObjectStoragePushWithProgress: vi.fn(),
  formatObjectStorageApplyToast: vi.fn(),
  formatObjectStoragePreviewToast: vi.fn(),
  pickObjectStorageMirrorFolder: vi.fn(),
  previewObjectStoragePullWithProgress: vi.fn(),
  previewObjectStoragePush: vi.fn(),
  previewObjectStoragePushWithProgress: vi.fn(),
  runS3LivePreflight: vi.fn(),
  formatS3LivePreflightToast: vi.fn(),
}))

vi.mock('../utils/markdownFolderImport', () => markdownMocks)
vi.mock('../utils/vaultExport', () => vaultExportMocks)
vi.mock('../utils/objectStorageSync', () => objectStorageMocks)

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
  return { ...hook, setToastMessage }
}

function completeExport(
  result: MarkdownZipExportResult,
): (
  vaultPath: string,
  targetPath: string,
  operationId: string,
  onEvent: (event: VaultExportProgressEvent) => void,
) => Promise<MarkdownZipExportResult> {
  return async (_vaultPath, _targetPath, _operationId, onEvent) => {
    onEvent({ event: 'Started', data: { totalFiles: result.files_exported } })
    onEvent({
      event: 'Progress',
      data: { currentPath: 'notes/research.md', processedFiles: result.files_exported, totalFiles: result.files_exported },
    })
    onEvent({ event: 'Finished', data: { result } })
    return result
  }
}

describe('useVaultPortabilityActions exports', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    markdownMocks.cancelPortabilityOperation.mockResolvedValue(true)
    vaultExportMocks.pickMarkdownZipExportTarget.mockResolvedValue('/tmp/grimoire.zip')
    vaultExportMocks.pickStaticHtmlArchiveTarget.mockResolvedValue('/tmp/grimoire-site')
    vaultExportMocks.pickJsonSnapshotExportTarget.mockResolvedValue('/tmp/grimoire.json')
    vaultExportMocks.pickSqliteSnapshotExportTarget.mockResolvedValue('/tmp/grimoire.sqlite')
    vaultExportMocks.previewPortabilityCapsule.mockResolvedValue({
      format: 'json',
      files_exportable: 4,
      notes_exportable: 3,
      assets_exportable: 1,
      skipped_files: 2,
      bytes_exportable: 1024,
      locality_proof: {
        markdown_source_of_truth: true,
        absolute_source_paths_redacted: true,
        local_only_files_withheld: 2,
      },
      manifest_rows: [],
    })
    vaultExportMocks.exportPortabilityCapsule.mockResolvedValue({
      export_path: '/tmp/grimoire.json',
      files_exported: 4,
      skipped_files: 2,
    })
    vaultExportMocks.exportMarkdownZipWithProgress.mockImplementation(completeExport({
      export_path: '/tmp/grimoire.zip',
      files_exported: 2,
      skipped_files: 1,
    }))
    vaultExportMocks.exportStaticHtmlArchiveWithProgress.mockImplementation(completeExport({
      export_path: '/tmp/grimoire-site',
      files_exported: 3,
      skipped_files: 0,
    }))
  })

  it('exports Markdown ZIP through the progress path', async () => {
    const { result, setToastMessage } = renderActions()

    act(() => result.current.handleExportMarkdownZip())

    await waitFor(() => expect(vaultExportMocks.exportMarkdownZipWithProgress).toHaveBeenCalled())
    expect(vaultExportMocks.exportMarkdownZip).not.toHaveBeenCalled()
    await waitFor(() => expect(setToastMessage).toHaveBeenLastCalledWith('zip toast'))
  })

  it('exports static HTML through the progress path', async () => {
    const { result, setToastMessage } = renderActions()

    act(() => result.current.handleExportStaticHtmlArchive())

    await waitFor(() => expect(vaultExportMocks.exportStaticHtmlArchiveWithProgress).toHaveBeenCalled())
    expect(vaultExportMocks.exportStaticHtmlArchive).not.toHaveBeenCalled()
    await waitFor(() => expect(setToastMessage).toHaveBeenLastCalledWith('html toast'))
  })

  it('previews JSON and SQLite capsules before writing snapshots', async () => {
    const { result, setToastMessage } = renderActions()

    act(() => result.current.handlePreviewJsonSnapshot())
    await waitFor(() => expect(vaultExportMocks.previewPortabilityCapsule).toHaveBeenCalledWith('/vault', 'json'))
    await waitFor(() => expect(result.current.lastExportPreview?.format).toBe('json'))
    await waitFor(() => expect(setToastMessage).toHaveBeenLastCalledWith('capsule preview toast'))

    act(() => result.current.handlePreviewSqliteSnapshot())
    await waitFor(() => expect(vaultExportMocks.previewPortabilityCapsule).toHaveBeenCalledWith('/vault', 'sqlite'))
    await waitFor(() => expect(result.current.lastExportPreview?.format).toBe('sqlite'))
  })

  it('blocks JSON and SQLite capsule exports until the matching preview exists', async () => {
    const { result, setToastMessage } = renderActions()

    act(() => result.current.handleExportJsonSnapshot())

    await waitFor(() => expect(setToastMessage).toHaveBeenLastCalledWith('Preview JSON snapshot before exporting'))
    expect(vaultExportMocks.pickJsonSnapshotExportTarget).not.toHaveBeenCalled()
    expect(vaultExportMocks.exportPortabilityCapsule).not.toHaveBeenCalled()
  })

  it('exports JSON and SQLite capsules through reviewed local targets', async () => {
    const { result, setToastMessage } = renderActions()

    act(() => result.current.handlePreviewJsonSnapshot())
    await waitFor(() => expect(result.current.lastExportPreview?.format).toBe('json'))
    act(() => result.current.handleExportJsonSnapshot())
    await waitFor(() => expect(vaultExportMocks.exportPortabilityCapsule).toHaveBeenCalledWith('/vault', '/tmp/grimoire.json', 'json'))
    await waitFor(() => expect(setToastMessage).toHaveBeenLastCalledWith('capsule export toast'))
    expect(result.current.lastExportPreview).toBeNull()

    act(() => result.current.handlePreviewSqliteSnapshot())
    await waitFor(() => expect(result.current.lastExportPreview?.format).toBe('sqlite'))
    act(() => result.current.handleExportSqliteSnapshot())
    await waitFor(() => expect(vaultExportMocks.exportPortabilityCapsule).toHaveBeenCalledWith('/vault', '/tmp/grimoire.sqlite', 'sqlite'))
  })

  it('cancels an active static HTML export without showing a late success toast', async () => {
    let finishExport: ((result: MarkdownZipExportResult) => void) | undefined
    const exportDeferred = new Promise<MarkdownZipExportResult>((resolve) => {
      finishExport = resolve
    })
    vaultExportMocks.exportStaticHtmlArchiveWithProgress.mockImplementation((
      _vaultPath: string,
      _targetPath: string,
      operationId: string,
      onEvent: (event: VaultExportProgressEvent) => void,
    ) => {
      expect(operationId).toContain('export-static-html')
      onEvent({ event: 'Started', data: { totalFiles: 2 } })
      onEvent({
        event: 'Progress',
        data: { currentPath: 'notes/one.md', processedFiles: 1, totalFiles: 2 },
      })
      return exportDeferred
    })
    const { result, setToastMessage } = renderActions()

    act(() => result.current.handleExportStaticHtmlArchive())
    await waitFor(() => expect(result.current.portabilityProgress?.processedFiles).toBe(1))
    const operationId = result.current.portabilityProgress?.operationId

    act(() => result.current.handleCancelPortabilityAction())

    expect(markdownMocks.cancelPortabilityOperation).toHaveBeenCalledWith(operationId)
    expect(result.current.portabilityBusyAction).toBeNull()
    expect(result.current.portabilityProgress).toBeNull()
    expect(setToastMessage).toHaveBeenLastCalledWith('Export cancelled')

    await act(async () => {
      finishExport?.({ export_path: '/tmp/grimoire-site', files_exported: 2, skipped_files: 0 })
      await exportDeferred
    })
    expect(setToastMessage).not.toHaveBeenLastCalledWith('html toast')
  })
})
