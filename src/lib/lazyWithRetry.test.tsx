import { Component, Suspense, type ReactNode } from 'react'
import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { lazyWithRetry } from './lazyWithRetry'

function Demo() {
  return <p>lazy surface loaded</p>
}

class CaptureBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null }
  static getDerivedStateFromError(error: Error) {
    return { error }
  }
  render() {
    return this.state.error ? <p>boundary: {this.state.error.message}</p> : this.props.children
  }
}

describe('lazyWithRetry', () => {
  it('renders the surface on first success', async () => {
    const Lazy = lazyWithRetry(async () => ({ default: Demo }))
    render(
      <Suspense fallback={<p>loading</p>}>
        <Lazy />
      </Suspense>,
    )
    expect(await screen.findByText('lazy surface loaded')).toBeInTheDocument()
  })

  it('retries once after a transient module failure', async () => {
    const factory = vi
      .fn()
      .mockRejectedValueOnce(new TypeError('Importing a module script failed.'))
      .mockResolvedValueOnce({ default: Demo })
    const Lazy = lazyWithRetry(factory as unknown as () => Promise<{ default: () => null }>)
    render(
      <Suspense fallback={<p>loading</p>}>
        <Lazy />
      </Suspense>,
    )
    expect(await screen.findByText('lazy surface loaded', {}, { timeout: 3000 })).toBeInTheDocument()
    expect(factory).toHaveBeenCalledTimes(2)
  })

  it('surfaces the original error when the retry also fails', async () => {
    const first = new TypeError('Importing a module script failed.')
    const factory = vi.fn().mockRejectedValue(first)
    const Lazy = lazyWithRetry(factory as unknown as () => Promise<{ default: () => null }>)
    vi.spyOn(console, 'error').mockImplementation(() => {})
    render(
      <CaptureBoundary>
        <Suspense fallback={<p>loading</p>}>
          <Lazy />
        </Suspense>
      </CaptureBoundary>,
    )
    expect(
      await screen.findByText(/boundary: Importing a module script failed/, {}, { timeout: 5000 }),
    ).toBeInTheDocument()
    expect(factory).toHaveBeenCalledTimes(2)
  })
})
