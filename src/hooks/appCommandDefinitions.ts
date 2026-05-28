import { APP_COMMAND_IDS, type AppCommandDefinition, type AppCommandId } from './appCommandTypes'

export const APP_COMMAND_DEFINITIONS: Record<AppCommandId, AppCommandDefinition> = {
  [APP_COMMAND_IDS.appSettings]: {
    route: { kind: 'handler', handler: 'onOpenSettings' },
    menuOwned: true,
    shortcut: { combo: 'command-or-ctrl', key: ',', display: '⌘,' },
  },
  [APP_COMMAND_IDS.appCheckForUpdates]: {
    route: { kind: 'handler', handler: 'onCheckForUpdates' },
    menuOwned: true,
  },
  [APP_COMMAND_IDS.fileNewNote]: {
    route: { kind: 'handler', handler: 'onCreateNote' },
    menuOwned: true,
    shortcut: { combo: 'command-or-ctrl', key: 'n', code: 'KeyN', display: '⌘N' },
  },
  [APP_COMMAND_IDS.fileCaptureThought]: {
    route: { kind: 'handler', handler: 'onCaptureThought' },
    menuOwned: true,
  },
  [APP_COMMAND_IDS.fileCaptureJournal]: {
    route: { kind: 'handler', handler: 'onCaptureJournal' },
    menuOwned: true,
  },
  [APP_COMMAND_IDS.fileCaptureDream]: {
    route: { kind: 'handler', handler: 'onCaptureDream' },
    menuOwned: true,
  },
  [APP_COMMAND_IDS.fileNewType]: {
    route: { kind: 'handler', handler: 'onCreateType' },
    menuOwned: true,
  },
  [APP_COMMAND_IDS.fileQuickOpen]: {
    route: { kind: 'handler', handler: 'onQuickOpen' },
    menuOwned: true,
    shortcut: {
      combo: 'command-or-ctrl',
      key: 'p',
      aliases: ['o'],
      code: 'KeyP',
      display: '⌘P / ⌘O',
    },
  },
  [APP_COMMAND_IDS.fileSave]: {
    route: { kind: 'handler', handler: 'onSave' },
    menuOwned: true,
    shortcut: { combo: 'command-or-ctrl', key: 's', code: 'KeyS', display: '⌘S' },
  },
  [APP_COMMAND_IDS.editFindInVault]: {
    route: { kind: 'handler', handler: 'onSearch' },
    menuOwned: true,
    shortcut: { combo: 'command-or-ctrl-shift', key: 'f', code: 'KeyF', display: '⌘⇧F' },
  },
  [APP_COMMAND_IDS.editToggleRawEditor]: {
    route: { kind: 'handler', handler: 'onToggleRawEditor' },
    menuOwned: true,
    shortcut: { combo: 'command-or-ctrl', key: '\\', display: '⌘\\' },
  },
  [APP_COMMAND_IDS.editToggleDiff]: {
    route: { kind: 'handler', handler: 'onToggleDiff' },
    menuOwned: true,
  },
  [APP_COMMAND_IDS.viewEditorOnly]: {
    route: { kind: 'view-mode', value: 'editor-only' },
    menuOwned: true,
    shortcut: { combo: 'command-or-ctrl', key: '1', display: '⌘1' },
  },
  [APP_COMMAND_IDS.viewEditorList]: {
    route: { kind: 'view-mode', value: 'editor-list' },
    menuOwned: true,
    shortcut: { combo: 'command-or-ctrl', key: '2', display: '⌘2' },
  },
  [APP_COMMAND_IDS.viewAll]: {
    route: { kind: 'view-mode', value: 'all' },
    menuOwned: true,
    shortcut: { combo: 'command-or-ctrl', key: '3', display: '⌘3' },
  },
  [APP_COMMAND_IDS.viewToggleProperties]: {
    route: { kind: 'handler', handler: 'onToggleInspector' },
    menuOwned: true,
    preferredShortcutQaMode: 'renderer-shortcut-event',
    shortcut: { combo: 'command-or-ctrl-shift', key: 'i', code: 'KeyI', display: '⌘⇧I' },
  },
  [APP_COMMAND_IDS.viewToggleAiChat]: {
    route: { kind: 'handler', handler: 'onToggleAIChat' },
    menuOwned: true,
    shortcut: { combo: 'command-or-ctrl-shift', key: 'l', code: 'KeyL', display: '⌘⇧L' },
  },
  [APP_COMMAND_IDS.viewToggleBacklinks]: {
    route: { kind: 'handler', handler: 'onToggleInspector' },
    menuOwned: true,
  },
  [APP_COMMAND_IDS.viewCommandPalette]: {
    route: { kind: 'handler', handler: 'onCommandPalette' },
    menuOwned: true,
    shortcut: { combo: 'command-or-ctrl', key: 'k', code: 'KeyK', display: '⌘K' },
  },
  [APP_COMMAND_IDS.viewZoomIn]: {
    route: { kind: 'handler', handler: 'onZoomIn' },
    menuOwned: true,
    shortcut: { combo: 'command-or-ctrl', key: '=', aliases: ['+'], display: '⌘=' },
  },
  [APP_COMMAND_IDS.viewZoomOut]: {
    route: { kind: 'handler', handler: 'onZoomOut' },
    menuOwned: true,
    shortcut: { combo: 'command-or-ctrl', key: '-', display: '⌘-' },
  },
  [APP_COMMAND_IDS.viewZoomReset]: {
    route: { kind: 'handler', handler: 'onZoomReset' },
    menuOwned: true,
    shortcut: { combo: 'command-or-ctrl', key: '0', display: '⌘0' },
  },
  [APP_COMMAND_IDS.viewGoBack]: {
    route: { kind: 'handler', handler: 'onGoBack' },
    menuOwned: true,
    shortcut: { combo: 'command-or-ctrl', key: 'ArrowLeft', code: 'ArrowLeft', display: '⌘←' },
  },
  [APP_COMMAND_IDS.viewGoForward]: {
    route: { kind: 'handler', handler: 'onGoForward' },
    menuOwned: true,
    shortcut: { combo: 'command-or-ctrl', key: 'ArrowRight', code: 'ArrowRight', display: '⌘→' },
  },
  [APP_COMMAND_IDS.goAllNotes]: {
    route: { kind: 'filter', value: 'all' },
    menuOwned: true,
  },
  [APP_COMMAND_IDS.goArchived]: {
    route: { kind: 'filter', value: 'archived' },
    menuOwned: true,
  },
  [APP_COMMAND_IDS.goChanges]: {
    route: { kind: 'filter', value: 'changes' },
    menuOwned: true,
  },
  [APP_COMMAND_IDS.goInbox]: {
    route: { kind: 'filter', value: 'inbox' },
    menuOwned: true,
  },
  [APP_COMMAND_IDS.noteToggleOrganized]: {
    route: { kind: 'active-tab-handler', handler: 'onToggleOrganized' },
    menuOwned: true,
    shortcut: { combo: 'command-or-ctrl', key: 'e', code: 'KeyE', display: '⌘E' },
  },
  [APP_COMMAND_IDS.noteToggleFavorite]: {
    route: { kind: 'active-tab-handler', handler: 'onToggleFavorite' },
    menuOwned: false,
    shortcut: { combo: 'command-or-ctrl', key: 'd', code: 'KeyD', display: '⌘D' },
  },
  [APP_COMMAND_IDS.noteArchive]: {
    route: { kind: 'active-tab-handler', handler: 'onArchiveNote' },
    menuOwned: true,
  },
  [APP_COMMAND_IDS.noteDelete]: {
    route: { kind: 'active-tab-handler', handler: 'onDeleteNote' },
    menuOwned: true,
    shortcut: { combo: 'command-or-ctrl', key: 'Backspace', aliases: ['Delete'], display: '⌘⌫' },
  },
  [APP_COMMAND_IDS.noteOpenInNewWindow]: {
    route: { kind: 'handler', handler: 'onOpenInNewWindow' },
    menuOwned: true,
    shortcut: { combo: 'command-or-ctrl-shift', key: 'o', code: 'KeyO', display: '⌘⇧O' },
  },
  [APP_COMMAND_IDS.noteRestoreDeleted]: {
    route: { kind: 'handler', handler: 'onRestoreDeletedNote' },
    menuOwned: true,
  },
  [APP_COMMAND_IDS.vaultOpen]: {
    route: { kind: 'handler', handler: 'onOpenVault' },
    menuOwned: true,
  },
  [APP_COMMAND_IDS.vaultRemove]: {
    route: { kind: 'handler', handler: 'onRemoveActiveVault' },
    menuOwned: true,
  },
  [APP_COMMAND_IDS.vaultRestoreGettingStarted]: {
    route: { kind: 'handler', handler: 'onRestoreGettingStarted' },
    menuOwned: true,
  },
  [APP_COMMAND_IDS.vaultAddRemote]: {
    route: { kind: 'handler', handler: 'onAddRemote' },
    menuOwned: true,
  },
  [APP_COMMAND_IDS.vaultCommitPush]: {
    route: { kind: 'handler', handler: 'onCommitPush' },
    menuOwned: true,
  },
  [APP_COMMAND_IDS.vaultPull]: {
    route: { kind: 'handler', handler: 'onPull' },
    menuOwned: true,
  },
  [APP_COMMAND_IDS.vaultResolveConflicts]: {
    route: { kind: 'handler', handler: 'onResolveConflicts' },
    menuOwned: true,
  },
  [APP_COMMAND_IDS.vaultViewChanges]: {
    route: { kind: 'handler', handler: 'onViewChanges' },
    menuOwned: true,
  },
  [APP_COMMAND_IDS.vaultInstallMcp]: {
    route: { kind: 'handler', handler: 'onInstallMcp' },
    menuOwned: true,
  },
  [APP_COMMAND_IDS.vaultReload]: {
    route: { kind: 'handler', handler: 'onReloadVault' },
    menuOwned: true,
  },
  [APP_COMMAND_IDS.vaultRepair]: {
    route: { kind: 'handler', handler: 'onRepairVault' },
    menuOwned: true,
  },
}

export const MANUAL_NATIVE_ACCELERATOR_QA_COMMAND_SET = new Set<AppCommandId>([
  APP_COMMAND_IDS.appSettings,
  APP_COMMAND_IDS.fileNewNote,
  APP_COMMAND_IDS.fileQuickOpen,
  APP_COMMAND_IDS.fileSave,
  APP_COMMAND_IDS.editFindInVault,
  APP_COMMAND_IDS.viewToggleAiChat,
  APP_COMMAND_IDS.viewCommandPalette,
  APP_COMMAND_IDS.noteToggleOrganized,
  APP_COMMAND_IDS.noteToggleFavorite,
])
