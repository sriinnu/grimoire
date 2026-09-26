import { renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { useStableFunctionProps } from './useStableHandlers'

describe('useStableFunctionProps', () => {
  it('keeps handler identities stable across renders while calling the latest handler', () => {
    const first = vi.fn()
    const second = vi.fn()
    const { result, rerender } = renderHook((props: { count: number; onPick?: () => void }) => useStableFunctionProps(props), {
      initialProps: { count: 1, onPick: first },
    })
    const stableBefore = result.current.onPick

    rerender({ count: 2, onPick: second })

    expect(result.current.onPick).toBe(stableBefore)
    expect(result.current.count).toBe(2)
    result.current.onPick?.()
    expect(second).toHaveBeenCalledTimes(1)
    expect(first).not.toHaveBeenCalled()
  })

  it('drops a handler that becomes undefined so conditional UI still reacts', () => {
    const { result, rerender } = renderHook((props: { onBulk?: () => void }) => useStableFunctionProps(props), {
      initialProps: { onBulk: vi.fn() as (() => void) | undefined },
    })
    expect(typeof result.current.onBulk).toBe('function')

    rerender({ onBulk: undefined })
    expect(result.current.onBulk).toBeUndefined()
  })
})
