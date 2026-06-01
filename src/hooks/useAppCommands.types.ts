import type { MutableRefObject, RefObject } from 'react'
import type { AiAgentId, AiAgentsStatus } from '../lib/aiAgents'
import type { AppLocale, UiLanguagePreference } from '../lib/i18nCore'
import type { VaultAiGuidanceStatus } from '../lib/vaultAiGuidance'
import type { NoteListMultiSelectionCommands } from '../components/note-list/multiSelectionCommands'
import type { NoteLayout, SidebarSelection, VaultEntry } from '../types'
import type { NoteListFilter } from '../utils/noteListHelpers'
import type { ViewMode } from './useViewMode'
import type { useCommandRegistry } from './useCommandRegistry'

export interface AppCommandsConfig {
  activeTabPath: string | null
  activeTabPathRef: MutableRefObject<string | null>
  entries: VaultEntry[]
  visibleNotesRef: RefObject<VaultEntry[]>
  multiSelectionCommandRef: MutableRefObject<NoteListMultiSelectionCommands | null>
  modifiedCount: number
  isGitVault?: boolean
  selection: SidebarSelection
  onQuickOpen: () => void
  onCommandPalette: () => void
  onSearch: () => void
  onCreateNote: () => void
  onCaptureThought?: () => void
  onCaptureJournal?: () => void
  onCaptureDream?: () => void
  onCreateNoteOfType: (type: string) => void
  onSave: () => void
  onOpenSettings: () => void
  onOpenFeedback?: () => void
  onDeleteNote: (path: string) => void
  onArchiveNote: (path: string) => void
  onUnarchiveNote: (path: string) => void
  onCommitPush: () => void
  onPull?: () => void
  onResolveConflicts?: () => void
  onSetViewMode: (mode: ViewMode) => void
  onToggleInspector: () => void
  onToggleDiff?: () => void
  onToggleRawEditor?: () => void
  noteLayout?: NoteLayout
  onToggleNoteLayout?: () => void
  activeNoteModified: boolean
  onZoomIn: () => void
  onZoomOut: () => void
  onZoomReset: () => void
  zoomLevel: number
  onSelect: (sel: SidebarSelection) => void
  onRenameFolder?: () => void
  onDeleteFolder?: () => void
  showInbox?: boolean
  onReplaceActiveTab: (entry: VaultEntry) => void
  onSelectNote: (entry: VaultEntry) => void
  onGoBack?: () => void
  onGoForward?: () => void
  canGoBack?: boolean
  canGoForward?: boolean
  onOpenVault?: () => void
  onCreateEmptyVault?: () => void
  onAddRemote?: () => void
  canAddRemote?: boolean
  onCreateType?: () => void
  onToggleAIChat?: () => void
  onOpenGraph?: () => void
  onCheckForUpdates?: () => void
  onRemoveActiveVault?: () => void
  onRestoreGettingStarted?: () => void
  isGettingStartedHidden?: boolean
  vaultCount?: number
  locale?: AppLocale
  systemLocale?: AppLocale
  selectedUiLanguage?: UiLanguagePreference
  onSetUiLanguage?: (language: UiLanguagePreference) => void
  mcpStatus?: string
  onInstallMcp?: () => void
  aiAgentsStatus?: AiAgentsStatus
  vaultAiGuidanceStatus?: VaultAiGuidanceStatus
  onOpenAiAgents?: () => void
  onRestoreVaultAiGuidance?: () => void
  onSetDefaultAiAgent?: (agent: AiAgentId) => void
  selectedAiAgent?: AiAgentId
  onCycleDefaultAiAgent?: () => void
  selectedAiAgentLabel?: string
  claudeCodeStatus?: string
  claudeCodeVersion?: string
  onReloadVault?: () => void
  onRepairVault?: () => void
  onSetNoteIcon?: () => void
  onRemoveNoteIcon?: () => void
  onChangeNoteType?: () => void
  onMoveNoteToFolder?: () => void
  canMoveNoteToFolder?: boolean
  activeNoteHasIcon?: boolean
  noteListFilter?: NoteListFilter
  onSetNoteListFilter?: (filter: NoteListFilter) => void
  onOpenInNewWindow?: () => void
  onRevealNoteInFinder?: (path: string) => void
  onPreviewNoteWithQuickLook?: (path: string) => void
  onRevealVaultInFinder?: () => void
  onToggleFavorite?: (path: string) => void
  onToggleOrganized?: (path: string) => void
  onInsertWeatherSnapshot?: () => void
  onTranscribeAudio?: () => void
  onRecordAudio?: () => void
  onCustomizeNoteListColumns?: () => void
  canCustomizeNoteListColumns?: boolean
  noteListColumnsLabel?: string
  onRestoreDeletedNote?: () => void
  canRestoreDeletedNote?: boolean
}

