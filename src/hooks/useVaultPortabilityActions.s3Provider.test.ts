import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { ObjectStorageSyncReport } from '../utils/objectStorageSync'
import { useVaultPortabilityActions } from './useVaultPortabilityActions'

const s3ProviderPushPreview: ObjectStorageSyncReport = {
  provider_id: 's3',
  adapter_phase: 'provider-sdk-adapter',
  prototype_mode: 's3-live-provider',
  direction: 'push',
  mirror_path: 's3://sriinnu-vault/notes/',
  preview_signature: 'provider-push-signature',
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

const s3ProviderPullPreview: ObjectStorageSyncReport = {
  ...s3ProviderPushPreview,
  direction: 'pull',
  preview_signature: 'provider-pull-signature',
  files_to_upload: 0,
  files_to_download: 1,
  operations: [{ kind: 'download', path: 'Notes/remote.md', reason: 'Missing from local working copy' }],
}

const s3ProviderMocks = vi.hoisted(() => ({
  previewS3ProviderPush: vi.fn(),
  previewS3ProviderPull: vi.fn(),
  applyS3ProviderSync: vi.fn(),
  previewAzureProviderPush: vi.fn(),
  previewAzureProviderPull: vi.fn(),
  applyAzureProviderSync: vi.fn(),
}))

vi.mock('../utils/objectStorageProviderSync', () => s3ProviderMocks)

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

describe('useVaultPortabilityActions S3 provider SDK lane', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    s3ProviderMocks.previewS3ProviderPush.mockResolvedValue(s3ProviderPushPreview)
    s3ProviderMocks.previewS3ProviderPull.mockResolvedValue(s3ProviderPullPreview)
    s3ProviderMocks.applyS3ProviderSync.mockImplementation(async (
      _vaultPath: string,
      direction: 'push' | 'pull',
    ) => ({
      ...(direction === 'push' ? s3ProviderPushPreview : s3ProviderPullPreview),
      applied: true,
      sync_report_path: `/vault/.grimoire/sync-reports/s3-provider-${direction}.md`,
    }))
  })

  it('stores provider push previews separately from the local-mirror fixture', async () => {
    const { result, setToastMessage } = renderActions()

    act(() => result.current.handlePreviewS3ProviderPush({
      bucket: ' sriinnu-vault ',
      region: ' us-east-1 ',
      prefix: ' notes/ ',
    }))

    await waitFor(() => expect(result.current.s3ProviderPushPreviewReady).toBe(true))
    expect(result.current.s3ProviderPushPreviewReport).toEqual(s3ProviderPushPreview)
    expect(result.current.s3MirrorPreviewReady).toBe(false)
    expect(s3ProviderMocks.previewS3ProviderPush).toHaveBeenCalledWith('/vault', {
      bucket: 'sriinnu-vault',
      region: 'us-east-1',
      prefix: 'notes/',
    })
    expect(setToastMessage).toHaveBeenLastCalledWith(expect.stringContaining('S3 provider SDK push preview'))
  })

  it('blocks apply when S3 target fields changed after preview', async () => {
    const { result, setToastMessage } = renderActions()

    act(() => result.current.handlePreviewS3ProviderPush({
      bucket: 'sriinnu-vault',
      region: 'us-east-1',
      prefix: 'notes/',
    }))
    await waitFor(() => expect(result.current.s3ProviderPushPreviewReady).toBe(true))

    act(() => result.current.handleApplyS3ProviderPush({
      bucket: 'changed-after-preview',
      prefix: 'wrong/',
    }))

    await waitFor(() => {
      expect(setToastMessage).toHaveBeenLastCalledWith(
        'S3 provider target changed; run push preview again before applying sync.',
      )
    })
    expect(s3ProviderMocks.applyS3ProviderSync).not.toHaveBeenCalled()
    expect(result.current.s3ProviderPushPreviewReady).toBe(true)
  })

  it('applies push with the exact preview signature and previewed S3 target args', async () => {
    const { result, loadModifiedFiles, reloadVault } = renderActions()

    act(() => result.current.handlePreviewS3ProviderPush({
      bucket: 'sriinnu-vault',
      region: 'us-east-1',
      prefix: 'notes/',
    }))
    await waitFor(() => expect(result.current.s3ProviderPushPreviewReady).toBe(true))

    act(() => result.current.handleApplyS3ProviderPush({
      bucket: 'sriinnu-vault',
      region: 'us-east-1',
      prefix: 'notes/',
    }))

    await waitFor(() => expect(result.current.s3ProviderPushPreviewReady).toBe(false))
    expect(s3ProviderMocks.applyS3ProviderSync).toHaveBeenCalledWith('/vault', 'push', 'provider-push-signature', {
      bucket: 'sriinnu-vault',
      region: 'us-east-1',
      prefix: 'notes/',
    })
    expect(loadModifiedFiles).toHaveBeenCalledOnce()
    expect(reloadVault).not.toHaveBeenCalled()
  })

  it('fully reloads the vault after provider pull apply', async () => {
    const { result, loadModifiedFiles, reloadFolders, reloadVault } = renderActions()

    act(() => result.current.handlePreviewS3ProviderPull({ bucket: 'sriinnu-vault' }))
    await waitFor(() => expect(result.current.s3ProviderPullPreviewReady).toBe(true))

    act(() => result.current.handleApplyS3ProviderPull({ bucket: 'sriinnu-vault' }))

    await waitFor(() => expect(result.current.s3ProviderPullPreviewReady).toBe(false))
    expect(s3ProviderMocks.applyS3ProviderSync).toHaveBeenCalledWith('/vault', 'pull', 'provider-pull-signature', {
      bucket: 'sriinnu-vault',
    })
    expect(reloadVault).toHaveBeenCalledOnce()
    expect(reloadFolders).toHaveBeenCalledOnce()
    expect(loadModifiedFiles).toHaveBeenCalledOnce()
  })

  it('requires a provider preview before apply', async () => {
    const { result, setToastMessage } = renderActions()

    act(() => result.current.handleApplyS3ProviderPull())

    await waitFor(() => {
      expect(setToastMessage).toHaveBeenLastCalledWith('Run S3 provider pull preview before applying sync.')
    })
    expect(s3ProviderMocks.applyS3ProviderSync).not.toHaveBeenCalled()
  })

  it('blocks provider apply when preview has conflicts', async () => {
    const { result, setToastMessage } = renderActions()
    s3ProviderMocks.previewS3ProviderPush.mockResolvedValueOnce({
      ...s3ProviderPushPreview,
      conflicts: 1,
      operations: [{ kind: 'conflict', path: 'Notes/changed.md', reason: 'differs' }],
    })

    act(() => result.current.handlePreviewS3ProviderPush({ bucket: 'sriinnu-vault' }))
    await waitFor(() => expect(result.current.s3ProviderPushPreviewReport?.conflicts).toBe(1))
    expect(result.current.s3ProviderPushPreviewReady).toBe(false)

    act(() => result.current.handleApplyS3ProviderPush({ bucket: 'sriinnu-vault' }))

    await waitFor(() => {
      expect(setToastMessage).toHaveBeenLastCalledWith(
        'Resolve S3 provider push conflicts before applying sync.',
      )
    })
    expect(s3ProviderMocks.applyS3ProviderSync).not.toHaveBeenCalled()
  })

  it('keeps malformed provider previews from becoming apply-ready', async () => {
    const { result, setToastMessage } = renderActions()
    s3ProviderMocks.previewS3ProviderPush.mockResolvedValueOnce({
      ...s3ProviderPushPreview,
      preview_signature: '',
    })

    act(() => result.current.handlePreviewS3ProviderPush({ bucket: 'sriinnu-vault' }))
    await waitFor(() => expect(result.current.s3ProviderPushPreviewReport?.preview_signature).toBe(''))
    expect(result.current.s3ProviderPushPreviewReady).toBe(false)

    act(() => result.current.handleApplyS3ProviderPush({ bucket: 'sriinnu-vault' }))

    await waitFor(() => {
      expect(setToastMessage).toHaveBeenLastCalledWith(
        'Run S3 provider push preview again before applying sync.',
      )
    })
    expect(s3ProviderMocks.applyS3ProviderSync).not.toHaveBeenCalled()
  })

  it('blocks already-applied provider previews from replaying apply', async () => {
    const { result, setToastMessage } = renderActions()
    s3ProviderMocks.previewS3ProviderPull.mockResolvedValueOnce({
      ...s3ProviderPullPreview,
      applied: true,
    })

    act(() => result.current.handlePreviewS3ProviderPull({ bucket: 'sriinnu-vault' }))
    await waitFor(() => expect(result.current.s3ProviderPullPreviewReport?.applied).toBe(true))
    expect(result.current.s3ProviderPullPreviewReady).toBe(false)

    act(() => result.current.handleApplyS3ProviderPull({ bucket: 'sriinnu-vault' }))

    await waitFor(() => {
      expect(setToastMessage).toHaveBeenLastCalledWith(
        'Run S3 provider pull preview again before applying sync.',
      )
    })
    expect(s3ProviderMocks.applyS3ProviderSync).not.toHaveBeenCalled()
  })
})
