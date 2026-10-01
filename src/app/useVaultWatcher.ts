import { useEffect, useRef } from 'react'
import { invoke } from '../lib/tauriRuntime'
import { wasWrittenLocally } from '../lib/localWriteLedger'
import { isTauri } from '../mock-tauri'

export const VAULT_FS_CHANGED_EVENT = 'vault-fs-changed'
/** Renderer-side broadcast after the entries reload, for panels that cache note bodies. */
export const VAULT_FS_CHANGED_DOM_EVENT = 'grimoire:vault-fs-changed'

export interface VaultFsChangedPayload {
  vaultPath: string
  paths: string[]
}

const COALESCE_MS = 250

/** Drops files Grimoire wrote itself moments ago; the rest are outside edits. */
export function externalChanges(payload: VaultFsChangedPayload, pendingSavePaths: ReadonlySet<string>, now = Date.now()): string[] {
  return payload.paths.filter((path) => !pendingSavePaths.has(path) && !wasWrittenLocally(path, now))
}

/**
 * Keeps the vault list in step with the disk. Native only: the browser
 * preview has no filesystem to watch. Changes made by Grimoire are ignored;
 * anything else soft-reloads the entries and announces the paths.
 */
export function useVaultWatcher({
  vaultPath,
  pendingSavePaths,
  reloadVaultSoft,
}: {
  vaultPath: string | null | undefined
  pendingSavePaths: ReadonlySet<string>
  reloadVaultSoft: (extraPaths?: string[]) => Promise<unknown>
}): void {
  const pendingRef = useRef(pendingSavePaths)
  pendingRef.current = pendingSavePaths
  const reloadRef = useRef(reloadVaultSoft)
  reloadRef.current = reloadVaultSoft

  useEffect(() => {
    if (!vaultPath || !isTauri()) return
    let disposed = false
    let unlisten: (() => void) | null = null
    let queued = new Set<string>()
    let timer: number | null = null

    const flush = () => {
      timer = null
      const paths = [...queued]
      queued = new Set()
      if (paths.length === 0) return
      void reloadRef.current(paths).then(() => {
        if (disposed) return
        window.dispatchEvent(new CustomEvent<VaultFsChangedPayload>(VAULT_FS_CHANGED_DOM_EVENT, { detail: { vaultPath, paths } }))
      })
    }

    void invoke('watch_vault', { vaultPath }).catch((error: unknown) => {
      console.warn('[vault] watcher unavailable:', error)
    })
    void import('@tauri-apps/api/event')
      .then(({ listen }) => listen<VaultFsChangedPayload>(VAULT_FS_CHANGED_EVENT, (event) => {
        if (disposed || event.payload.vaultPath !== vaultPath) return
        for (const path of externalChanges(event.payload, pendingRef.current)) queued.add(path)
        if (queued.size > 0 && timer === null) timer = window.setTimeout(flush, COALESCE_MS)
      }))
      .then((teardown) => {
        if (disposed) teardown()
        else unlisten = teardown
      })
      .catch(() => { /* event bridge unavailable */ })

    return () => {
      disposed = true
      if (timer !== null) window.clearTimeout(timer)
      unlisten?.()
    }
  }, [vaultPath])
}
