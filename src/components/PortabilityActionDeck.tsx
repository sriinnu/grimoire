import type { ReactNode } from 'react'
import { exportRequiresReview, hasReviewedExportPreview } from '../lib/exportReviewGate'
import {
  listVaultExportTargets,
  listVaultImportSources,
  type VaultPortabilityActionId,
} from '../lib/vaultPortability'
import { Glyph } from './glyphs/Glyph'
import { InstalledAppImportActions } from './InstalledAppImportActions'
import { ObjectStoragePrototypeActions } from './ObjectStoragePrototypeActions'
import type { PortabilityActionDeckProps, PortabilityActionDeckTranslate } from './PortabilityActionDeck.types'
import { isPortabilityActionDisabled } from './PortabilityActionDeckModel'
import { PortabilityActionButton, PortabilityImportButton } from './PortabilityActionButton'
import { PortabilityActionProgress } from './PortabilityActionProgress'
import { PortabilityRowLabel } from './PortabilityGroups'
import {
  SettingsActionRow,
  SettingsGroup,
  SettingsRow,
} from './settings/primitives/SettingsGroup'
import { Badge } from './ui/badge'

type DeckLabelKey = Parameters<PortabilityActionDeckTranslate>[0]

interface DeckActionButton {
  labelKey: DeckLabelKey
  testId: string
  actionId: VaultPortabilityActionId
  kind: 'preview' | 'import' | 'export'
  onClick?: () => void
}

interface DeckActionRow {
  sourceId: string
  buttons: DeckActionButton[]
}

