import { describe, expect, it } from 'vitest'
import {
  applyObjectStoragePull,
  applyObjectStoragePullWithProgress,
  applyObjectStoragePush,
  applyObjectStoragePushWithProgress,
  formatObjectStorageApplyToast,
  formatObjectStoragePreviewToast,
  previewObjectStoragePull,
  previewObjectStoragePullWithProgress,
  previewObjectStoragePush,
  previewObjectStoragePushWithProgress,
  type ObjectStorageSyncReport,
} from './objectStorageSync'

const baseReport: ObjectStorageSyncReport = {
  provider_id: 's3',
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
      .toBe('S3 preview: 2 uploads, 0 downloads, 1 remote delete, 1 conflict, 3 local-only exclusions; conflicts: notes/changed.md; local-only: Journal/private.md')
  })

  it('formats applied syncs with the local report cue', () => {
    expect(formatObjectStorageApplyToast({
      ...baseReport,
      provider_id: 'azure-blob',
      applied: true,
      sync_report_path: '/vault/.grimoire/sync-reports/azure-blob-push-report.md',
    })).toBe('Azure Blob sync applied: 2 uploads, 0 downloads, 1 remote delete, 1 conflict, 3 local-only exclusions; local report written')
  })

  it('calls the mock preview command in browser mode', async () => {
    await expect(previewObjectStoragePush('/vault', '/mirror', 's3'))
      .resolves.toMatchObject({
        provider_id: 's3',
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
