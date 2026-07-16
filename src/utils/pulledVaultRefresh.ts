import type { VaultEntry } from '../types'

interface PulledVaultRefreshOptions {
  activeTabPath: string | null
  closeAllTabs: () => void
  hasUnsavedChanges: (path: string) => boolean
  reloadFolders: () => Promise<unknown> | unknown
  /** May resolve to `null` when the reload aborted — the refresh becomes a no-op. */
  reloadVault: () => Promise<VaultEntry[] | null>
  reloadViews: () => Promise<unknown> | unknown
  replaceActiveTab: (entry: VaultEntry) => Promise<void>
  updatedFiles: string[]
  vaultPath: string
}

function normalizePath(path: string): string {
  return path
    .replaceAll('\\', '/')
    .replace(/^\/private\/tmp(?=\/|$)/u, '/tmp')
    .replace(/\/+$/u, '')
}

function resolveUpdatedFilePath(path: string, vaultPath: string): string {
  if (path.startsWith('/')) return normalizePath(path)
  return normalizePath(`${vaultPath}/${path}`)
}

function didPullUpdateActiveNote(updatedFiles: string[], vaultPath: string, activeTabPath: string): boolean {
  const normalizedActivePath = normalizePath(activeTabPath)
  return updatedFiles.some((path) => resolveUpdatedFilePath(path, vaultPath) === normalizedActivePath)
}

export async function refreshPulledVaultState(options: PulledVaultRefreshOptions): Promise<VaultEntry[] | null> {
  const {
    activeTabPath,
    closeAllTabs,
    hasUnsavedChanges,
    reloadFolders,
    reloadVault,
    reloadViews,
    replaceActiveTab,
    updatedFiles,
    vaultPath,
  } = options

  const [entries] = await Promise.all([
    reloadVault(),
    Promise.resolve(reloadFolders()),
    Promise.resolve(reloadViews()),
  ])

  // `null` means the reload aborted (transient IPC failure or vault switch
  // mid-flight). Abort the whole refresh and keep the current tab session —
  // an empty result here is NOT an empty vault, and closing tabs on it would
  // destroy the user's session over a hiccup.
  if (entries === null) return null

  if (!activeTabPath || hasUnsavedChanges(activeTabPath)) return entries

  const refreshedEntry = entries.find(entry => normalizePath(entry.path) === normalizePath(activeTabPath))
  if (!refreshedEntry) {
    closeAllTabs()
    return entries
  }

  // Native BlockNote can keep rendering the previous document after a pull that
  // changes the active file in place. Dropping the tab first forces a full
  // reopen for that specific case without affecting unrelated pull updates.
  if (didPullUpdateActiveNote(updatedFiles, vaultPath, activeTabPath)) {
    closeAllTabs()
  }

  await replaceActiveTab(refreshedEntry)
  return entries
}
