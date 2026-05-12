import { useEffect, useRef } from 'react'
import type { GitRemoteStatus } from '../types'

const DEFAULT_INTERVAL_MS = 5 * 60_000
const FOCUS_COOLDOWN_MS = 30_000

interface AutoSyncLifecycleOptions {
  checkExistingConflicts: () => Promise<boolean>
  enabled: boolean
  intervalMinutes: number | null
  performPull: () => Promise<void>
  refreshRemoteStatus: () => Promise<GitRemoteStatus | null>
}

/** Starts auto-sync on launch, focus, and interval when Git sync is enabled. */
export function useAutoSyncLifecycle(options: AutoSyncLifecycleOptions): void {
  const {
    checkExistingConflicts,
    enabled,
    intervalMinutes,
    performPull,
    refreshRemoteStatus,
  } = options

  useEffect(() => {
    if (!enabled) return

    void checkExistingConflicts().then(hasConflicts => {
      if (!hasConflicts) void performPull()
    })
    void refreshRemoteStatus()
  }, [checkExistingConflicts, enabled, performPull, refreshRemoteStatus])

  const lastPullTimeRef = useRef(0)
  useEffect(() => {
    if (!enabled) return

    const handleFocus = () => {
      const now = Date.now()
      if (now - lastPullTimeRef.current < FOCUS_COOLDOWN_MS) return
      lastPullTimeRef.current = now
      void performPull()
    }
    window.addEventListener('focus', handleFocus)
    return () => window.removeEventListener('focus', handleFocus)
  }, [enabled, performPull])

  useEffect(() => {
    if (!enabled) return

    const ms = (intervalMinutes ?? 5) * 60_000 || DEFAULT_INTERVAL_MS
    const id = setInterval(() => { void performPull() }, ms)
    return () => clearInterval(id)
  }, [enabled, performPull, intervalMinutes])
}
