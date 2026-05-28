import type { VaultEntry } from '../types'
import type { createTranslator } from '../lib/i18n'
import {
  type ImportAutopsyPreviewState,
  type PortabilityProgressState,
  type VaultPortabilityActionId,
} from '../lib/vaultPortability'
import type { ObjectStorageLiveProofReport } from '../lib/portabilityProof'
import type { ObjectStorageSyncReport, S3LivePreflightArgs, S3LivePreflightReport } from '../utils/objectStorageSync'
import type { AzureLivePreflightArgs, AzureLivePreflightReport } from '../utils/objectStorageLivePreflight'
import { ImportAutopsyTimeline } from './ImportAutopsyTimeline'
import { LocalityFirewallSettingsCard } from './LocalityFirewallSettingsCard'
import { PortabilityActionDeck } from './PortabilityActionDeck'
import { PortabilityGroups } from './PortabilityGroups'
import { PortabilityProofLedger } from './PortabilityProofLedger'

type Translate = ReturnType<typeof createTranslator>

interface PortabilitySettingsSectionProps {
  t: Translate
  vaultPath?: string
  entries?: VaultEntry[]
  vaultReady?: boolean
  importBusy?: boolean
  busyAction?: VaultPortabilityActionId | null
  progress?: PortabilityProgressState | null
  importPreview?: ImportAutopsyPreviewState | null
  onCancelProgress?: () => void
  onPreviewMarkdownFolder?: () => void
  onImportMarkdownFolder?: () => void
  onPreviewMarkdownZip?: () => void
  onImportMarkdownZip?: () => void
  onPreviewBear?: () => void
  onImportBear?: () => void
  onPreviewObsidian?: () => void
  onImportObsidian?: () => void
  onPreviewNotion?: () => void
  onImportNotion?: () => void
  onPreviewNotionFolder?: () => void
  onImportNotionFolder?: () => void
  onPreviewSpanda?: () => void
  onImportSpanda?: () => void
  onPreviewAppleJournal?: () => void
  onImportAppleJournal?: () => void
  onPreviewDayOne?: () => void
  onImportDayOne?: () => void
  onPreviewJourney?: () => void
  onImportJourney?: () => void
  onPreviewJsonCapsule?: () => void
  onImportJsonCapsule?: () => void
  onPreviewSqliteCapsule?: () => void
  onImportSqliteCapsule?: () => void
  onExportMarkdownZip?: () => void
  onExportStaticHtmlArchive?: () => void
  onPreviewJsonSnapshot?: () => void
  onExportJsonSnapshot?: () => void
  onPreviewSqliteSnapshot?: () => void
  onExportSqliteSnapshot?: () => void
  s3MirrorPreviewReady?: boolean
  s3MirrorPullPreviewReady?: boolean
  s3ProviderPushPreviewReady?: boolean
  s3ProviderPullPreviewReady?: boolean
  azureProviderPushPreviewReady?: boolean
  azureProviderPullPreviewReady?: boolean
  azureMirrorPreviewReady?: boolean
  azureMirrorPullPreviewReady?: boolean
  s3MirrorPreviewReport?: ObjectStorageSyncReport
  s3MirrorPullPreviewReport?: ObjectStorageSyncReport
  s3ProviderPushPreviewReport?: ObjectStorageSyncReport
  s3ProviderPullPreviewReport?: ObjectStorageSyncReport
  azureProviderPushPreviewReport?: ObjectStorageSyncReport
  azureProviderPullPreviewReport?: ObjectStorageSyncReport
  azureMirrorPreviewReport?: ObjectStorageSyncReport
  azureMirrorPullPreviewReport?: ObjectStorageSyncReport
  s3LivePreflightReport?: S3LivePreflightReport
  azureLivePreflightReport?: AzureLivePreflightReport
  objectStorageLiveProofReport?: ObjectStorageLiveProofReport | null
  onRunS3LivePreflight?: (args: S3LivePreflightArgs) => void
  onRunAzureLivePreflight?: (args: AzureLivePreflightArgs) => void
  onPreviewS3MirrorPush?: () => void
  onApplyS3MirrorPush?: () => void
  onPreviewS3MirrorPull?: () => void
  onApplyS3MirrorPull?: () => void
  onPreviewS3ProviderPush?: (args: S3LivePreflightArgs) => void
  onApplyS3ProviderPush?: (args: S3LivePreflightArgs) => void
  onPreviewS3ProviderPull?: (args: S3LivePreflightArgs) => void
  onApplyS3ProviderPull?: (args: S3LivePreflightArgs) => void
  onPreviewAzureProviderPush?: (args: AzureLivePreflightArgs) => void
  onApplyAzureProviderPush?: (args: AzureLivePreflightArgs) => void
  onPreviewAzureProviderPull?: (args: AzureLivePreflightArgs) => void
  onApplyAzureProviderPull?: (args: AzureLivePreflightArgs) => void
  onPreviewAzureMirrorPush?: () => void
  onApplyAzureMirrorPush?: () => void
  onPreviewAzureMirrorPull?: () => void
  onApplyAzureMirrorPull?: () => void
}

