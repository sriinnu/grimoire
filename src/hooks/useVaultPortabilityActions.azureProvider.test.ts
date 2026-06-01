import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { ObjectStorageSyncReport } from '../utils/objectStorageSync'
import { useVaultPortabilityActions } from './useVaultPortabilityActions'

const azureProviderPushPreview: ObjectStorageSyncReport = {
  provider_id: 'azure-blob',
  adapter_phase: 'provider-sdk-adapter',
  prototype_mode: 'azure-live-provider',
  direction: 'push',
  mirror_path: 'redacted provider target',
  preview_signature: 'azure-provider-push-signature',
  applied: false,
  files_to_upload: 1,
  files_to_download: 0,
  files_to_delete: 0,
  conflicts: 0,
  excluded_files: 1,
  operations: [{ kind: 'exclude', path: 'Journal/private.md', reason: 'local-only' }],
  sync_report_path: null,
  conflict_artifacts: [],
}

const azureProviderPullPreview: ObjectStorageSyncReport = {
  ...azureProviderPushPreview,
  direction: 'pull',
  preview_signature: 'azure-provider-pull-signature',
  files_to_upload: 0,
  files_to_download: 1,
  operations: [{ kind: 'download', path: 'Notes/remote.md', reason: 'Missing from local working copy' }],
}

const providerMocks = vi.hoisted(() => ({
  previewS3ProviderPush: vi.fn(),
  previewS3ProviderPull: vi.fn(),
  applyS3ProviderSync: vi.fn(),
  previewAzureProviderPush: vi.fn(),
  previewAzureProviderPull: vi.fn(),
  applyAzureProviderSync: vi.fn(),
}))

vi.mock('../utils/objectStorageProviderSync', () => providerMocks)

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

