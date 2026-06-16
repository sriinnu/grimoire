import { APP_COMMAND_IDS, getAppCommandShortcutDisplay } from '../appCommandCatalog'
import type { CommandAction } from './types'
import type { SidebarSelection } from '../../types'

interface NavigationCommandsConfig {
  isGitVault?: boolean
  onQuickOpen: () => void
  onCaptureThought?: () => void
  onCaptureJournal?: () => void
  onCaptureDream?: () => void
  onSelect: (sel: SidebarSelection) => void
  selection?: SidebarSelection
  onRenameFolder?: () => void
  onDeleteFolder?: () => void
  showInbox?: boolean
  onGoBack?: () => void
  onGoForward?: () => void
  canGoBack?: boolean
  canGoForward?: boolean
}

function buildFolderCommands(
  folderSelected: boolean,
  onRenameFolder?: () => void,
  onDeleteFolder?: () => void,
): CommandAction[] {
  return [
    {
      id: 'rename-folder',
      label: 'Rename Folder',
      group: 'Navigation',
      keywords: ['folder', 'directory', 'sidebar', 'rename'],
      enabled: folderSelected && !!onRenameFolder,
      execute: () => onRenameFolder?.(),
    },
    {
      id: 'delete-folder',
      label: 'Delete Folder',
      group: 'Navigation',
      keywords: ['folder', 'directory', 'sidebar', 'delete', 'remove'],
      enabled: folderSelected && !!onDeleteFolder,
      execute: () => onDeleteFolder?.(),
    },
  ]
}

function buildBaseCommands(config: NavigationCommandsConfig): CommandAction[] {
  const {
    onQuickOpen,
    onCaptureThought,
    onCaptureJournal,
    onCaptureDream,
    onSelect,
    onGoBack,
    onGoForward,
    canGoBack,
    canGoForward,
    isGitVault = true,
  } = config

  return [
    { id: 'search-notes', label: 'Search Pages', group: 'Navigation', shortcut: getAppCommandShortcutDisplay(APP_COMMAND_IDS.fileQuickOpen), keywords: ['find', 'open', 'quick', 'pages', 'notes', 'search pages', 'search notes'], enabled: true, execute: onQuickOpen },
    { id: 'go-dashboard', label: 'Go to Notebook', group: 'Navigation', keywords: ['home', 'today', 'assistant', 'capture', 'dashboard', 'notebook', 'go dashboard'], enabled: true, execute: () => onSelect({ kind: 'dashboard' }) },
    { id: 'capture-thought', label: 'Catch a Thought', group: 'Capture', keywords: ['note', 'thought', 'quick', 'menu bar'], enabled: !!onCaptureThought, execute: () => onCaptureThought?.() },
    { id: 'capture-journal', label: 'Journal Page', group: 'Capture', keywords: ['journal', 'reflect', 'private', 'menu bar'], enabled: !!onCaptureJournal, execute: () => onCaptureJournal?.() },
    { id: 'capture-dream', label: 'Dream Page', group: 'Capture', keywords: ['dream', 'private', 'night', 'menu bar'], enabled: !!onCaptureDream, execute: () => onCaptureDream?.() },
    { id: 'go-all', label: 'Go to Pages', group: 'Navigation', keywords: ['filter'], enabled: true, execute: () => onSelect({ kind: 'filter', filter: 'all' }) },
    { id: 'go-archived', label: 'Go to Archive', group: 'Navigation', keywords: ['archived'], enabled: true, execute: () => onSelect({ kind: 'filter', filter: 'archived' }) },
    { id: 'go-changes', label: 'Review Edits', group: 'Navigation', keywords: ['git', 'modified', 'pending', 'changes', 'edits', 'go changes'], enabled: isGitVault, execute: () => onSelect({ kind: 'filter', filter: 'changes' }) },
    { id: 'go-pulse', label: 'Open History', group: 'Navigation', keywords: ['activity', 'history', 'commits', 'git', 'feed'], enabled: isGitVault, execute: () => onSelect({ kind: 'filter', filter: 'pulse' }) },
    { id: 'go-back', label: 'Go Back', group: 'Navigation', shortcut: getAppCommandShortcutDisplay(APP_COMMAND_IDS.viewGoBack), keywords: ['previous', 'history', 'back'], enabled: !!canGoBack, execute: () => onGoBack?.() },
    { id: 'go-forward', label: 'Go Forward', group: 'Navigation', shortcut: getAppCommandShortcutDisplay(APP_COMMAND_IDS.viewGoForward), keywords: ['next', 'history', 'forward'], enabled: !!canGoForward, execute: () => onGoForward?.() },
  ]
}

function insertInboxCommand(commands: CommandAction[], showInbox: boolean, onSelect: (sel: SidebarSelection) => void) {
  if (!showInbox) return commands

  const backCommandIndex = commands.findIndex((command) => command.id === 'go-back')
  commands.splice(backCommandIndex === -1 ? commands.length : backCommandIndex, 0, {
    id: 'go-inbox',
    label: 'Go to Inbox',
    group: 'Navigation',
    keywords: ['inbox', 'unlinked', 'orphan', 'unorganized', 'triage'],
    enabled: true,
    execute: () => onSelect({ kind: 'filter', filter: 'inbox' }),
  })
  return commands
}

/** Build navigation and lightweight capture commands for the command palette. */
export function buildNavigationCommands(config: NavigationCommandsConfig): CommandAction[] {
  const {
    onSelect,
    selection,
    onRenameFolder,
    onDeleteFolder,
    showInbox = true,
  } = config
  const folderSelected = selection?.kind === 'folder'
  const commands = [
    ...buildBaseCommands(config),
    ...buildFolderCommands(folderSelected, onRenameFolder, onDeleteFolder),
  ]
  return insertInboxCommand(commands, showInbox, onSelect)
}
