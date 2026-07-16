import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useChitraguptaPairing } from './useChitraguptaPairing'

const { mockInvoke } = vi.hoisted(() => ({ mockInvoke: vi.fn() }))

vi.mock('../mock-tauri', () => ({
  isTauri: () => false,
  mockInvoke,
}))

const HEALTHY_PAIRED_STATUS = {
  healthy: true,
  version: '0.1.16',
  token_present: true,
  token_source: 'keychain',
  base_url: 'http://127.0.0.1:3141',
}

const HEALTHY_UNPAIRED_STATUS = {
  ...HEALTHY_PAIRED_STATUS,
  token_present: false,
  token_source: 'missing',
}

const OFFLINE_STATUS = {
  healthy: false,
  version: null,
  token_present: false,
  token_source: 'missing',
  base_url: 'http://127.0.0.1:3141',
}

function statusResponder(status: unknown) {
  return async (cmd: string) => {
    if (cmd === 'get_chitragupta_socket_status') return status
    throw new Error(`unexpected command ${cmd}`)
  }
}

describe('useChitraguptaPairing', () => {
  beforeEach(() => {
    mockInvoke.mockReset()
  })

  it('starts idle and loads the socket status once', async () => {
    mockInvoke.mockImplementation(statusResponder(HEALTHY_UNPAIRED_STATUS))

    const { result } = renderHook(() => useChitraguptaPairing())

    await waitFor(() => expect(result.current.status).toEqual(HEALTHY_UNPAIRED_STATUS))
    expect(result.current.phase).toBe('idle')
    expect(result.current.error).toBeNull()
  })

  it('runs provisioning to connected when the daemon accepts the new key', async () => {
    let socketStatus: unknown = HEALTHY_UNPAIRED_STATUS
    mockInvoke.mockImplementation(async (cmd: string) => {
      if (cmd === 'get_chitragupta_socket_status') return socketStatus
      if (cmd === 'provision_chitragupta_socket_token') {
        socketStatus = HEALTHY_PAIRED_STATUS
        return { provisioned: true, connected: true, needs_daemon_refresh: false }
      }
      throw new Error(`unexpected command ${cmd}`)
    })

    const { result } = renderHook(() => useChitraguptaPairing())
    await waitFor(() => expect(result.current.status).toEqual(HEALTHY_UNPAIRED_STATUS))

    let pending: Promise<void> = Promise.resolve()
    act(() => {
      pending = result.current.connect()
    })
    expect(result.current.phase).toBe('provisioning')
    await act(async () => pending)

    expect(result.current.phase).toBe('connected')
    expect(result.current.error).toBeNull()
    expect(result.current.status).toEqual(HEALTHY_PAIRED_STATUS)
  })

  it('lands on waiting when the key is created but the daemon has not refreshed', async () => {
    mockInvoke.mockImplementation(async (cmd: string) => {
      if (cmd === 'get_chitragupta_socket_status') return { ...HEALTHY_PAIRED_STATUS, healthy: false }
      if (cmd === 'provision_chitragupta_socket_token') {
        return { provisioned: true, connected: false, needs_daemon_refresh: true }
      }
      throw new Error(`unexpected command ${cmd}`)
    })

    const { result } = renderHook(() => useChitraguptaPairing())
    await act(async () => result.current.connect())

    expect(result.current.phase).toBe('waiting')
    expect(result.current.error).toBeNull()
  })

  it('check connection flips waiting to connected once the daemon is back with a token', async () => {
    let socketStatus: unknown = OFFLINE_STATUS
    mockInvoke.mockImplementation(async (cmd: string) => {
      if (cmd === 'get_chitragupta_socket_status') return socketStatus
      if (cmd === 'provision_chitragupta_socket_token') {
        return { provisioned: true, connected: false, needs_daemon_refresh: true }
      }
      throw new Error(`unexpected command ${cmd}`)
    })

    const { result } = renderHook(() => useChitraguptaPairing())
    await act(async () => result.current.connect())
    expect(result.current.phase).toBe('waiting')

    // Daemon still not refreshed: stays waiting.
    await act(async () => result.current.checkConnection())
    expect(result.current.phase).toBe('waiting')

    // Daemon refreshed and sees the stored token: connected.
    socketStatus = HEALTHY_PAIRED_STATUS
    await act(async () => result.current.checkConnection())
    expect(result.current.phase).toBe('connected')
    expect(result.current.status).toEqual(HEALTHY_PAIRED_STATUS)
  })

  it('surfaces a CLI-missing error and keeps the manual fallback path open', async () => {
    mockInvoke.mockImplementation(async (cmd: string) => {
      if (cmd === 'get_chitragupta_socket_status') return OFFLINE_STATUS
      if (cmd === 'provision_chitragupta_socket_token') {
        throw new Error('Chitragupta CLI not found. Install it from https://github.com/sriinnu/chitragupta or use a local repo launcher.')
      }
      throw new Error(`unexpected command ${cmd}`)
    })

    const { result } = renderHook(() => useChitraguptaPairing())
    await act(async () => result.current.connect())

    expect(result.current.phase).toBe('error')
    expect(result.current.error).toContain('Chitragupta CLI not found')

    // A later successful connect clears the error.
    mockInvoke.mockImplementation(async (cmd: string) => {
      if (cmd === 'get_chitragupta_socket_status') return HEALTHY_PAIRED_STATUS
      if (cmd === 'provision_chitragupta_socket_token') {
        return { provisioned: true, connected: true, needs_daemon_refresh: false }
      }
      throw new Error(`unexpected command ${cmd}`)
    })
    await act(async () => result.current.connect())
    expect(result.current.phase).toBe('connected')
    expect(result.current.error).toBeNull()
  })
})
