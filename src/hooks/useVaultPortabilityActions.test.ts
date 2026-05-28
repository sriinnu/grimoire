import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useVaultPortabilityActions } from './useVaultPortabilityActions'
import type { MarkdownFolderImportPreviewResult, MarkdownFolderImportResult } from '../lib/vaultPortability'
import type { MarkdownFolderImportProgressEvent } from '../utils/markdownFolderImport'
import type { AzureLivePreflightReport } from '../utils/objectStorageLivePreflight'
import type { ObjectStorageSyncProgressEvent, ObjectStorageSyncReport, S3LivePreflightReport } from '../utils/objectStorageSync'

const previewResult: MarkdownFolderImportPreviewResult = {
  source_path: '/source/research',
  planned_import_root: '/vault/imports/markdown',
  notes_to_copy: 2,
  assets_to_copy: 1,
  skipped_files: 0,
  failed_files: 0,
  writes_local_only_report: true,
}

const importResult: MarkdownFolderImportResult = {
  imported_root: '/vault/imports/markdown',
  report_path: '/vault/imports/import-report.md',
  notes_copied: 2,
  assets_copied: 1,
  skipped_files: 0,
  failed_files: 0,
}

const storagePreviewResult: ObjectStorageSyncReport = {
  provider_id: 's3',
  adapter_phase: 'local-mirror-prototype',
  prototype_mode: 'local-mirror-fixture',
  direction: 'push',
  mirror_path: '/mirror',
  preview_signature: 'sync-v1-test',
  applied: false,
  files_to_upload: 2,
  files_to_download: 0,
  files_to_delete: 0,
  conflicts: 0,
  excluded_files: 1,
  operations: [{ kind: 'exclude', path: 'Journal/private.md', reason: 'local-only' }],
  sync_report_path: null,
  conflict_artifacts: [],
}

const s3LivePreflightResult: S3LivePreflightReport = {
  provider_id: 's3',
  proof_level: 'live-read-only-preflight',
  configured: true,
  status: 'reachable',
  bucket_configured: true,
  region_configured: true,
  prefix_configured: false,
  head_bucket_checked: true,
  list_prefix_checked: true,
  message: 'S3 bucket and prefix are reachable through read-only HeadBucket/ListObjectsV2 checks.',
  checked_at: '2026-05-25T00:00:00Z',
}

const azureLivePreflightResult: AzureLivePreflightReport = {
  provider_id: 'azure-blob',
  proof_level: 'live-read-only-preflight',
  configured: true,
  status: 'reachable',
  account_configured: true,
  container_configured: true,
  prefix_configured: true,
  container_checked: true,
  list_prefix_checked: true,
  message: 'Azure container and prefix are reachable through read-only CLI container/list checks.',
  checked_at: '2026-05-25T00:00:00Z',
}

const storagePullPreviewResult: ObjectStorageSyncReport = {
  ...storagePreviewResult,
  direction: 'pull',
  files_to_upload: 0,
  files_to_download: 2,
  files_to_delete: 0,
  operations: [{ kind: 'download', path: 'Notes/remote.md', reason: 'Missing from local working copy' }],
}

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
  importMarkdownFolderIntoVault: vi.fn(),
  importMarkdownFolderIntoVaultWithProgress: vi.fn(),
  cancelMarkdownFolderImport: vi.fn(),
  cancelPortabilityOperation: vi.fn(),
  importMarkdownZipIntoVault: vi.fn(),
  importMarkdownZipIntoVaultWithProgress: vi.fn(),
  importJournalExportIntoVault: vi.fn(),
  importJournalExportIntoVaultWithProgress: vi.fn(),
  importAppExportIntoVault: vi.fn(),
  importAppExportIntoVaultWithProgress: vi.fn(),
  formatMarkdownImportPreviewToast: vi.fn(() => 'preview toast'),
  formatMarkdownImportToast: vi.fn(() => 'import toast'),
}))

