import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useAutoGit } from './useAutoGit'

describe('useAutoGit', () => {
  let hasFocus = true
  let visibilityState: DocumentVisibilityState = 'visible'

  beforeEach(() => {
    vi.useFakeTimers()
    vi.spyOn(document, 'hasFocus').mockImplementation(() => hasFocus)
    vi.spyOn(document, 'visibilityState', 'get').mockImplementation(() => visibilityState)
    hasFocus = true
    visibilityState = 'visible'
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.useRealTimers()
  })

  it('triggers an idle checkpoint after the configured threshold', async () => {
    const onCheckpoint = vi.fn().mockResolvedValue(true)
    renderHook(() => useAutoGit({
      enabled: true,
      idleThresholdSeconds: 3,
      inactiveThresholdSeconds: 2,
      isGitVault: true,
      hasPendingChanges: true,
      hasUnsavedChanges: false,
      onCheckpoint,
    }))

    await act(async () => {
      await vi.advanceTimersByTimeAsync(2_999)
    })
    expect(onCheckpoint).not.toHaveBeenCalled()

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1)
    })
    expect(onCheckpoint).toHaveBeenCalledWith('idle')
  })

  it('waits for the app to become inactive before triggering the inactive checkpoint', async () => {
    const onCheckpoint = vi.fn().mockResolvedValue(true)
    renderHook(() => useAutoGit({
      enabled: true,
      idleThresholdSeconds: 10,
      inactiveThresholdSeconds: 2,
      isGitVault: true,
      hasPendingChanges: true,
      hasUnsavedChanges: false,
      onCheckpoint,
    }))

    hasFocus = false
    await act(async () => {
      window.dispatchEvent(new Event('blur'))
      await vi.advanceTimersByTimeAsync(2_000)
    })

    expect(onCheckpoint).toHaveBeenCalledWith('inactive')
  })

  it('does not trigger while the editor still has unsaved changes', async () => {
    const onCheckpoint = vi.fn().mockResolvedValue(true)
    renderHook(() => useAutoGit({
      enabled: true,
      idleThresholdSeconds: 1,
      inactiveThresholdSeconds: 1,
      isGitVault: true,
      hasPendingChanges: true,
      hasUnsavedChanges: true,
      onCheckpoint,
    }))

    await act(async () => {
      await vi.advanceTimersByTimeAsync(2_000)
    })

    expect(onCheckpoint).not.toHaveBeenCalled()
  })

  it('does not start a scheduler when the vault cannot checkpoint yet', () => {
    const intervalSpy = vi.spyOn(window, 'setInterval')
    const timeoutSpy = vi.spyOn(window, 'setTimeout')
    const onCheckpoint = vi.fn().mockResolvedValue(true)
    const baseOptions = {
      enabled: true,
      idleThresholdSeconds: 1,
      inactiveThresholdSeconds: 1,
      onCheckpoint,
    }

    const localVault = renderHook(() => useAutoGit({
      ...baseOptions,
      isGitVault: false,
      hasPendingChanges: true,
      hasUnsavedChanges: false,
    }))
    localVault.unmount()

    const cleanVault = renderHook(() => useAutoGit({
      ...baseOptions,
      isGitVault: true,
      hasPendingChanges: false,
      hasUnsavedChanges: false,
    }))
    cleanVault.unmount()

    const unsavedVault = renderHook(() => useAutoGit({
      ...baseOptions,
      isGitVault: true,
      hasPendingChanges: true,
      hasUnsavedChanges: true,
    }))
    unsavedVault.unmount()

    expect(intervalSpy).not.toHaveBeenCalled()
    expect(timeoutSpy).not.toHaveBeenCalled()
  })

  it('schedules one-shot work instead of a polling interval when saved pending Git work becomes eligible', () => {
    const intervalSpy = vi.spyOn(window, 'setInterval')
    const timeoutSpy = vi.spyOn(window, 'setTimeout')
    const onCheckpoint = vi.fn().mockResolvedValue(true)
    const { rerender } = renderHook(({ hasPendingChanges, hasUnsavedChanges }) => useAutoGit({
      enabled: true,
      idleThresholdSeconds: 1,
      inactiveThresholdSeconds: 1,
      isGitVault: true,
      hasPendingChanges,
      hasUnsavedChanges,
      onCheckpoint,
    }), {
      initialProps: {
        hasPendingChanges: true,
        hasUnsavedChanges: true,
      },
    })

    expect(intervalSpy).not.toHaveBeenCalled()

    rerender({
      hasPendingChanges: true,
      hasUnsavedChanges: false,
    })

    expect(intervalSpy).not.toHaveBeenCalled()
    expect(timeoutSpy).toHaveBeenCalled()
  })

  it('does not checkpoint or schedule while the app is hidden', async () => {
    visibilityState = 'hidden'
    hasFocus = false
    const timeoutSpy = vi.spyOn(window, 'setTimeout')
    const onCheckpoint = vi.fn().mockResolvedValue(true)
    renderHook(() => useAutoGit({
      enabled: true,
      idleThresholdSeconds: 1,
      inactiveThresholdSeconds: 1,
      isGitVault: true,
      hasPendingChanges: true,
      hasUnsavedChanges: false,
      onCheckpoint,
    }))

    expect(timeoutSpy).not.toHaveBeenCalled()

    await act(async () => {
      await vi.advanceTimersByTimeAsync(10_000)
    })
    expect(onCheckpoint).not.toHaveBeenCalled()

    visibilityState = 'visible'
    hasFocus = true
    await act(async () => {
      document.dispatchEvent(new Event('visibilitychange'))
      await vi.advanceTimersByTimeAsync(0)
    })

    expect(onCheckpoint).toHaveBeenCalledWith('idle')
  })

  it('only triggers once per activity burst until activity is recorded again', async () => {
    const onCheckpoint = vi.fn().mockResolvedValue(true)
    const { result } = renderHook(() => useAutoGit({
      enabled: true,
      idleThresholdSeconds: 1,
      inactiveThresholdSeconds: 1,
      isGitVault: true,
      hasPendingChanges: true,
      hasUnsavedChanges: false,
      onCheckpoint,
    }))

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1_000)
    })
    expect(onCheckpoint).toHaveBeenCalledTimes(1)

    await act(async () => {
      await vi.advanceTimersByTimeAsync(3_000)
    })
    expect(onCheckpoint).toHaveBeenCalledTimes(1)

    act(() => {
      result.current.recordActivity()
    })

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1_000)
    })
    expect(onCheckpoint).toHaveBeenCalledTimes(2)
  })
})
