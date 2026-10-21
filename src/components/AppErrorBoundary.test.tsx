import { render, screen, fireEvent } from '@testing-library/react'
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { AppErrorBoundary } from './AppErrorBoundary'

function Boom(): never {
  throw new Error('render exploded')
}

describe('AppErrorBoundary', () => {
  beforeEach(() => {
    window.localStorage.clear()
    vi.restoreAllMocks()
  })

  it('renders children when nothing throws', () => {
    render(
      <AppErrorBoundary>
        <p>calm page</p>
      </AppErrorBoundary>,
    )
    expect(screen.getByText('calm page')).toBeInTheDocument()
  })

  it('shows the recovery surface with the error message when a child throws', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    render(
      <AppErrorBoundary>
        <Boom />
      </AppErrorBoundary>,
    )
    expect(screen.getByRole('alert')).toBeInTheDocument()
    expect(screen.getByText('Something interrupted the ink.')).toBeInTheDocument()
    expect(screen.getByText(/render exploded/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Reload app' })).toBeInTheDocument()
  })

  it('persists crash details to localStorage for later inspection', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    render(
      <AppErrorBoundary>
        <Boom />
      </AppErrorBoundary>,
    )
    const raw = window.localStorage.getItem('grimoire:last-crash')
    expect(raw).toBeTruthy()
    const payload = JSON.parse(raw as string)
    expect(payload.message).toBe('render exploded')
    expect(payload.stack).toContain('Boom')
  })

  it('reloads the app from the recovery surface', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    const reload = vi.fn()
    Object.defineProperty(window, 'location', {
      writable: true,
      value: { ...window.location, reload },
    })
    render(
      <AppErrorBoundary>
        <Boom />
      </AppErrorBoundary>,
    )
    fireEvent.click(screen.getByRole('button', { name: 'Reload app' }))
    expect(reload).toHaveBeenCalledOnce()
  })
})
