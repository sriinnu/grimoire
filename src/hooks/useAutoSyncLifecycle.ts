import { useEffect, useRef, useState } from 'react'
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

function isDocumentVisible(): boolean {
  return typeof document === 'undefined' || document.visibilityState !== 'hidden'
}

function syncIntervalMs(intervalMinutes: number | null): number {
  const minutes = intervalMinutes ?? 5
  return minutes > 0 ? minutes * 60_000 : DEFAULT_INTERVAL_MS
}

/** Starts visible-only auto-sync on launch, focus, and interval when Git sync is enabled. */
export function useAutoSyncLifecycle(options: AutoSyncLifecycleOptions): void {
  const {
    checkExistingConflicts,
    enabled,
    intervalMinutes,
    performPull,
    refreshRemoteStatus,
  } = options

  const [visible, setVisible] = useState(() => isDocumentVisible())
  const lastPullTimeRef = useRef(0)

  useEffect(() => {
    if (!enabled) return

    const handleVisibilityChange = () => setVisible(isDocumentVisible())
    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
  }, [enabled])

  useEffect(() => {
    if (!enabled || !visible) return

    void checkExistingConflicts().then(hasConflicts => {
      if (!hasConflicts && isDocumentVisible()) {
        lastPullTimeRef.current = Date.now()
        void performPull()
      }
    })
    void refreshRemoteStatus()
  }, [checkExistingConflicts, enabled, performPull, refreshRemoteStatus, visible])

  useEffect(() => {
    if (!enabled) return

    const handleFocus = () => {
      if (!isDocumentVisible()) return
      const now = Date.now()
      if (now - lastPullTimeRef.current < FOCUS_COOLDOWN_MS) return
      lastPullTimeRef.current = now
      void performPull()
    }
    window.addEventListener('focus', handleFocus)
    return () => window.removeEventListener('focus', handleFocus)
  }, [enabled, performPull])

  useEffect(() => {
    if (!enabled || !visible) return

    let cancelled = false
    let timeoutId: ReturnType<typeof window.setTimeout> | null = null

    const clearScheduledPull = () => {
      if (timeoutId === null) return
      window.clearTimeout(timeoutId)
      timeoutId = null
    }

    const scheduleNextPull = () => {
      clearScheduledPull()
      timeoutId = window.setTimeout(() => {
        timeoutId = null
        if (cancelled || !isDocumentVisible()) return

        lastPullTimeRef.current = Date.now()
        void performPull().finally(() => {
          if (!cancelled && isDocumentVisible()) scheduleNextPull()
        })
      }, syncIntervalMs(intervalMinutes))
    }

    scheduleNextPull()
    return () => {
      cancelled = true
      clearScheduledPull()
    }
  }, [enabled, intervalMinutes, performPull, visible])
}
