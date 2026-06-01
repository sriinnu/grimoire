import type { ImportAutopsyPreviewState, PortabilityProgressState, VaultPortabilityActionId } from '../lib/vaultPortability'
import type { PortabilityExportPreviewState } from '../lib/exportReviewGate'
import type { createTranslator } from '../lib/i18n'
import type { ObjectStorageSyncReport, S3LivePreflightArgs, S3LivePreflightReport } from '../utils/objectStorageSync'
import type { AzureLivePreflightArgs, AzureLivePreflightReport } from '../utils/objectStorageLivePreflight'

export type PortabilityActionDeckTranslate = ReturnType<typeof createTranslator>

export interface PortabilityActionDeckProps {
  t: PortabilityActionDeckTranslate
  vaultReady: boolean
  busyAction: VaultPortabilityActionId | null
  importPreview?: ImportAutopsyPreviewState | null
  exportPreview?: PortabilityExportPreviewState | null
  progress?: PortabilityProgressState | null
  onCancelProgress?: () => void
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
  s3ProviderPushPreviewArgs?: S3LivePreflightArgs
  s3ProviderPullPreviewArgs?: S3LivePreflightArgs
  azureProviderPushPreviewReport?: ObjectStorageSyncReport
  azureProviderPullPreviewReport?: ObjectStorageSyncReport
  azureProviderPushPreviewArgs?: AzureLivePreflightArgs
  azureProviderPullPreviewArgs?: AzureLivePreflightArgs
  azureMirrorPreviewReport?: ObjectStorageSyncReport
  azureMirrorPullPreviewReport?: ObjectStorageSyncReport
  s3LivePreflightReport?: S3LivePreflightReport
  azureLivePreflightReport?: AzureLivePreflightReport
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
