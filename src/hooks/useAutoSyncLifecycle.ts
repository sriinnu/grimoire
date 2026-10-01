import { useEffect, useRef, useState } from 'react'
import type { GitRemoteStatus } from '../types'
import { scheduleAfterFirstPaintIdle } from './startupIdle'

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

/**
 * Starts visible-only auto-sync on launch, focus, and interval when sync is
 * enabled. The launch sync is deferred until after first paint and an idle
 * period; see startupIdle.ts.
 */
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
  // The first sync of a launch waits for paint + idle so the remote never sits
  // between the user and their first note. Later visibility returns pull at once.
  const launchSyncDoneRef = useRef(false)

  useEffect(() => {
    if (!enabled) return

    const handleVisibilityChange = () => setVisible(isDocumentVisible())
    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
  }, [enabled])

  useEffect(() => {
    if (!enabled || !visible) return

    let cancelled = false
    const syncNow = () => {
      if (cancelled) return
      launchSyncDoneRef.current = true
      void checkExistingConflicts().then(hasConflicts => {
        if (!cancelled && !hasConflicts && isDocumentVisible()) {
          lastPullTimeRef.current = Date.now()
          void performPull()
        }
      })
      void refreshRemoteStatus()
    }

    if (launchSyncDoneRef.current) {
      syncNow()
      return () => { cancelled = true }
    }
    const cancelDeferred = scheduleAfterFirstPaintIdle(syncNow)
    return () => {
      cancelled = true
      cancelDeferred()
    }
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
