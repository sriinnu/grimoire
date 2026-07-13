import type { DeletedNoteEntry } from '../components/note-list/noteListUtils'
import { isTauri, mockInvoke } from '../mock-tauri'
import type { SidebarSelection, VaultEntry } from '../types'
import { filenameStemToTitle } from '../utils/noteTitle'
import { DASHBOARD_SELECTION } from '../utils/organizationWorkflow'
import { getNoteWindowPathCandidates, type NoteWindowParams } from '../utils/windowMode'

export const DEFAULT_SELECTION: SidebarSelection = DASHBOARD_SELECTION

export function selectionScreenKey(selection: SidebarSelection): string | null {
  switch (selection.kind) {
    case 'entity': return null
    case 'filter': return `filter:${selection.filter}`
    case 'view': return `view:${selection.filename}`
    case 'folder': return `folder:${selection.path}`
    case 'sectionGroup': return `type:${selection.type}`
    case 'dashboard': return 'dashboard'
    default: return 'screen'
  }
}

export function getNextVisibleInboxEntry(entries: VaultEntry[], currentPath: string): VaultEntry | null {
  const currentIndex = entries.findIndex((entry) => entry.path === currentPath)
  return currentIndex < 0 ? null : entries[currentIndex + 1] ?? null
}

export function shouldPreferOnboardingVaultPath(
  onboardingState: { status: string; vaultPath?: string },
  vaults: Array<{ path: string }>,
): onboardingState is { status: 'ready'; vaultPath: string } {
  return onboardingState.status === 'ready'
    && typeof onboardingState.vaultPath === 'string'
    && onboardingState.vaultPath.length > 0
    && !vaults.some((vault) => vault.path === onboardingState.vaultPath)
}

export function labelFromVaultPath(path: string): string {
  return path.split('/').filter(Boolean).pop() || 'Local Notebook'
}

export interface VaultSwitchTransition {
  label: string
  path: string
}

type TauriCoreModule = typeof import('@tauri-apps/api/core')
let tauriCoreImport: Promise<TauriCoreModule> | null = null

export async function invokeTauri<T>(command: string, args?: Record<string, unknown>): Promise<T> {
  tauriCoreImport ??= import('@tauri-apps/api/core')
  const module = await tauriCoreImport
  return module.invoke<T>(command, args)
}

export function invokeAppCommand<T>(command: string, args?: Record<string, unknown>): Promise<T> {
  return isTauri() ? invokeTauri<T>(command, args) : mockInvoke<T>(command, args)
}

export async function resolveNoteWindowEntry(noteWindowParams: NoteWindowParams): Promise<VaultEntry | undefined> {
  for (const path of getNoteWindowPathCandidates(noteWindowParams)) {
    try {
      const entry = await invokeAppCommand<VaultEntry | null>('reload_vault_entry', {
        path,
        vaultPath: noteWindowParams.vaultPath,
      })
      if (entry) return entry
    } catch {
      // Try the next normalized candidate before reporting the note as unavailable.
    }
  }
}

export async function loadNoteWindowContent(path: string, vaultPath: string): Promise<string> {
  const request = { path, vaultPath }
  if (!isTauri()) return mockInvoke<string>('get_note_content', request)
  await invokeTauri('sync_vault_asset_scope_for_window', { vaultPath })
  return invokeTauri<string>('get_note_content', request)
}

export function createPulseDeletedNoteEntry(fullPath: string, relativePath: string): DeletedNoteEntry {
  const filename = relativePath.split('/').pop() ?? relativePath
  return {
    path: fullPath, filename, title: filenameStemToTitle(filename), isA: 'Note', aliases: [], belongsTo: [],
    relatedTo: [], status: null, archived: false, modifiedAt: null, createdAt: null, fileSize: 0,
    snippet: '', wordCount: 0, relationships: {}, icon: null, color: null, order: null, sidebarLabel: null,
    template: null, sort: null, view: null, visible: null, organized: false, favorite: false,
    favoriteIndex: null, listPropertiesDisplay: [], outgoingLinks: [], properties: {}, hasH1: true,
    fileKind: 'markdown', __deletedNotePreview: true, __deletedRelativePath: relativePath,
    __changeAddedLines: null, __changeDeletedLines: null, __changeBinary: false,
  }
}
