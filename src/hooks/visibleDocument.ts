export interface VisibleWorkOptions {
  delayMs?: number
}

/** Returns true when browser work is safe to start without waking a hidden app. */
export function isDocumentVisible(): boolean {
  return typeof document === 'undefined' || document.visibilityState !== 'hidden'
}

/** Schedules one unit of work for the next visible/focused document moment. */
export function scheduleVisibleWork(
  work: () => void,
  options: VisibleWorkOptions = {},
): () => void {
  const delayMs = options.delayMs ?? 0
  let cancelled = false
  let listening = false
  let timer: ReturnType<typeof window.setTimeout> | null = null

  const clearTimer = () => {
    if (timer === null) return
    window.clearTimeout(timer)
    timer = null
  }

  const removeListeners = () => {
    if (!listening || typeof document === 'undefined' || typeof window === 'undefined') return
    document.removeEventListener('visibilitychange', runWhenVisible)
    window.removeEventListener('focus', runWhenVisible)
    listening = false
  }

  const addListeners = () => {
    if (listening || typeof document === 'undefined' || typeof window === 'undefined') return
    document.addEventListener('visibilitychange', runWhenVisible)
    window.addEventListener('focus', runWhenVisible)
    listening = true
  }

  const execute = () => {
    timer = null
    if (cancelled) return
    if (!isDocumentVisible()) {
      addListeners()
      return
    }
    work()
  }

  function runWhenVisible() {
    if (cancelled) return
    if (!isDocumentVisible()) {
      clearTimer()
      addListeners()
      return
    }

    removeListeners()
    clearTimer()
    if (delayMs > 0) {
      timer = window.setTimeout(execute, delayMs)
      return
    }
    work()
  }

  if (isDocumentVisible()) {
    runWhenVisible()
  } else {
    addListeners()
  }

  return () => {
    cancelled = true
    clearTimer()
    removeListeners()
  }
}
