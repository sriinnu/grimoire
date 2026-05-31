import { useCallback, useRef } from 'react'
import { useAppKeyboard } from './useAppKeyboard'
import { useCommandRegistry } from './useCommandRegistry'
import type { CommandAction } from './useCommandRegistry'
import { useKeyboardNavigation } from './useKeyboardNavigation'
import { useMenuEvents } from './useMenuEvents'
import type { SidebarFilter } from '../types'
import { requestAddRemote } from '../utils/addRemoteEvents'
import type {
  AppCommandsConfig,
  CommandRegistryAiActions,
  CommandRegistryConfig,
  CommandRegistryCoreActions,
  CommandRegistryNoteActions,
  CommandRegistrySelectionState,
  CommandRegistryVaultActions,
} from './useAppCommands.types'

function createKeyboardActions(
  config: AppCommandsConfig,
): Omit<Parameters<typeof useAppKeyboard>[0], 'onArchiveNote'> {
  return {
    onQuickOpen: config.onQuickOpen,
    onCommandPalette: config.onCommandPalette,
    onSearch: config.onSearch,
    onCreateNote: config.onCreateNote,
    onSave: config.onSave,
    onOpenSettings: config.onOpenSettings,
    onDeleteNote: config.onDeleteNote,
    onSetViewMode: config.onSetViewMode,
    onZoomIn: config.onZoomIn,
    onZoomOut: config.onZoomOut,
    onZoomReset: config.onZoomReset,
    onGoBack: config.onGoBack,
    onGoForward: config.onGoForward,
    onToggleAIChat: config.onToggleAIChat,
    onToggleRawEditor: config.onToggleRawEditor,
    onToggleInspector: config.onToggleInspector,
    onToggleFavorite: config.onToggleFavorite,
    onToggleOrganized: config.onToggleOrganized,
    onOpenInNewWindow: config.onOpenInNewWindow,
    activeTabPathRef: config.activeTabPathRef,
    multiSelectionCommandRef: config.multiSelectionCommandRef,
  }
}

function createMenuEventHandlers(
  config: AppCommandsConfig,
  selectFilter: (filter: SidebarFilter) => void,
  viewChanges: () => void,
): Omit<Parameters<typeof useMenuEvents>[0], 'onArchiveNote'> {
  return {
    ...createMenuEventActionHandlers(config, selectFilter),
    ...createMenuEventVaultHandlers(config, viewChanges),
    ...createMenuEventState(config),
  }
}

function createMenuEventActionHandlers(
  config: AppCommandsConfig,
  selectFilter: (filter: SidebarFilter) => void,
): Pick<
  Omit<Parameters<typeof useMenuEvents>[0], 'onArchiveNote'>,
  | 'onSetViewMode'
  | 'onCreateNote'
  | 'onCaptureThought'
  | 'onCaptureJournal'
  | 'onCaptureDream'
  | 'onCreateType'
  | 'onQuickOpen'
  | 'onSave'
  | 'onOpenSettings'
  | 'onToggleInspector'
  | 'onCommandPalette'
  | 'onZoomIn'
  | 'onZoomOut'
  | 'onZoomReset'
  | 'onDeleteNote'
  | 'onSearch'
  | 'onToggleRawEditor'
  | 'onToggleDiff'
  | 'onToggleAIChat'
  | 'onToggleOrganized'
  | 'onGoBack'
  | 'onGoForward'
  | 'onCheckForUpdates'
  | 'onSelectFilter'
> {
  return {
    onSetViewMode: config.onSetViewMode,
    onCreateNote: config.onCreateNote,
    onCaptureThought: config.onCaptureThought,
    onCaptureJournal: config.onCaptureJournal,
    onCaptureDream: config.onCaptureDream,
    onCreateType: config.onCreateType,
    onQuickOpen: config.onQuickOpen,
    onSave: config.onSave,
    onOpenSettings: config.onOpenSettings,
    onToggleInspector: config.onToggleInspector,
    onCommandPalette: config.onCommandPalette,
    onZoomIn: config.onZoomIn,
    onZoomOut: config.onZoomOut,
    onZoomReset: config.onZoomReset,
    onDeleteNote: config.onDeleteNote,
    onSearch: config.onSearch,
    onToggleRawEditor: config.onToggleRawEditor,
    onToggleDiff: config.onToggleDiff,
    onToggleAIChat: config.onToggleAIChat,
    onToggleOrganized: config.onToggleOrganized,
    onGoBack: config.onGoBack,
    onGoForward: config.onGoForward,
    onCheckForUpdates: config.onCheckForUpdates,
    onSelectFilter: selectFilter,
  }
}

function createMenuEventVaultHandlers(
  config: AppCommandsConfig,
  viewChanges: () => void,
): Pick<
  Omit<Parameters<typeof useMenuEvents>[0], 'onArchiveNote'>,
  | 'onOpenVault'
  | 'onRemoveActiveVault'
  | 'onRestoreGettingStarted'
  | 'onAddRemote'
  | 'onCommitPush'
  | 'onPull'
  | 'onResolveConflicts'
  | 'onViewChanges'
  | 'onInstallMcp'
  | 'onReloadVault'
  | 'onRepairVault'
  | 'onOpenInNewWindow'
  | 'onRestoreDeletedNote'
