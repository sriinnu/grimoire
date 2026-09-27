import { useEffect, useRef } from 'react'
import { useTagSnapshot } from '../lib/bodyIndex/tagSnapshot'
import type { VaultEntry } from '../types'
import { subscribeNoteContentCached } from '../hooks/tabContentCache'

type BodyIndexModule = typeof import('../lib/bodyIndex/bodyIndex')

const FIRST_SYNC_IDLE_TIMEOUT_MS = 2000

function whenIdle(callback: () => void): () => void {
  if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
    const id = window.requestIdleCallback(callback, { timeout: FIRST_SYNC_IDLE_TIMEOUT_MS })
    return () => window.cancelIdleCallback(id)
  }
  const id = setTimeout(callback, 300)
  return () => clearTimeout(id)
}

/**
 * Keeps the body index (tags, mentions) in step with the vault. The index
 * module loads after first paint on an idle callback, so nothing here sits on
 * the boot path. Later entry changes diff by path and modifiedAt; saves push
 * their content straight in through the note-content cache.
 */
export function useBodyIndexSync(entries: VaultEntry[], vaultPath: string | null): ReturnType<typeof useTagSnapshot> {
  const moduleRef = useRef<BodyIndexModule | null>(null)
  const entriesRef = useRef(entries)
  entriesRef.current = entries

  // Load once, after first paint, then sync whatever entries are current.
  useEffect(() => {
    if (!vaultPath) return
    let cancelled = false
    const cancelIdle = whenIdle(() => {
      void import('../lib/bodyIndex/bodyIndex').then((module) => {
        if (cancelled) return
        moduleRef.current = module
        void module.getBodyIndex().rebuild(entriesRef.current)
      })
    })
    return () => {
      cancelled = true
      cancelIdle()
    }
  }, [vaultPath])

  // Entry list changed (save, delete, rename, reload): diff, never full re-read.
  useEffect(() => {
    const module = moduleRef.current
    if (!module) return
    void module.getBodyIndex().sync(entries)
  }, [entries])

  // A save knows its own content; index it now rather than after the next list refresh.
  useEffect(() => subscribeNoteContentCached((path, content) => {
    moduleRef.current?.getBodyIndex().update(path, content)
  }), [])
  return useTagSnapshot()
}