/** Renders import, export, and storage actions as System Settings-style groups. */
export function PortabilityActionDeck({
  t,
  vaultReady,
  busyAction,
  importPreview,
  exportPreview,
  progress,
  onCancelProgress,
  s3MirrorPreviewReady,
  s3MirrorPullPreviewReady,
  s3ProviderPushPreviewReady,
  s3ProviderPullPreviewReady,
  azureProviderPushPreviewReady,
  azureProviderPullPreviewReady,
  azureMirrorPreviewReady,
  azureMirrorPullPreviewReady,
  s3MirrorPreviewReport,
  s3MirrorPullPreviewReport,
  s3ProviderPushPreviewReport,
  s3ProviderPullPreviewReport,
  s3ProviderPushPreviewArgs,
  s3ProviderPullPreviewArgs,
  azureProviderPushPreviewReport,
  azureProviderPullPreviewReport,
  azureProviderPushPreviewArgs,
  azureProviderPullPreviewArgs,
  azureMirrorPreviewReport,
  azureMirrorPullPreviewReport,
  s3LivePreflightReport,
  azureLivePreflightReport,
  onPreviewMarkdownFolder,
  onImportMarkdownFolder,
  onPreviewMarkdownZip,
  onImportMarkdownZip,
  onPreviewBear,
  onImportBear,
  installedApps,
  onPreviewBearDatabase,
  onImportBearDatabase,
  onPreviewObsidian,
  onImportObsidian,
  onPreviewNotion,
  onImportNotion,
  onPreviewNotionFolder,
  onImportNotionFolder,
  onPreviewSpanda,
  onImportSpanda,
  onPreviewAppleJournal,
  onImportAppleJournal,
  onPreviewDayOne,
  onImportDayOne,
  onPreviewJourney,
  onImportJourney,
  onPreviewJsonCapsule,
  onImportJsonCapsule,
  onPreviewSqliteCapsule,
  onImportSqliteCapsule,
  onExportMarkdownZip,
  onExportStaticHtmlArchive,
  onPreviewJsonSnapshot,
  onExportJsonSnapshot,
  onPreviewSqliteSnapshot,
  onExportSqliteSnapshot,
  onRunS3LivePreflight,
  onRunAzureLivePreflight,
  onPreviewS3MirrorPush,
  onApplyS3MirrorPush,
  onPreviewS3MirrorPull,
  onApplyS3MirrorPull,
  onPreviewS3ProviderPush,
  onApplyS3ProviderPush,
  onPreviewS3ProviderPull,
  onApplyS3ProviderPull,
  onPreviewAzureProviderPush,
  onApplyAzureProviderPush,
  onPreviewAzureProviderPull,
  onApplyAzureProviderPull,
  onPreviewAzureMirrorPush,
  onApplyAzureMirrorPush,
  onPreviewAzureMirrorPull,
  onApplyAzureMirrorPull,
}: PortabilityActionDeckProps) {
  const importSources = new Map(listVaultImportSources().map((source) => [source.id, source]))
  const exportTargets = listVaultExportTargets()
  const previewing = t('settings.portability.previewing')

  const importRows: DeckActionRow[] = [
    {
      sourceId: 'markdown-folder',
      buttons: [
        { labelKey: 'settings.portability.previewMarkdownFolder', testId: 'settings-preview-markdown-folder', actionId: 'markdown-folder-preview', kind: 'preview', onClick: onPreviewMarkdownFolder },
        { labelKey: 'settings.portability.importMarkdownFolder', testId: 'settings-import-markdown-folder', actionId: 'markdown-folder', kind: 'import', onClick: onImportMarkdownFolder },
      ],
    },
    {
      sourceId: 'markdown-zip',
      buttons: [
        { labelKey: 'settings.portability.previewMarkdownZip', testId: 'settings-preview-markdown-zip', actionId: 'markdown-zip-preview', kind: 'preview', onClick: onPreviewMarkdownZip },
        { labelKey: 'settings.portability.importMarkdownZip', testId: 'settings-import-markdown-zip', actionId: 'markdown-zip', kind: 'import', onClick: onImportMarkdownZip },
      ],
    },
    {
      sourceId: 'bear',
      buttons: [
        { labelKey: 'settings.portability.previewBear', testId: 'settings-preview-bear', actionId: 'bear-preview', kind: 'preview', onClick: onPreviewBear },
        { labelKey: 'settings.portability.importBear', testId: 'settings-import-bear', actionId: 'bear', kind: 'import', onClick: onImportBear },
      ],
    },
    {
      sourceId: 'obsidian',
      buttons: [
        { labelKey: 'settings.portability.previewObsidian', testId: 'settings-preview-obsidian', actionId: 'obsidian-preview', kind: 'preview', onClick: onPreviewObsidian },
        { labelKey: 'settings.portability.importObsidian', testId: 'settings-import-obsidian', actionId: 'obsidian', kind: 'import', onClick: onImportObsidian },
      ],
    },
    {
      sourceId: 'notion-markdown',
      buttons: [
        { labelKey: 'settings.portability.previewNotion', testId: 'settings-preview-notion', actionId: 'notion-markdown-preview', kind: 'preview', onClick: onPreviewNotion },
        { labelKey: 'settings.portability.importNotion', testId: 'settings-import-notion', actionId: 'notion-markdown', kind: 'import', onClick: onImportNotion },
        { labelKey: 'settings.portability.previewNotionFolder', testId: 'settings-preview-notion-folder', actionId: 'notion-folder-preview', kind: 'preview', onClick: onPreviewNotionFolder },
        { labelKey: 'settings.portability.importNotionFolder', testId: 'settings-import-notion-folder', actionId: 'notion-folder', kind: 'import', onClick: onImportNotionFolder },
      ],
    },
    {
      sourceId: 'spanda',
      buttons: [
        { labelKey: 'settings.portability.previewSpanda', testId: 'settings-preview-spanda', actionId: 'spanda-preview', kind: 'preview', onClick: onPreviewSpanda },
        { labelKey: 'settings.portability.importSpanda', testId: 'settings-import-spanda', actionId: 'spanda', kind: 'import', onClick: onImportSpanda },
      ],
    },
    {
      sourceId: 'apple-journal',
      buttons: [
        { labelKey: 'settings.portability.previewAppleJournal', testId: 'settings-preview-apple-journal', actionId: 'apple-journal-preview', kind: 'preview', onClick: onPreviewAppleJournal },
        { labelKey: 'settings.portability.importAppleJournal', testId: 'settings-import-apple-journal', actionId: 'apple-journal', kind: 'import', onClick: onImportAppleJournal },
      ],
    },
    {
      sourceId: 'day-one',
      buttons: [
        { labelKey: 'settings.portability.previewDayOne', testId: 'settings-preview-day-one', actionId: 'day-one-preview', kind: 'preview', onClick: onPreviewDayOne },
        { labelKey: 'settings.portability.importDayOne', testId: 'settings-import-day-one', actionId: 'day-one', kind: 'import', onClick: onImportDayOne },
      ],
    },
    {
      sourceId: 'journey',
      buttons: [
        { labelKey: 'settings.portability.previewJourney', testId: 'settings-preview-journey', actionId: 'journey-preview', kind: 'preview', onClick: onPreviewJourney },
        { labelKey: 'settings.portability.importJourney', testId: 'settings-import-journey', actionId: 'journey', kind: 'import', onClick: onImportJourney },
      ],
    },
    {
      sourceId: 'json-capsule',
      buttons: [
        { labelKey: 'settings.portability.previewJsonCapsule', testId: 'settings-preview-json-capsule', actionId: 'json-capsule-preview', kind: 'preview', onClick: onPreviewJsonCapsule },
        { labelKey: 'settings.portability.importJsonCapsule', testId: 'settings-import-json-capsule', actionId: 'json-capsule', kind: 'import', onClick: onImportJsonCapsule },
      ],
    },
    {
      sourceId: 'sqlite-capsule',
      buttons: [
        { labelKey: 'settings.portability.previewSqliteCapsule', testId: 'settings-preview-sqlite-capsule', actionId: 'sqlite-capsule-preview', kind: 'preview', onClick: onPreviewSqliteCapsule },
        { labelKey: 'settings.portability.importSqliteCapsule', testId: 'settings-import-sqlite-capsule', actionId: 'sqlite-capsule', kind: 'import', onClick: onImportSqliteCapsule },
      ],
    },
  ]

  const exportRows: DeckActionRow[] = [
    { sourceId: 'vault-folder', buttons: [] },
    { sourceId: 'git-remote', buttons: [] },
    {
      sourceId: 'markdown-zip',
      buttons: [
        { labelKey: 'settings.portability.exportMarkdownZip', testId: 'settings-export-markdown-zip', actionId: 'export-markdown-zip', kind: 'export', onClick: onExportMarkdownZip },
      ],
    },
    {
      sourceId: 'static-html',
      buttons: [
        { labelKey: 'settings.portability.exportStaticHtml', testId: 'settings-export-static-html', actionId: 'export-static-html', kind: 'export', onClick: onExportStaticHtmlArchive },
      ],
    },
    {
      sourceId: 'json-snapshot',
      buttons: [
        { labelKey: 'settings.portability.previewJsonSnapshot', testId: 'settings-preview-json-snapshot', actionId: 'export-json-preview', kind: 'preview', onClick: onPreviewJsonSnapshot },
        { labelKey: 'settings.portability.exportJsonSnapshot', testId: 'settings-export-json-snapshot', actionId: 'export-json', kind: 'export', onClick: onExportJsonSnapshot },
      ],
    },
    {
      sourceId: 'sqlite-snapshot',
      buttons: [
        { labelKey: 'settings.portability.previewSqliteSnapshot', testId: 'settings-preview-sqlite-snapshot', actionId: 'export-sqlite-preview', kind: 'preview', onClick: onPreviewSqliteSnapshot },
        { labelKey: 'settings.portability.exportSqliteSnapshot', testId: 'settings-export-sqlite-snapshot', actionId: 'export-sqlite', kind: 'export', onClick: onExportSqliteSnapshot },
      ],
    },
  ]

  const progressSlot = progress
    ? progress.actionId.startsWith('storage-')
      ? 'storage'
      : progress.actionId.startsWith('export-')
        ? 'export'
        : 'import'
    : null
  const progressRow = progress ? (
    <SettingsRow fullWidth>
      <PortabilityActionProgress progress={progress} onCancel={onCancelProgress} t={t} />
    </SettingsRow>
  ) : null

  return (
    <div className="settings-hig-stack" data-testid="settings-portability-action-deck">
      <InstalledAppImportActions
        t={t}
        vaultReady={vaultReady}
        busyAction={busyAction}
        installedApps={installedApps ?? []}
        onPreviewAppDatabase={onPreviewBearDatabase}
        onImportAppDatabase={onImportBearDatabase}
      />

      <SettingsGroup
        title={t('settings.portability.import')}
        footnote={
          <span data-testid="settings-portability-preview-gate">
            {t('settings.portability.reviewGate')}
          </span>
        }
      >
        {progressSlot === 'import' ? progressRow : null}
        {importRows.map((row) => {
          const source = importSources.get(row.sourceId)
          if (!source) return null
          return (
            <SettingsActionRow
              key={row.sourceId}
              label={<PortabilityRowLabel label={source.label} status={source.status} t={t} />}
              description={source.description}
              actions={row.buttons.map(renderImportButton)}
            />
          )
        })}
      </SettingsGroup>

      <SettingsGroup
        title={t('settings.portability.export')}
        footnote={t('settings.portability.exportDescription')}
      >
        {progressSlot === 'export' ? progressRow : null}
        {exportRows.map((row) => {
          const target = exportTargets.find((candidate) => candidate.id === row.sourceId)
          if (!target) return null
          return (
            <SettingsActionRow
              key={row.sourceId}
              label={<PortabilityRowLabel label={target.label} status={target.status} t={t} />}
              description={target.description}
              actions={row.buttons.length > 0 ? row.buttons.map(renderExportButton) : null}
            />
          )
        })}
        {exportPreview ? (
          <SettingsRow fullWidth>
            <ExportPreviewSummary exportPreview={exportPreview} t={t} />
          </SettingsRow>
        ) : null}
      </SettingsGroup>

      {progressSlot === 'storage' && progress ? (
        <PortabilityActionProgress progress={progress} onCancel={onCancelProgress} t={t} />
      ) : null}
      <ObjectStoragePrototypeActions
        t={t}
        vaultReady={vaultReady}
        busyAction={busyAction}
        s3MirrorPreviewReady={s3MirrorPreviewReady}
        s3MirrorPullPreviewReady={s3MirrorPullPreviewReady}
        s3ProviderPushPreviewReady={s3ProviderPushPreviewReady}
        s3ProviderPullPreviewReady={s3ProviderPullPreviewReady}
        azureProviderPushPreviewReady={azureProviderPushPreviewReady}
        azureProviderPullPreviewReady={azureProviderPullPreviewReady}
        azureMirrorPreviewReady={azureMirrorPreviewReady}
        azureMirrorPullPreviewReady={azureMirrorPullPreviewReady}
        s3MirrorPreviewReport={s3MirrorPreviewReport}
        s3MirrorPullPreviewReport={s3MirrorPullPreviewReport}
        s3ProviderPushPreviewReport={s3ProviderPushPreviewReport}
        s3ProviderPullPreviewReport={s3ProviderPullPreviewReport}
        s3ProviderPushPreviewArgs={s3ProviderPushPreviewArgs}
        s3ProviderPullPreviewArgs={s3ProviderPullPreviewArgs}
        azureProviderPushPreviewReport={azureProviderPushPreviewReport}
        azureProviderPullPreviewReport={azureProviderPullPreviewReport}
        azureProviderPushPreviewArgs={azureProviderPushPreviewArgs}
        azureProviderPullPreviewArgs={azureProviderPullPreviewArgs}
        azureMirrorPreviewReport={azureMirrorPreviewReport}
        azureMirrorPullPreviewReport={azureMirrorPullPreviewReport}
        s3LivePreflightReport={s3LivePreflightReport}
        azureLivePreflightReport={azureLivePreflightReport}
        onRunS3LivePreflight={onRunS3LivePreflight}
        onRunAzureLivePreflight={onRunAzureLivePreflight}
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
      />
    </div>
  )

  function renderImportButton(button: DeckActionButton): ReactNode {
    return (
      <PortabilityImportButton
        key={button.actionId}
        label={t(button.labelKey)}
        testId={button.testId}
        busy={busyAction === button.actionId}
        busyLabel={button.kind === 'preview' ? previewing : undefined}
        disabled={isPortabilityActionDisabled(
          busyAction,
          vaultReady,
          button.onClick,
          button.kind === 'import' ? button.actionId : undefined,
          importPreview,
        )}
        onClick={button.onClick}
        t={t}
      />
    )
  }

  function renderExportButton(button: DeckActionButton): ReactNode {
    const exportLocked = exportRequiresReview(button.actionId)
      && !hasReviewedExportPreview(button.actionId, exportPreview)
    return (
      <PortabilityActionButton
        key={button.actionId}
        icon={<Glyph name="upload" size={14} />}
        label={t(button.labelKey)}
        testId={button.testId}
        busy={busyAction === button.actionId}
        busyLabel={button.kind === 'preview' ? previewing : t('settings.portability.exporting')}
        disabled={Boolean(busyAction) || !vaultReady || !button.onClick || exportLocked}
        onClick={button.onClick}
        t={t}
      />
    )
  }
}