vi.mock('../utils/markdownFolderImport', () => markdownMocks)
const vaultExportMocks = vi.hoisted(() => ({
  exportStaticHtmlArchive: vi.fn(),
  exportMarkdownZip: vi.fn(),
  exportMarkdownZipWithProgress: vi.fn(),
  exportStaticHtmlArchiveWithProgress: vi.fn(),
  formatMarkdownZipExportToast: vi.fn(() => 'zip toast'),
  formatStaticHtmlExportToast: vi.fn(() => 'html toast'),
  pickMarkdownZipExportTarget: vi.fn(),
  pickStaticHtmlArchiveTarget: vi.fn(),
}))

vi.mock('../utils/vaultExport', () => vaultExportMocks)
const objectStorageMocks = vi.hoisted(() => ({
  applyObjectStoragePush: vi.fn(),
  formatObjectStorageApplyToast: vi.fn(() => 'apply toast'),
  formatObjectStoragePreviewToast: vi.fn(() => 'storage preview toast'),
  pickObjectStorageMirrorFolder: vi.fn(),
  previewObjectStoragePush: vi.fn(),
  previewObjectStoragePull: vi.fn(),
  previewObjectStoragePushWithProgress: vi.fn(),
  previewObjectStoragePullWithProgress: vi.fn(),
  applyObjectStoragePullWithProgress: vi.fn(),
  applyObjectStoragePushWithProgress: vi.fn(),
  runS3LivePreflight: vi.fn(),
  formatS3LivePreflightToast: vi.fn(() => 's3 live toast'),
}))

vi.mock('../utils/objectStorageSync', () => objectStorageMocks)
const livePreflightMocks = vi.hoisted(() => ({
  runAzureLivePreflight: vi.fn(),
  formatAzureLivePreflightToast: vi.fn(() => 'azure live toast'),
}))

vi.mock('../utils/objectStorageLivePreflight', () => livePreflightMocks)

function renderActions(resolvedPath = '/vault') {
  const reloadVault = vi.fn(() => Promise.resolve())
  const reloadFolders = vi.fn(() => Promise.resolve())
  const loadModifiedFiles = vi.fn(() => Promise.resolve())
  const setToastMessage = vi.fn()
  const hook = renderHook(
    ({ path }) => useVaultPortabilityActions({
      resolvedPath: path,
      reloadVault,
      reloadFolders,
      loadModifiedFiles,
      setToastMessage,
    }),
    { initialProps: { path: resolvedPath } },
  )
  return { ...hook, loadModifiedFiles, reloadFolders, reloadVault, setToastMessage }
}

