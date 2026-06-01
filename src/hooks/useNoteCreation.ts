import { useCallback } from 'react'
import type { VaultEntry } from '../types'
import {
  addEntryWithMock,
  createNamedNote,
  createTypeFromName,
  createTypeSilently,
  persistNewNote,
  persistOptimistic,
  type PersistResolvedOptions,
} from './noteCreationPersistence'
import { RAPID_CREATE_NOTE_SETTLE_MS, useImmediateCreateQueue } from './noteCreationImmediate'
import type { ResolvedEntry } from './noteCreationModel'

export {
  DEFAULT_TEMPLATES,
  buildNewEntry,
  buildNoteContent,
  entryMatchesTarget,
  generateUntitledName,
  planNewNoteCreation,
  planNewTypeCreation,
  resolveNewNote,
  resolveNewType,
  resolveTemplate,
  slugify,
} from './noteCreationModel'
export { persistNewNote, RAPID_CREATE_NOTE_SETTLE_MS }

export interface NoteCreationConfig {
  addEntry: (entry: VaultEntry) => void
  removeEntry: (path: string) => void
  entries: VaultEntry[]
  setToastMessage: (msg: string | null) => void
  vaultPath: string
  addPendingSave?: (path: string) => void
  removePendingSave?: (path: string) => void
  trackUnsaved?: (path: string) => void
  clearUnsaved?: (path: string) => void
  unsavedPaths?: Set<string>
  markContentPending?: (path: string, content: string) => void
  onNewNotePersisted?: () => void
}

interface CreationTabDeps {
  openTabWithContent: (entry: VaultEntry, content: string) => void
}

/** Creates named notes, custom Types, and immediate untitled notes for the active vault. */
export function useNoteCreation(config: NoteCreationConfig, tabDeps: CreationTabDeps) {
  const { addEntry, removeEntry, entries, setToastMessage, addPendingSave, removePendingSave, vaultPath } = config
  const { openTabWithContent } = tabDeps

  const persistResolvedEntry = useCallback(async (
    resolved: ResolvedEntry,
    options?: PersistResolvedOptions,
  ): Promise<void> => {
    if (options?.openTab !== false) openTabWithContent(resolved.entry, resolved.content)
    addEntryWithMock(resolved.entry, resolved.content, addEntry)
    try {
      await persistOptimistic(resolved.entry.path, resolved.content, {
        onStart: addPendingSave,
        onEnd: removePendingSave,
        onPersisted: config.onNewNotePersisted,
      })
    } catch (error) {
      removeEntry(resolved.entry.path)
      throw error
    }
  }, [openTabWithContent, addEntry, addPendingSave, removePendingSave, config.onNewNotePersisted, removeEntry])

  const handleCreateNote = useCallback((title: string, type: string): Promise<boolean> =>
    createNamedNote({ entries, vaultPath, setToastMessage, persistResolvedEntry, title, type, creationPath: 'plus_button' }),
  [entries, vaultPath, setToastMessage, persistResolvedEntry])

  const handleCreateType = useCallback((typeName: string): Promise<boolean> =>
    createTypeFromName({ entries, vaultPath, setToastMessage, persistResolvedEntry, typeName }),
  [entries, vaultPath, setToastMessage, persistResolvedEntry])

  const createTypeEntrySilent = useCallback((typeName: string): Promise<VaultEntry> =>
    createTypeSilently({ entries, vaultPath, setToastMessage, persistResolvedEntry, typeName }),
  [entries, vaultPath, setToastMessage, persistResolvedEntry])

  const handleCreateNoteForRelationship = useCallback((title: string): Promise<boolean> =>
    createNamedNote({ entries, vaultPath, setToastMessage, persistResolvedEntry, title, type: 'Note' }),
  [entries, vaultPath, setToastMessage, persistResolvedEntry])

  const handleCreateNoteImmediate = useImmediateCreateQueue({
    entries,
    vaultPath,
    addEntry,
    openTabWithContent,
    trackUnsaved: config.trackUnsaved,
    markContentPending: config.markContentPending,
  })

  return {
    handleCreateNote,
    handleCreateNoteImmediate,
    handleCreateNoteForRelationship,
    handleCreateType,
    createTypeEntrySilent,
  }
}
