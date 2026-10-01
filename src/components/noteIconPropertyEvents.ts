export const FOCUS_NOTE_ICON_PROPERTY_EVENT = 'grimoire:focus-note-icon-property'
export const FOCUS_NOTE_PROPERTY_EVENT = 'grimoire:focus-note-property'
export const OPEN_INSPECTOR_EVENT = 'grimoire:open-inspector'

export interface FocusNotePropertyDetail {
  key: string
}

let pendingPropertyKey: string | null = null

export function focusNoteIconPropertyEditor(): void {
  window.dispatchEvent(new CustomEvent(FOCUS_NOTE_ICON_PROPERTY_EVENT))
}

/**
 * Ask the Second Brain to open and start editing one property. The panel may
 * not be mounted yet (it is lazy and may be collapsed), so the key is also
 * parked for it to pick up on mount.
 */
export function requestNotePropertyFocus(key: string): void {
  pendingPropertyKey = key
  window.dispatchEvent(new CustomEvent(OPEN_INSPECTOR_EVENT))
  window.dispatchEvent(new CustomEvent<FocusNotePropertyDetail>(FOCUS_NOTE_PROPERTY_EVENT, { detail: { key } }))
}

/** The panel calls this once on mount; the key is handed over exactly once. */
export function consumePendingNotePropertyFocus(): string | null {
  const key = pendingPropertyKey
  pendingPropertyKey = null
  return key
}
