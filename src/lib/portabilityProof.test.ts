import { describe, expect, it } from 'vitest'
import {
  listPortabilityProofRows,
  OBJECT_STORAGE_LIVE_PROOF_COMMAND,
  OBJECT_STORAGE_LIVE_PROOF_DRY_RUN_COMMAND,
  portabilityProofLevelLabel,
} from './portabilityProof'
import type { ObjectStorageSyncReport } from '../utils/objectStorageSync'

const providerPreviewReport: ObjectStorageSyncReport = {
  provider_id: 's3',
  adapter_phase: 'provider-sdk-adapter',
  prototype_mode: 's3-live-provider',
  direction: 'push',
  mirror_path: 'redacted provider target',
  preview_signature: 'sync-v1:test',
  applied: false,
  files_to_upload: 1,
  files_to_download: 0,
  files_to_delete: 0,
  conflicts: 2,
  excluded_files: 3,
  operations: [
    { kind: 'conflict', path: 's3://secret-bucket/private-prefix/changed.md', reason: 'conflict' },
    { kind: 'exclude', path: '/Users/sriinnu/mockups/private.png', reason: 'local only' },
  ],
  sync_report_path: null,
  conflict_artifacts: [],
}

describe('portabilityProof', () => {
  it('separates support status from proof level', () => {
    const rows = listPortabilityProofRows()
    const rowById = Object.fromEntries(rows.map(row => [row.id, row]))

    expect(rows.map(row => row.id)).toEqual([
      'imports',
      'exports',
      'desktop-sync',
      'object-storage',
      'provider-proof-runner',
    ])
    expect(rowById.imports.supportStatus).toBe('ready')
    expect(rowById.imports.proofLevel).toBe('fixture-regression')
    expect(rowById['desktop-sync'].supportStatus).toBe('folder-proof')
    expect(rowById['desktop-sync'].proofLevel).toBe('provider-managed-local-folder')
    expect(rowById['object-storage'].supportStatus).toBe('fixture')
    expect(rowById['object-storage'].proofLevel).toBe('live-read-only-plus-local-mirror')
    expect(rowById['provider-proof-runner'].supportStatus).toBe('available')
    expect(rowById['provider-proof-runner'].proofLevel).toBe('live-provider-proof-runner')
    expect(rowById['provider-proof-runner'].commands?.map(command => command.command)).toEqual([
      OBJECT_STORAGE_LIVE_PROOF_DRY_RUN_COMMAND,
      OBJECT_STORAGE_LIVE_PROOF_COMMAND,
    ])
    expect(rowById['provider-proof-runner'].providerRequirements?.map(requirement => requirement.id)).toEqual([
      's3',
      'azure',
    ])
  })

  it('keeps remaining provider gaps explicit without leaking local paths', () => {
    const rows = listPortabilityProofRows()
    const publicCopy = rows
      .flatMap(row => [row.detail, row.evidence])
      .join('\n')
    const developerProof = rows
      .flatMap(row => [
        row.remainingProof,
        ...(row.commands ?? []).flatMap(command => [command.command, command.detail]),
        ...(row.providerRequirements ?? []).flatMap(requirement => [
          requirement.gate,
          ...requirement.required,
          ...requirement.optional,
          requirement.proofNeed,
        ]),
      ])
      .join('\n')
    const combined = `${publicCopy}\n${developerProof}`

    expect(combined).toContain('Apple Journal')
    expect(combined).toContain('fresh real-world exports')
    expect(combined).toContain('JSON/SQLite capsules have local import regressions')
    expect(combined).toContain('S3 has a read-only HeadBucket/ListObjectsV2 preflight')
    expect(combined).toContain('Azure has a read-only CLI container/list preflight')
    expect(combined).toContain('provider preview/apply contracts')
    expect(combined).toContain('pnpm test:object-storage-live -- --report .tmp/object-storage-live-proof.json')
    expect(combined).toContain('pnpm test:object-storage-live -- --dry-run --report .tmp/object-storage-live-proof.json')
    expect(combined).toContain('pass, fail, or missing-config status')
    expect(combined).toContain('No provider writes')
    expect(combined).toContain('GRIMOIRE_S3_LIVE_WRITE_PROOF')
    expect(combined).toContain('GRIMOIRE_AZURE_STORAGE_ACCOUNT')
    expect(combined).toContain('permission, auth, conflict')
    expect(combined).toContain('exact preview signatures')
    expect(combined).toContain('folder proof paths; provider sync not proven')
    expect(combined).toContain('Settings proves local folder readability only')
    expect(combined).toContain('Run the live provider proof runner')
    expect(combined).toContain('Provider quota, offline recovery')
    expect(publicCopy).toContain('Load a redacted live proof report')
    expect(publicCopy).not.toContain('pnpm test:object-storage-live')
    expect(publicCopy).not.toContain('GRIMOIRE_S3_LIVE_WRITE_PROOF')
    expect(publicCopy).not.toContain('GRIMOIRE_AZURE_STORAGE_ACCOUNT')
    expect(combined).not.toContain('capsule re-import')
    expect(combined).not.toMatch(/\/Users\//)
    expect(combined).not.toMatch(/secret|token|password/i)
  })

  it('adds redacted live preflight evidence when Settings has provider reports', () => {
    const objectStorage = listPortabilityProofRows({
      azureLivePreflightReport: {
        account_configured: true,
        checked_at: '2026-05-28T12:00:00Z',
        configured: true,
        container_checked: true,
        container_configured: true,
        list_prefix_checked: true,
        prefix_configured: false,
        status: 'missing_credentials',
      },
      s3LivePreflightReport: {
        bucket_configured: true,
        checked_at: '2026-05-28T11:00:00Z',
        configured: true,
        head_bucket_checked: true,
        list_prefix_checked: true,
        prefix_configured: false,
        region_configured: true,
        status: 'reachable',
      },
    }).find(row => row.id === 'object-storage')

    expect(objectStorage?.liveProofs).toEqual([
      {
        id: 's3-read-only',
        label: 'S3 read-only preflight',
        status: 'reachable',
        detail: 'config set; bucket set; region set; prefix optional; HeadBucket checked; prefix list checked; checked 2026-05-28T11:00:00Z',
      },
      {
        id: 'azure-read-only',
        label: 'Azure read-only preflight',
        status: 'missing credentials',
        detail: 'config set; account set; container set; prefix optional; container checked; prefix list checked; checked 2026-05-28T12:00:00Z',
      },
    ])
    expect(JSON.stringify(objectStorage?.liveProofs)).not.toMatch(/s3:\/\/|azblob:\/\/|\/Users\//)
  })

  it('lifts provider preview reports into object-storage proof without provider targets', () => {
    const objectStorage = listPortabilityProofRows({
      objectStorageProviderPreviewReports: {
        azurePull: {
          ...providerPreviewReport,
          provider_id: 'azure-blob',
          prototype_mode: 'azure-live-provider',
          direction: 'pull',
          conflicts: 0,
          excluded_files: 1,
        },
        s3Push: providerPreviewReport,
      },
    }).find(row => row.id === 'object-storage')

    expect(objectStorage?.liveProofs).toEqual([
      {
        id: 's3-provider-push-preview',
        label: 'S3 provider push preview',
        status: 'reviewed preview',
        detail: 's3-live-provider push; 2 conflicts; 3 local-only withheld; signature captured; not provider-proven sync yet',
      },
      {
        id: 'azure-provider-pull-preview',
        label: 'Azure provider pull preview',
        status: 'reviewed preview',
        detail: 'azure-live-provider pull; 0 conflicts; 1 local-only withheld; signature captured; not provider-proven sync yet',
      },
    ])
    expect(JSON.stringify(objectStorage?.liveProofs)).not.toMatch(/s3:\/\/|azblob:\/\/|\/Users\/|secret-bucket|private-prefix/i)
  })

  it('adds redacted desktop-folder proof when Settings checks iCloud or Google Drive', () => {
    const desktopSync = listPortabilityProofRows({
      desktopStorageHealthReports: {
        'icloud-drive': {
          checked_at: '2026-05-28T13:00:00Z',
          configured: true,
          credentials_stored: false,
          local_path_checked: true,
          provider_id: 'icloud-drive',
          provider_root_detected: true,
          readable: true,
          status: 'ready',
          vault_directory_checked: true,
        },
        'google-drive-desktop': {
          checked_at: '/Users/sriinnu/Library/CloudStorage token=abc',
          configured: false,
          credentials_stored: false,
          local_path_checked: true,
          provider_id: 'google-drive-desktop',
          provider_root_detected: false,
          readable: false,
          status: 'provider_root_missing',
          vault_directory_checked: false,
        },
      },
    }).find(row => row.id === 'desktop-sync')

    expect(desktopSync?.liveProofs).toEqual([
      {
        id: 'icloud-drive-folder',
        label: 'iCloud Drive folder proof',
        status: 'folder readable',
        detail: 'configured; local path checked; provider root detected; vault folder checked; readable; credentials not stored; checked 2026-05-28T13:00:00Z',
      },
      {
        id: 'google-drive-desktop-folder',
        label: 'Google Drive Desktop folder proof',
        status: 'provider root missing',
        detail: 'not configured; local path checked; provider root not detected; vault folder not checked; not readable; credentials not stored; checked redacted-time',
      },
    ])
    expect(JSON.stringify(desktopSync?.liveProofs)).not.toMatch(/\/Users\/|token|secret|password/i)
  })

  it('lifts reviewed capsule import and export previews without source paths', () => {
    const rows = listPortabilityProofRows({
      capsuleExportPreview: {
        format: 'json',
        result: {
          assets_exportable: 1,
          bytes_exportable: 2048,
          files_exportable: 4,
          format: 'json',
          preview_signature: 'capsule-preview-v1:test',
          locality_proof: {
            absolute_source_paths_redacted: true,
            local_only_files_withheld: 2,
            markdown_source_of_truth: true,
          },
          manifest_rows: [{ bytes: 128, kind: 'markdown', path: '/Users/sriinnu/private.md' }],
          notes_exportable: 3,
          skipped_files: 2,
        },
      },
      capsuleImportPreview: {
        sourceId: 'sqlite-capsule-preview',
        result: {
          assets_to_copy: 1,
          failed_files: 0,
          manifest_rows: [{ detail: '/Users/sriinnu/private.md', kind: 'withheld', source_path: '/Users/sriinnu/private.md' }],
          notes_to_copy: 3,
          planned_import_root: '/Users/sriinnu/Grimoire/imports',
          preview_signature: 'capsule-import-preview-v1:test',
          skipped_files: 2,
          source_path: '/Users/sriinnu/export.sqlite',
          writes_local_only_report: true,
        },
      },
    })
    const imports = rows.find(row => row.id === 'imports')
    const exports = rows.find(row => row.id === 'exports')

    expect(exports?.liveProofs).toEqual([{
      id: 'json-capsule-export-preview',
      label: 'JSON capsule export preview',
      status: 'reviewed',
      detail: '4 files; 3 notes; 1 assets; 2 withheld; 2048 bytes; Markdown source of truth; absolute paths redacted',
    }])
    expect(imports?.liveProofs).toEqual([{
      id: 'sqlite-capsule-import-preview',
      label: 'SQLite capsule import preview',
      status: 'reviewed',
      detail: '3 notes; 1 assets; 2 withheld; 0 failed; local-only report planned',
    }])
    expect(JSON.stringify([imports?.liveProofs, exports?.liveProofs])).not.toMatch(/\/Users\/|private\.md|token|secret|password/i)
  })

  it('uses compact user-facing proof labels', () => {
    expect(portabilityProofLevelLabel('fixture-regression')).toBe('fixture/regression')
    expect(portabilityProofLevelLabel('local-regression')).toBe('local regression')
    expect(portabilityProofLevelLabel('provider-managed-local-folder')).toBe('desktop folder')
    expect(portabilityProofLevelLabel('local-mirror-fixture')).toBe('local mirror')
    expect(portabilityProofLevelLabel('live-read-only-plus-local-mirror')).toBe('preflight + preview')
    expect(portabilityProofLevelLabel('live-provider-proof-runner')).toBe('live proof runner')
  })
})
