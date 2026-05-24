import { fireEvent, render, screen, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { createTranslator } from '../lib/i18n'
import type { ImportAutopsyPreviewState } from '../lib/vaultPortability'
import { makeEntry } from '../test-utils/noteListTestUtils'
import type { ObjectStorageSyncReport } from '../utils/objectStorageSync'
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

const storagePreview: ObjectStorageSyncReport = {
  provider_id: 's3',
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
    expect(screen.getByTestId('settings-portability-section')).toBeInTheDocument()
    expect(screen.getByTestId('settings-storage-health')).toBeInTheDocument()
    expect(screen.getByText('Bear')).toBeInTheDocument()
    expect(screen.getByText('Obsidian')).toBeInTheDocument()
    expect(screen.getByText('Notion Markdown')).toBeInTheDocument()
    expect(screen.getByText('Spanda')).toBeInTheDocument()
    expect(screen.getAllByText('Git remote')).toHaveLength(2)
    expect(screen.getByText('iCloud Drive')).toBeInTheDocument()
    expect(screen.getByText('Amazon S3')).toBeInTheDocument()
    expect(screen.getByText('Azure Blob Storage')).toBeInTheDocument()
    expect(screen.getByText('Apple Journal')).toBeInTheDocument()
    expect(screen.getByText('Journal capture')).toBeInTheDocument()
    expect(screen.getByText('Memory graph')).toBeInTheDocument()
    expect(screen.getByTestId('settings-portability-action-deck')).toBeInTheDocument()
    expect(screen.getByText('Move vault data')).toBeInTheDocument()
    expect(screen.getByTestId('settings-portability-lane-markdown')).toHaveAttribute('aria-selected', 'true')
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

    fireEvent.click(screen.getByTestId('settings-portability-lane-storage'))
    expect(screen.getByTestId('object-storage-prototype-actions')).toBeInTheDocument()
    expect(screen.getByText('Preview S3 push')).toBeInTheDocument()
    expect(screen.getByText('Preview S3 pull')).toBeInTheDocument()
    expect(screen.getByText('Apply Azure push')).toBeInTheDocument()
    expect(screen.getByText('Apply Azure pull')).toBeInTheDocument()
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
    const onExportMarkdownZip = vi.fn()
    const onExportStaticHtmlArchive = vi.fn()
    const onPreviewS3MirrorPush = vi.fn()
    const onApplyS3MirrorPush = vi.fn()
    const onPreviewS3MirrorPull = vi.fn()
    const onApplyS3MirrorPull = vi.fn()
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
        onExportMarkdownZip={onExportMarkdownZip}
        onExportStaticHtmlArchive={onExportStaticHtmlArchive}
        s3MirrorPreviewReady
        s3MirrorPullPreviewReady
        azureMirrorPreviewReady
        azureMirrorPullPreviewReady
        onPreviewS3MirrorPush={onPreviewS3MirrorPush}
        onApplyS3MirrorPush={onApplyS3MirrorPush}
        onPreviewS3MirrorPull={onPreviewS3MirrorPull}
        onApplyS3MirrorPull={onApplyS3MirrorPull}
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

    fireEvent.click(screen.getByTestId('settings-portability-lane-export'))
    fireEvent.click(screen.getByTestId('settings-export-markdown-zip'))
    fireEvent.click(screen.getByTestId('settings-export-static-html'))

    fireEvent.click(screen.getByTestId('settings-portability-lane-storage'))
    fireEvent.click(screen.getByTestId('settings-storage-s3-preview'))
    fireEvent.click(screen.getByTestId('settings-storage-s3-apply'))
    fireEvent.click(screen.getByTestId('settings-storage-s3-pull-preview'))
    fireEvent.click(screen.getByTestId('settings-storage-s3-pull-apply'))
    fireEvent.click(screen.getByTestId('settings-storage-azure-preview'))
    fireEvent.click(screen.getByTestId('settings-storage-azure-apply'))
    fireEvent.click(screen.getByTestId('settings-storage-azure-pull-preview'))
    fireEvent.click(screen.getByTestId('settings-storage-azure-pull-apply'))

    expect(onPreviewMarkdownFolder).toHaveBeenCalledTimes(1)
    expect(onImportMarkdownFolder).toHaveBeenCalledTimes(1)
    expect(onPreviewMarkdownZip).toHaveBeenCalledTimes(1)
    expect(onImportMarkdownZip).toHaveBeenCalledTimes(1)
    expect(onPreviewBear).toHaveBeenCalledTimes(1)
    expect(onImportBear).toHaveBeenCalledTimes(1)
    expect(onPreviewObsidian).toHaveBeenCalledTimes(1)
    expect(onImportObsidian).toHaveBeenCalledTimes(1)
    expect(onPreviewNotion).toHaveBeenCalledTimes(1)
    expect(onImportNotion).toHaveBeenCalledTimes(1)
    expect(onPreviewNotionFolder).toHaveBeenCalledTimes(1)
    expect(onImportNotionFolder).toHaveBeenCalledTimes(1)
    expect(onPreviewSpanda).toHaveBeenCalledTimes(1)
    expect(onImportSpanda).toHaveBeenCalledTimes(1)
    expect(onPreviewAppleJournal).toHaveBeenCalledTimes(1)
    expect(onImportAppleJournal).toHaveBeenCalledTimes(1)
    expect(onPreviewDayOne).toHaveBeenCalledTimes(1)
    expect(onImportDayOne).toHaveBeenCalledTimes(1)
    expect(onPreviewJourney).toHaveBeenCalledTimes(1)
    expect(onImportJourney).toHaveBeenCalledTimes(1)
    expect(onExportMarkdownZip).toHaveBeenCalledTimes(1)
    expect(onExportStaticHtmlArchive).toHaveBeenCalledTimes(1)
    expect(onPreviewS3MirrorPush).toHaveBeenCalledTimes(1)
    expect(onApplyS3MirrorPush).toHaveBeenCalledTimes(1)
    expect(onPreviewS3MirrorPull).toHaveBeenCalledTimes(1)
    expect(onApplyS3MirrorPull).toHaveBeenCalledTimes(1)
    expect(onPreviewAzureMirrorPush).toHaveBeenCalledTimes(1)
    expect(onApplyAzureMirrorPush).toHaveBeenCalledTimes(1)
    expect(onPreviewAzureMirrorPull).toHaveBeenCalledTimes(1)
    expect(onApplyAzureMirrorPull).toHaveBeenCalledTimes(1)
  })

  it('requires object-storage preview before apply buttons unlock', () => {
    const onApplyS3MirrorPush = vi.fn()
    const onApplyS3MirrorPull = vi.fn()
    const { rerender } = render(
      <PortabilitySettingsSection
        t={createTranslator('en')}
        onApplyS3MirrorPush={onApplyS3MirrorPush}
        onApplyS3MirrorPull={onApplyS3MirrorPull}
      />,
    )

    fireEvent.click(screen.getByTestId('settings-portability-lane-storage'))
    expect(screen.getByTestId('settings-storage-s3-apply')).toBeDisabled()
    expect(screen.getByTestId('settings-storage-s3-pull-apply')).toBeDisabled()
    fireEvent.click(screen.getByTestId('settings-storage-s3-apply'))
    fireEvent.click(screen.getByTestId('settings-storage-s3-pull-apply'))
    expect(onApplyS3MirrorPush).not.toHaveBeenCalled()
    expect(onApplyS3MirrorPull).not.toHaveBeenCalled()

    rerender(
      <PortabilitySettingsSection
        t={createTranslator('en')}
        s3MirrorPreviewReady
        s3MirrorPullPreviewReady
        onApplyS3MirrorPush={onApplyS3MirrorPush}
        onApplyS3MirrorPull={onApplyS3MirrorPull}
      />,
    )

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

    const preview = screen.getByTestId('object-storage-s3-push-preview')
    expect(preview).toHaveTextContent('Preview ready')
    expect(preview).toHaveTextContent('S3 push: s3-bucket')
    expect(preview).toHaveTextContent('Upload')
    expect(preview).toHaveTextContent('2')
    expect(preview).toHaveTextContent('Conflicts: Notes/changed.md')
    expect(preview).toHaveTextContent('Local-only withheld: Journal/private.md')
    expect(preview).toHaveTextContent('Apply is locked to this exact push preview')
    expect(preview).not.toHaveTextContent('/Users/sri/Private')
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
      />,
    )

    expect(screen.getByTestId('settings-preview-markdown-folder')).toHaveTextContent('Previewing...')
    expect(screen.getByTestId('settings-import-markdown-folder')).toHaveTextContent('Import Markdown folder')
    expect(screen.getByTestId('settings-import-markdown-folder')).toBeDisabled()
    expect(screen.queryByTestId('settings-export-markdown-zip')).not.toBeInTheDocument()

    fireEvent.click(screen.getByTestId('settings-portability-lane-export'))
    expect(screen.getByTestId('settings-export-markdown-zip')).toBeDisabled()
    expect(screen.getByTestId('settings-export-static-html')).toBeDisabled()

    fireEvent.click(screen.getByTestId('settings-portability-lane-storage'))
    expect(screen.getByTestId('settings-storage-s3-preview')).toBeDisabled()
    expect(screen.getByTestId('settings-storage-s3-pull-preview')).toBeDisabled()
  })
})
