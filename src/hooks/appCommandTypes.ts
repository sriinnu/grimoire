import type { SidebarFilter } from '../types'
import type { ViewMode } from './useViewMode'

export const APP_COMMAND_IDS = {
  appSettings: 'app-settings',
  appCheckForUpdates: 'app-check-for-updates',
  fileNewNote: 'file-new-note',
  fileCaptureThought: 'file-capture-thought',
  fileCaptureJournal: 'file-capture-journal',
  fileCaptureDream: 'file-capture-dream',
  fileNewType: 'file-new-type',
  fileQuickOpen: 'file-quick-open',
  fileSave: 'file-save',
  editFindInVault: 'edit-find-in-vault',
  editToggleRawEditor: 'edit-toggle-raw-editor',
  editToggleDiff: 'edit-toggle-diff',
  viewEditorOnly: 'view-editor-only',
  viewEditorList: 'view-editor-list',
  viewAll: 'view-all',
  viewToggleProperties: 'view-toggle-properties',
  viewToggleAiChat: 'view-toggle-ai-chat',
  viewToggleBacklinks: 'view-toggle-backlinks',
  viewCommandPalette: 'view-command-palette',
  viewZoomIn: 'view-zoom-in',
  viewZoomOut: 'view-zoom-out',
  viewZoomReset: 'view-zoom-reset',
  viewGoBack: 'view-go-back',
  viewGoForward: 'view-go-forward',
  goAllNotes: 'go-all-notes',
  goArchived: 'go-archived',
  goChanges: 'go-changes',
  goInbox: 'go-inbox',
  noteToggleOrganized: 'note-toggle-organized',
  noteToggleFavorite: 'note-toggle-favorite',
  noteArchive: 'note-archive',
  noteDelete: 'note-delete',
  noteOpenInNewWindow: 'note-open-in-new-window',
  noteRestoreDeleted: 'note-restore-deleted',
  vaultOpen: 'vault-open',
  vaultRemove: 'vault-remove',
  vaultRestoreGettingStarted: 'vault-restore-getting-started',
  vaultAddRemote: 'vault-add-remote',
  vaultCommitPush: 'vault-commit-push',
  vaultPull: 'vault-pull',
  vaultResolveConflicts: 'vault-resolve-conflicts',
  vaultViewChanges: 'vault-view-changes',
  vaultInstallMcp: 'vault-install-mcp',
  vaultReload: 'vault-reload',
  vaultRepair: 'vault-repair',
} as const

export type AppCommandId = (typeof APP_COMMAND_IDS)[keyof typeof APP_COMMAND_IDS]
export type AppCommandShortcutCombo =
  | 'command-or-ctrl'
  | 'command-or-ctrl-shift'
  | 'command-shift'
export type AppCommandDeterministicQaMode =
  | 'renderer-shortcut-event'
  | 'native-menu-command'
export type ShortcutEventLike = Pick<KeyboardEvent, 'altKey' | 'ctrlKey' | 'metaKey' | 'shiftKey' | 'key' | 'code'>

export interface AppCommandDeterministicQaDefinition {
  preferredMode: AppCommandDeterministicQaMode
  supportsRendererShortcutEvent: boolean
  supportsNativeMenuCommand: boolean
  requiresManualNativeAcceleratorQa: boolean
}

export interface AppCommandShortcutEventOptions {
  preferControl?: boolean
}

export type AppCommandShortcutEventInit = Pick<
  KeyboardEventInit,
  'altKey' | 'bubbles' | 'cancelable' | 'code' | 'ctrlKey' | 'key' | 'metaKey' | 'shiftKey'
>

export type SimpleHandlerKey =
  | 'onOpenSettings'
  | 'onCheckForUpdates'
  | 'onCreateNote'
  | 'onCaptureThought'
  | 'onCaptureJournal'
  | 'onCaptureDream'
  | 'onCreateType'
  | 'onQuickOpen'
  | 'onSave'
  | 'onSearch'
  | 'onToggleRawEditor'
  | 'onToggleDiff'
  | 'onToggleInspector'
  | 'onToggleAIChat'
  | 'onCommandPalette'
  | 'onZoomIn'
  | 'onZoomOut'
  | 'onZoomReset'
  | 'onGoBack'
  | 'onGoForward'
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

export type ActiveTabHandlerKey =
  | 'onToggleOrganized'
  | 'onToggleFavorite'
  | 'onArchiveNote'
  | 'onDeleteNote'

export type AppCommandRoute =
  | { kind: 'view-mode'; value: ViewMode }
  | { kind: 'filter'; value: SidebarFilter }
  | { kind: 'handler'; handler: SimpleHandlerKey }
  | { kind: 'active-tab-handler'; handler: ActiveTabHandlerKey }

export interface AppCommandShortcutDefinition {
  combo: AppCommandShortcutCombo
  key: string
  aliases?: string[]
  code?: string
  display: string
}

export interface AppCommandDefinition {
  route: AppCommandRoute
  menuOwned: boolean
  shortcut?: AppCommandShortcutDefinition
  preferredShortcutQaMode?: AppCommandDeterministicQaMode
}
