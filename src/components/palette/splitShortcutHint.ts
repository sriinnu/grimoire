export interface ShortcutHint {
  /** Key-glyph group authored with Mac glyphs (e.g. "↑↓", "↵", "esc"). */
  keys?: string
  label: string
}

const LEADING_KEYS_PATTERN = /^([↑↓←→↵↩⇥⎋⌘⌥⇧⌃⌫⌦]+|esc|tab|space)\s+/

/**
 * Splits a legacy "keys label" footer string (e.g. the command.* i18n values)
 * into a structured hint. Strings without a leading key group become
 * label-only hints.
 */
export function splitShortcutHint(value: string): ShortcutHint {
  const match = LEADING_KEYS_PATTERN.exec(value)
  if (!match) return { label: value }
  return { keys: match[1], label: value.slice(match[0].length) }
}