/** Renders the local-first import, export, storage, and second-brain roadmap surface. */
export function PortabilitySettingsSection({
  t,
  vaultPath = '',
  entries = [],
  vaultReady = true,
  importBusy = false,
  busyAction = importBusy ? 'markdown-folder' : null,
  progress = null,
  importPreview = null,
  onCancelProgress,
  onPreviewMarkdownFolder,
  onImportMarkdownFolder,
  onPreviewMarkdownZip,
  onImportMarkdownZip,
  onPreviewBear,
  onImportBear,
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
  azureProviderPushPreviewReport,
  azureProviderPullPreviewReport,
  azureMirrorPreviewReport,
  azureMirrorPullPreviewReport,
  s3LivePreflightReport,
  azureLivePreflightReport,
  objectStorageLiveProofReport,
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
}: PortabilitySettingsSectionProps) {
  return (
    <>
      <div className="flex flex-col gap-1.5">
        <div className="text-[11px] font-bold uppercase tracking-[0.08em] text-muted-foreground">
          {t('settings.portability.title')}
        </div>
        <div className="max-w-[420px] text-xs leading-relaxed text-muted-foreground">
          {t('settings.portability.description')}
        </div>
      </div>

      <div className="grid gap-2" data-testid="settings-portability-section">
        <LocalityFirewallSettingsCard entries={entries} />
        <PortabilityProofLedger
          azureLivePreflightReport={azureLivePreflightReport}
          objectStorageLiveProofReport={objectStorageLiveProofReport}
          s3LivePreflightReport={s3LivePreflightReport}
        />
        <PortabilityGroups t={t} vaultPath={vaultPath} />
      </div>

      <PortabilityActionDeck
        t={t}
        vaultReady={vaultReady}
        busyAction={busyAction}
        progress={progress}
        onCancelProgress={onCancelProgress}
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
        azureProviderPushPreviewReport={azureProviderPushPreviewReport}
        azureProviderPullPreviewReport={azureProviderPullPreviewReport}
        azureMirrorPreviewReport={azureMirrorPreviewReport}
        azureMirrorPullPreviewReport={azureMirrorPullPreviewReport}
        s3LivePreflightReport={s3LivePreflightReport}
        azureLivePreflightReport={azureLivePreflightReport}
        onRunS3LivePreflight={onRunS3LivePreflight}
        onRunAzureLivePreflight={onRunAzureLivePreflight}
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

      <ImportAutopsyTimeline
        preview={importPreview}
        vaultPath={vaultPath}
        isRefreshing={isImportPreviewAction(busyAction)}
      />

    </>
  )
}

function isImportPreviewAction(action: VaultPortabilityActionId | null): boolean {
  return Boolean(action?.endsWith('-preview') && !action.startsWith('storage-') && !action.startsWith('export-'))
}