describe('useVaultPortabilityActions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    markdownMocks.pickMarkdownImportFolder.mockResolvedValue('/source/research')
    markdownMocks.pickMarkdownZipImportFile.mockResolvedValue('/source/portable.zip')
    markdownMocks.pickAppImportSource.mockResolvedValue('/source/obsidian')
    markdownMocks.pickJournalImportSource.mockResolvedValue('/source/day-one.zip')
    markdownMocks.previewMarkdownFolderImport.mockResolvedValue(previewResult)
    markdownMocks.previewMarkdownZipImport.mockResolvedValue({
      ...previewResult,
      source_path: '/source/portable.zip',
    })
    markdownMocks.previewAppExportIntoVault.mockResolvedValue({
      ...previewResult,
      source_path: '/source/obsidian',
    })
    markdownMocks.previewJournalExportIntoVault.mockResolvedValue({
      ...previewResult,
      source_path: '/source/day-one.zip',
    })
    markdownMocks.importMarkdownFolderIntoVault.mockResolvedValue(importResult)
    markdownMocks.importMarkdownFolderIntoVaultWithProgress.mockImplementation(async (
      _vaultPath: string,
      _sourcePath: string,
      _operationId: string,
      onEvent: (event: MarkdownFolderImportProgressEvent) => void,
    ) => {
      onEvent({ event: 'Started', data: { totalFiles: 3 } })
      onEvent({
        event: 'Progress',
        data: { currentPath: 'notes/research.md', processedFiles: 3, totalFiles: 3 },
      })
      onEvent({ event: 'Finished', data: { result: importResult } })
      return importResult
    })
    markdownMocks.importMarkdownZipIntoVaultWithProgress.mockImplementation(async (
      _vaultPath: string,
      _sourcePath: string,
      _operationId: string,
      onEvent: (event: MarkdownFolderImportProgressEvent) => void,
    ) => {
      onEvent({ event: 'Started', data: { totalFiles: 3 } })
      onEvent({
        event: 'Progress',
        data: { currentPath: 'notes/research.md', processedFiles: 3, totalFiles: 3 },
      })
      onEvent({ event: 'Finished', data: { result: importResult } })
      return importResult
    })
    markdownMocks.importAppExportIntoVaultWithProgress.mockImplementation(async (
      _vaultPath: string,
      _sourcePath: string,
      _sourceKind: string,
      _operationId: string,
      onEvent: (event: MarkdownFolderImportProgressEvent) => void,
    ) => {
      onEvent({ event: 'Started', data: { totalFiles: 3 } })
      onEvent({
        event: 'Progress',
        data: { currentPath: 'notes/project.md', processedFiles: 3, totalFiles: 3 },
      })
      onEvent({ event: 'Finished', data: { result: importResult } })
      return importResult
    })
    markdownMocks.importJournalExportIntoVaultWithProgress.mockImplementation(async (
      _vaultPath: string,
      _sourcePath: string,
      _sourceKind: string,
      _operationId: string,
      onEvent: (event: MarkdownFolderImportProgressEvent) => void,
    ) => {
      onEvent({ event: 'Started', data: { totalFiles: 3 } })
      onEvent({
        event: 'Progress',
        data: { currentPath: 'journal/day.md', processedFiles: 3, totalFiles: 3 },
      })
      onEvent({ event: 'Finished', data: { result: importResult } })
      return importResult
    })
    markdownMocks.cancelMarkdownFolderImport.mockResolvedValue(true)
    markdownMocks.cancelPortabilityOperation.mockResolvedValue(true)
    objectStorageMocks.pickObjectStorageMirrorFolder.mockResolvedValue('/mirror')
    objectStorageMocks.previewObjectStoragePush.mockResolvedValue(storagePreviewResult)
    objectStorageMocks.previewObjectStoragePull.mockResolvedValue(storagePullPreviewResult)
    objectStorageMocks.previewObjectStoragePushWithProgress.mockImplementation(async (
      _vaultPath: string,
      _mirrorPath: string,
      _providerId: string,
      _operationId: string,
      onEvent: (event: ObjectStorageSyncProgressEvent) => void,
    ) => {
      onEvent({ event: 'Started', data: { totalFiles: 2 } })
      onEvent({
        event: 'Progress',
        data: { currentPath: 'notes/public.md', processedFiles: 2, totalFiles: 2 },
      })
      onEvent({ event: 'Finished', data: { result: storagePreviewResult } })
      return storagePreviewResult
    })
    objectStorageMocks.previewObjectStoragePullWithProgress.mockImplementation(async (
      _vaultPath: string,
      _mirrorPath: string,
      _providerId: string,
      _operationId: string,
      onEvent: (event: ObjectStorageSyncProgressEvent) => void,
    ) => {
      onEvent({ event: 'Started', data: { totalFiles: 2 } })
      onEvent({
        event: 'Progress',
        data: { currentPath: 'notes/remote.md', processedFiles: 2, totalFiles: 2 },
      })
      onEvent({ event: 'Finished', data: { result: storagePullPreviewResult } })
      return storagePullPreviewResult
    })
    objectStorageMocks.applyObjectStoragePush.mockResolvedValue({
      ...storagePreviewResult,
      applied: true,
      sync_report_path: '/vault/.grimoire/sync-reports/s3-push-report.md',
    })
    objectStorageMocks.applyObjectStoragePushWithProgress.mockImplementation(async (
      _vaultPath: string,
      _mirrorPath: string,
      _providerId: string,
      _previewSignature: string,
      _operationId: string,
      onEvent: (event: ObjectStorageSyncProgressEvent) => void,
    ) => {
      const result = {
        ...storagePreviewResult,
        applied: true,
        sync_report_path: '/vault/.grimoire/sync-reports/s3-push-report.md',
      }
      onEvent({ event: 'Started', data: { totalFiles: 2 } })
      onEvent({
        event: 'Progress',
        data: { currentPath: 'notes/public.md', processedFiles: 2, totalFiles: 2 },
      })
      onEvent({ event: 'Finished', data: { result } })
      return result
    })
    objectStorageMocks.applyObjectStoragePullWithProgress.mockImplementation(async (
      _vaultPath: string,
      _mirrorPath: string,
      _providerId: string,
      _previewSignature: string,
      _operationId: string,
      onEvent: (event: ObjectStorageSyncProgressEvent) => void,
    ) => {
      const result = {
        ...storagePullPreviewResult,
        applied: true,
        sync_report_path: '/vault/.grimoire/sync-reports/s3-pull-report.md',
      }
      onEvent({ event: 'Started', data: { totalFiles: 2 } })
      onEvent({
        event: 'Progress',
        data: { currentPath: 'notes/remote.md', processedFiles: 2, totalFiles: 2 },
      })
      onEvent({ event: 'Finished', data: { result } })
      return result
    })
    objectStorageMocks.runS3LivePreflight.mockResolvedValue(s3LivePreflightResult)
    livePreflightMocks.runAzureLivePreflight.mockResolvedValue(azureLivePreflightResult)
  })

  it('stores the last no-write import preview in memory', async () => {
    const { result } = renderActions()

    act(() => result.current.handlePreviewMarkdownFolder())

    await waitFor(() => {
      expect(result.current.lastImportPreview?.sourceId).toBe('markdown-folder-preview')
    })
    expect(result.current.lastImportPreview?.result).toEqual(previewResult)
  })

  it('clears import preview state when the active vault changes', async () => {
    const { result, rerender } = renderActions()
    act(() => result.current.handlePreviewMarkdownFolder())
    await waitFor(() => expect(result.current.lastImportPreview).not.toBeNull())

    rerender({ path: '/next-vault' })

    expect(result.current.lastImportPreview).toBeNull()
  })

  it('clears import preview state when an import runs', async () => {
    const { result, reloadVault } = renderActions()
    act(() => result.current.handlePreviewMarkdownFolder())
    await waitFor(() => expect(result.current.lastImportPreview).not.toBeNull())

    act(() => result.current.handleImportMarkdownFolder())

    await waitFor(() => expect(result.current.lastImportPreview).toBeNull())
    await waitFor(() => expect(reloadVault).toHaveBeenCalledOnce())
  })

  it('blocks import writes until the matching no-write preview has been reviewed', async () => {
    const { result, setToastMessage } = renderActions()

    act(() => result.current.handleImportMarkdownFolder())

    await waitFor(() => expect(setToastMessage).toHaveBeenLastCalledWith('Preview Markdown folder before importing to the vault'))
    expect(markdownMocks.pickMarkdownImportFolder).not.toHaveBeenCalled()
    expect(markdownMocks.importMarkdownFolderIntoVaultWithProgress).not.toHaveBeenCalled()
  })

  it('cancels an active Markdown folder import without reloading after a late result', async () => {
    let finishImport: ((result: MarkdownFolderImportResult) => void) | undefined
    const importDeferred = new Promise<MarkdownFolderImportResult>((resolve) => {
      finishImport = resolve
    })
    markdownMocks.importMarkdownFolderIntoVaultWithProgress.mockImplementation((
      _vaultPath: string,
      _sourcePath: string,
      operationId: string,
      onEvent: (event: MarkdownFolderImportProgressEvent) => void,
    ) => {
      expect(operationId).toContain('markdown-folder')
      onEvent({ event: 'Started', data: { totalFiles: 3 } })
      onEvent({
        event: 'Progress',
        data: { currentPath: 'notes/one.md', processedFiles: 1, totalFiles: 3 },
      })
      return importDeferred
    })
    const { result, reloadVault, setToastMessage } = renderActions()
    act(() => result.current.handlePreviewMarkdownFolder())
    await waitFor(() => expect(result.current.lastImportPreview).not.toBeNull())

    act(() => result.current.handleImportMarkdownFolder())
    await waitFor(() => expect(result.current.portabilityProgress?.processedFiles).toBe(1))
    const operationId = result.current.portabilityProgress?.operationId

    act(() => result.current.handleCancelPortabilityAction())

    expect(markdownMocks.cancelPortabilityOperation).toHaveBeenCalledWith(operationId)
    expect(result.current.portabilityBusyAction).toBeNull()
    expect(result.current.portabilityProgress).toBeNull()
    expect(setToastMessage).toHaveBeenLastCalledWith('Import cancelled')

    await act(async () => {
      finishImport?.(importResult)
      await importDeferred
    })
    expect(reloadVault).not.toHaveBeenCalled()
  })

  it('imports Markdown ZIP through the progress path', async () => {
    const { result, reloadVault } = renderActions()
    act(() => result.current.handlePreviewMarkdownZip())
    await waitFor(() => expect(result.current.lastImportPreview?.sourceId).toBe('markdown-zip-preview'))

    act(() => result.current.handleImportMarkdownZip())

    await waitFor(() => expect(markdownMocks.importMarkdownZipIntoVaultWithProgress).toHaveBeenCalled())
    expect(markdownMocks.importMarkdownZipIntoVault).not.toHaveBeenCalled()
    await waitFor(() => expect(reloadVault).toHaveBeenCalledOnce())
  })

  it('imports app exports through the progress path', async () => {
    const { result, reloadVault } = renderActions()
    act(() => result.current.handlePreviewObsidian())
    await waitFor(() => expect(result.current.lastImportPreview?.sourceId).toBe('obsidian-preview'))

    act(() => result.current.handleImportObsidian())

    await waitFor(() => expect(markdownMocks.importAppExportIntoVaultWithProgress).toHaveBeenCalled())
    expect(markdownMocks.importAppExportIntoVault).not.toHaveBeenCalled()
    await waitFor(() => expect(reloadVault).toHaveBeenCalledOnce())
  })

  it('imports journal exports through the progress path', async () => {
    const { result, reloadVault } = renderActions()
    act(() => result.current.handlePreviewDayOne())
    await waitFor(() => expect(result.current.lastImportPreview?.sourceId).toBe('day-one-preview'))

    act(() => result.current.handleImportDayOne())

    await waitFor(() => expect(markdownMocks.importJournalExportIntoVaultWithProgress).toHaveBeenCalled())
    expect(markdownMocks.importJournalExportIntoVault).not.toHaveBeenCalled()
    await waitFor(() => expect(reloadVault).toHaveBeenCalledOnce())
  })

  it('stores object-storage preview reports in memory for Settings review', async () => {
    const { result, setToastMessage } = renderActions()

    act(() => result.current.handlePreviewS3MirrorPush())

    await waitFor(() => expect(result.current.s3MirrorPreviewReady).toBe(true))
    expect(result.current.s3MirrorPreviewReport).toEqual(storagePreviewResult)
    expect(objectStorageMocks.previewObjectStoragePushWithProgress).toHaveBeenCalled()
    expect(objectStorageMocks.previewObjectStoragePush).not.toHaveBeenCalled()
    expect(setToastMessage).toHaveBeenLastCalledWith('storage preview toast')
  })

  it('clears object-storage preview reports after apply', async () => {
    const { result, loadModifiedFiles } = renderActions()
    act(() => result.current.handlePreviewS3MirrorPush())
    await waitFor(() => expect(result.current.s3MirrorPreviewReady).toBe(true))

    act(() => result.current.handleApplyS3MirrorPush())

    await waitFor(() => expect(result.current.s3MirrorPreviewReady).toBe(false))
    expect(result.current.s3MirrorPreviewReport).toBeUndefined()
    expect(objectStorageMocks.applyObjectStoragePushWithProgress).toHaveBeenCalled()
    expect(objectStorageMocks.applyObjectStoragePush).not.toHaveBeenCalled()
    expect(loadModifiedFiles).toHaveBeenCalledOnce()
  })

  it('previews and applies object-storage pull through the same exact-preview path', async () => {
    const { result, loadModifiedFiles, reloadFolders, reloadVault } = renderActions()

    act(() => result.current.handlePreviewS3MirrorPull())

    await waitFor(() => expect(result.current.s3MirrorPullPreviewReady).toBe(true))
    expect(result.current.s3MirrorPullPreviewReport).toEqual(storagePullPreviewResult)
    expect(objectStorageMocks.previewObjectStoragePullWithProgress).toHaveBeenCalled()

    act(() => result.current.handleApplyS3MirrorPull())

    await waitFor(() => expect(result.current.s3MirrorPullPreviewReady).toBe(false))
    expect(objectStorageMocks.applyObjectStoragePullWithProgress).toHaveBeenCalled()
    expect(reloadVault).toHaveBeenCalledOnce()
    expect(reloadFolders).toHaveBeenCalledOnce()
    expect(loadModifiedFiles).toHaveBeenCalledOnce()
  })

  it('stores the S3 live read-only preflight report without touching sync previews', async () => {
    const { result, setToastMessage } = renderActions()

    act(() => result.current.handleS3LivePreflight({
      bucket: 'sriinnu-vault',
      region: 'us-east-1',
      prefix: 'journals/dreams/',
    }))

    await waitFor(() => expect(result.current.s3LivePreflightReport).toEqual(s3LivePreflightResult))
    expect(objectStorageMocks.runS3LivePreflight).toHaveBeenCalledWith({
      bucket: 'sriinnu-vault',
      region: 'us-east-1',
      prefix: 'journals/dreams/',
    })
    expect(objectStorageMocks.previewObjectStoragePushWithProgress).not.toHaveBeenCalled()
    expect(setToastMessage).toHaveBeenLastCalledWith('s3 live toast')
  })

  it('stores the Azure live read-only preflight report without touching sync previews', async () => {
    const { result, setToastMessage } = renderActions()

    act(() => result.current.handleAzureLivePreflight({
      account: 'sriinnuacct',
      container: 'grimoire',
      prefix: 'notes/',
    }))

    await waitFor(() => expect(result.current.azureLivePreflightReport).toEqual(azureLivePreflightResult))
    expect(livePreflightMocks.runAzureLivePreflight).toHaveBeenCalledWith({
      account: 'sriinnuacct',
      container: 'grimoire',
      prefix: 'notes/',
    })
    expect(objectStorageMocks.previewObjectStoragePushWithProgress).not.toHaveBeenCalled()
    expect(setToastMessage).toHaveBeenLastCalledWith('azure live toast')
  })

  it('cancels an active object-storage apply without clearing preview from a late result', async () => {
    let finishApply: ((result: ObjectStorageSyncReport) => void) | undefined
    const applyDeferred = new Promise<ObjectStorageSyncReport>((resolve) => {
      finishApply = resolve
    })
    objectStorageMocks.applyObjectStoragePushWithProgress.mockImplementation((
      _vaultPath: string,
      _mirrorPath: string,
      _providerId: string,
      _previewSignature: string,
      operationId: string,
      onEvent: (event: ObjectStorageSyncProgressEvent) => void,
    ) => {
      expect(operationId).toContain('storage-s3-apply')
      onEvent({ event: 'Started', data: { totalFiles: 2 } })
      onEvent({
        event: 'Progress',
        data: { currentPath: 'notes/public.md', processedFiles: 1, totalFiles: 2 },
      })
      return applyDeferred
    })
    const { result, loadModifiedFiles, setToastMessage } = renderActions()
    act(() => result.current.handlePreviewS3MirrorPush())
    await waitFor(() => expect(result.current.s3MirrorPreviewReady).toBe(true))

    act(() => result.current.handleApplyS3MirrorPush())
    await waitFor(() => expect(result.current.portabilityProgress?.processedFiles).toBe(1))
    const operationId = result.current.portabilityProgress?.operationId

    act(() => result.current.handleCancelPortabilityAction())

    expect(markdownMocks.cancelPortabilityOperation).toHaveBeenCalledWith(operationId)
    expect(setToastMessage).toHaveBeenLastCalledWith('Storage sync cancelled')
    expect(result.current.s3MirrorPreviewReady).toBe(true)

    await act(async () => {
      finishApply?.({ ...storagePreviewResult, applied: true })
      await applyDeferred
    })
    expect(loadModifiedFiles).not.toHaveBeenCalled()
  })
})