export type CommandRegistryConfig = Parameters<typeof useCommandRegistry>[0]
export type CommandRegistrySelectionState = Pick<
  CommandRegistryConfig,
  | 'activeNoteModified'
  | 'onZoomIn'
  | 'onZoomOut'
  | 'onZoomReset'
  | 'zoomLevel'
  | 'onSelect'
  | 'onRenameFolder'
  | 'onDeleteFolder'
  | 'showInbox'
  | 'onGoBack'
  | 'onGoForward'
  | 'canGoBack'
  | 'canGoForward'
  | 'selection'
>
export type CommandRegistryCoreActions = Pick<
  CommandRegistryConfig,
  | 'activeTabPath'
  | 'entries'
  | 'modifiedCount'
  | 'onQuickOpen'
  | 'onCreateNote'
  | 'onCaptureThought'
  | 'onCaptureJournal'
  | 'onCaptureDream'
  | 'onCreateNoteOfType'
  | 'onSave'
  | 'onOpenSettings'
  | 'onOpenFeedback'
  | 'onDeleteNote'
  | 'onArchiveNote'
  | 'onUnarchiveNote'
  | 'onCommitPush'
  | 'onPull'
  | 'onResolveConflicts'
  | 'onSetViewMode'
  | 'onToggleInspector'
  | 'onToggleDiff'
  | 'onToggleRawEditor'
  | 'noteLayout'
  | 'onToggleNoteLayout'
  | 'onToggleAIChat'
  | 'onOpenGraph'
>
export type CommandRegistryVaultActions = Pick<
  CommandRegistryConfig,
  | 'onOpenVault'
  | 'onCreateEmptyVault'
  | 'onAddRemote'
  | 'canAddRemote'
  | 'onCheckForUpdates'
  | 'onCreateType'
  | 'locale'
  | 'systemLocale'
  | 'selectedUiLanguage'
  | 'onSetUiLanguage'
  | 'onRemoveActiveVault'
  | 'onRestoreGettingStarted'
  | 'isGettingStartedHidden'
  | 'vaultCount'
  | 'onReloadVault'
  | 'onRepairVault'
  | 'onOpenInNewWindow'
  | 'onRevealVaultInFinder'
  | 'onRestoreDeletedNote'
  | 'canRestoreDeletedNote'
>
export type CommandRegistryAiActions = Pick<
  CommandRegistryConfig,
  | 'mcpStatus'
  | 'onInstallMcp'
  | 'aiAgentsStatus'
  | 'vaultAiGuidanceStatus'
  | 'onOpenAiAgents'
  | 'onRestoreVaultAiGuidance'
  | 'onSetDefaultAiAgent'
  | 'selectedAiAgent'
  | 'onCycleDefaultAiAgent'
  | 'selectedAiAgentLabel'
>
export type CommandRegistryNoteActions = Pick<
  CommandRegistryConfig,
  | 'onSetNoteIcon'
  | 'onRemoveNoteIcon'
  | 'onChangeNoteType'
  | 'onMoveNoteToFolder'
  | 'canMoveNoteToFolder'
  | 'activeNoteHasIcon'
  | 'noteListFilter'
  | 'onSetNoteListFilter'
  | 'onToggleFavorite'
  | 'onToggleOrganized'
  | 'onRevealNoteInFinder'
  | 'onPreviewNoteWithQuickLook'
  | 'onInsertWeatherSnapshot'
  | 'onTranscribeAudio'
  | 'onRecordAudio'
  | 'onCustomizeNoteListColumns'
  | 'canCustomizeNoteListColumns'
  | 'noteListColumnsLabel'
>