> {
  const isGitVault = config.isGitVault !== false

  return {
    onOpenVault: config.onOpenVault,
    onRemoveActiveVault: config.onRemoveActiveVault,
    onRestoreGettingStarted: config.onRestoreGettingStarted,
    onAddRemote: config.onAddRemote ?? requestAddRemote,
    onCommitPush: isGitVault ? config.onCommitPush : undefined,
    onPull: isGitVault ? config.onPull : undefined,
    onResolveConflicts: isGitVault ? config.onResolveConflicts : undefined,
    onViewChanges: isGitVault ? viewChanges : undefined,
    onInstallMcp: config.onInstallMcp,
    onReloadVault: config.onReloadVault,
    onRepairVault: config.onRepairVault,
    onOpenInNewWindow: config.onOpenInNewWindow,
    onRestoreDeletedNote: config.onRestoreDeletedNote,
  }
}

function createMenuEventState(
  config: AppCommandsConfig,
): Pick<
  Omit<Parameters<typeof useMenuEvents>[0], 'onArchiveNote'>,
  | 'activeTabPathRef'
  | 'multiSelectionCommandRef'
  | 'activeTabPath'
  | 'modifiedCount'
  | 'hasRestorableDeletedNote'
  | 'hasNoRemote'
  | 'hasGitVault'
> {
  const isGitVault = config.isGitVault !== false

  return {
    activeTabPathRef: config.activeTabPathRef,
    multiSelectionCommandRef: config.multiSelectionCommandRef,
    activeTabPath: config.activeTabPath,
    modifiedCount: isGitVault ? config.modifiedCount : 0,
    hasRestorableDeletedNote: config.canRestoreDeletedNote,
    hasNoRemote: !isGitVault || (config.canAddRemote ?? true),
    hasGitVault: isGitVault,
  }
}

function createCommandRegistrySelectionConfig(
  config: AppCommandsConfig,
): CommandRegistrySelectionState {
  return {
    activeNoteModified: config.activeNoteModified,
    onZoomIn: config.onZoomIn,
    onZoomOut: config.onZoomOut,
    onZoomReset: config.onZoomReset,
    zoomLevel: config.zoomLevel,
    onSelect: config.onSelect,
    onRenameFolder: config.onRenameFolder,
    onDeleteFolder: config.onDeleteFolder,
    showInbox: config.showInbox,
    onGoBack: config.onGoBack,
    onGoForward: config.onGoForward,
    canGoBack: config.canGoBack,
    canGoForward: config.canGoForward,
    selection: config.selection,
  }
}

function createCommandRegistryCoreConfig(
  config: AppCommandsConfig,
): CommandRegistryCoreActions {
  return {
    activeTabPath: config.activeTabPath,
    entries: config.entries,
    modifiedCount: config.isGitVault === false ? 0 : config.modifiedCount,
    onQuickOpen: config.onQuickOpen,
    onCreateNote: config.onCreateNote,
    onCaptureThought: config.onCaptureThought,
    onCaptureJournal: config.onCaptureJournal,
    onCaptureDream: config.onCaptureDream,
    onCreateNoteOfType: config.onCreateNoteOfType,
    onSave: config.onSave,
    onOpenSettings: config.onOpenSettings,
    onOpenFeedback: config.onOpenFeedback,
    onDeleteNote: config.onDeleteNote,
    onArchiveNote: config.onArchiveNote,
    onUnarchiveNote: config.onUnarchiveNote,
    onCommitPush: config.onCommitPush,
    onPull: config.onPull,
    onResolveConflicts: config.onResolveConflicts,
    onSetViewMode: config.onSetViewMode,
    onToggleInspector: config.onToggleInspector,
    onToggleDiff: config.onToggleDiff,
    onToggleRawEditor: config.onToggleRawEditor,
    noteLayout: config.noteLayout,
    onToggleNoteLayout: config.onToggleNoteLayout,
    onToggleAIChat: config.onToggleAIChat,
    onOpenGraph: config.onOpenGraph,
  }
}

function createCommandRegistryVaultConfig(
  config: AppCommandsConfig,
): CommandRegistryVaultActions {
  const isGitVault = config.isGitVault !== false

  return {
    onOpenVault: config.onOpenVault,
    onCreateEmptyVault: config.onCreateEmptyVault,
    onAddRemote: config.onAddRemote ?? requestAddRemote,
    canAddRemote: !isGitVault || (config.canAddRemote ?? true),
    onCheckForUpdates: config.onCheckForUpdates,
    onCreateType: config.onCreateType,
    locale: config.locale,
    systemLocale: config.systemLocale,
    selectedUiLanguage: config.selectedUiLanguage,
    onSetUiLanguage: config.onSetUiLanguage,
    onRemoveActiveVault: config.onRemoveActiveVault,
    onRestoreGettingStarted: config.onRestoreGettingStarted,
    isGettingStartedHidden: config.isGettingStartedHidden,
    vaultCount: config.vaultCount,
    onReloadVault: config.onReloadVault,
    onRepairVault: config.onRepairVault,
    onOpenInNewWindow: config.onOpenInNewWindow,
    onRestoreDeletedNote: config.onRestoreDeletedNote,
    canRestoreDeletedNote: config.canRestoreDeletedNote,
  }
}

