import type { AppCommandShortcutDefinition } from '../../hooks/appCommandTypes'

/** `mod` is Cmd on macOS and Ctrl elsewhere; `ctrl` is always the Control key. */
export type ShortcutModifier = 'mod' | 'ctrl' | 'alt' | 'shift'

export interface ShortcutChord {
  modifiers: readonly ShortcutModifier[]
  /** KeyboardEvent.key-style name ('K', '/', 'ArrowUp', 'Enter') or typed text ('[['). */
  key: string
}

export type ShortcutPlatform = 'mac' | 'other'

// Matches the order the app's own display strings use (⌘⇧F, Ctrl+Shift+F).
const MODIFIER_ORDER: readonly ShortcutModifier[] = ['mod', 'ctrl', 'shift', 'alt']

const MAC_MODIFIER_CAPS: Record<ShortcutModifier, string> = { mod: '⌘', ctrl: '⌃', alt: '⌥', shift: '⇧' }
const OTHER_MODIFIER_CAPS: Record<ShortcutModifier, string> = { mod: 'Ctrl', ctrl: 'Ctrl', alt: 'Alt', shift: 'Shift' }

const MAC_KEY_CAPS: Record<string, string> = {
  ArrowUp: '↑', ArrowDown: '↓', ArrowLeft: '←', ArrowRight: '→',
  Backspace: '⌫', Delete: '⌦', Enter: '↵', Escape: 'Esc', Tab: '⇥', Space: 'Space',
}
const OTHER_KEY_CAPS: Record<string, string> = {
  ArrowUp: 'Up', ArrowDown: 'Down', ArrowLeft: 'Left', ArrowRight: 'Right',
  Backspace: 'Backspace', Delete: 'Delete', Enter: 'Enter', Escape: 'Esc', Tab: 'Tab', Space: 'Space',
}

function keyCap(key: string, platform: ShortcutPlatform): string {
  const named = (platform === 'mac' ? MAC_KEY_CAPS : OTHER_KEY_CAPS)[key]
  if (named) return named
  return key.length === 1 ? key.toUpperCase() : key
}

/** Renders one chord as an ordered list of key caps for the given platform. */
export function formatChordCaps(chord: ShortcutChord, platform: ShortcutPlatform): string[] {
  const modifierCaps = platform === 'mac' ? MAC_MODIFIER_CAPS : OTHER_MODIFIER_CAPS
  const caps: string[] = []
  for (const modifier of MODIFIER_ORDER) {
    if (!chord.modifiers.includes(modifier)) continue
    const cap = modifierCaps[modifier]
    if (!caps.includes(cap)) caps.push(cap)
  }
  caps.push(keyCap(chord.key, platform))
  return caps
}

const KEYMAP_MODIFIERS: Record<string, ShortcutModifier> = {
  Mod: 'mod', Cmd: 'mod', Meta: 'mod', Ctrl: 'ctrl', Control: 'ctrl', Alt: 'alt', Shift: 'shift',
}

/** Parses a ProseMirror/Tiptap keymap string such as `Shift-Mod-z` or `Mod-Alt-1`. */
export function parseKeymap(keymap: string): ShortcutChord {
  const parts = keymap.split('-')
  let key = parts.pop() ?? ''
  if (key === '' && parts.length > 0) {
    parts.pop()
    key = '-'
  }
  const modifiers = parts.map((part) => {
    const modifier = KEYMAP_MODIFIERS[part]
    if (!modifier) throw new Error(`Unknown keymap modifier "${part}" in "${keymap}"`)
    return modifier
  })
  return { modifiers, key }
}

/**
 * Chords for an app command shortcut. Aliases are only shown when the authored
 * display string advertises them (e.g. `⌘P / ⌘O`), so the sheet never shows more
 * than the palette and menus do.
 */
export function chordsForAppShortcut(shortcut: AppCommandShortcutDefinition): ShortcutChord[] {
  const modifiers: ShortcutModifier[] = shortcut.combo === 'command-or-ctrl' ? ['mod'] : ['mod', 'shift']
  const advertised = shortcut.display.split(' / ').length
  return [shortcut.key, ...(shortcut.aliases ?? [])]
    .slice(0, advertised)
    .map((key) => ({ modifiers, key }))
}