describe('useVaultPortabilityActions Azure provider lane', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    providerMocks.previewAzureProviderPush.mockResolvedValue(azureProviderPushPreview)
    providerMocks.previewAzureProviderPull.mockResolvedValue(azureProviderPullPreview)
    providerMocks.applyAzureProviderSync.mockImplementation(async (
      _vaultPath: string,
      direction: 'push' | 'pull',
    ) => ({
      ...(direction === 'push' ? azureProviderPushPreview : azureProviderPullPreview),
      applied: true,
      sync_report_path: `/vault/.grimoire/sync-reports/azure-provider-${direction}.md`,
    }))
  })

  it('stores provider push previews separately from the local-mirror fixture', async () => {
    const { result, setToastMessage } = renderActions()

    act(() => result.current.handlePreviewAzureProviderPush({
      account: ' acct ',
      container: ' vault ',
      prefix: ' notes/ ',
    }))

    await waitFor(() => expect(result.current.azureProviderPushPreviewReady).toBe(true))
    expect(result.current.azureProviderPushPreviewReport).toEqual(azureProviderPushPreview)
    expect(result.current.azureMirrorPreviewReady).toBe(false)
    expect(providerMocks.previewAzureProviderPush).toHaveBeenCalledWith('/vault', {
      account: 'acct',
      container: 'vault',
      prefix: 'notes/',
    })
    expect(setToastMessage).toHaveBeenLastCalledWith(expect.stringContaining('Azure provider push preview'))
  })

  it('blocks apply when Azure target fields changed after preview', async () => {
    const { result, setToastMessage } = renderActions()

    act(() => result.current.handlePreviewAzureProviderPush({
      account: 'acct',
      container: 'vault',
      prefix: 'notes/',
    }))
    await waitFor(() => expect(result.current.azureProviderPushPreviewReady).toBe(true))

    act(() => result.current.handleApplyAzureProviderPush({
      account: 'changed-after-preview',
      prefix: 'wrong/',
    }))

    await waitFor(() => {
      expect(setToastMessage).toHaveBeenLastCalledWith(
        'Azure provider target changed; run push preview again before applying sync.',
      )
    })
    expect(providerMocks.applyAzureProviderSync).not.toHaveBeenCalled()
    expect(result.current.azureProviderPushPreviewReady).toBe(true)
  })

  it('applies with the exact preview signature and previewed Azure target args', async () => {
    const { result, loadModifiedFiles } = renderActions()

    act(() => result.current.handlePreviewAzureProviderPush({
      account: 'acct',
      container: 'vault',
      prefix: 'notes/',
    }))
    await waitFor(() => expect(result.current.azureProviderPushPreviewReady).toBe(true))

    act(() => result.current.handleApplyAzureProviderPush({
      account: 'acct',
      container: 'vault',
      prefix: 'notes/',
    }))

    await waitFor(() => expect(result.current.azureProviderPushPreviewReady).toBe(false))
    expect(providerMocks.applyAzureProviderSync).toHaveBeenCalledWith('/vault', 'push', 'azure-provider-push-signature', {
      account: 'acct',
      container: 'vault',
      prefix: 'notes/',
    })
    expect(loadModifiedFiles).toHaveBeenCalledOnce()
  })

  it('fully reloads the vault after provider pull apply', async () => {
    const { result, loadModifiedFiles, reloadFolders, reloadVault } = renderActions()

    act(() => result.current.handlePreviewAzureProviderPull({ account: 'acct', container: 'vault' }))
    await waitFor(() => expect(result.current.azureProviderPullPreviewReady).toBe(true))

    act(() => result.current.handleApplyAzureProviderPull({ account: 'acct', container: 'vault' }))

    await waitFor(() => expect(result.current.azureProviderPullPreviewReady).toBe(false))
    expect(providerMocks.applyAzureProviderSync).toHaveBeenCalledWith('/vault', 'pull', 'azure-provider-pull-signature', {
      account: 'acct',
      container: 'vault',
    })
    expect(reloadVault).toHaveBeenCalledOnce()
    expect(reloadFolders).toHaveBeenCalledOnce()
    expect(loadModifiedFiles).toHaveBeenCalledOnce()
  })

  it('blocks provider apply when preview has conflicts', async () => {
    const { result, setToastMessage } = renderActions()
    providerMocks.previewAzureProviderPush.mockResolvedValueOnce({
      ...azureProviderPushPreview,
      conflicts: 1,
      operations: [{ kind: 'conflict', path: 'Notes/changed.md', reason: 'differs' }],
    })

    act(() => result.current.handlePreviewAzureProviderPush({ account: 'acct', container: 'vault' }))
    await waitFor(() => expect(result.current.azureProviderPushPreviewReport?.conflicts).toBe(1))
    expect(result.current.azureProviderPushPreviewReady).toBe(false)

    act(() => result.current.handleApplyAzureProviderPush({ account: 'acct', container: 'vault' }))

    await waitFor(() => {
      expect(setToastMessage).toHaveBeenLastCalledWith(
        'Resolve Azure provider push conflicts before applying sync.',
      )
    })
    expect(providerMocks.applyAzureProviderSync).not.toHaveBeenCalled()
  })

  it('keeps malformed provider previews from becoming apply-ready', async () => {
    const { result, setToastMessage } = renderActions()
    providerMocks.previewAzureProviderPush.mockResolvedValueOnce({
      ...azureProviderPushPreview,
      preview_signature: '',
    })

    act(() => result.current.handlePreviewAzureProviderPush({ account: 'acct', container: 'vault' }))
    await waitFor(() => expect(result.current.azureProviderPushPreviewReport?.preview_signature).toBe(''))
    expect(result.current.azureProviderPushPreviewReady).toBe(false)

    act(() => result.current.handleApplyAzureProviderPush({ account: 'acct', container: 'vault' }))

    await waitFor(() => {
      expect(setToastMessage).toHaveBeenLastCalledWith(
        'Run Azure provider push preview again before applying sync.',
      )
    })
    expect(providerMocks.applyAzureProviderSync).not.toHaveBeenCalled()
  })

  it('blocks already-applied provider previews from replaying apply', async () => {
    const { result, setToastMessage } = renderActions()
    providerMocks.previewAzureProviderPull.mockResolvedValueOnce({
      ...azureProviderPullPreview,
      applied: true,
    })

    act(() => result.current.handlePreviewAzureProviderPull({ account: 'acct', container: 'vault' }))
    await waitFor(() => expect(result.current.azureProviderPullPreviewReport?.applied).toBe(true))
    expect(result.current.azureProviderPullPreviewReady).toBe(false)

    act(() => result.current.handleApplyAzureProviderPull({ account: 'acct', container: 'vault' }))

    await waitFor(() => {
      expect(setToastMessage).toHaveBeenLastCalledWith(
        'Run Azure provider pull preview again before applying sync.',
      )
    })
    expect(providerMocks.applyAzureProviderSync).not.toHaveBeenCalled()
  })
})
