import { fireEvent, render, screen, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { PortabilityExportPreviewState } from '../lib/exportReviewGate'
import { createTranslator } from '../lib/i18n'
import type { ImportAutopsyPreviewState } from '../lib/vaultPortability'
import { makeEntry } from '../test-utils/noteListTestUtils'
import type { AzureLivePreflightReport } from '../utils/objectStorageLivePreflight'
import type { ObjectStorageSyncReport, S3LivePreflightReport } from '../utils/objectStorageSync'
import { PortabilitySettingsSection } from './PortabilitySettingsSection'

const importPreview: ImportAutopsyPreviewState = {
  sourceId: 'markdown-folder-preview',
  result: {
    source_path: '/Users/sri/Downloads/Research',
    planned_import_root: '/Users/sri/Vault/imports/markdown',
    notes_to_copy: 3,
    assets_to_copy: 1,
    skipped_files: 0,
    failed_files: 0,
    writes_local_only_report: true,
  },
}

const exportPreview: PortabilityExportPreviewState = {
  format: 'json',
  result: {
    format: 'json',
    files_exportable: 4,
    notes_exportable: 3,
    assets_exportable: 1,
    skipped_files: 2,
    bytes_exportable: 2048,
    locality_proof: {
      absolute_source_paths_redacted: true,
      local_only_files_withheld: 2,
      markdown_source_of_truth: true,
    },
    manifest_rows: [],
  },
}

const storagePreview: ObjectStorageSyncReport = {
  provider_id: 's3',
  adapter_phase: 'local-mirror-prototype',
  prototype_mode: 'local-mirror-fixture',
  direction: 'push',
  mirror_path: '/Users/sri/Private/Mirrors/s3-bucket',
  preview_signature: 'sync-v1-test',
  applied: false,
  files_to_upload: 2,
  files_to_download: 0,
  files_to_delete: 1,
  conflicts: 1,
  excluded_files: 2,
  operations: [
    { kind: 'conflict', path: 'Notes/changed.md', reason: 'Local and mirror differ' },
    { kind: 'exclude', path: 'Journal/private.md', reason: 'Protected by local-only policy' },
  ],
  sync_report_path: null,
  conflict_artifacts: [],
}

const s3ProviderPreview: ObjectStorageSyncReport = {
  ...storagePreview,
  adapter_phase: 'provider-sdk-adapter',
  prototype_mode: 's3-live-provider',
  mirror_path: 's3://sriinnu-vault/notes/',
  preview_signature: 's3-provider-preview',
  operations: [
    { kind: 'exclude', path: 'Journal/private.md', reason: 'Protected by local-only policy' },
  ],
}

const azureProviderPreview: ObjectStorageSyncReport = {
  ...storagePreview,
  provider_id: 'azure-blob',
  adapter_phase: 'provider-sdk-adapter',
  prototype_mode: 'azure-live-provider',
  mirror_path: 'azblob://acct/vault/notes',
  preview_signature: 'azure-provider-preview',
  operations: [
    { kind: 'exclude', path: 'Journal/private.md', reason: 'Protected by local-only policy' },
  ],
}

const s3Preflight: S3LivePreflightReport = {
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

const azurePreflight: AzureLivePreflightReport = {
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

describe('PortabilitySettingsSection', () => {
  it('surfaces import, export, storage, and second-brain lanes', () => {
    render(
      <PortabilitySettingsSection
        t={createTranslator('en')}
        vaultPath="/Users/sri/Library/Mobile Documents/com~apple~CloudDocs/Grimoire"
        entries={[
          makeEntry({ title: 'Public Plan', isA: 'Note' }),
          makeEntry({ title: 'Dream Thread', isA: 'Dream' }),
          makeEntry({ title: 'Private Memory', isA: 'Memory' }),
          makeEntry({ title: 'Blocked Export', properties: { egress: 'blocked' } }),
        ]}
      />,
    )

    const firewall = within(screen.getByTestId('locality-firewall-card'))
    expect(firewall.getByText('Locality Firewall')).toBeInTheDocument()
    expect(firewall.getByText('Protected local-only')).toBeInTheDocument()
    expect(firewall.getByText('Allowed by default')).toBeInTheDocument()
    expect(firewall.getByText('Memory 1')).toBeInTheDocument()
    expect(firewall.getByText(/no silent cloud or remote egress/)).toBeInTheDocument()
    const actionDeck = screen.getByTestId('settings-portability-action-deck')
    const proofLedger = within(screen.getByTestId('portability-proof-ledger'))
    expect(proofLedger.getByText('Portability Status')).toBeInTheDocument()
    expect(actionDeck.compareDocumentPosition(screen.getByTestId('portability-proof-ledger'))).toBe(Node.DOCUMENT_POSITION_FOLLOWING)
    expect(screen.getByTestId('portability-proof-imports')).toHaveAttribute('data-support-status', 'ready')
    expect(screen.getByTestId('portability-proof-imports')).toHaveAttribute('data-proof-level', 'fixture-regression')
    expect(screen.getByTestId('portability-proof-imports')).toHaveTextContent(/no-write preview adapters/)
    expect(screen.getByTestId('portability-proof-imports')).toHaveTextContent('Apple Journal')
    expect(screen.getByTestId('portability-proof-desktop-sync')).toHaveTextContent('Google Drive Desktop')
    expect(screen.getByTestId('portability-proof-desktop-sync')).not.toHaveTextContent('Provider quota, offline recovery')
    fireEvent.click(screen.getByTestId('portability-proof-details-toggle-desktop-sync'))
    expect(screen.getByTestId('portability-proof-desktop-sync')).toHaveTextContent('Provider quota, offline recovery')
    expect(screen.getByTestId('portability-proof-object-storage')).toHaveAttribute('data-support-status', 'fixture')
    expect(screen.getByTestId('portability-proof-object-storage')).toHaveAttribute('data-proof-level', 'live-read-only-plus-local-mirror')
    expect(screen.getByTestId('portability-proof-object-storage')).toHaveTextContent('S3 has a read-only HeadBucket/ListObjectsV2 preflight')
    expect(screen.getByTestId('portability-proof-object-storage')).not.toHaveTextContent('/Users/')
    expect(screen.getByTestId('settings-portability-section')).toBeInTheDocument()
    expect(screen.getByTestId('settings-portability-section').querySelector('.grimoire-portability-card')).toBeInTheDocument()
    expect(screen.getByTestId('settings-storage-health')).toBeInTheDocument()
    expect(screen.getByTestId('settings-desktop-storage-health')).toHaveClass('grimoire-portability-inline-panel')
    expect(screen.getByTestId('settings-desktop-storage-health')).not.toHaveClass('grimoire-portability-card')
    expect(screen.getByText('Bear')).toBeInTheDocument()
    expect(screen.getByText('Obsidian')).toBeInTheDocument()
    expect(screen.getByText('Notion Markdown')).toBeInTheDocument()
    expect(screen.getByText('Spanda')).toBeInTheDocument()
    expect(screen.getByText('JSON capsule')).toBeInTheDocument()
    expect(screen.getByText('SQLite capsule')).toBeInTheDocument()
    expect(screen.getAllByText('Git remote')).toHaveLength(2)
    expect(screen.getByText('Pure JSON snapshot')).toBeInTheDocument()
    expect(screen.getByText('Local SQLite snapshot')).toBeInTheDocument()
    expect(screen.getAllByText('iCloud Drive').length).toBeGreaterThanOrEqual(1)
    expect(screen.getByText('Amazon S3')).toBeInTheDocument()
    expect(screen.getByText('Azure Blob Storage')).toBeInTheDocument()
    expect(screen.getByText('Apple Journal')).toBeInTheDocument()
    expect(screen.getByText('Journal capture')).toBeInTheDocument()
    expect(screen.getByText('Memory graph')).toBeInTheDocument()
    expect(actionDeck).toBeInTheDocument()
    expect(actionDeck).toHaveClass('grimoire-portability-action-deck')
    expect(screen.getByRole('tablist')).toHaveClass('grimoire-portability-lanes')
    expect(screen.getByText('Move vault data')).toBeInTheDocument()
    expect(screen.getByTestId('settings-portability-lane-markdown')).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByTestId('settings-portability-preview-gate')).toHaveTextContent('Preview first to unlock')
    expect(screen.getByText('Preview Bear')).toBeInTheDocument()
    expect(screen.queryByText('Preview Obsidian')).not.toBeInTheDocument()
    expect(screen.queryByTestId('object-storage-prototype-actions')).not.toBeInTheDocument()

    fireEvent.click(screen.getByTestId('settings-portability-lane-apps'))
    expect(screen.getByText('Preview Obsidian')).toBeInTheDocument()
    expect(screen.getByText('Preview Notion ZIP')).toBeInTheDocument()
    expect(screen.getByText('Preview Spanda')).toBeInTheDocument()
    expect(screen.queryByText('Preview Apple Journal')).not.toBeInTheDocument()

    fireEvent.click(screen.getByTestId('settings-portability-lane-journals'))
    expect(screen.getByText('Preview Apple Journal')).toBeInTheDocument()
    expect(screen.getByText('Preview Day One')).toBeInTheDocument()
    expect(screen.getByText('Preview Journey')).toBeInTheDocument()
    expect(screen.queryByText('Preview Obsidian')).not.toBeInTheDocument()

    fireEvent.click(screen.getByTestId('settings-portability-lane-capsules'))
    expect(screen.getByText('Preview JSON capsule')).toBeInTheDocument()
    expect(screen.getByText('Import SQLite capsule')).toBeInTheDocument()
    expect(screen.queryByText('Preview Journey')).not.toBeInTheDocument()

    fireEvent.click(screen.getByTestId('settings-portability-lane-storage'))
    expect(screen.getByTestId('object-storage-prototype-actions')).toHaveClass('grimoire-object-storage-prototype')
    expect(screen.getByTestId('object-storage-prototype-actions')).toHaveClass('grimoire-portability-inline-panel')
    expect(screen.getByTestId('object-storage-provider-empty')).toHaveTextContent('Pick a provider')
    expect(screen.queryByText('Preview S3 local-mirror push')).not.toBeInTheDocument()

    fireEvent.click(screen.getByTestId('settings-object-storage-provider-s3'))
    expect(screen.getByText('S3 provider proof preview/apply')).toBeInTheDocument()
    expect(screen.getByText(/live failure-state proof is still required before this becomes provider-proven/)).toBeInTheDocument()
    expect(screen.getByText('Preview S3 provider push')).toBeInTheDocument()
    expect(screen.getByText('Preview S3 provider pull')).toBeInTheDocument()
    expect(screen.getByText('Preview S3 local-mirror push')).toBeInTheDocument()
    expect(screen.getByText('Preview S3 local-mirror pull')).toBeInTheDocument()
    expect(screen.queryByText('Apply Azure local-mirror push')).not.toBeInTheDocument()

    fireEvent.click(screen.getByTestId('settings-object-storage-provider-azure'))
    expect(screen.getByText('Azure provider proof preview/apply')).toBeInTheDocument()
    expect(screen.getByText('Preview Azure provider push')).toBeInTheDocument()
    expect(screen.getByText('Preview Azure provider pull')).toBeInTheDocument()
    expect(screen.getByText('Apply Azure local-mirror push')).toBeInTheDocument()
    expect(screen.getByText('Apply Azure local-mirror pull')).toBeInTheDocument()
    expect(screen.getAllByText(/Adapter planned around a local working copy/)).toHaveLength(2)
    expect(screen.getByText(/Current vault is inside iCloud Drive/)).toBeInTheDocument()
    expect(screen.getByText(/Grimoire only edits the local files/)).toBeInTheDocument()
  })

  it('shows the last import preview as an autopsy timeline only after preview state exists', () => {
    const { rerender } = render(
      <PortabilitySettingsSection t={createTranslator('en')} vaultPath="/Users/sri/Vault" />,
    )

    expect(screen.queryByTestId('import-autopsy-timeline')).not.toBeInTheDocument()

    rerender(
      <PortabilitySettingsSection
        t={createTranslator('en')}
        vaultPath="/Users/sri/Vault"
        importPreview={importPreview}
      />,
    )

    const timeline = screen.getByTestId('import-autopsy-timeline')
    const actionDeck = screen.getByTestId('settings-portability-action-deck')
    const proofLedger = screen.getByTestId('portability-proof-ledger')
    expect(actionDeck.compareDocumentPosition(timeline) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(timeline.compareDocumentPosition(proofLedger) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(timeline).toHaveTextContent('Review gate')
    expect(timeline).toHaveTextContent('Review the exact rows below before importing.')
    expect(timeline).toHaveTextContent('Markdown folder selected: Research')
    expect(timeline).toHaveTextContent('Will land in ./imports/markdown')
    expect(timeline).toHaveTextContent('3 notes')
  })

  it('marks the previous import preview stale while a new import preview is running', () => {
    render(
      <PortabilitySettingsSection
        t={createTranslator('en')}
        vaultPath="/Users/sri/Vault"
        importPreview={importPreview}
        busyAction="day-one-preview"
      />,
    )

    const timeline = screen.getByTestId('import-autopsy-timeline')
    expect(timeline).toHaveTextContent('Refreshing...')
    expect(timeline).not.toHaveTextContent('/Users/sri/Downloads')
  })

  it('runs the import actions when available', async () => {
    const onPreviewMarkdownFolder = vi.fn()
    const onImportMarkdownFolder = vi.fn()
    const onPreviewMarkdownZip = vi.fn()
    const onImportMarkdownZip = vi.fn()
    const onPreviewBear = vi.fn()
    const onImportBear = vi.fn()
    const onPreviewObsidian = vi.fn()
    const onImportObsidian = vi.fn()
    const onPreviewNotion = vi.fn()
    const onImportNotion = vi.fn()
    const onPreviewNotionFolder = vi.fn()
    const onImportNotionFolder = vi.fn()
    const onPreviewSpanda = vi.fn()
    const onImportSpanda = vi.fn()
    const onPreviewAppleJournal = vi.fn()
    const onImportAppleJournal = vi.fn()
    const onPreviewDayOne = vi.fn()
    const onImportDayOne = vi.fn()
    const onPreviewJourney = vi.fn()
    const onImportJourney = vi.fn()
    const onPreviewJsonCapsule = vi.fn()
    const onImportJsonCapsule = vi.fn()
    const onPreviewSqliteCapsule = vi.fn()
    const onImportSqliteCapsule = vi.fn()
    const onExportMarkdownZip = vi.fn()
    const onExportStaticHtmlArchive = vi.fn()
    const onPreviewJsonSnapshot = vi.fn()
    const onExportJsonSnapshot = vi.fn()
    const onPreviewSqliteSnapshot = vi.fn()
    const onExportSqliteSnapshot = vi.fn()
    const onRunS3LivePreflight = vi.fn()
    const onRunAzureLivePreflight = vi.fn()
    const onPreviewS3MirrorPush = vi.fn()
    const onApplyS3MirrorPush = vi.fn()
    const onPreviewS3MirrorPull = vi.fn()
    const onApplyS3MirrorPull = vi.fn()
    const onPreviewS3ProviderPush = vi.fn()
    const onApplyS3ProviderPush = vi.fn()
    const onPreviewS3ProviderPull = vi.fn()
    const onApplyS3ProviderPull = vi.fn()
    const onPreviewAzureProviderPush = vi.fn()
    const onApplyAzureProviderPush = vi.fn()
    const onPreviewAzureProviderPull = vi.fn()
    const onApplyAzureProviderPull = vi.fn()
    const onPreviewAzureMirrorPush = vi.fn()
    const onApplyAzureMirrorPush = vi.fn()
    const onPreviewAzureMirrorPull = vi.fn()
    const onApplyAzureMirrorPull = vi.fn()
    render(
      <PortabilitySettingsSection
        t={createTranslator('en')}
        onPreviewMarkdownFolder={onPreviewMarkdownFolder}
        onImportMarkdownFolder={onImportMarkdownFolder}
        onPreviewMarkdownZip={onPreviewMarkdownZip}
        onImportMarkdownZip={onImportMarkdownZip}
        onPreviewBear={onPreviewBear}
        onImportBear={onImportBear}
        onPreviewObsidian={onPreviewObsidian}
        onImportObsidian={onImportObsidian}
        onPreviewNotion={onPreviewNotion}
        onImportNotion={onImportNotion}
        onPreviewNotionFolder={onPreviewNotionFolder}
        onImportNotionFolder={onImportNotionFolder}
        onPreviewSpanda={onPreviewSpanda}
        onImportSpanda={onImportSpanda}
        onPreviewAppleJournal={onPreviewAppleJournal}
        onImportAppleJournal={onImportAppleJournal}
        onPreviewDayOne={onPreviewDayOne}
        onImportDayOne={onImportDayOne}
        onPreviewJourney={onPreviewJourney}
        onImportJourney={onImportJourney}
        onPreviewJsonCapsule={onPreviewJsonCapsule}
        onImportJsonCapsule={onImportJsonCapsule}
        onPreviewSqliteCapsule={onPreviewSqliteCapsule}
        onImportSqliteCapsule={onImportSqliteCapsule}
        onExportMarkdownZip={onExportMarkdownZip}
        onExportStaticHtmlArchive={onExportStaticHtmlArchive}
        onPreviewJsonSnapshot={onPreviewJsonSnapshot}
        onExportJsonSnapshot={onExportJsonSnapshot}
        onPreviewSqliteSnapshot={onPreviewSqliteSnapshot}
        onExportSqliteSnapshot={onExportSqliteSnapshot}
        onRunS3LivePreflight={onRunS3LivePreflight}
        onRunAzureLivePreflight={onRunAzureLivePreflight}
        s3MirrorPreviewReady
        s3MirrorPullPreviewReady
        s3ProviderPushPreviewReady
        s3ProviderPullPreviewReady
        azureProviderPushPreviewReady
        azureProviderPullPreviewReady
        azureMirrorPreviewReady
        azureMirrorPullPreviewReady
        onPreviewS3MirrorPush={onPreviewS3MirrorPush}
        onApplyS3MirrorPush={onApplyS3MirrorPush}
        onPreviewS3MirrorPull={onPreviewS3MirrorPull}
        onApplyS3MirrorPull={onApplyS3MirrorPull}
        onPreviewS3ProviderPush={onPreviewS3ProviderPush}
        onApplyS3ProviderPush={onApplyS3ProviderPush}
        onPreviewS3ProviderPull={onPreviewS3ProviderPull}
        onApplyS3ProviderPull={onApplyS3ProviderPull}
        onPreviewAzureProviderPush={onPreviewAzureProviderPush}
        onApplyAzureProviderPush={onApplyAzureProviderPush}
        onPreviewAzureProviderPull={onPreviewAzureProviderPull}
        onApplyAzureProviderPull={onApplyAzureProviderPull}
        onPreviewAzureMirrorPush={onPreviewAzureMirrorPush}
        onApplyAzureMirrorPush={onApplyAzureMirrorPush}
        onPreviewAzureMirrorPull={onPreviewAzureMirrorPull}
        onApplyAzureMirrorPull={onApplyAzureMirrorPull}
      />,
    )

    fireEvent.click(screen.getByTestId('settings-preview-markdown-folder'))
    fireEvent.click(screen.getByTestId('settings-import-markdown-folder'))
    fireEvent.click(screen.getByTestId('settings-preview-markdown-zip'))
    fireEvent.click(screen.getByTestId('settings-import-markdown-zip'))
    fireEvent.click(screen.getByTestId('settings-preview-bear'))
    fireEvent.click(screen.getByTestId('settings-import-bear'))

    fireEvent.click(screen.getByTestId('settings-portability-lane-apps'))
    fireEvent.click(screen.getByTestId('settings-preview-obsidian'))
    fireEvent.click(screen.getByTestId('settings-import-obsidian'))
    fireEvent.click(screen.getByTestId('settings-preview-notion'))
    fireEvent.click(screen.getByTestId('settings-import-notion'))
    fireEvent.click(screen.getByTestId('settings-preview-notion-folder'))
    fireEvent.click(screen.getByTestId('settings-import-notion-folder'))
    fireEvent.click(screen.getByTestId('settings-preview-spanda'))
    fireEvent.click(screen.getByTestId('settings-import-spanda'))

    fireEvent.click(screen.getByTestId('settings-portability-lane-journals'))
    fireEvent.click(screen.getByTestId('settings-preview-apple-journal'))
    fireEvent.click(screen.getByTestId('settings-import-apple-journal'))
    fireEvent.click(screen.getByTestId('settings-preview-day-one'))
    fireEvent.click(screen.getByTestId('settings-import-day-one'))
    fireEvent.click(screen.getByTestId('settings-preview-journey'))
    fireEvent.click(screen.getByTestId('settings-import-journey'))

    fireEvent.click(screen.getByTestId('settings-portability-lane-capsules'))
    fireEvent.click(screen.getByTestId('settings-preview-json-capsule'))
    fireEvent.click(screen.getByTestId('settings-import-json-capsule'))
    fireEvent.click(screen.getByTestId('settings-preview-sqlite-capsule'))
    fireEvent.click(screen.getByTestId('settings-import-sqlite-capsule'))

    fireEvent.click(screen.getByTestId('settings-portability-lane-export'))
    fireEvent.click(screen.getByTestId('settings-export-markdown-zip'))
    fireEvent.click(screen.getByTestId('settings-export-static-html'))
    fireEvent.click(screen.getByTestId('settings-preview-json-snapshot'))
    fireEvent.click(screen.getByTestId('settings-export-json-snapshot'))
    fireEvent.click(screen.getByTestId('settings-preview-sqlite-snapshot'))
    fireEvent.click(screen.getByTestId('settings-export-sqlite-snapshot'))

    fireEvent.click(screen.getByTestId('settings-portability-lane-storage'))
    fireEvent.click(screen.getByTestId('settings-object-storage-provider-s3'))
    fireEvent.click(screen.getByTestId('settings-storage-s3-live-preflight'))
    fireEvent.click(screen.getByTestId('settings-storage-s3-provider-push-preview'))
    fireEvent.click(screen.getByTestId('settings-storage-s3-provider-push-apply'))
    fireEvent.click(screen.getByTestId('settings-storage-s3-provider-pull-preview'))
    fireEvent.click(screen.getByTestId('settings-storage-s3-provider-pull-apply'))
    fireEvent.click(screen.getByTestId('settings-storage-s3-preview'))
    fireEvent.click(screen.getByTestId('settings-storage-s3-apply'))
    fireEvent.click(screen.getByTestId('settings-storage-s3-pull-preview'))
    fireEvent.click(screen.getByTestId('settings-storage-s3-pull-apply'))
    fireEvent.click(screen.getByTestId('settings-object-storage-provider-azure'))
    fireEvent.click(screen.getByTestId('settings-storage-azure-live-preflight'))
    fireEvent.click(screen.getByTestId('settings-storage-azure-provider-push-preview'))
    fireEvent.click(screen.getByTestId('settings-storage-azure-provider-push-apply'))
    fireEvent.click(screen.getByTestId('settings-storage-azure-provider-pull-preview'))
    fireEvent.click(screen.getByTestId('settings-storage-azure-provider-pull-apply'))
    fireEvent.click(screen.getByTestId('settings-storage-azure-preview'))
    fireEvent.click(screen.getByTestId('settings-storage-azure-apply'))
    fireEvent.click(screen.getByTestId('settings-storage-azure-pull-preview'))
    fireEvent.click(screen.getByTestId('settings-storage-azure-pull-apply'))

    expect(onPreviewMarkdownFolder).toHaveBeenCalledTimes(1)
    expect(onImportMarkdownFolder).not.toHaveBeenCalled()
    expect(onPreviewMarkdownZip).toHaveBeenCalledTimes(1)
    expect(onImportMarkdownZip).not.toHaveBeenCalled()
    expect(onPreviewBear).toHaveBeenCalledTimes(1)
    expect(onImportBear).not.toHaveBeenCalled()
    expect(onPreviewObsidian).toHaveBeenCalledTimes(1)
    expect(onImportObsidian).not.toHaveBeenCalled()
    expect(onPreviewNotion).toHaveBeenCalledTimes(1)
    expect(onImportNotion).not.toHaveBeenCalled()
    expect(onPreviewNotionFolder).toHaveBeenCalledTimes(1)
    expect(onImportNotionFolder).not.toHaveBeenCalled()
    expect(onPreviewSpanda).toHaveBeenCalledTimes(1)
    expect(onImportSpanda).not.toHaveBeenCalled()
    expect(onPreviewAppleJournal).toHaveBeenCalledTimes(1)
    expect(onImportAppleJournal).not.toHaveBeenCalled()
    expect(onPreviewDayOne).toHaveBeenCalledTimes(1)
    expect(onImportDayOne).not.toHaveBeenCalled()
    expect(onPreviewJourney).toHaveBeenCalledTimes(1)
    expect(onImportJourney).not.toHaveBeenCalled()
    expect(onPreviewJsonCapsule).toHaveBeenCalledTimes(1)
    expect(onImportJsonCapsule).not.toHaveBeenCalled()
    expect(onPreviewSqliteCapsule).toHaveBeenCalledTimes(1)
    expect(onImportSqliteCapsule).not.toHaveBeenCalled()
    expect(onExportMarkdownZip).toHaveBeenCalledTimes(1)
    expect(onExportStaticHtmlArchive).toHaveBeenCalledTimes(1)
    expect(onPreviewJsonSnapshot).toHaveBeenCalledTimes(1)
    expect(onExportJsonSnapshot).not.toHaveBeenCalled()
    expect(onPreviewSqliteSnapshot).toHaveBeenCalledTimes(1)
    expect(onExportSqliteSnapshot).not.toHaveBeenCalled()
    expect(onRunS3LivePreflight).toHaveBeenCalledTimes(1)
    expect(onRunAzureLivePreflight).toHaveBeenCalledTimes(1)
    expect(onPreviewS3ProviderPush).toHaveBeenCalledTimes(1)
    expect(onApplyS3ProviderPush).toHaveBeenCalledTimes(1)
    expect(onPreviewS3ProviderPull).toHaveBeenCalledTimes(1)
    expect(onApplyS3ProviderPull).toHaveBeenCalledTimes(1)
    expect(onPreviewAzureProviderPush).toHaveBeenCalledTimes(1)
    expect(onApplyAzureProviderPush).toHaveBeenCalledTimes(1)
    expect(onPreviewAzureProviderPull).toHaveBeenCalledTimes(1)
    expect(onApplyAzureProviderPull).toHaveBeenCalledTimes(1)
    expect(onPreviewS3MirrorPush).toHaveBeenCalledTimes(1)
    expect(onApplyS3MirrorPush).toHaveBeenCalledTimes(1)
    expect(onPreviewS3MirrorPull).toHaveBeenCalledTimes(1)
    expect(onApplyS3MirrorPull).toHaveBeenCalledTimes(1)
    expect(onPreviewAzureMirrorPush).toHaveBeenCalledTimes(1)
    expect(onApplyAzureMirrorPush).toHaveBeenCalledTimes(1)
    expect(onPreviewAzureMirrorPull).toHaveBeenCalledTimes(1)
    expect(onApplyAzureMirrorPull).toHaveBeenCalledTimes(1)
  })

  it('unlocks only the matching capsule export after a reviewed preview', () => {
    const onExportJsonSnapshot = vi.fn()
    const onExportSqliteSnapshot = vi.fn()
    const { rerender } = render(
      <PortabilitySettingsSection
        t={createTranslator('en')}
        exportPreview={exportPreview}
        onExportJsonSnapshot={onExportJsonSnapshot}
        onExportSqliteSnapshot={onExportSqliteSnapshot}
      />,
    )

    fireEvent.click(screen.getByTestId('settings-portability-lane-export'))
    const summary = screen.getByTestId('settings-export-preview-summary')
    expect(summary).toHaveTextContent('Reviewed preview')
    expect(summary).toHaveTextContent('JSON snapshot')
    expect(summary).toHaveTextContent('4 files')
    expect(summary).toHaveTextContent('local-only withheld')
    expect(summary).toHaveTextContent('Markdown source of truth: yes')
    expect(summary).not.toHaveTextContent('/Users/')
    expect(screen.getByTestId('settings-export-json-snapshot')).not.toBeDisabled()
    expect(screen.getByTestId('settings-export-sqlite-snapshot')).toBeDisabled()
    fireEvent.click(screen.getByTestId('settings-export-json-snapshot'))
    fireEvent.click(screen.getByTestId('settings-export-sqlite-snapshot'))
    expect(onExportJsonSnapshot).toHaveBeenCalledTimes(1)
    expect(onExportSqliteSnapshot).not.toHaveBeenCalled()

    rerender(
      <PortabilitySettingsSection
        t={createTranslator('en')}
        exportPreview={{ ...exportPreview, format: 'sqlite', result: { ...exportPreview.result, format: 'sqlite' } }}
        onExportJsonSnapshot={onExportJsonSnapshot}
        onExportSqliteSnapshot={onExportSqliteSnapshot}
      />,
    )

    fireEvent.click(screen.getByTestId('settings-portability-lane-export'))
    expect(screen.getByTestId('settings-export-json-snapshot')).toBeDisabled()
    expect(screen.getByTestId('settings-export-sqlite-snapshot')).not.toBeDisabled()
    fireEvent.click(screen.getByTestId('settings-export-sqlite-snapshot'))
    expect(onExportSqliteSnapshot).toHaveBeenCalledTimes(1)
  })

  it('unlocks only the matching import after a no-write preview is reviewed', () => {
    const onImportMarkdownFolder = vi.fn()
    const onImportBear = vi.fn()
    const onImportDayOne = vi.fn()
    const { rerender } = render(
      <PortabilitySettingsSection
        t={createTranslator('en')}
        importPreview={importPreview}
        onImportMarkdownFolder={onImportMarkdownFolder}
        onImportBear={onImportBear}
        onImportDayOne={onImportDayOne}
      />,
    )

    expect(screen.getByTestId('settings-import-markdown-folder')).not.toBeDisabled()
    expect(screen.getByTestId('settings-import-bear')).toBeDisabled()
    fireEvent.click(screen.getByTestId('settings-import-markdown-folder'))
    fireEvent.click(screen.getByTestId('settings-import-bear'))
    expect(onImportMarkdownFolder).toHaveBeenCalledTimes(1)
    expect(onImportBear).not.toHaveBeenCalled()

    rerender(
      <PortabilitySettingsSection
        t={createTranslator('en')}
        importPreview={{ ...importPreview, sourceId: 'day-one-preview' }}
        onImportMarkdownFolder={onImportMarkdownFolder}
        onImportDayOne={onImportDayOne}
      />,
    )

    fireEvent.click(screen.getByTestId('settings-portability-lane-journals'))
    expect(screen.getByTestId('settings-import-day-one')).not.toBeDisabled()
    expect(screen.getByTestId('settings-import-journey')).toBeDisabled()
    fireEvent.click(screen.getByTestId('settings-import-day-one'))
    expect(onImportDayOne).toHaveBeenCalledTimes(1)
  })

  it('requires object-storage preview before apply buttons unlock', () => {
    const onApplyS3MirrorPush = vi.fn()
    const onApplyS3MirrorPull = vi.fn()
    const onApplyS3ProviderPush = vi.fn()
    const onApplyS3ProviderPull = vi.fn()
    const onApplyAzureProviderPush = vi.fn()
    const onApplyAzureProviderPull = vi.fn()
    const { rerender } = render(
      <PortabilitySettingsSection
        t={createTranslator('en')}
        onApplyS3MirrorPush={onApplyS3MirrorPush}
        onApplyS3MirrorPull={onApplyS3MirrorPull}
        onApplyS3ProviderPush={onApplyS3ProviderPush}
        onApplyS3ProviderPull={onApplyS3ProviderPull}
        onApplyAzureProviderPush={onApplyAzureProviderPush}
        onApplyAzureProviderPull={onApplyAzureProviderPull}
      />,
    )

    fireEvent.click(screen.getByTestId('settings-portability-lane-storage'))
    fireEvent.click(screen.getByTestId('settings-object-storage-provider-s3'))
    expect(screen.getByTestId('settings-storage-s3-provider-push-apply')).toBeDisabled()
    expect(screen.getByTestId('settings-storage-s3-provider-pull-apply')).toBeDisabled()
    expect(screen.getByTestId('settings-storage-s3-apply')).toBeDisabled()
    expect(screen.getByTestId('settings-storage-s3-pull-apply')).toBeDisabled()
    fireEvent.click(screen.getByTestId('settings-storage-s3-provider-push-apply'))
    fireEvent.click(screen.getByTestId('settings-storage-s3-provider-pull-apply'))
    fireEvent.click(screen.getByTestId('settings-storage-s3-apply'))
    fireEvent.click(screen.getByTestId('settings-storage-s3-pull-apply'))
    expect(onApplyS3ProviderPush).not.toHaveBeenCalled()
    expect(onApplyS3ProviderPull).not.toHaveBeenCalled()
    expect(onApplyS3MirrorPush).not.toHaveBeenCalled()
    expect(onApplyS3MirrorPull).not.toHaveBeenCalled()

    fireEvent.click(screen.getByTestId('settings-object-storage-provider-azure'))
    expect(screen.getByTestId('settings-storage-azure-provider-push-apply')).toBeDisabled()
    expect(screen.getByTestId('settings-storage-azure-provider-pull-apply')).toBeDisabled()
    fireEvent.click(screen.getByTestId('settings-storage-azure-provider-push-apply'))
    fireEvent.click(screen.getByTestId('settings-storage-azure-provider-pull-apply'))
    expect(onApplyAzureProviderPush).not.toHaveBeenCalled()
    expect(onApplyAzureProviderPull).not.toHaveBeenCalled()

    rerender(
      <PortabilitySettingsSection
        t={createTranslator('en')}
        s3MirrorPreviewReady
        s3MirrorPullPreviewReady
        s3ProviderPushPreviewReady
        s3ProviderPullPreviewReady
        azureProviderPushPreviewReady
        azureProviderPullPreviewReady
        onApplyS3MirrorPush={onApplyS3MirrorPush}
        onApplyS3MirrorPull={onApplyS3MirrorPull}
        onApplyS3ProviderPush={onApplyS3ProviderPush}
        onApplyS3ProviderPull={onApplyS3ProviderPull}
        onApplyAzureProviderPush={onApplyAzureProviderPush}
        onApplyAzureProviderPull={onApplyAzureProviderPull}
      />,
    )

    fireEvent.click(screen.getByTestId('settings-object-storage-provider-azure'))
    expect(screen.getByTestId('settings-storage-azure-provider-push-apply')).not.toBeDisabled()
    expect(screen.getByTestId('settings-storage-azure-provider-pull-apply')).not.toBeDisabled()
    fireEvent.click(screen.getByTestId('settings-object-storage-provider-s3'))
    expect(screen.getByTestId('settings-storage-s3-provider-push-apply')).not.toBeDisabled()
    expect(screen.getByTestId('settings-storage-s3-provider-pull-apply')).not.toBeDisabled()
    expect(screen.getByTestId('settings-storage-s3-apply')).not.toBeDisabled()
    expect(screen.getByTestId('settings-storage-s3-pull-apply')).not.toBeDisabled()
  })

  it('shows object-storage dry-run details without leaking full mirror paths', () => {
    render(
      <PortabilitySettingsSection
        t={createTranslator('en')}
        s3MirrorPreviewReady
        s3MirrorPreviewReport={storagePreview}
      />,
    )

    const preview = screen.getByTestId('object-storage-s3-mirror-push-preview')
    expect(preview).toHaveClass('grimoire-object-storage-preview')
    expect(preview).toHaveTextContent('Preview ready')
    expect(preview).toHaveTextContent('Local mirror fixture')
    expect(preview).toHaveTextContent('S3 push: s3-bucket')
    expect(preview).toHaveTextContent('Upload')
    expect(preview).toHaveTextContent('2')
    expect(preview).toHaveTextContent('Conflicts: Notes/changed.md (Local and mirror differ)')
    expect(preview).toHaveTextContent('Local-only withheld: Journal/private.md (Protected by local-only policy)')
    expect(preview).toHaveTextContent('Apply is locked to this exact push preview')
    expect(preview).toHaveTextContent('not live cloud sync yet')
    expect(preview).not.toHaveTextContent('/Users/sri/Private')
    expect(within(preview).getByText('Conflicts').closest('.grimoire-preview-stat')).toHaveAttribute('data-tone', 'warn')
    expect(within(preview).getByText('Local-only').closest('.grimoire-preview-stat')).toHaveAttribute('data-tone', 'safe')
  })

  it('shows S3 provider proof previews separately from local-mirror fixture reports', () => {
    render(
      <PortabilitySettingsSection
        t={createTranslator('en')}
        s3ProviderPushPreviewReady
        s3ProviderPushPreviewReport={s3ProviderPreview}
      />,
    )

    const preview = screen.getByTestId('object-storage-s3-provider-push-preview')
    expect(preview).toHaveTextContent('Preview ready')
    expect(preview).toHaveTextContent('S3 provider proof preview')
    expect(preview).toHaveTextContent('S3 push: redacted provider target')
    expect(preview).toHaveTextContent('Apply is locked to this exact push provider proof preview')
    expect(preview).toHaveTextContent('not provider-proven sync yet')
    expect(preview).not.toHaveTextContent('Local mirror fixture')
    expect(preview).not.toHaveTextContent('S3 provider SDK')
    expect(preview).not.toHaveTextContent('not live cloud sync yet')
    expect(preview).not.toHaveTextContent('s3://')
    expect(preview).not.toHaveTextContent('sriinnu-vault')
    expect(preview).not.toHaveTextContent('/Users/')
  })

  it('shows Azure provider previews separately from local-mirror fixture reports', () => {
    render(
      <PortabilitySettingsSection
        t={createTranslator('en')}
        azureProviderPushPreviewReady
        azureProviderPushPreviewReport={azureProviderPreview}
      />,
    )

    const preview = screen.getByTestId('object-storage-azure-blob-provider-push-preview')
    expect(preview).toHaveTextContent('Preview ready')
    expect(preview).toHaveTextContent('Azure provider proof preview')
    expect(preview).toHaveTextContent('Azure Blob push: redacted provider target')
    expect(preview).toHaveTextContent('Apply is locked to this exact push provider proof preview')
    expect(preview).toHaveTextContent('not provider-proven sync yet')
    expect(preview).not.toHaveTextContent('Local mirror fixture')
    expect(preview).not.toHaveTextContent('Azure provider sync')
    expect(preview).not.toHaveTextContent('azblob://')
    expect(preview).not.toHaveTextContent('acct')
    expect(preview).not.toHaveTextContent('/Users/')
  })

  it('shows S3 live preflight status without leaking credentials or local paths', () => {
    render(
      <PortabilitySettingsSection
        t={createTranslator('en')}
        s3LivePreflightReport={s3Preflight}
      />,
    )

    const preflight = screen.getByTestId('object-storage-s3-live-preflight')
    expect(preflight).toHaveAttribute('data-status', 'reachable')
    expect(preflight).toHaveTextContent('S3 live preflight')
    expect(preflight).toHaveTextContent('reachable')
    expect(preflight).toHaveTextContent('Read-only')
    expect(preflight).toHaveTextContent('HeadBucket')
    expect(preflight).toHaveTextContent('checked')
    expect(preflight).toHaveTextContent('No object keys, credentials, or local file paths are returned.')
    expect(preflight).not.toHaveTextContent('/Users/')
    expect(preflight).not.toHaveTextContent('AKIA')
  })

  it('shows Azure live preflight status without leaking credentials or local paths', () => {
    render(
      <PortabilitySettingsSection
        t={createTranslator('en')}
        azureLivePreflightReport={azurePreflight}
      />,
    )

    const preflight = screen.getByTestId('object-storage-azure-live-preflight')
    expect(preflight).toHaveAttribute('data-status', 'reachable')
    expect(preflight).toHaveTextContent('Azure live preflight')
    expect(preflight).toHaveTextContent('reachable')
    expect(preflight).toHaveTextContent('Read-only')
    expect(preflight).toHaveTextContent('Container check')
    expect(preflight).toHaveTextContent('checked')
    expect(preflight).toHaveTextContent('No object keys, credentials, or local file paths are returned.')
    expect(preflight).not.toHaveTextContent('/Users/')
    expect(preflight).not.toHaveTextContent('DefaultEndpointsProtocol')
  })

  it('passes S3 preflight fields as a transient draft', () => {
    const onRunS3LivePreflight = vi.fn()

    render(
      <PortabilitySettingsSection
        t={createTranslator('en')}
        onRunS3LivePreflight={onRunS3LivePreflight}
      />,
    )

    fireEvent.click(screen.getByTestId('settings-portability-lane-storage'))
    fireEvent.click(screen.getByTestId('settings-object-storage-provider-s3'))
    fireEvent.change(screen.getByTestId('settings-s3-preflight-bucket'), { target: { value: ' sriinnu-vault ' } })
    fireEvent.change(screen.getByTestId('settings-s3-preflight-region'), { target: { value: ' us-east-1 ' } })
    fireEvent.change(screen.getByTestId('settings-s3-preflight-prefix'), { target: { value: ' journals/dreams/ ' } })
    fireEvent.click(screen.getByTestId('settings-storage-s3-live-preflight'))

    expect(onRunS3LivePreflight).toHaveBeenCalledWith({
      bucket: 'sriinnu-vault',
      region: 'us-east-1',
      prefix: 'journals/dreams/',
    })
    expect(screen.getByTestId('s3-live-preflight-controls')).toHaveTextContent('Credentials come from local AWS config')
  })

  it('passes the same transient S3 target draft to provider actions', () => {
    const onPreviewS3ProviderPush = vi.fn()
    const onApplyS3ProviderPull = vi.fn()

    render(
      <PortabilitySettingsSection
        t={createTranslator('en')}
        s3ProviderPullPreviewReady
        onPreviewS3ProviderPush={onPreviewS3ProviderPush}
        onApplyS3ProviderPull={onApplyS3ProviderPull}
      />,
    )

    fireEvent.click(screen.getByTestId('settings-portability-lane-storage'))
    fireEvent.click(screen.getByTestId('settings-object-storage-provider-s3'))
    fireEvent.change(screen.getByTestId('settings-s3-preflight-bucket'), { target: { value: ' sriinnu-vault ' } })
    fireEvent.change(screen.getByTestId('settings-s3-preflight-region'), { target: { value: ' us-east-1 ' } })
    fireEvent.change(screen.getByTestId('settings-s3-preflight-prefix'), { target: { value: ' journals/dreams/ ' } })
    fireEvent.click(screen.getByTestId('settings-storage-s3-provider-push-preview'))
    fireEvent.click(screen.getByTestId('settings-storage-s3-provider-pull-apply'))

    expect(onPreviewS3ProviderPush).toHaveBeenCalledWith({
      bucket: 'sriinnu-vault',
      region: 'us-east-1',
      prefix: 'journals/dreams/',
    })
    expect(onApplyS3ProviderPull).toHaveBeenCalledWith({
      bucket: 'sriinnu-vault',
      region: 'us-east-1',
      prefix: 'journals/dreams/',
    })
  })

  it('passes Azure preflight fields as a transient draft', () => {
    const onRunAzureLivePreflight = vi.fn()

    render(
      <PortabilitySettingsSection
        t={createTranslator('en')}
        onRunAzureLivePreflight={onRunAzureLivePreflight}
      />,
    )

    fireEvent.click(screen.getByTestId('settings-portability-lane-storage'))
    fireEvent.click(screen.getByTestId('settings-object-storage-provider-azure'))
    fireEvent.change(screen.getByTestId('settings-azure-preflight-account'), { target: { value: ' sriinnuacct ' } })
    fireEvent.change(screen.getByTestId('settings-azure-preflight-container'), { target: { value: ' grimoire ' } })
    fireEvent.change(screen.getByTestId('settings-azure-preflight-prefix'), { target: { value: ' notes/ ' } })
    fireEvent.click(screen.getByTestId('settings-storage-azure-live-preflight'))

    expect(onRunAzureLivePreflight).toHaveBeenCalledWith({
      account: 'sriinnuacct',
      container: 'grimoire',
      prefix: 'notes/',
    })
    expect(screen.getByTestId('azure-live-preflight-controls')).toHaveTextContent('Azure login stays local')
  })

  it('passes the same transient Azure target draft to provider actions', () => {
    const onPreviewAzureProviderPush = vi.fn()
    const onApplyAzureProviderPull = vi.fn()

    render(
      <PortabilitySettingsSection
        t={createTranslator('en')}
        azureProviderPullPreviewReady
        onPreviewAzureProviderPush={onPreviewAzureProviderPush}
        onApplyAzureProviderPull={onApplyAzureProviderPull}
      />,
    )

    fireEvent.click(screen.getByTestId('settings-portability-lane-storage'))
    fireEvent.click(screen.getByTestId('settings-object-storage-provider-azure'))
    fireEvent.change(screen.getByTestId('settings-azure-preflight-account'), { target: { value: ' sriinnuacct ' } })
    fireEvent.change(screen.getByTestId('settings-azure-preflight-container'), { target: { value: ' grimoire ' } })
    fireEvent.change(screen.getByTestId('settings-azure-preflight-prefix'), { target: { value: ' notes/ ' } })
    fireEvent.click(screen.getByTestId('settings-storage-azure-provider-push-preview'))
    fireEvent.click(screen.getByTestId('settings-storage-azure-provider-pull-apply'))

    expect(onPreviewAzureProviderPush).toHaveBeenCalledWith({
      account: 'sriinnuacct',
      container: 'grimoire',
      prefix: 'notes/',
    })
    expect(onApplyAzureProviderPull).toHaveBeenCalledWith({
      account: 'sriinnuacct',
      container: 'grimoire',
      prefix: 'notes/',
    })
  })

  it('only shows the active action busy label while locking all buttons', () => {
    render(
      <PortabilitySettingsSection
        t={createTranslator('en')}
        busyAction="markdown-folder-preview"
        onPreviewMarkdownFolder={vi.fn()}
        onImportMarkdownFolder={vi.fn()}
        onExportMarkdownZip={vi.fn()}
        onExportStaticHtmlArchive={vi.fn()}
        onPreviewJsonSnapshot={vi.fn()}
        onExportJsonSnapshot={vi.fn()}
        onPreviewSqliteSnapshot={vi.fn()}
        onExportSqliteSnapshot={vi.fn()}
      />,
    )

    expect(screen.getByTestId('settings-preview-markdown-folder')).toHaveTextContent('Previewing...')
    expect(screen.getByTestId('settings-import-markdown-folder')).toHaveTextContent('Import Markdown folder')
    expect(screen.getByTestId('settings-import-markdown-folder')).toBeDisabled()
    expect(screen.queryByTestId('settings-export-markdown-zip')).not.toBeInTheDocument()

    fireEvent.click(screen.getByTestId('settings-portability-lane-export'))
    expect(screen.getByTestId('settings-export-markdown-zip')).toBeDisabled()
    expect(screen.getByTestId('settings-export-static-html')).toBeDisabled()
    expect(screen.getByTestId('settings-preview-json-snapshot')).toBeDisabled()
    expect(screen.getByTestId('settings-export-json-snapshot')).toBeDisabled()
    expect(screen.getByTestId('settings-preview-sqlite-snapshot')).toBeDisabled()
    expect(screen.getByTestId('settings-export-sqlite-snapshot')).toBeDisabled()

    fireEvent.click(screen.getByTestId('settings-portability-lane-storage'))
    fireEvent.click(screen.getByTestId('settings-object-storage-provider-s3'))
    expect(screen.getByTestId('settings-storage-s3-provider-push-preview')).toBeDisabled()
    expect(screen.getByTestId('settings-storage-s3-provider-pull-preview')).toBeDisabled()
    expect(screen.getByTestId('settings-storage-s3-preview')).toBeDisabled()
    expect(screen.getByTestId('settings-storage-s3-pull-preview')).toBeDisabled()
  })
})
