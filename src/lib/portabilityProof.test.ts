import { describe, expect, it } from 'vitest'
import {
  listPortabilityProofRows,
  OBJECT_STORAGE_LIVE_PROOF_COMMAND,
  OBJECT_STORAGE_LIVE_PROOF_DRY_RUN_COMMAND,
  parseObjectStorageLiveProofReport,
  portabilityProofLevelLabel,
} from './portabilityProof'

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
    const combined = listPortabilityProofRows()
      .flatMap(row => [
        row.detail,
        row.evidence,
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

    expect(combined).toContain('Apple Journal')
    expect(combined).toContain('fresh real-world exports')
    expect(combined).toContain('JSON/SQLite capsules have local import regressions')
    expect(combined).toContain('S3 has a read-only HeadBucket/ListObjectsV2 preflight')
    expect(combined).toContain('Azure has a read-only CLI container/list preflight')
    expect(combined).toContain('provider preview/apply contracts')
    expect(combined).toContain('pnpm test:object-storage-live -- --report .tmp/object-storage-live-proof.json')
    expect(combined).toContain('pnpm test:object-storage-live -- --dry-run --report .tmp/object-storage-live-proof.json')
    expect(combined).toContain('pass/fail/missing-config status')
    expect(combined).toContain('No provider writes')
    expect(combined).toContain('GRIMOIRE_S3_LIVE_WRITE_PROOF')
    expect(combined).toContain('GRIMOIRE_AZURE_STORAGE_ACCOUNT')
    expect(combined).toContain('permission, auth, conflict')
    expect(combined).toContain('exact preview signatures')
    expect(combined).toContain('local read proof for iCloud/GDrive')
    expect(combined).toContain('Run the live provider proof runner')
    expect(combined).toContain('Provider quota, offline recovery')
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
        status: 'ready',
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

  it('loads sanitized provider proof runner reports without provider targets', () => {
    const report = parseObjectStorageLiveProofReport(JSON.stringify({
      schema: 'grimoire-object-storage-live-proof-v1',
      generated_at: '2026-05-28T12:30:00Z',
      finished_at: '2026-05-28T12:35:00Z',
      provider_filter: 'all',
      summary: { status: 'passed', message: 'wrote /Users/sriinnu/.aws and s3://secret-bucket' },
      providers: [
        {
          id: 's3',
          label: 's3://secret-bucket/private-prefix',
          enabled: true,
          gate: { name: 'GRIMOIRE_S3_LIVE_WRITE_PROOF', state: 'set' },
          required: { GRIMOIRE_S3_BUCKET: 'set', AWS_SECRET_ACCESS_KEY: 'set' },
          optional: { GRIMOIRE_S3_REGION: 'set', GRIMOIRE_S3_PREFIX: 'set', TOKEN: 'set' },
          status: 'passed',
          message: 'provider returned token=abc',
        },
        {
          id: 'azure',
          label: 'azblob://secret-account/private-container',
          enabled: true,
          gate: { name: 'GRIMOIRE_AZURE_LIVE_WRITE_PROOF', state: 'set' },
          required: {
            GRIMOIRE_AZURE_CONTAINER: 'missing',
            GRIMOIRE_AZURE_STORAGE_ACCOUNT: 'set',
            PASSWORD: 'set',
          },
          optional: { GRIMOIRE_AZURE_PREFIX: 'missing' },
          status: 'missing_config',
          message: '/Users/sriinnu/Library/Azure leaked here',
        },
      ],
    }))

    expect(report?.summary.message).toBe('Redacted provider proof report loaded.')
    expect(report?.providers[0]).toMatchObject({
      id: 's3',
      gate: { name: 'GRIMOIRE_S3_LIVE_WRITE_PROOF', state: 'set' },
      required: { GRIMOIRE_S3_BUCKET: 'set' },
      optional: { GRIMOIRE_S3_REGION: 'set', GRIMOIRE_S3_PREFIX: 'set' },
      status: 'passed',
    })
    expect(report?.providers[1]?.required).toEqual({
      GRIMOIRE_AZURE_CONTAINER: 'missing',
      GRIMOIRE_AZURE_STORAGE_ACCOUNT: 'set',
    })

    const runner = listPortabilityProofRows({ objectStorageLiveProofReport: report })
      .find(row => row.id === 'provider-proof-runner')
    expect(runner?.liveProofs).toEqual([
      {
        id: 'provider-report-summary',
        label: 'Latest proof report',
        status: 'passed',
        detail: 'scope all; 1 passed, 1 missing config; generated 2026-05-28T12:30:00Z; finished 2026-05-28T12:35:00Z',
      },
      {
        id: 's3-provider-proof',
        label: 'S3 provider proof',
        status: 'passed',
        detail: 'gate set; 1/1 required set; 2/2 optional set; preview/apply/pull proof passed',
      },
      {
        id: 'azure-provider-proof',
        label: 'Azure provider proof',
        status: 'missing config',
        detail: 'gate set; 1/2 required set; 0/1 optional set; missing config recorded',
      },
    ])
    expect(JSON.stringify(runner?.liveProofs)).not.toMatch(/s3:\/\/|azblob:\/\/|\/Users\//)
    expect(JSON.stringify(report)).not.toContain('secret-bucket')
    expect(JSON.stringify(report)).not.toContain('AWS_SECRET_ACCESS_KEY')
    expect(JSON.stringify(report)).not.toContain('TOKEN')
    expect(JSON.stringify(report)).not.toContain('PASSWORD')
  })

  it('sanitizes proof report timestamps before storing pasted report state', () => {
    const report = parseObjectStorageLiveProofReport(JSON.stringify({
      schema: 'grimoire-object-storage-live-proof-v1',
      generated_at: '/Users/sriinnu/.aws s3://secret-bucket',
      finished_at: 'azblob://secret-account/container',
      provider_filter: 's3',
      summary: { status: 'passed', message: 'done' },
      providers: [
        {
          id: 's3',
          enabled: true,
          gate: { name: 'GRIMOIRE_S3_LIVE_WRITE_PROOF', state: 'set' },
          required: { GRIMOIRE_S3_BUCKET: 'set' },
          optional: {},
          status: 'passed',
        },
      ],
    }))

    expect(report?.generated_at).toBe('redacted-time')
    expect(report?.finished_at).toBe('redacted-time')
    expect(JSON.stringify(report)).not.toMatch(/\/Users\/|s3:\/\/|azblob:\/\//)
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
