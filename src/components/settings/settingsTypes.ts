import type { AiAgentId, AiAgentsStatus } from '../../lib/aiAgents'
import type { EditorFont, ThemePreset } from '../../lib/appearance'
import type { createTranslator, AppLocale, UiLanguagePreference } from '../../lib/i18n'
import type { ReleaseChannel } from '../../lib/releaseChannel'
import type { TranscriptionProviderId } from '../../lib/transcriptionProviders'
import type { ThemeMode } from '../../lib/themeMode'
import type {
  ImportAutopsyPreviewState,
  PortabilityProgressState,
  VaultPortabilityActionId,
} from '../../lib/vaultPortability'
import type { VaultEntry } from '../../types'
import type { ObjectStorageSyncReport } from '../../utils/objectStorageSync'

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
  onExportMarkdownZip?: () => void
  onExportStaticHtmlArchive?: () => void
  s3MirrorPreviewReady?: boolean
  s3MirrorPullPreviewReady?: boolean
  azureMirrorPreviewReady?: boolean
  azureMirrorPullPreviewReady?: boolean
  s3MirrorPreviewReport?: ObjectStorageSyncReport
  s3MirrorPullPreviewReport?: ObjectStorageSyncReport
  azureMirrorPreviewReport?: ObjectStorageSyncReport
  azureMirrorPullPreviewReport?: ObjectStorageSyncReport
  onPreviewS3MirrorPush?: () => void
  onApplyS3MirrorPush?: () => void
  onPreviewS3MirrorPull?: () => void
  onApplyS3MirrorPull?: () => void
  onPreviewAzureMirrorPush?: () => void
  onApplyAzureMirrorPush?: () => void
  onPreviewAzureMirrorPull?: () => void
  onApplyAzureMirrorPull?: () => void
}
