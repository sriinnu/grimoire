import { act, render } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { StatusBar, type VaultOption } from './StatusBar'

const vaults: VaultOption[] = [
  { label: 'veda', path: '/vault' },
]

let visibilityState: DocumentVisibilityState = 'visible'

function renderStatusBar() {
  return render(
    <StatusBar
      noteCount={12}
      vaultPath="/vault"
      vaults={vaults}
      onSwitchVault={vi.fn()}
    />,
  )
}

describe('StatusBar ticker', () => {
  beforeEach(() => {
    visibilityState = 'visible'
    vi.useFakeTimers()
    vi.spyOn(document, 'visibilityState', 'get').mockImplementation(() => visibilityState)
    Object.defineProperty(window, 'innerWidth', {
      configurable: true,
      writable: true,
      value: 1440,
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.useRealTimers()
  })

  it('suspends the relative-time repaint ticker while the app is hidden', () => {
    visibilityState = 'hidden'
    const intervalSpy = vi.spyOn(window, 'setInterval')
    const clearIntervalSpy = vi.spyOn(window, 'clearInterval')

    renderStatusBar()

    expect(intervalSpy).not.toHaveBeenCalled()

    visibilityState = 'visible'
    act(() => { document.dispatchEvent(new Event('visibilitychange')) })
    expect(intervalSpy).toHaveBeenCalledOnce()

    visibilityState = 'hidden'
    act(() => { document.dispatchEvent(new Event('visibilitychange')) })
    expect(clearIntervalSpy).toHaveBeenCalledOnce()
  })
})