function ExportPreviewSummary({
  exportPreview,
  t,
}: {
  exportPreview: NonNullable<PortabilityActionDeckProps['exportPreview']>
  t: PortabilityActionDeckTranslate
}) {
  const { result } = exportPreview
  const proofValue = (proved: boolean) => (
    proved ? t('settings.portability.proofYes') : t('settings.portability.proofNeedsReview')
  )
  return (
    <div className="grid gap-1.5 text-[11px]" data-testid="settings-export-preview-summary">
      <div className="flex flex-wrap items-center gap-1.5">
        <Badge variant="secondary" className="rounded-md">{t('settings.portability.exportPreviewReviewed')}</Badge>
        <span className="font-medium text-foreground">
          {t(exportPreview.format === 'json'
            ? 'settings.portability.exportPreviewFormatJson'
            : 'settings.portability.exportPreviewFormatSqlite')}
        </span>
      </div>
      <div className="text-muted-foreground">
        {t('settings.portability.exportPreviewCounts', {
          assets: result.assets_exportable,
          files: result.files_exportable,
          notes: result.notes_exportable,
          withheld: result.skipped_files,
        })}
      </div>
      <div className="text-muted-foreground">
        {t('settings.portability.exportPreviewProof', {
          paths: proofValue(result.locality_proof.absolute_source_paths_redacted),
          source: proofValue(result.locality_proof.markdown_source_of_truth),
        })}
      </div>
    </div>
  )
}
