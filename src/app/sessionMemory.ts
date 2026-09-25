import { APP_STORAGE_KEYS } from '../constants/appStorage'
import type { SidebarFilter, SidebarSelection, VaultEntry } from '../types'

/**
 * Session memory — "continue where you left off".
 *
 * Sriinnu: every launch used to land on the dashboard with nothing open, so the
 * first thing you did each morning was navigate back to what you were writing.
 * Bear, iA Writer and Apple Notes all reopen your last note; so do we now.
 *
 * Stored per vault (paths differ per vault), only in localStorage, and only the
 * screen + the note path — never note content. Entity selections are transient
 * neighborhood views and are not persisted.
 */
export interface StoredSession {
  selection: PersistableSelection
  notePath: string | null
}

export type PersistableSelection = Exclude<SidebarSelection, { kind: 'entity' }>

const SIDEBAR_FILTERS: ReadonlySet<SidebarFilter> = new Set(['all', 'archived', 'changes', 'pulse', 'inbox', 'favorites'])

type SessionStorage = Pick<Storage, 'getItem' | 'setItem'>

export function sessionStorageKey(vaultPath: string): string {
  return `${APP_STORAGE_KEYS.sessionMemory}:${vaultPath}`
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0
}

/** Narrows untrusted JSON back into a selection; anything malformed is dropped. */
export function parsePersistableSelection(value: unknown): PersistableSelection | null {
  if (!value || typeof value !== 'object') return null
  const candidate = value as Record<string, unknown>
  switch (candidate.kind) {
    case 'dashboard':
      return { kind: 'dashboard' }
    case 'filter':
      return SIDEBAR_FILTERS.has(candidate.filter as SidebarFilter)
        ? { kind: 'filter', filter: candidate.filter as SidebarFilter }
        : null
    case 'sectionGroup':
      return isNonEmptyString(candidate.type) ? { kind: 'sectionGroup', type: candidate.type } : null
    case 'folder':
      return isNonEmptyString(candidate.path) ? { kind: 'folder', path: candidate.path } : null
    case 'view':
      return isNonEmptyString(candidate.filename) ? { kind: 'view', filename: candidate.filename } : null
    default:
      return null
  }
}

export function toPersistableSelection(selection: SidebarSelection): PersistableSelection | null {
  return selection.kind === 'entity' ? null : selection
}

export function readStoredSession(storage: SessionStorage, vaultPath: string): StoredSession | null {
  try {
    const raw = storage.getItem(sessionStorageKey(vaultPath))
    if (!raw) return null
    const parsed = JSON.parse(raw) as Record<string, unknown>
    const selection = parsePersistableSelection(parsed.selection)
    if (!selection) return null
    return { selection, notePath: isNonEmptyString(parsed.notePath) ? parsed.notePath : null }
  } catch {
    return null
  }
}

export function writeStoredSession(storage: SessionStorage, vaultPath: string, session: StoredSession): void {
  try {
    storage.setItem(sessionStorageKey(vaultPath), JSON.stringify(session))
  } catch {
    // Private windows / full quota: forgetting the session is harmless.
  }
}

/**
 * Decides what to reopen once the vault's entries are loaded. Stale pointers
 * (deleted note, removed folder or type) degrade gracefully instead of opening
 * an empty screen.
 */
export function resolveSessionRestore(
  session: StoredSession,
  entries: readonly VaultEntry[],
): { selection: PersistableSelection | null; note: VaultEntry | null } {
  const note = session.notePath ? entries.find((entry) => entry.path === session.notePath) ?? null : null
  const { selection } = session

  if (selection.kind === 'folder') {
    const prefix = selection.path.endsWith('/') ? selection.path : `${selection.path}/`
    const folderStillExists = entries.some((entry) => entry.path.startsWith(prefix))
    return { selection: folderStillExists ? selection : null, note }
  }
  if (selection.kind === 'sectionGroup') {
    const typeStillExists = entries.some((entry) => entry.isA === selection.type)
    return { selection: typeStillExists ? selection : null, note }
  }
  return { selection, note }
}
