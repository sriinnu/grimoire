import { invoke } from '../tauriRuntime'

/** One note as another device sees it: vault-relative path, mtime, size, content hash. */
export interface ManifestEntry {
  path: string
  mtime: number
  size: number
  hash: string
}

/** What one sync round should do. Nothing here is executed; a transport does that. */
export interface SyncPlan {
  pull: string[]
  push: string[]
  conflicts: string[]
  delete_local: string[]
  delete_remote: string[]
}

/** The local vault's manifest, straight from the SQLite index (refreshed first). */
export function fetchSyncManifest(vaultPath: string): Promise<ManifestEntry[]> {
  return invoke<ManifestEntry[]>('index_manifest', { vaultPath })
}

/**
 * Decide a sync round. With `base` (the manifest from the last successful
 * sync) this is a three-way merge and both-changed notes come back as
 * conflicts to keep as copies; without it, mtime decides and ties are
 * conflicts. An edit is never silently dropped.
 */
export function planSync(local: ManifestEntry[], remote: ManifestEntry[], base?: ManifestEntry[]): Promise<SyncPlan> {
  return invoke<SyncPlan>('sync_plan', { local, remote, base: base ?? null })
}

/** The file name a conflict copy gets: the original next to a device-and-date twin. */
export function conflictCopyPath(path: string, device: string, at = new Date()): string {
  const stamp = at.toISOString().slice(0, 16).replace('T', ' ').replace(':', '.')
  const dot = path.lastIndexOf('.')
  const stem = dot > path.lastIndexOf('/') ? path.slice(0, dot) : path
  const ext = dot > path.lastIndexOf('/') ? path.slice(dot) : ''
  return `${stem} (${device} ${stamp})${ext}`
}
