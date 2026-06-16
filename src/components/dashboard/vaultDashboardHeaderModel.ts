import type { SyncStatus } from '../../types'
import type { VaultOption } from '../status-bar/types'

/** Returns the compact storage badge for the notebook header. */
export function storageLabel(activeVault?: VaultOption): string {
  const provider = activeVault?.storageProvider
  if (provider === 'icloud-drive') return 'Personal Sync'
  if (provider === 'google-drive-desktop') return 'Personal Sync'
  if (provider === 'cloud-folder') return 'Personal Sync'
  if (provider === 's3' || provider === 'azure-blob') return 'Export Allowed'
  return 'Local'
}

/** Returns the sync badge copy when the header needs an interruption-level state. */
export function syncLabel(syncStatus: SyncStatus, modifiedCount: number, conflictCount: number): string {
  if (conflictCount > 0 || syncStatus === 'conflict') return 'Conflicts'
  if (syncStatus === 'syncing') return 'Syncing'
  if (syncStatus === 'pull_required') return 'Pull Needed'
  if (syncStatus === 'error') return 'Sync Check'
  if (modifiedCount > 0) return modifiedCount === 1 ? 'Unsaved change' : 'Unsaved changes'
  return 'Clean'
}

/** Keeps routine edit counts in the status bar while surfacing sync blockers. */
export function shouldShowSyncBadge(syncStatus: SyncStatus, conflictCount: number): boolean {
  return conflictCount > 0 || syncStatus === 'conflict' || syncStatus === 'pull_required' || syncStatus === 'error'
}

/** Turns vault labels into notebook-first dashboard titles. */
export function notebookTitle(label: string): string {
  const title = label
    .replace(/[-_]+/gu, ' ')
    .replace(/\s+/gu, ' ')
    .trim()
    .replace(/\b\p{L}/gu, (letter) => letter.toLocaleUpperCase())

  const withoutFixtureVersion = title.replace(/\s+V\d+$/u, '').trim()
  const notebookName = /^Demo Vault$/iu.test(withoutFixtureVersion)
    ? 'Notebook'
    : withoutFixtureVersion.replace(/\bVault\b/giu, 'Notebook')
  return notebookName === 'Notebook' ? 'Today in Grimoire' : notebookName
}
