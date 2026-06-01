import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useAutoSyncLifecycle } from './useAutoSyncLifecycle'

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

  it('pulls and refreshes remote status when enabled and visible', async () => {
    renderLifecycle()
    await flushEffects()

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
    await flushEffects()

    expect(checkExistingConflicts).toHaveBeenCalledTimes(1)
    expect(performPull).toHaveBeenCalledTimes(1)
    expect(refreshRemoteStatus).toHaveBeenCalledTimes(1)
  })

  it('pauses scheduled pulls while hidden and resumes after visibility returns', async () => {
    renderLifecycle(1)
    await flushEffects()
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
    await flushEffects()

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
    await flushEffects()
    expect(performPull).toHaveBeenCalledTimes(1)

    act(() => { window.dispatchEvent(new Event('focus')) })

    expect(performPull).toHaveBeenCalledTimes(1)

    act(() => { vi.advanceTimersByTime(30_000) })
    act(() => { window.dispatchEvent(new Event('focus')) })

    expect(performPull).toHaveBeenCalledTimes(2)
  })
})
