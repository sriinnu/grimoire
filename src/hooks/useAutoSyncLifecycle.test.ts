import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useAutoSyncLifecycle } from './useAutoSyncLifecycle'
import { STARTUP_IDLE_FALLBACK_MS } from './startupIdle'

let visibilityState: DocumentVisibilityState = 'visible'

describe('useAutoSyncLifecycle', () => {
  const checkExistingConflicts = vi.fn()
  const performPull = vi.fn()
  const refreshRemoteStatus = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    visibilityState = 'visible'
    vi.useFakeTimers()
    vi.spyOn(document, 'visibilityState', 'get').mockImplementation(() => visibilityState)
    checkExistingConflicts.mockResolvedValue(false)
    performPull.mockResolvedValue(undefined)
    refreshRemoteStatus.mockResolvedValue(null)
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.useRealTimers()
  })

  function renderLifecycle(intervalMinutes: number | null = 5) {
    return renderHook(() => useAutoSyncLifecycle({
      checkExistingConflicts,
      enabled: true,
      intervalMinutes,
      performPull,
      refreshRemoteStatus,
    }))
  }

  async function flushEffects() {
    await act(async () => {
      await Promise.resolve()
      await Promise.resolve()
    })
  }

  /** jsdom has no requestIdleCallback; the launch sync falls back to a short timeout after paint. */
  async function passLaunchDeferral() {
    await act(async () => {
      await vi.advanceTimersByTimeAsync(STARTUP_IDLE_FALLBACK_MS + 50)
    })
  }

  it('waits for paint and idle before the launch sync, then pulls once', async () => {
    renderLifecycle()
    await flushEffects()

    expect(checkExistingConflicts).not.toHaveBeenCalled()
    expect(performPull).not.toHaveBeenCalled()
    expect(refreshRemoteStatus).not.toHaveBeenCalled()

    await passLaunchDeferral()

    expect(checkExistingConflicts).toHaveBeenCalledTimes(1)
    expect(performPull).toHaveBeenCalledTimes(1)
    expect(refreshRemoteStatus).toHaveBeenCalledTimes(1)
  })

  it('hands the launch sync to requestIdleCallback when the browser has one', async () => {
    const idleCallbacks: Array<() => void> = []
    vi.stubGlobal('requestIdleCallback', (callback: () => void) => { idleCallbacks.push(callback); return idleCallbacks.length })
    vi.stubGlobal('cancelIdleCallback', vi.fn())
    try {
      renderLifecycle()
      await act(async () => { await vi.advanceTimersByTimeAsync(5_000) })
      expect(performPull).not.toHaveBeenCalled()
      expect(idleCallbacks).toHaveLength(1)

      await act(async () => { idleCallbacks[0](); await Promise.resolve(); await Promise.resolve() })
      expect(checkExistingConflicts).toHaveBeenCalledTimes(1)
      expect(performPull).toHaveBeenCalledTimes(1)
    } finally {
      vi.unstubAllGlobals()
    }
  })

  it('drops the deferred launch sync when the hook unmounts first', async () => {
    const { unmount } = renderLifecycle()
    await flushEffects()
    unmount()
    await passLaunchDeferral()

    expect(checkExistingConflicts).not.toHaveBeenCalled()
    expect(performPull).not.toHaveBeenCalled()
  })

  it('pulls and refreshes remote status when enabled and visible', async () => {
    renderLifecycle()
    await passLaunchDeferral()

    expect(checkExistingConflicts).toHaveBeenCalledTimes(1)
    expect(performPull).toHaveBeenCalledTimes(1)
    expect(refreshRemoteStatus).toHaveBeenCalledTimes(1)
  })

  it('does not start network sync while the app is hidden', async () => {
    visibilityState = 'hidden'
    renderLifecycle()

    await act(async () => {
      await Promise.resolve()
    })

    expect(checkExistingConflicts).not.toHaveBeenCalled()
    expect(performPull).not.toHaveBeenCalled()
    expect(refreshRemoteStatus).not.toHaveBeenCalled()

    visibilityState = 'visible'
    act(() => { document.dispatchEvent(new Event('visibilitychange')) })
    await passLaunchDeferral()

    expect(checkExistingConflicts).toHaveBeenCalledTimes(1)
    expect(performPull).toHaveBeenCalledTimes(1)
    expect(refreshRemoteStatus).toHaveBeenCalledTimes(1)
  })

  it('pauses scheduled pulls while hidden and resumes after visibility returns', async () => {
    renderLifecycle(1)
    await passLaunchDeferral()
    expect(performPull).toHaveBeenCalledTimes(1)
    performPull.mockClear()

    visibilityState = 'hidden'
    act(() => { document.dispatchEvent(new Event('visibilitychange')) })
    act(() => { vi.advanceTimersByTime(60_000) })

    expect(performPull).not.toHaveBeenCalled()

    visibilityState = 'visible'
    act(() => { document.dispatchEvent(new Event('visibilitychange')) })
    await flushEffects()
    expect(performPull).toHaveBeenCalledTimes(1)

    performPull.mockClear()
    act(() => { vi.advanceTimersByTime(60_000) })

    expect(performPull).toHaveBeenCalledTimes(1)
  })

  it('uses one-shot scheduling instead of a permanent polling interval', async () => {
    const intervalSpy = vi.spyOn(window, 'setInterval')
    const timeoutSpy = vi.spyOn(window, 'setTimeout')

    renderLifecycle(1)
    await passLaunchDeferral()

    expect(intervalSpy).not.toHaveBeenCalled()
    expect(timeoutSpy).toHaveBeenCalled()

    performPull.mockClear()
    await act(async () => {
      await vi.advanceTimersByTimeAsync(60_000)
    })

    expect(performPull).toHaveBeenCalledTimes(1)
    expect(intervalSpy).not.toHaveBeenCalled()
  })

  it('keeps focus pulls debounced after a visibility-triggered pull', async () => {
    renderLifecycle()
    await passLaunchDeferral()
    expect(performPull).toHaveBeenCalledTimes(1)

    act(() => { window.dispatchEvent(new Event('focus')) })

    expect(performPull).toHaveBeenCalledTimes(1)

    act(() => { vi.advanceTimersByTime(30_000) })
    act(() => { window.dispatchEvent(new Event('focus')) })

    expect(performPull).toHaveBeenCalledTimes(2)
  })
})
