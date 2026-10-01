import { useEffect, useRef } from 'react'
import type { SidebarSelection, VaultEntry } from '../types'
import {
  readStoredSession,
  resolveSessionRestore,
  toPersistableSelection,
  writeStoredSession,
} from './sessionMemory'

interface SessionMemoryOptions {
  /** Note windows and onboarding never touch the main window's session. */
  disabled: boolean
  vaultPath: string | null | undefined
  isLoading: boolean
  entries: readonly VaultEntry[]
  selection: SidebarSelection
  activeTabPath: string | null
  onRestoreSelection: (selection: SidebarSelection) => void
  onRestoreNote: (entry: VaultEntry) => void
}

function browserStorage(): Storage | null {
  try {
    return typeof window === 'undefined' ? null : window.localStorage
  } catch {
    return null
  }
}

/** Reopens the last screen + note per vault, and keeps that memory current. */
export function useSessionMemory({
  disabled,
  vaultPath,
  isLoading,
  entries,
  selection,
  activeTabPath,
  onRestoreSelection,
  onRestoreNote,
}: SessionMemoryOptions): void {
  // Which vault has had its restore attempt. Until then we must not persist,
  // or the default dashboard selection would overwrite the saved session.
  const restoredVaultRef = useRef<string | null>(null)
  // The selection that was on screen when a restore was dispatched. The restore
  // lands a render later, so persisting this stale value would clobber it.
  const preRestoreSelectionRef = useRef<SidebarSelection | null>(null)
  const restoreHandlersRef = useRef({ onRestoreSelection, onRestoreNote })
  useEffect(() => {
    restoreHandlersRef.current = { onRestoreSelection, onRestoreNote }
  }, [onRestoreSelection, onRestoreNote])

  useEffect(() => {
    if (disabled || !vaultPath || isLoading || entries.length === 0) return
    if (restoredVaultRef.current === vaultPath) return
    restoredVaultRef.current = vaultPath

    const storage = browserStorage()
    const session = storage ? readStoredSession(storage, vaultPath) : null
    if (!session) return

    const { selection: restoredSelection, note } = resolveSessionRestore(session, entries)
    if (restoredSelection || note) preRestoreSelectionRef.current = selection
    const { onRestoreSelection: restoreSelection, onRestoreNote: restoreNote } = restoreHandlersRef.current
    // The dashboard hides the editor, so a remembered note wins over it.
    if (note && (!restoredSelection || restoredSelection.kind === 'dashboard')) {
      restoreSelection({ kind: 'filter', filter: 'all' })
    } else if (restoredSelection) {
      restoreSelection(restoredSelection)
    }
    if (note) restoreNote(note)
  }, [disabled, entries, isLoading, selection, vaultPath])

  useEffect(() => {
    if (disabled || !vaultPath || restoredVaultRef.current !== vaultPath) return
    if (preRestoreSelectionRef.current === selection) return
    preRestoreSelectionRef.current = null
    const persistable = toPersistableSelection(selection)
    if (!persistable) return
    const storage = browserStorage()
    if (storage) writeStoredSession(storage, vaultPath, { selection: persistable, notePath: activeTabPath })
  }, [activeTabPath, disabled, selection, vaultPath])
}
