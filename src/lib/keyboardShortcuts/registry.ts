import { APP_COMMAND_DEFINITIONS, APP_COMMAND_IDS, type AppCommandId } from '../../hooks/appCommandCatalog'
import { chordsForAppShortcut, parseKeymap, type ShortcutChord } from './chords'

export type ShortcutGroupId = 'navigate' | 'notes' | 'writing' | 'view'

export const SHORTCUT_GROUPS: ReadonlyArray<{ id: ShortcutGroupId; label: string }> = [
  { id: 'navigate', label: 'Navigate' },
  { id: 'notes', label: 'Notes' },
  { id: 'writing', label: 'Writing' },
  { id: 'view', label: 'View' },
]

export interface ShortcutEntry {
  id: string
  label: string
  group: ShortcutGroupId
  /** Alternative chords that trigger the same action. */
  chords: readonly ShortcutChord[]
  /** True when the chord is typed text (e.g. `/` or `[[`) rather than a key combination. */
  typed?: boolean
  keywords?: readonly string[]
}

interface SheetMeta {
  label: string
  group: ShortcutGroupId
  keywords?: readonly string[]
}

/**
 * Sheet placement for every app command. Exhaustive on purpose: adding an
 * AppCommandId fails type-checking until someone decides whether it belongs on
 * the sheet. Commands without a shortcut are skipped regardless.
 */
const APP_COMMAND_SHEET_META: Record<AppCommandId, SheetMeta | null> = {
  [APP_COMMAND_IDS.fileQuickOpen]: { label: 'Quick open a page', group: 'navigate', keywords: ['find', 'jump', 'go to'] },
  [APP_COMMAND_IDS.viewCommandPalette]: { label: 'Command palette', group: 'navigate', keywords: ['actions', 'run'] },
  [APP_COMMAND_IDS.editFindInVault]: { label: 'Search the notebook', group: 'navigate', keywords: ['find', 'vault', 'full text'] },
  [APP_COMMAND_IDS.viewGoBack]: { label: 'Go back', group: 'navigate', keywords: ['history', 'previous'] },
  [APP_COMMAND_IDS.viewGoForward]: { label: 'Go forward', group: 'navigate', keywords: ['history', 'next'] },
  [APP_COMMAND_IDS.fileNewNote]: { label: 'New page', group: 'notes', keywords: ['create', 'note'] },
  [APP_COMMAND_IDS.fileSave]: { label: 'Save', group: 'notes' },
  [APP_COMMAND_IDS.noteToggleOrganized]: { label: 'Toggle organized', group: 'notes', keywords: ['inbox', 'triage'] },
  [APP_COMMAND_IDS.noteToggleFavorite]: { label: 'Toggle favorite', group: 'notes', keywords: ['star', 'pin'] },
  [APP_COMMAND_IDS.noteDelete]: { label: 'Delete page', group: 'notes', keywords: ['remove', 'trash'] },
  [APP_COMMAND_IDS.noteOpenInNewWindow]: { label: 'Open page in new window', group: 'notes' },
  [APP_COMMAND_IDS.editToggleRawEditor]: { label: 'Toggle raw Markdown editor', group: 'notes', keywords: ['source', 'markdown'] },
  [APP_COMMAND_IDS.viewEditorOnly]: { label: 'Editor only', group: 'view', keywords: ['layout', 'focus'] },
  [APP_COMMAND_IDS.viewEditorList]: { label: 'Editor and page list', group: 'view', keywords: ['layout'] },
  [APP_COMMAND_IDS.viewAll]: { label: 'All panels', group: 'view', keywords: ['layout', 'sidebar'] },
  [APP_COMMAND_IDS.viewToggleProperties]: { label: 'Toggle properties panel', group: 'view', keywords: ['inspector'] },
  [APP_COMMAND_IDS.viewToggleAiChat]: { label: 'Toggle AI panel', group: 'view', keywords: ['chat', 'assistant'] },
  [APP_COMMAND_IDS.viewZoomIn]: { label: 'Zoom in', group: 'view' },
  [APP_COMMAND_IDS.viewZoomOut]: { label: 'Zoom out', group: 'view' },
  [APP_COMMAND_IDS.viewZoomReset]: { label: 'Actual size', group: 'view', keywords: ['zoom', 'reset'] },
  [APP_COMMAND_IDS.appSettings]: { label: 'Settings', group: 'view', keywords: ['preferences'] },
  [APP_COMMAND_IDS.viewKeyboardShortcuts]: { label: 'Keyboard shortcuts', group: 'view', keywords: ['help', 'keys', 'cheat sheet'] },
  [APP_COMMAND_IDS.appCheckForUpdates]: null,
  [APP_COMMAND_IDS.fileCaptureThought]: null,
  [APP_COMMAND_IDS.fileCaptureJournal]: null,
  [APP_COMMAND_IDS.fileCaptureDream]: null,
  [APP_COMMAND_IDS.fileNewType]: null,
  [APP_COMMAND_IDS.editToggleDiff]: null,
  [APP_COMMAND_IDS.viewToggleBacklinks]: null,
  [APP_COMMAND_IDS.goAllNotes]: null,
  [APP_COMMAND_IDS.goArchived]: null,
  [APP_COMMAND_IDS.goChanges]: null,
  [APP_COMMAND_IDS.goInbox]: null,
  [APP_COMMAND_IDS.noteArchive]: null,
  [APP_COMMAND_IDS.noteRestoreDeleted]: null,
  [APP_COMMAND_IDS.vaultOpen]: null,
  [APP_COMMAND_IDS.vaultRemove]: null,
  [APP_COMMAND_IDS.vaultRestoreGettingStarted]: null,
  [APP_COMMAND_IDS.vaultAddRemote]: null,
  [APP_COMMAND_IDS.vaultCommitPush]: null,
  [APP_COMMAND_IDS.vaultPull]: null,
  [APP_COMMAND_IDS.vaultResolveConflicts]: null,
  [APP_COMMAND_IDS.vaultViewChanges]: null,
  [APP_COMMAND_IDS.vaultInstallMcp]: null,
  [APP_COMMAND_IDS.vaultReload]: null,
  [APP_COMMAND_IDS.vaultRepair]: null,
}

