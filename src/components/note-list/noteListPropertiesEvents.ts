export type NoteListPropertiesScope = 'type' | 'inbox' | 'all' | 'view'

export interface OpenListPropertiesEventDetail {
  scope: NoteListPropertiesScope
}

export const OPEN_NOTE_LIST_PROPERTIES_EVENT = 'grimoire:open-note-list-properties'

let pendingOpenScope: NoteListPropertiesScope | null = null

/** Returns and clears a pending property-picker request for a lazily mounted popover. */
export function consumePendingNoteListPropertiesPicker(scope: NoteListPropertiesScope): boolean {
  if (pendingOpenScope !== scope) return false
  pendingOpenScope = null
  return true
}

/** Opens the note-list property picker, including when its lazy chunk is still mounting. */
export function openNoteListPropertiesPicker(scope: NoteListPropertiesScope): void {
  pendingOpenScope = scope
  window.dispatchEvent(new CustomEvent<OpenListPropertiesEventDetail>(OPEN_NOTE_LIST_PROPERTIES_EVENT, {
    detail: { scope },
  }))
}