function createCommandRegistryAiConfig(
  config: AppCommandsConfig,
): CommandRegistryAiActions {
  return {
    mcpStatus: config.mcpStatus,
    onInstallMcp: config.onInstallMcp,
    aiAgentsStatus: config.aiAgentsStatus,
    vaultAiGuidanceStatus: config.vaultAiGuidanceStatus,
    onOpenAiAgents: config.onOpenAiAgents,
    onRestoreVaultAiGuidance: config.onRestoreVaultAiGuidance,
    onSetDefaultAiAgent: config.onSetDefaultAiAgent,
    selectedAiAgent: config.selectedAiAgent,
    onCycleDefaultAiAgent: config.onCycleDefaultAiAgent,
    selectedAiAgentLabel: config.selectedAiAgentLabel,
  }
}

function createCommandRegistryNoteConfig(
  config: AppCommandsConfig,
): CommandRegistryNoteActions {
  return {
    onSetNoteIcon: config.onSetNoteIcon,
    onRemoveNoteIcon: config.onRemoveNoteIcon,
    onChangeNoteType: config.onChangeNoteType,
    onMoveNoteToFolder: config.onMoveNoteToFolder,
    canMoveNoteToFolder: config.canMoveNoteToFolder,
    activeNoteHasIcon: config.activeNoteHasIcon,
    noteListFilter: config.noteListFilter,
    onSetNoteListFilter: config.onSetNoteListFilter,
    onToggleFavorite: config.onToggleFavorite,
    onToggleOrganized: config.onToggleOrganized,
    onRevealNoteInFinder: config.onRevealNoteInFinder,
    onPreviewNoteWithQuickLook: config.onPreviewNoteWithQuickLook,
    onInsertWeatherSnapshot: config.onInsertWeatherSnapshot,
    onTranscribeAudio: config.onTranscribeAudio,
    onRecordAudio: config.onRecordAudio,
    onCustomizeNoteListColumns: config.onCustomizeNoteListColumns,
    canCustomizeNoteListColumns: config.canCustomizeNoteListColumns,
    noteListColumnsLabel: config.noteListColumnsLabel,
  }
}

function createCommandRegistryConfig(config: AppCommandsConfig): CommandRegistryConfig {
  return {
    isGitVault: config.isGitVault !== false,
    ...createCommandRegistryCoreConfig(config),
    ...createCommandRegistrySelectionConfig(config),
    ...createCommandRegistryVaultConfig(config),
    ...createCommandRegistryAiConfig(config),
    ...createCommandRegistryNoteConfig(config),
  }
}

/** Sets up keyboard shortcuts, command registry, menu events, and keyboard navigation. */
export function useAppCommands(config: AppCommandsConfig): CommandAction[] {
  const entriesRef = useRef(config.entries)
  entriesRef.current = config.entries

  const toggleArchive = useCallback((path: string) => {
    const entry = entriesRef.current.find(e => e.path === path)
    ;(entry?.archived ? config.onUnarchiveNote : config.onArchiveNote)(path)
  }, [config.onArchiveNote, config.onUnarchiveNote])


  const { onSelect } = config

  const selectFilter = useCallback((filter: SidebarFilter) => {
    const isGitVault = config.isGitVault !== false
    const safeFilter = (!isGitVault && (filter === 'changes' || filter === 'pulse'))
      || (!config.showInbox && filter === 'inbox')
      ? 'all'
      : filter
    onSelect({ kind: 'filter', filter: safeFilter })
  }, [config.isGitVault, config.showInbox, onSelect])

  const viewChanges = useCallback(() => {
    onSelect({ kind: 'filter', filter: config.isGitVault === false ? 'all' : 'changes' })
  }, [config.isGitVault, onSelect])

  const keyboardActions = createKeyboardActions(config)
  const menuEventHandlers = createMenuEventHandlers(config, selectFilter, viewChanges)

  useAppKeyboard({ ...keyboardActions, onArchiveNote: toggleArchive })

  useMenuEvents({ ...menuEventHandlers, onArchiveNote: toggleArchive })

  const commands = useCommandRegistry(createCommandRegistryConfig(config))

  useKeyboardNavigation({
    activeTabPath: config.activeTabPath,
    visibleNotesRef: config.visibleNotesRef,
    onReplaceActiveTab: config.onReplaceActiveTab,
    onSelectNote: config.onSelectNote,
  })

  return commands
}
