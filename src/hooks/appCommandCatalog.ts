import { isMac, isTouchPlatform } from '../utils/platform'
import {
  APP_COMMAND_DEFINITIONS,
  MANUAL_NATIVE_ACCELERATOR_QA_COMMAND_SET,
} from './appCommandDefinitions'
import {
  APP_COMMAND_IDS,
  type AppCommandDefinition,
  type AppCommandDeterministicQaDefinition,
  type AppCommandId,
  type AppCommandShortcutCombo,
  type AppCommandShortcutDefinition,
  type AppCommandShortcutEventInit,
  type AppCommandShortcutEventOptions,
  type ShortcutEventLike,
} from './appCommandTypes'

export {
  APP_COMMAND_DEFINITIONS,
  APP_COMMAND_IDS,
  MANUAL_NATIVE_ACCELERATOR_QA_COMMAND_SET,
}
export type {
  ActiveTabHandlerKey,
  AppCommandDefinition,
  AppCommandDeterministicQaDefinition,
  AppCommandDeterministicQaMode,
  AppCommandId,
  AppCommandRoute,
  AppCommandShortcutCombo,
  AppCommandShortcutDefinition,
  AppCommandShortcutEventInit,
  AppCommandShortcutEventOptions,
  ShortcutEventLike,
  SimpleHandlerKey,
} from './appCommandTypes'

const APP_COMMAND_SET = new Set<string>(Object.values(APP_COMMAND_IDS))

const NATIVE_MENU_COMMAND_SET = new Set<string>(
  (Object.entries(APP_COMMAND_DEFINITIONS) as Array<[AppCommandId, AppCommandDefinition]>)
    .filter(([, definition]) => definition.menuOwned)
    .map(([id]) => id),
)

const shortcutKeyMaps = {
  'command-or-ctrl': new Map<string, AppCommandId>(),
  'command-or-ctrl-shift': new Map<string, AppCommandId>(),
  'command-shift': new Map<string, AppCommandId>(),
} satisfies Record<AppCommandShortcutCombo, Map<string, AppCommandId>>

const shortcutCodeMaps = {
  'command-or-ctrl': new Map<string, AppCommandId>(),
  'command-or-ctrl-shift': new Map<string, AppCommandId>(),
  'command-shift': new Map<string, AppCommandId>(),
} satisfies Record<AppCommandShortcutCombo, Map<string, AppCommandId>>

const COMMAND_ONLY_COMBOS: readonly AppCommandShortcutCombo[] = ['command-or-ctrl']
const COMMAND_SHIFT_COMBOS: readonly AppCommandShortcutCombo[] = ['command-shift', 'command-or-ctrl-shift']
const COMMAND_OR_CTRL_SHIFT_COMBOS: readonly AppCommandShortcutCombo[] = ['command-or-ctrl-shift']
const NO_SHORTCUT_COMBOS: readonly AppCommandShortcutCombo[] = []

function normalizeShortcutKey(key: string): string {
  return key.length === 1 ? key.toLowerCase() : key
}

for (const [id, definition] of Object.entries(APP_COMMAND_DEFINITIONS) as Array<[AppCommandId, AppCommandDefinition]>) {
  const shortcut = definition.shortcut
  if (!shortcut) continue
  shortcutKeyMaps[shortcut.combo].set(normalizeShortcutKey(shortcut.key), id)
  for (const alias of shortcut.aliases ?? []) {
    shortcutKeyMaps[shortcut.combo].set(normalizeShortcutKey(alias), id)
  }
  if (shortcut.code) {
    shortcutCodeMaps[shortcut.combo].set(shortcut.code, id)
  }
}

export function isAppCommandId(value: string): value is AppCommandId {
  return APP_COMMAND_SET.has(value)
}

export function isNativeMenuCommandId(value: string): value is AppCommandId {
  return NATIVE_MENU_COMMAND_SET.has(value)
}

export function getDeterministicShortcutQaDefinition(
  id: AppCommandId,
): AppCommandDeterministicQaDefinition | null {
  const definition = APP_COMMAND_DEFINITIONS[id]
  if (!definition.shortcut) return null

  return {
    preferredMode:
      definition.preferredShortcutQaMode
      ?? (definition.menuOwned ? 'native-menu-command' : 'renderer-shortcut-event'),
    supportsRendererShortcutEvent: true,
    supportsNativeMenuCommand: definition.menuOwned,
    requiresManualNativeAcceleratorQa: MANUAL_NATIVE_ACCELERATOR_QA_COMMAND_SET.has(id),
  }
}

