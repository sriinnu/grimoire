type EntryLoadFailureKind =
  | 'missing-active-vault'
  | 'missing-path'
  | 'unreadable-content'
  | 'load-failed'

export type RecoverableEntryLoadFailureKind = Exclude<EntryLoadFailureKind, 'load-failed'>

function messageFromUnknown(error: unknown): string {
  return error instanceof Error
    ? error.message
    : typeof error === 'string'
      ? error
      : String(error)
}

/** Returns true when native note loading failed because the file no longer exists. */
export function isMissingNotePathError(error: unknown): boolean {
  return /does not exist|not found|enoent/i.test(messageFromUnknown(error))
}

/** Returns true when native note loading failed because no vault is currently selected. */
export function isNoActiveVaultSelectedError(error: unknown): boolean {
  return /no active vault selected/i.test(messageFromUnknown(error))
}

/** Returns true when a selected file is not readable Markdown/text content. */
export function isUnreadableNoteContentError(error: unknown): boolean {
  return /not valid utf-8 text|invalid utf-8|stream did not contain valid utf-8/i.test(messageFromUnknown(error))
}

/** Classifies a note-content load error for navigation recovery. */
export function getEntryLoadFailureKind(error: unknown): EntryLoadFailureKind {
  if (isNoActiveVaultSelectedError(error)) return 'missing-active-vault'
  if (isMissingNotePathError(error)) return 'missing-path'
  if (isUnreadableNoteContentError(error)) return 'unreadable-content'
  return 'load-failed'
}
