import type { AiAgentId, AiAgentsStatus } from '../../lib/aiAgents'
import type { EditorFont, NativeShellMaterial, ThemePreset } from '../../lib/appearance'
import type { createTranslator } from '../../lib/i18n'
import type { AppLocale, UiLanguagePreference } from '../../lib/i18nCore'
import type { PortabilityExportPreviewState } from '../../lib/exportReviewGate'
import type { ReleaseChannel } from '../../lib/releaseChannel'
import type { TranscriptionProviderId } from '../../lib/transcriptionProviders'
import type { ThemeMode } from '../../lib/themeMode'
import type {
  ImportAutopsyPreviewState,
  PortabilityProgressState,
  VaultPortabilityActionId,
} from '../../lib/vaultPortability'
import type { VaultEntry } from '../../types'
import type { AzureLivePreflightArgs, AzureLivePreflightReport } from '../../utils/objectStorageLivePreflight'
import type { ObjectStorageSyncReport, S3LivePreflightArgs, S3LivePreflightReport } from '../../utils/objectStorageSync'

export type SettingsTranslate = ReturnType<typeof createTranslator>

export interface SettingsDraft {
  pullInterval: number
  autoGitEnabled: boolean
  autoGitIdleThresholdSeconds: number
  autoGitInactiveThresholdSeconds: number
  autoAdvanceInboxAfterOrganize: boolean
  defaultAiAgent: AiAgentId
  aiAgentModels: Partial<Record<AiAgentId, string>>
  aiAgentProviders: Partial<Record<AiAgentId, string>>
  releaseChannel: ReleaseChannel
  themeMode: ThemeMode
  themePreset: ThemePreset
  editorFont: EditorFont
  uiLanguage: UiLanguagePreference
  menuBarIconEnabled: boolean
  nativeShellMaterial: NativeShellMaterial
  initialH1AutoRename: boolean
  crashReporting: boolean
  analytics: boolean
  transcriptionProvider: TranscriptionProviderId
  cloudTranscriptionEnabled: boolean
  explicitOrganization: boolean
}

export interface SettingsBodyProps {
  t: SettingsTranslate
  pullInterval: number
  setPullInterval: (value: number) => void
  isGitVault: boolean
  hasGitMetadata: boolean
  gitCapabilityUpdating: boolean
  onSetGitEnabled?: (enabled: boolean) => void
  autoGitEnabled: boolean
  setAutoGitEnabled: (value: boolean) => void
  autoGitIdleThresholdSeconds: number
  setAutoGitIdleThresholdSeconds: (value: number) => void
  autoGitInactiveThresholdSeconds: number
  setAutoGitInactiveThresholdSeconds: (value: number) => void
  autoAdvanceInboxAfterOrganize: boolean
  setAutoAdvanceInboxAfterOrganize: (value: boolean) => void
  aiAgentsStatus: AiAgentsStatus
  defaultAiAgent: AiAgentId
  setDefaultAiAgent: (value: AiAgentId) => void
  aiAgentModels: Partial<Record<AiAgentId, string>>
  setAiAgentModels: (value: Partial<Record<AiAgentId, string>>) => void
  aiAgentProviders: Partial<Record<AiAgentId, string>>
  setAiAgentProviders: (value: Partial<Record<AiAgentId, string>>) => void
  releaseChannel: ReleaseChannel
  setReleaseChannel: (value: ReleaseChannel) => void
  themeMode: ThemeMode
  setThemeMode: (value: ThemeMode) => void
  themePreset: ThemePreset
  setThemePreset: (value: ThemePreset) => void
  editorFont: EditorFont
  setEditorFont: (value: EditorFont) => void
  uiLanguage: UiLanguagePreference
  setUiLanguage: (value: UiLanguagePreference) => void
  menuBarIconEnabled: boolean
  setMenuBarIconEnabled: (value: boolean) => void
  nativeShellMaterial: NativeShellMaterial
  setNativeShellMaterial: (value: NativeShellMaterial) => void
  locale: AppLocale
  systemLocale: AppLocale
  initialH1AutoRename: boolean
  setInitialH1AutoRename: (value: boolean) => void
  explicitOrganization: boolean
  setExplicitOrganization: (value: boolean) => void
  crashReporting: boolean
  setCrashReporting: (value: boolean) => void
  analytics: boolean
  setAnalytics: (value: boolean) => void
  transcriptionProvider: TranscriptionProviderId
  setTranscriptionProvider: (value: TranscriptionProviderId) => void
  cloudTranscriptionEnabled: boolean
  setCloudTranscriptionEnabled: (value: boolean) => void
  vaultPath: string
  entries: VaultEntry[]
  importMarkdownFolderBusy: boolean
  portabilityBusyAction?: VaultPortabilityActionId | null
  portabilityProgress?: PortabilityProgressState | null
  importPreview?: ImportAutopsyPreviewState | null
  exportPreview?: PortabilityExportPreviewState | null
  onCancelPortabilityAction?: () => void
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
