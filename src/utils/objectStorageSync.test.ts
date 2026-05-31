import { describe, expect, it } from 'vitest'
import {
  applyObjectStoragePull,
  applyObjectStoragePullWithProgress,
  applyObjectStoragePush,
  applyObjectStoragePushWithProgress,
  formatObjectStorageApplyToast,
  formatObjectStoragePreviewToast,
  formatS3LivePreflightToast,
  previewObjectStoragePull,
  previewObjectStoragePullWithProgress,
  previewObjectStoragePush,
  previewObjectStoragePushWithProgress,
  runS3LivePreflight,
  type ObjectStorageSyncReport,
} from './objectStorageSync'
import {
  applyAzureProviderSync,
  applyS3ProviderSync,
  previewAzureProviderPull,
  previewAzureProviderPush,
  previewS3ProviderPull,
  previewS3ProviderPush,
} from './objectStorageProviderSync'

const baseReport: ObjectStorageSyncReport = {
  provider_id: 's3',
  adapter_phase: 'local-mirror-prototype',
  prototype_mode: 'local-mirror-fixture',
  direction: 'push',
  mirror_path: '/tmp/mirror',
  preview_signature: 'sync-v1-test',
  applied: false,
  files_to_upload: 2,
  files_to_download: 0,
  files_to_delete: 1,
  conflicts: 1,
  excluded_files: 3,
  operations: [
    { kind: 'conflict', path: 'notes/changed.md', reason: 'Local and mirror differ' },
    { kind: 'exclude', path: 'Journal/private.md', reason: 'Protected by local-only policy' },
  ],
  sync_report_path: null,
  conflict_artifacts: [],
}

