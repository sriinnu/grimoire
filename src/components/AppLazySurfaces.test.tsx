import { act, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { LazyStatusBar } from './AppLazySurfaces'

vi.mock('./StatusBar', () => ({
  StatusBar: () => <footer data-testid="loaded-status-bar">Loaded status bar</footer>,
}))

let visibilityState: DocumentVisibilityState = 'visible'
let visibilitySpy: ReturnType<typeof vi.spyOn> | null = null

describe('AppLazySurfaces', () => {
  beforeEach(() => {
    visibilityState = 'visible'
    visibilitySpy = vi.spyOn(document, 'visibilityState', 'get').mockImplementation(() => visibilityState)
  })

  afterEach(() => {
    visibilitySpy?.mockRestore()
    visibilitySpy = null
  })

  it('keeps the status bar chunk behind visibility when the app opens hidden', async () => {
    visibilityState = 'hidden'

    render(<LazyStatusBar isGitVault={false} remoteStatus={null} />)

    expect(screen.getByLabelText('Grimoire status loading')).toBeInTheDocument()
    expect(screen.getByTestId('status-local-only')).toHaveTextContent('Local only')
    expect(screen.queryByTestId('loaded-status-bar')).not.toBeInTheDocument()

    visibilityState = 'visible'
    act(() => { document.dispatchEvent(new Event('visibilitychange')) })

    await waitFor(() => {
      expect(screen.getByTestId('loaded-status-bar')).toBeInTheDocument()
    })
  })
})
