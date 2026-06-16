import { APP_COMMAND_IDS, getAppCommandShortcutDisplay } from '../appCommandCatalog'
import type { CommandAction } from './types'

interface NoteCommandsConfig {
  hasActiveNote: boolean
  activeTabPath: string | null
  isArchived: boolean
  activeNoteHasIcon?: boolean
  onCreateNote: () => void
  createNoteLabel?: string
  createNoteKeywords?: string[]
  onCreateType?: () => void
  onSave: () => void
  onDeleteNote: (path: string) => void
  onArchiveNote: (path: string) => void
  onUnarchiveNote: (path: string) => void
  onChangeNoteType?: () => void
  onMoveNoteToFolder?: () => void
  canMoveNoteToFolder?: boolean
  onSetNoteIcon?: () => void
  onRemoveNoteIcon?: () => void
  onOpenInNewWindow?: () => void
  onRevealNoteInFinder?: (path: string) => void
  onPreviewNoteWithQuickLook?: (path: string) => void
  onToggleFavorite?: (path: string) => void
  isFavorite?: boolean
  onToggleOrganized?: (path: string) => void
  isOrganized?: boolean
  onInsertWeatherSnapshot?: () => void
  onTranscribeAudio?: () => void
  onRecordAudio?: () => void
  onRestoreDeletedNote?: () => void
  canRestoreDeletedNote?: boolean
}

interface NoteCommandConfig {
  id: string
  label: string
  keywords: string[]
  enabled: boolean
  execute?: () => void
  shortcut?: string
  path?: string | null
  run?: (path: string) => void
}

function createNoteCommand(config: NoteCommandConfig): CommandAction {
  return {
    id: config.id,
    label: config.label,
    group: 'Page',
    shortcut: config.shortcut,
    keywords: config.keywords,
    enabled: config.enabled,
    execute: () => {
      if (config.path && config.run) {
        config.run(config.path)
        return
      }
      config.execute?.()
    },
  }
}

function buildCoreNoteCommands(config: NoteCommandsConfig): CommandAction[] {
  return [
    createNoteCommand({
      id: 'create-note',
      label: config.createNoteLabel ?? 'New Page',
      shortcut: getAppCommandShortcutDisplay(APP_COMMAND_IDS.fileNewNote),
      keywords: config.createNoteKeywords ?? ['new', 'create', 'add', 'page', 'note', 'new page', 'new note'],
      enabled: true,
      execute: config.onCreateNote,
    }),
    createNoteCommand({
      id: 'create-type',
      label: 'New Type',
      keywords: ['new', 'create', 'type', 'template'],
      enabled: !!config.onCreateType,
      execute: () => config.onCreateType?.(),
    }),
    createNoteCommand({
      id: 'save-note',
      label: 'Save Page',
      shortcut: getAppCommandShortcutDisplay(APP_COMMAND_IDS.fileSave),
      keywords: ['write', 'save', 'page', 'note', 'save page', 'save note'],
      enabled: config.hasActiveNote,
      execute: config.onSave,
    }),
  ]
}

function buildPathNoteCommands(config: NoteCommandsConfig): CommandAction[] {
  return [
    ...buildDestructiveNoteCommands(config),
    ...buildPinnedNoteCommands(config),
  ]
}

function buildDestructiveNoteCommands(config: NoteCommandsConfig): CommandAction[] {
  return [
    createNoteCommand({
      id: 'delete-note',
      label: 'Delete Page',
      shortcut: getAppCommandShortcutDisplay(APP_COMMAND_IDS.noteDelete),
      keywords: ['delete', 'remove', 'page', 'note', 'delete page', 'delete note'],
      enabled: config.hasActiveNote,
      path: config.activeTabPath,
      run: config.onDeleteNote,
    }),
    createNoteCommand({
      id: 'archive-note',
      label: config.isArchived ? 'Unarchive Page' : 'Archive Page',
      keywords: ['archive', 'page', 'note', 'archive page', 'archive note'],
      enabled: config.hasActiveNote,
      path: config.activeTabPath,
      run: config.isArchived ? config.onUnarchiveNote : config.onArchiveNote,
    }),
  ]
}

function buildPinnedNoteCommands(config: NoteCommandsConfig): CommandAction[] {
  return [
    createNoteCommand({
      id: 'toggle-favorite',
      label: config.isFavorite ? 'Remove from Favorites' : 'Add to Favorites',
      shortcut: getAppCommandShortcutDisplay(APP_COMMAND_IDS.noteToggleFavorite),
      keywords: ['favorite', 'star', 'bookmark', 'pin'],
      enabled: config.hasActiveNote && !!config.onToggleFavorite,
      path: config.activeTabPath,
      run: (path) => config.onToggleFavorite?.(path),
    }),
    createNoteCommand({
      id: 'toggle-organized',
      label: config.isOrganized ? 'Mark as Unorganized' : 'Mark as Organized',
      shortcut: getAppCommandShortcutDisplay(APP_COMMAND_IDS.noteToggleOrganized),
      keywords: ['organized', 'inbox', 'triage', 'done'],
      enabled: config.hasActiveNote && !!config.onToggleOrganized,
      path: config.activeTabPath,
      run: (path) => config.onToggleOrganized?.(path),
    }),
  ]
}