describe('objectStorageSync', () => {
  it('formats previews with conflicts and local-only exclusions visible', () => {
    expect(formatObjectStoragePreviewToast(baseReport))
      .toBe('S3 local-mirror fixture preview (not live cloud sync): 2 uploads, 0 downloads, 1 remote delete, 1 conflict, 3 local-only exclusions; conflicts: notes/changed.md; local-only: Journal/private.md')
  })

  it('redacts provider-style paths before showing preview plan toast details', () => {
    const toast = formatObjectStoragePreviewToast({
      ...baseReport,
      operations: [
        { kind: 'conflict', path: 's3://sriinnu-vault/private-prefix/changed.md', reason: 'Provider object differs' },
        { kind: 'exclude', path: 'azblob://secret-account/vault/private.md', reason: 'Provider object withheld' },
      ],
    })

    expect(toast).toContain('conflicts: redacted provider target')
    expect(toast).toContain('local-only: redacted provider target')
    expect(toast).not.toContain('s3://')
    expect(toast).not.toContain('azblob://')
    expect(toast).not.toContain('sriinnu-vault')
    expect(toast).not.toContain('secret-account')
    expect(toast).not.toContain('private-prefix')
  })

  it('labels provider-sdk previews without calling them local-mirror fixtures', () => {
    const providerReport: ObjectStorageSyncReport = {
      ...baseReport,
      adapter_phase: 'provider-sdk-adapter',
      prototype_mode: 's3-live-provider',
      mirror_path: 'redacted provider target',
    }

    expect(formatObjectStoragePreviewToast(providerReport))
      .toContain('S3 provider proof preview (not provider-proven sync yet)')
    expect(formatObjectStorageApplyToast({ ...providerReport, applied: true }))
      .toContain('S3 provider proof applied (not provider-proven sync yet)')
    expect(formatObjectStoragePreviewToast(providerReport)).not.toContain('local-mirror fixture')
    expect(formatObjectStorageApplyToast({ ...providerReport, applied: true })).not.toContain('local-mirror fixture')
  })

  it('formats applied syncs with the local report cue', () => {
    expect(formatObjectStorageApplyToast({
      ...baseReport,
      provider_id: 'azure-blob',
      applied: true,
      sync_report_path: '/vault/.grimoire/sync-reports/azure-blob-push-report.md',
    })).toBe('Azure Blob local-mirror fixture applied (not live cloud sync): 2 uploads, 0 downloads, 1 remote delete, 1 conflict, 3 local-only exclusions; local report written')
  })

  it('calls the mock preview command in browser mode', async () => {
    await expect(previewObjectStoragePush('/vault', '/mirror', 's3'))
      .resolves.toMatchObject({
        provider_id: 's3',
        adapter_phase: 'local-mirror-prototype',
        prototype_mode: 'local-mirror-fixture',
        files_to_upload: 2,
        excluded_files: 1,
      })
  })

  it('calls the mock pull preview command in browser mode', async () => {
    await expect(previewObjectStoragePull('/vault', '/mirror', 's3'))
      .resolves.toMatchObject({
        provider_id: 's3',
        direction: 'pull',
        files_to_download: 2,
      })
  })

  it('calls the mock apply command in browser mode', async () => {
    await expect(applyObjectStoragePush('/vault', '/mirror', 'azure-blob', 'sync-v1-test'))
      .resolves.toMatchObject({
        provider_id: 'azure-blob',
        applied: true,
        sync_report_path: '/vault/.grimoire/sync-reports/azure-blob-push-report.md',
      })
  })

  it('calls the mock S3 live preflight command in browser mode without local paths', async () => {
    await expect(runS3LivePreflight()).resolves.toMatchObject({
      provider_id: 's3',
      proof_level: 'live-read-only-preflight',
      status: 'missing_config',
      bucket_configured: false,
      head_bucket_checked: false,
    })
  })

  it('calls the mock S3 provider preview commands in browser mode', async () => {
    await expect(previewS3ProviderPush('/vault', {
      bucket: ' sriinnu-vault ',
      prefix: ' grimoire/demo ',
    })).resolves.toMatchObject({
      provider_id: 's3',
      adapter_phase: 'provider-sdk-adapter',
      prototype_mode: 's3-live-provider',
      direction: 'push',
      mirror_path: 'redacted provider target',
      files_to_upload: 1,
      excluded_files: 1,
    })

    await expect(previewS3ProviderPull('/vault', {
      bucket: 'sriinnu-vault',
      prefix: 'grimoire/demo',
    })).resolves.toMatchObject({
      direction: 'pull',
      files_to_download: 1,
    })
  })

  it('calls the mock S3 provider apply command in browser mode', async () => {
    await expect(applyS3ProviderSync('/vault', 'pull', 'sync-v1-test', {
      bucket: 'sriinnu-vault',
    })).resolves.toMatchObject({
      provider_id: 's3',
      adapter_phase: 'provider-sdk-adapter',
      applied: true,
      preview_signature: 'sync-v1-test',
      sync_report_path: '/vault/.grimoire/sync-reports/s3-provider-pull.md',
    })
  })

  it('calls the mock Azure provider commands in browser mode', async () => {
    await expect(previewAzureProviderPush('/vault', {
      account: ' acct ',
      container: ' vault ',
      prefix: ' grimoire/demo ',
    })).resolves.toMatchObject({
      provider_id: 'azure-blob',
      adapter_phase: 'provider-sdk-adapter',
      prototype_mode: 'azure-live-provider',
      direction: 'push',
      mirror_path: 'redacted provider target',
      files_to_upload: 1,
      excluded_files: 1,
    })

    await expect(previewAzureProviderPull('/vault', {
      account: 'acct',
      container: 'vault',
    })).resolves.toMatchObject({
      direction: 'pull',
      files_to_download: 1,
    })

    await expect(applyAzureProviderSync('/vault', 'pull', 'sync-v1-test', {
      account: 'acct',
      container: 'vault',
    })).resolves.toMatchObject({
      provider_id: 'azure-blob',
      adapter_phase: 'provider-sdk-adapter',
      applied: true,
      preview_signature: 'sync-v1-test',
      sync_report_path: '/vault/.grimoire/sync-reports/azure-provider-pull.md',
    })
  })

  it('passes optional S3 preflight scope through as redacted configured state', async () => {
    await expect(runS3LivePreflight({
      bucket: ' sriinnu-vault ',
      region: ' us-east-1 ',
      prefix: ' journals/dreams/ ',
    })).resolves.toMatchObject({
      status: 'reachable',
      bucket_configured: true,
      region_configured: true,
      prefix_configured: true,
      head_bucket_checked: true,
      list_prefix_checked: true,
    })
  })

  it('formats S3 live preflight status as a redacted proof summary', () => {
    expect(formatS3LivePreflightToast({
      provider_id: 's3',
      proof_level: 'live-read-only-preflight',
      configured: true,
      status: 'auth_denied',
      bucket_configured: true,
      region_configured: true,
      prefix_configured: false,
      head_bucket_checked: true,
      list_prefix_checked: false,
      message: 'AWS credentials were found, but S3 denied the read-only preflight.',
      checked_at: '2026-05-25T00:00:00Z',
    })).toBe('S3 live read-only preflight: access denied')
  })

  it('calls the mock pull apply command in browser mode', async () => {
    await expect(applyObjectStoragePull('/vault', '/mirror', 'azure-blob', 'sync-v1-test'))
      .resolves.toMatchObject({
        provider_id: 'azure-blob',
        direction: 'pull',
        applied: true,
        sync_report_path: '/vault/.grimoire/sync-reports/azure-blob-pull-report.md',
      })
  })

  it('reports mock preview progress in browser mode', async () => {
    const events: string[] = []

    await expect(previewObjectStoragePushWithProgress(
      '/vault',
      '/mirror',
      's3',
      'storage-preview-test',
      (event) => events.push(event.event),
    )).resolves.toMatchObject({
      provider_id: 's3',
      applied: false,
    })

    expect(events).toEqual(['Started', 'Progress', 'Finished'])
  })

  it('reports mock apply progress in browser mode', async () => {
    const events: string[] = []

    await expect(applyObjectStoragePushWithProgress(
      '/vault',
      '/mirror',
      'azure-blob',
      'sync-v1-test',
      'storage-apply-test',
      (event) => events.push(event.event),
    )).resolves.toMatchObject({
      provider_id: 'azure-blob',
      applied: true,
    })

    expect(events).toEqual(['Started', 'Progress', 'Finished'])
  })

  it('reports mock pull progress in browser mode', async () => {
    const events: string[] = []

    await expect(previewObjectStoragePullWithProgress(
      '/vault',
      '/mirror',
      's3',
      'storage-pull-preview-test',
      (event) => events.push(event.event),
    )).resolves.toMatchObject({
      direction: 'pull',
      files_to_download: 2,
    })

    await expect(applyObjectStoragePullWithProgress(
      '/vault',
      '/mirror',
      's3',
      'sync-v1-test',
      'storage-pull-apply-test',
      (event) => events.push(event.event),
    )).resolves.toMatchObject({
      direction: 'pull',
      applied: true,
    })

    expect(events).toEqual(['Started', 'Progress', 'Finished', 'Started', 'Progress', 'Finished'])
  })
})
