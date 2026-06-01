import type { KeyboardEvent, RefObject } from 'react'
import type { VaultEntry } from '../types'
import { slugify } from '../hooks/useNoteCreation'

/** Focuses and selects the filename input after edit mode mounts. */
export function focusFilenameInput(
  isEditing: boolean,
  inputRef: RefObject<HTMLInputElement | null>,
) {
  if (!isEditing) return
  inputRef.current?.focus()
  inputRef.current?.select()
}

/** Starts filename editing from the currently displayed stem. */
export function beginFilenameEditing(
  onRenameFilename: ((path: string, newFilenameStem: string) => void) | undefined,
  filenameStem: string,
  setDraftStem: (value: string) => void,
  setIsEditing: (value: boolean) => void,
) {
  if (!onRenameFilename) return
  setDraftStem(filenameStem)
  setIsEditing(true)
}

export function normalizeFilenameStemInput(value: string): string {
  const trimmed = value.trim()
  return trimmed.replace(/\.md$/i, '').trim()
}

/** Resolves the submitted filename stem, or null when nothing should change. */
export function resolveFilenameRenameTarget(
  draftStem: string,
  filenameStem: string,
): string | null {
  const nextStem = normalizeFilenameStemInput(draftStem)
  if (!nextStem || nextStem === filenameStem) return null
  return nextStem
}

/** Handles keyboard submission and cancellation for filename editing. */
export function handleFilenameInputKeyDown(
  event: KeyboardEvent<HTMLInputElement>,
  submitRename: () => void,
  cancelEditing: () => void,
) {
  switch (event.key) {
    case 'Enter':
      event.preventDefault()
      submitRename()
      return
    case 'Escape':
      event.preventDefault()
      cancelEditing()
      return
    default:
      return
  }
}

/** Returns the title-derived filename stem when it differs from the current file. */
export function deriveSyncStem(entry: VaultEntry): string | null {
  const expectedStem = slugify(entry.title.trim())
  const filenameStem = entry.filename.replace(/\.md$/, '')
  if (!expectedStem || expectedStem === filenameStem) return null
  return expectedStem
}
