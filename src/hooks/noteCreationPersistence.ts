import { invoke } from '../lib/tauriRuntime'
import { trackEvent } from '../lib/telemetry'
import { addMockEntry, isTauri } from '../mock-tauri'
import type { VaultEntry } from '../types'
import {
  createPersistFailureMessage,
  planNewNoteCreation,
  planNewTypeCreation,
  resolveTemplate,
  type ResolvedEntry,
} from './noteCreationModel'

interface PersistCallbacks {
  onStart?: (p: string) => void
  onEnd?: (p: string) => void
  onPersisted?: () => void
}

export interface PersistResolvedOptions {
  openTab?: boolean
}

export type PersistResolvedEntryFn = (
  resolved: ResolvedEntry,
  options?: PersistResolvedOptions,
) => Promise<void>

interface CreationDeps {
  entries: VaultEntry[]
  vaultPath: string
  setToastMessage: (msg: string | null) => void
  persistResolvedEntry: PersistResolvedEntryFn
}

interface NoteCreationRequest extends CreationDeps {
  title: string
  type: string
  creationPath?: 'plus_button'
}

interface TypeCreationRequest extends CreationDeps {
  typeName: string
}

/** Persist a newly created note to disk. Returns a Promise for error handling. */
export function persistNewNote(path: string, content: string): Promise<void> {
  if (!isTauri()) return Promise.resolve()
  return invoke<void>('create_note_content', { path, content }).then(() => {})
}

/** Mirror a new entry into the browser mock vault before adding it to app state. */
export function addEntryWithMock(entry: VaultEntry, content: string, addEntry: (e: VaultEntry) => void) {
  if (!isTauri()) addMockEntry(entry, content)
  addEntry(entry)
}

/** Persist to disk; track pending state via onStart/onEnd. */
export async function persistOptimistic(path: string, content: string, cbs: PersistCallbacks): Promise<void> {
  cbs.onStart?.(path)
  try {
    await persistNewNote(path, content)
    cbs.onPersisted?.()
  } finally {
    cbs.onEnd?.(path)
  }
}

/** Create a named note through the collision-aware planning path. */
export async function createNamedNote({
  entries,
  title,
  type,
  vaultPath,
  setToastMessage,
  persistResolvedEntry,
  creationPath,
}: NoteCreationRequest): Promise<boolean> {
  const template = resolveTemplate({ entries, typeName: type })
  const plan = planNewNoteCreation({ entries, title, type, vaultPath, template })
  if (plan.status === 'blocked') {
    setToastMessage(plan.message)
    return false
  }

  try {
    await persistResolvedEntry(plan.resolved)
    if (creationPath) {
      trackEvent('note_created', { has_type: type !== 'Note' ? 1 : 0, creation_path: creationPath })
    }
    return true
  } catch (error) {
    setToastMessage(createPersistFailureMessage(plan.resolved.entry, error))
    return false
  }
}

/** Create a custom Type note, reporting existing equivalent Type definitions as a no-op. */
export async function createTypeFromName({
  entries,
  typeName,
  vaultPath,
  setToastMessage,
  persistResolvedEntry,
}: TypeCreationRequest): Promise<boolean> {
  const plan = planNewTypeCreation({ entries, typeName, vaultPath })
  if (plan.status === 'existing') {
    setToastMessage(`Type "${plan.entry.title}" already exists`)
    return false
  }
  if (plan.status === 'blocked') {
    setToastMessage(plan.message)
    return false
  }

  try {
    await persistResolvedEntry(plan.resolved)
    trackEvent('type_created')
    return true
  } catch (error) {
    setToastMessage(createPersistFailureMessage(plan.resolved.entry, error))
    return false
  }
}

/** Ensure a Type exists without opening a new tab for successful creates. */
export async function createTypeSilently({
  entries,
  typeName,
  vaultPath,
  setToastMessage,
  persistResolvedEntry,
}: TypeCreationRequest): Promise<VaultEntry> {
  const plan = planNewTypeCreation({ entries, typeName, vaultPath })
  if (plan.status === 'existing') return plan.entry
  if (plan.status === 'blocked') {
    setToastMessage(plan.message)
    throw new Error(plan.message)
  }

  try {
    await persistResolvedEntry(plan.resolved, { openTab: false })
    return plan.resolved.entry
  } catch (error) {
    const message = createPersistFailureMessage(plan.resolved.entry, error)
    setToastMessage(message)
    throw new Error(message)
  }
}