/** Placement lookup, exported for the drift test. */
export function appCommandSheetMeta(id: AppCommandId): SheetMeta | null {
  return APP_COMMAND_SHEET_META[id]
}

/** Shortcuts owned by the app command registry (`APP_COMMAND_DEFINITIONS`). */
export function appCommandShortcutEntries(): ShortcutEntry[] {
  const entries: ShortcutEntry[] = []
  for (const id of Object.keys(APP_COMMAND_DEFINITIONS) as AppCommandId[]) {
    const shortcut = APP_COMMAND_DEFINITIONS[id].shortcut
    const meta = APP_COMMAND_SHEET_META[id]
    if (!shortcut || !meta) continue
    entries.push({ id, ...meta, chords: chordsForAppShortcut(shortcut) })
  }
  return entries
}

/**
 * Bindings that live in one-off key handlers rather than the command registry.
 * Each one is exercised against its real handler in registry.test.ts.
 */
export const AD_HOC_SHORTCUTS: readonly ShortcutEntry[] = [
  {
    id: 'next-page-in-list',
    label: 'Next page in list',
    group: 'navigate',
    chords: [{ modifiers: ['mod', 'alt'], key: 'ArrowDown' }],
  },
  {
    id: 'previous-page-in-list',
    label: 'Previous page in list',
    group: 'navigate',
    chords: [{ modifiers: ['mod', 'alt'], key: 'ArrowUp' }],
  },
  {
    id: 'find-in-page',
    label: 'Find in page or filter page list',
    group: 'notes',
    chords: [{ modifiers: ['mod'], key: 'F' }],
    keywords: ['search', 'navigator'],
  },
  {
    id: 'open-neighborhood',
    label: 'Open neighborhood of highlighted page',
    group: 'notes',
    chords: [{ modifiers: ['mod'], key: 'Enter' }],
    keywords: ['related', 'links'],
  },
  {
    id: 'select-all-pages',
    label: 'Select all pages in list',
    group: 'notes',
    chords: [{ modifiers: ['mod'], key: 'A' }],
    keywords: ['multi', 'bulk'],
  },
  {
    id: 'cycle-reading-width',
    label: 'Cycle reading width',
    group: 'view',
    chords: [{ modifiers: ['mod', 'alt'], key: 'W' }],
    keywords: ['measure', 'narrow', 'wide', 'full', 'line length'],
  },
  {
    id: 'inspector-jump',
    label: 'Jump to About / Connections / History (in Second Brain)',
    group: 'view',
    chords: [
      { modifiers: ['ctrl'], key: '1' },
      { modifiers: ['ctrl'], key: '2' },
      { modifiers: ['ctrl'], key: '3' },
    ],
    keywords: ['inspector', 'second brain', 'section'],
  },
  {
    id: 'quick-capture',
    label: 'Quick capture to today\'s journal',
    group: 'notes',
    chords: [{ modifiers: ['mod', 'shift'], key: 'Space' }],
    keywords: ['capture', 'jot', 'thought', 'inbox'],
  },
]

