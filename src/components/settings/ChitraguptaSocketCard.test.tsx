import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createTranslator } from '../../lib/i18n'
import { ChitraguptaSocketCard } from './ChitraguptaSocketCard'

const { mockInvoke } = vi.hoisted(() => ({ mockInvoke: vi.fn() }))

vi.mock('../../mock-tauri', () => ({
  isTauri: () => false,
  mockInvoke,
}))

const OFFLINE_STATUS = {
  healthy: false,
  version: null,
  token_present: false,
  token_source: 'missing',
  base_url: 'http://127.0.0.1:3141',
}

const PAIRED_STATUS = {
  healthy: true,
  version: '0.1.16',
  token_present: true,
  token_source: 'keychain',
  base_url: 'http://127.0.0.1:3141',
}

const originalPlatform = navigator.platform
const originalUserAgent = navigator.userAgent

function setPlatform(platform: string, userAgent: string) {
  Object.defineProperty(window.navigator, 'platform', { configurable: true, value: platform })
  Object.defineProperty(window.navigator, 'userAgent', { configurable: true, value: userAgent })
}

function provisionCalls(): number {
  return mockInvoke.mock.calls.filter(([cmd]) => cmd === 'provision_chitragupta_socket_token').length
}

function renderCard() {
  render(<ChitraguptaSocketCard t={createTranslator('en')} />)
}

describe('ChitraguptaSocketCard', () => {
  beforeEach(() => {
    mockInvoke.mockReset()
    setPlatform('MacIntel', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 15_7_8)')
  })

  afterEach(() => {
    setPlatform(originalPlatform, originalUserAgent)
  })

  it('connects automatically and flips the status pill when the daemon accepts the key', async () => {
    let socketStatus: unknown = OFFLINE_STATUS
    mockInvoke.mockImplementation(async (cmd: string) => {
      if (cmd === 'get_chitragupta_socket_status') return socketStatus
      if (cmd === 'provision_chitragupta_socket_token') {
        socketStatus = PAIRED_STATUS
        return { provisioned: true, connected: true, needs_daemon_refresh: false }
      }
      throw new Error(`unexpected command ${cmd}`)
    })

    renderCard()
    await waitFor(() =>
      expect(screen.getByTestId('settings-chitragupta-socket-status')).toHaveTextContent('Daemon unreachable'))

    fireEvent.click(screen.getByTestId('settings-chitragupta-socket-connect'))

    await waitFor(() =>
      expect(screen.getByTestId('settings-chitragupta-socket-status')).toHaveTextContent('Connected · v0.1.16'))
    expect(provisionCalls()).toBe(1)
    expect(screen.queryByTestId('settings-chitragupta-socket-waiting')).not.toBeInTheDocument()
    expect(screen.getByTestId('settings-chitragupta-socket-token-source')).toHaveTextContent('macOS Keychain')
  })

  it('shows the waiting state with a working Check connection retry', async () => {
    let socketStatus: unknown = OFFLINE_STATUS
    mockInvoke.mockImplementation(async (cmd: string) => {
      if (cmd === 'get_chitragupta_socket_status') return socketStatus
      if (cmd === 'provision_chitragupta_socket_token') {
        return { provisioned: true, connected: false, needs_daemon_refresh: true }
      }
      throw new Error(`unexpected command ${cmd}`)
    })

    renderCard()
    fireEvent.click(await screen.findByTestId('settings-chitragupta-socket-connect'))

    const waiting = await screen.findByTestId('settings-chitragupta-socket-waiting')
    expect(waiting).toHaveTextContent('waiting for the Chitragupta daemon to refresh')

    // Daemon refreshes; retry re-invokes the status command and clears waiting.
    socketStatus = PAIRED_STATUS
    fireEvent.click(screen.getByTestId('settings-chitragupta-socket-check'))

    await waitFor(() =>
      expect(screen.getByTestId('settings-chitragupta-socket-status')).toHaveTextContent('Connected · v0.1.16'))
    expect(screen.queryByTestId('settings-chitragupta-socket-waiting')).not.toBeInTheDocument()
    expect(screen.queryByTestId('settings-chitragupta-socket-check')).not.toBeInTheDocument()
  })

  it('surfaces sanitized pairing errors and keeps manual token entry usable', async () => {
    mockInvoke.mockImplementation(async (cmd: string, args?: Record<string, unknown>) => {
      if (cmd === 'get_chitragupta_socket_status') return OFFLINE_STATUS
      if (cmd === 'provision_chitragupta_socket_token') {
        throw new Error('Chitragupta rotated a key, but Grimoire could not read the receipt: [redacted] Paste the token manually in Settings.')
      }
      if (cmd === 'save_chitragupta_socket_token') {
        expect(args).toEqual({ token: 'chg_manual' })
        return { token_present: true, token_source: 'keychain' }
      }
      throw new Error(`unexpected command ${cmd}`)
    })

    renderCard()
    fireEvent.click(await screen.findByTestId('settings-chitragupta-socket-connect'))

    await waitFor(() =>
      expect(screen.getByText(/could not read the receipt/)).toBeInTheDocument())
    expect(screen.getByText(/\[redacted\]/)).toBeInTheDocument()

    // Manual fallback still works.
    fireEvent.change(screen.getByTestId('settings-chitragupta-socket-token-input'), {
      target: { value: 'chg_manual' },
    })
    fireEvent.click(screen.getByTestId('settings-chitragupta-socket-token-save'))
    await waitFor(() =>
      expect(mockInvoke.mock.calls.some(([cmd]) => cmd === 'save_chitragupta_socket_token')).toBe(true))
  })
})
