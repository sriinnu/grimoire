import { useCallback, useEffect, useRef } from 'react'

export type AutoGitTrigger = 'idle' | 'inactive'

interface UseAutoGitOptions {
  enabled: boolean
  idleThresholdSeconds: number
  inactiveThresholdSeconds: number
  isGitVault: boolean
  hasPendingChanges: boolean
  hasUnsavedChanges: boolean
  onCheckpoint: (trigger: AutoGitTrigger) => Promise<boolean>
}

interface TriggerState {
  idle: number | null
  inactive: number | null
}

interface AutoGitState {
  recordActivity: () => void
}

interface CheckpointEligibility {
  enabled: boolean
  isGitVault: boolean
  hasPendingChanges: boolean
  hasUnsavedChanges: boolean
}

function isDocumentVisible(): boolean {
  return document.visibilityState === 'visible'
}

function isDocumentActive(): boolean {
  return isDocumentVisible() && document.hasFocus()
}

function resetTriggerState(target: TriggerState): void {
  target.idle = null
  target.inactive = null
}

function thresholdMsForTrigger(
  trigger: AutoGitTrigger,
  idleThresholdSeconds: number,
  inactiveThresholdSeconds: number,
): number {
  return (trigger === 'idle' ? idleThresholdSeconds : inactiveThresholdSeconds) * 1000
}

function isCheckpointEligible({
  enabled,
  isGitVault,
  hasPendingChanges,
  hasUnsavedChanges,
}: CheckpointEligibility): boolean {
  return enabled && isGitVault && hasPendingChanges && !hasUnsavedChanges
}

function markTriggerAsHandled(
  target: TriggerState,
  trigger: AutoGitTrigger,
  activityAt: number,
): void {
  target[trigger] = activityAt
}

function shouldTriggerCheckpoint({
  eligibility,
  trigger,
  lastTriggeredAt,
  lastActivityAt,
  idleThresholdSeconds,
  inactiveThresholdSeconds,
}: {
  eligibility: CheckpointEligibility
  trigger: AutoGitTrigger
  lastTriggeredAt: number | null
  lastActivityAt: number
  idleThresholdSeconds: number
  inactiveThresholdSeconds: number
}): boolean {
  if (!isCheckpointEligible(eligibility)) return false
  if (lastTriggeredAt === lastActivityAt) return false

  const thresholdMs = thresholdMsForTrigger(
    trigger,
    idleThresholdSeconds,
    inactiveThresholdSeconds,
  )
  return Date.now() - lastActivityAt >= thresholdMs
}

/** Runs AutoGit checkpoints only while a Git vault has saved pending work. */
export function useAutoGit({
  enabled,
  idleThresholdSeconds,
  inactiveThresholdSeconds,
  isGitVault,
  hasPendingChanges,
  hasUnsavedChanges,
  onCheckpoint,
}: UseAutoGitOptions): AutoGitState {
  const lastActivityAtRef = useRef(0)
  const lastTriggeredRef = useRef<TriggerState>({ idle: null, inactive: null })
  const appActiveRef = useRef(true)
  const checkpointInFlightRef = useRef(false)
  const checkpointTimerRef = useRef<number | null>(null)
  const scheduleCheckpointRef = useRef<(() => void) | null>(null)

  const clearScheduledCheckpoint = useCallback(() => {
    if (checkpointTimerRef.current === null) return
    window.clearTimeout(checkpointTimerRef.current)
    checkpointTimerRef.current = null
  }, [])

  const runCheckpoint = useCallback(async (
    trigger: AutoGitTrigger,
    lastActivityAt: number,
  ) => {
    const eligibility = {
      enabled,
      isGitVault,
      hasPendingChanges,
      hasUnsavedChanges,
    }
    if (!shouldTriggerCheckpoint({
      eligibility,
      trigger,
      lastTriggeredAt: lastTriggeredRef.current[trigger],
      lastActivityAt,
      idleThresholdSeconds,
      inactiveThresholdSeconds,
    })) return

    try {
      const didRun = await onCheckpoint(trigger)
      if (didRun) markTriggerAsHandled(lastTriggeredRef.current, trigger, lastActivityAt)
    } catch (err) {
      console.warn('[git] Auto-commit failed:', err)
    }
  }, [
    enabled,
    hasPendingChanges,
    hasUnsavedChanges,
    idleThresholdSeconds,
    inactiveThresholdSeconds,
    isGitVault,
    onCheckpoint,
  ])

  const scheduleCheckpoint = useCallback(() => {
    clearScheduledCheckpoint()
    if (!isCheckpointEligible({
      enabled,
      isGitVault,
      hasPendingChanges,
      hasUnsavedChanges,
    }) || !isDocumentVisible()) return

    const trigger = isDocumentActive() ? 'idle' : 'inactive'
    const lastActivityAt = lastActivityAtRef.current
    if (lastTriggeredRef.current[trigger] === lastActivityAt) return

    const delayMs = Math.max(
      0,
      thresholdMsForTrigger(trigger, idleThresholdSeconds, inactiveThresholdSeconds)
        - (Date.now() - lastActivityAt),
    )
    checkpointTimerRef.current = window.setTimeout(() => {
      checkpointTimerRef.current = null
      if (checkpointInFlightRef.current || !isDocumentVisible()) {
        scheduleCheckpointRef.current?.()
        return
      }
      checkpointInFlightRef.current = true
      void runCheckpoint(trigger, lastActivityAtRef.current).finally(() => {
        checkpointInFlightRef.current = false
        scheduleCheckpointRef.current?.()
      })
    }, delayMs)
  }, [
    clearScheduledCheckpoint,
    enabled,
    hasPendingChanges,
    hasUnsavedChanges,
    idleThresholdSeconds,
    inactiveThresholdSeconds,
    isGitVault,
    runCheckpoint,
  ])

  useEffect(() => {
    scheduleCheckpointRef.current = scheduleCheckpoint
  }, [scheduleCheckpoint])

  const recordActivity = useCallback(() => {
    lastActivityAtRef.current = Date.now()
    resetTriggerState(lastTriggeredRef.current)
    scheduleCheckpoint()
  }, [scheduleCheckpoint])

  const updateDocumentActivity = useCallback(() => {
    if (!isDocumentVisible()) {
      clearScheduledCheckpoint()
      appActiveRef.current = false
      return
    }

    const active = isDocumentActive()
    if (appActiveRef.current !== active) {
      appActiveRef.current = active

      if (active) {
        lastTriggeredRef.current.inactive = null
      } else {
        lastTriggeredRef.current.idle = null
      }
    }

    scheduleCheckpoint()
  }, [clearScheduledCheckpoint, scheduleCheckpoint])

  useEffect(() => {
    lastActivityAtRef.current = Date.now()
    appActiveRef.current = isDocumentActive()

    const handleFocus = () => { updateDocumentActivity() }
    const handleBlur = () => { updateDocumentActivity() }
    const handleVisibilityChange = () => { updateDocumentActivity() }

    window.addEventListener('focus', handleFocus)
    window.addEventListener('blur', handleBlur)
    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      window.removeEventListener('focus', handleFocus)
      window.removeEventListener('blur', handleBlur)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [clearScheduledCheckpoint, updateDocumentActivity])

  useEffect(() => {
    scheduleCheckpoint()
    return () => clearScheduledCheckpoint()
  }, [clearScheduledCheckpoint, scheduleCheckpoint])

  return { recordActivity }
}