interface WritingBinding {
  id: string
  label: string
  /** Keymap string exactly as BlockNote/Tiptap register it. */
  keymap?: string
  /** Suggestion-menu trigger text registered in SingleEditorView. */
  trigger?: string
  keywords?: readonly string[]
}

/**
 * Editor bindings provided by BlockNote and Tiptap, plus Grimoire's suggestion
 * triggers. registry.test.ts checks each keymap against the installed packages.
 * Inline code (Mod-e) is left out because ⌘E belongs to Toggle organized.
 */
export const WRITING_BINDINGS: readonly WritingBinding[] = [
  { id: 'bold', label: 'Bold', keymap: 'Mod-b' },
  { id: 'italic', label: 'Italic', keymap: 'Mod-i' },
  { id: 'underline', label: 'Underline', keymap: 'Mod-u' },
  { id: 'strike', label: 'Strikethrough', keymap: 'Mod-Shift-s' },
  { id: 'heading-1', label: 'Heading 1', keymap: 'Mod-Alt-1', keywords: ['h1', 'title'] },
  { id: 'heading-2', label: 'Heading 2', keymap: 'Mod-Alt-2', keywords: ['h2'] },
  { id: 'heading-3', label: 'Heading 3', keymap: 'Mod-Alt-3', keywords: ['h3'] },
  { id: 'paragraph', label: 'Plain paragraph', keymap: 'Mod-Alt-0', keywords: ['text', 'body'] },
  { id: 'quote', label: 'Quote', keymap: 'Mod-Alt-q', keywords: ['blockquote'] },
  { id: 'bullet-list', label: 'Bulleted list', keymap: 'Mod-Shift-8' },
  { id: 'numbered-list', label: 'Numbered list', keymap: 'Mod-Shift-7' },
  { id: 'check-list', label: 'Checklist', keymap: 'Mod-Shift-9', keywords: ['todo', 'task'] },
  { id: 'toggle-list', label: 'Toggle list', keymap: 'Mod-Shift-6', keywords: ['collapse'] },
  { id: 'indent', label: 'Indent block', keymap: 'Tab', keywords: ['nest'] },
  { id: 'outdent', label: 'Outdent block', keymap: 'Shift-Tab', keywords: ['unnest'] },
  { id: 'move-block-up', label: 'Move block up', keymap: 'Shift-Mod-ArrowUp' },
  { id: 'move-block-down', label: 'Move block down', keymap: 'Shift-Mod-ArrowDown' },
  { id: 'undo', label: 'Undo', keymap: 'Mod-z' },
  { id: 'redo', label: 'Redo', keymap: 'Shift-Mod-z' },
  { id: 'slash-menu', label: 'Insert block (slash menu)', trigger: '/', keywords: ['command', 'insert'] },
  { id: 'wikilink', label: 'Link to a page', trigger: '[[', keywords: ['wikilink', 'backlink'] },
  { id: 'mention', label: 'Mention', trigger: '@' },
  { id: 'tag', label: 'Tag', trigger: '#' },
]

export function writingShortcutEntries(): ShortcutEntry[] {
  return WRITING_BINDINGS.map(({ id, label, keymap, trigger, keywords }) => ({
    id: `writing-${id}`,
    label,
    group: 'writing',
    chords: [trigger !== undefined ? { modifiers: [], key: trigger } : parseKeymap(keymap ?? '')],
    typed: trigger !== undefined,
    keywords,
  }))
}

/** Every shortcut on the sheet, in display order within each group. */
export function allShortcutEntries(): ShortcutEntry[] {
  return [...appCommandShortcutEntries(), ...AD_HOC_SHORTCUTS, ...writingShortcutEntries()]
}