function buildOptionalNoteCommands(config: NoteCommandsConfig): CommandAction[] {
  return [
    ...buildRecoveryCommands(config),
    ...buildRetargetingCommands(config),
    ...buildPresentationCommands(config),
  ]
}

function buildRecoveryCommands(config: NoteCommandsConfig): CommandAction[] {
  return [
    createNoteCommand({
      id: 'restore-deleted-note',
      label: 'Restore Deleted Page',
      keywords: ['restore', 'deleted', 'undelete', 'git', 'checkout', 'page', 'note', 'restore page', 'restore note'],
      enabled: !!config.canRestoreDeletedNote && !!config.onRestoreDeletedNote,
      execute: () => config.onRestoreDeletedNote?.(),
    }),
  ]
}

function buildRetargetingCommands(config: NoteCommandsConfig): CommandAction[] {
  return [
    createNoteCommand({
      id: 'set-note-icon',
      label: 'Set Page Icon',
      keywords: ['icon', 'emoji', 'set', 'add', 'change', 'picker', 'page', 'note', 'set page icon', 'set note icon'],
      enabled: config.hasActiveNote && !!config.onSetNoteIcon,
      execute: () => config.onSetNoteIcon?.(),
    }),
    createNoteCommand({
      id: 'change-note-type',
      label: 'Change Page Type…',
      keywords: ['type', 'change', 'retarget', 'section', 'move', 'page', 'note', 'change page type', 'change note type'],
      enabled: config.hasActiveNote && !!config.onChangeNoteType,
      execute: () => config.onChangeNoteType?.(),
    }),
    createNoteCommand({
      id: 'move-note-to-folder',
      label: 'Move Page to Folder…',
      keywords: ['folder', 'move', 'retarget', 'organize', 'page', 'note', 'move page', 'move note'],
      enabled: config.hasActiveNote && !!config.onMoveNoteToFolder && !!config.canMoveNoteToFolder,
      execute: () => config.onMoveNoteToFolder?.(),
    }),
  ]
}

function buildPresentationCommands(config: NoteCommandsConfig): CommandAction[] {
  return [
    createNoteCommand({
      id: 'insert-weather-snapshot',
      label: 'Insert Weather Snapshot',
      keywords: ['weather', 'journal', 'daily', 'location', 'temperature', 'forecast'],
      enabled: config.hasActiveNote && !!config.onInsertWeatherSnapshot,
      execute: () => config.onInsertWeatherSnapshot?.(),
    }),
    createNoteCommand({
      id: 'transcribe-audio',
      label: 'Transcribe Audio...',
      keywords: ['audio', 'voice', 'whisper', 'transcript', 'speech', 'dictation'],
      enabled: !!config.onTranscribeAudio,
      execute: () => config.onTranscribeAudio?.(),
    }),
    createNoteCommand({
      id: 'record-audio',
      label: 'Record Audio...',
      keywords: ['audio', 'voice', 'microphone', 'record', 'whisper', 'dictation'],
      enabled: !!config.onRecordAudio,
      execute: () => config.onRecordAudio?.(),
    }),
    createNoteCommand({
      id: 'remove-note-icon',
      label: 'Remove Page Icon',
      keywords: ['icon', 'emoji', 'remove', 'delete', 'clear', 'page', 'note', 'remove page icon', 'remove note icon'],
      enabled: config.hasActiveNote && !!config.activeNoteHasIcon && !!config.onRemoveNoteIcon,
      execute: () => config.onRemoveNoteIcon?.(),
    }),
    createNoteCommand({
      id: 'open-in-new-window',
      label: 'Open in New Window',
      shortcut: getAppCommandShortcutDisplay(APP_COMMAND_IDS.noteOpenInNewWindow),
      keywords: ['window', 'new', 'detach', 'pop', 'external', 'separate'],
      enabled: config.hasActiveNote,
      execute: () => config.onOpenInNewWindow?.(),
    }),
    createNoteCommand({
      id: 'reveal-note-in-finder',
      label: 'Reveal Page in Finder',
      keywords: ['finder', 'reveal', 'file', 'local', 'markdown', 'path', 'page', 'note', 'reveal page', 'reveal note'],
      enabled: config.hasActiveNote && !!config.onRevealNoteInFinder,
      path: config.activeTabPath,
      run: (path) => config.onRevealNoteInFinder?.(path),
    }),
    createNoteCommand({
      id: 'preview-note-with-quick-look',
      label: 'Preview Page with Quick Look',
      keywords: ['quicklook', 'quick', 'look', 'finder', 'preview', 'markdown', 'native', 'page', 'note', 'preview page', 'preview note'],
      enabled: config.hasActiveNote && !!config.onPreviewNoteWithQuickLook,
      path: config.activeTabPath,
      run: (path) => config.onPreviewNoteWithQuickLook?.(path),
    }),
  ]
}

export function buildNoteCommands(config: NoteCommandsConfig): CommandAction[] {
  return [
    ...buildCoreNoteCommands(config),
    ...buildPathNoteCommands(config),
    ...buildOptionalNoteCommands(config),
  ]
}