export function getShortcutEventInit(
  id: AppCommandId,
  options: AppCommandShortcutEventOptions = {},
): AppCommandShortcutEventInit | null {
  const shortcut = APP_COMMAND_DEFINITIONS[id].shortcut
  if (!shortcut) return null

  const useControl = options.preferControl ?? false

  return {
    key: shortcut.key,
    code: shortcut.code,
    altKey: false,
    bubbles: true,
    cancelable: true,
    ctrlKey: useControl,
    metaKey: !useControl,
    shiftKey: shortcut.combo !== 'command-or-ctrl',
  }
}

export function shortcutCombosForEvent({
  altKey,
  ctrlKey,
  metaKey,
  shiftKey,
}: Pick<ShortcutEventLike, 'altKey' | 'ctrlKey' | 'metaKey' | 'shiftKey'>): readonly AppCommandShortcutCombo[] {
  if (altKey || (!metaKey && !ctrlKey)) return NO_SHORTCUT_COMBOS
  if (shiftKey) {
    return metaKey && !ctrlKey ? COMMAND_SHIFT_COMBOS : COMMAND_OR_CTRL_SHIFT_COMBOS
  }
  return COMMAND_ONLY_COMBOS
}

export function findShortcutCommandId(
  combo: AppCommandShortcutCombo,
  key: string,
  code?: string,
): AppCommandId | null {
  if (code) {
    const codeMatch = shortcutCodeMaps[combo].get(code)
    if (codeMatch) return codeMatch
  }
  return shortcutKeyMaps[combo].get(normalizeShortcutKey(key)) ?? null
}

export function findShortcutCommandIdForEvent(event: ShortcutEventLike): AppCommandId | null {
  for (const combo of shortcutCombosForEvent(event)) {
    const commandId = findShortcutCommandId(combo, event.key, event.code)
    if (commandId) return commandId
  }
  return null
}

const NON_MAC_KEY_NAMES: Record<string, string> = {
  '⌫': 'Backspace', '⌦': 'Delete', '←': 'Left', '→': 'Right', '↑': 'Up', '↓': 'Down', '↵': 'Enter', '⇥': 'Tab', '⎋': 'Esc',
}

/** One chord like ⌘⌥⇧K: modifiers in Ctrl+Alt+Shift order, then the key, on Windows and Linux. */
function formatChordForNonMac(chord: string): string {
  const modifiers: string[] = []
  let rest = chord
  const push = (name: string) => { if (!modifiers.includes(name)) modifiers.push(name) }
  while (rest.length > 0) {
    const glyph = rest[0]
    if (glyph === '⌘' || glyph === '⌃') push('Ctrl')
    else if (glyph === '⌥') push('Alt')
    else if (glyph === '⇧') push('Shift')
    else break
    rest = rest.slice(1)
  }
  const order = ['Ctrl', 'Alt', 'Shift']
  modifiers.sort((a, b) => order.indexOf(a) - order.indexOf(b))
  const key = rest.split('').map((char) => NON_MAC_KEY_NAMES[char] ?? char).join('')
  return [...modifiers, key].filter(Boolean).join('+')
}

/**
 * The display string is authored with Mac glyphs. On Windows and Linux it
 * becomes Ctrl+Alt+Shift+Key; alternatives separated by " / " are kept.
 */
export function formatShortcutDisplay(
  shortcut: Pick<AppCommandShortcutDefinition, 'display'>,
): string {
  if (isMac() && !isTouchPlatform()) return shortcut.display
  return shortcut.display
    .split(' / ')
    .map((chord) => formatChordForNonMac(chord.trim()))
    .join(' / ')
}

/** A hint for a footer or tooltip: null on touch platforms, where there is no chord to press. */
export function formatShortcutHint(display: string): string | null {
  if (isTouchPlatform()) return null
  return formatShortcutDisplay({ display })
}

export function getAppCommandShortcutDisplay(id: AppCommandId): string | undefined {
  const shortcut = APP_COMMAND_DEFINITIONS[id].shortcut
  return shortcut ? formatShortcutDisplay(shortcut) : undefined
}
