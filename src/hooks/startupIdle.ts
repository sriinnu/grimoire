/** Upper bound on how long the browser may postpone a deferred startup task. */
export const STARTUP_IDLE_TIMEOUT_MS = 1500

/** Used when requestIdleCallback is missing (Safari, jsdom): one short beat after paint. */
export const STARTUP_IDLE_FALLBACK_MS = 250

type Cancel = () => void

/**
 * Runs `task` after the first frame has painted and the main thread has gone
 * idle, capped at STARTUP_IDLE_TIMEOUT_MS so it never waits forever. Returns
 * a cancel function; cancelling before the task runs drops it.
 */
export function scheduleAfterFirstPaintIdle(task: () => void, timeoutMs = STARTUP_IDLE_TIMEOUT_MS): Cancel {
  let cancelled = false
  let frameId: number | null = null
  let idleId: number | null = null
  let timeoutId: ReturnType<typeof window.setTimeout> | null = null

  const runWhenIdle = () => {
    frameId = null
    if (cancelled) return
    if (typeof window.requestIdleCallback === 'function') {
      idleId = window.requestIdleCallback(() => {
        idleId = null
        if (!cancelled) task()
      }, { timeout: timeoutMs })
      return
    }
    timeoutId = window.setTimeout(() => {
      timeoutId = null
      if (!cancelled) task()
    }, Math.min(STARTUP_IDLE_FALLBACK_MS, timeoutMs))
  }

  if (typeof window.requestAnimationFrame === 'function') {
    frameId = window.requestAnimationFrame(runWhenIdle)
  } else {
    timeoutId = window.setTimeout(runWhenIdle, 0)
  }

  return () => {
    cancelled = true
    if (frameId !== null && typeof window.cancelAnimationFrame === 'function') window.cancelAnimationFrame(frameId)
    if (idleId !== null && typeof window.cancelIdleCallback === 'function') window.cancelIdleCallback(idleId)
    if (timeoutId !== null) window.clearTimeout(timeoutId)
  }
}
