import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useChitraguptaPairing } from './useChitraguptaPairing'

const { mockInvoke } = vi.hoisted(() => ({ mockInvoke: vi.fn() }))
vi.mock('../mock-tauri', () => ({ isTauri: () => false, mockInvoke }))
const status = (state = 'pairing_required', projectPath = '/vault') => ({ contractVersion: 1, state, projectPath })

describe('useChitraguptaPairing', () => {
  beforeEach(() => { mockInvoke.mockReset() })

  it('keeps pairing separate from workspace approval and checks without re-pairing', async () => {
    let current = status()
    mockInvoke.mockImplementation(async (command: string) => command === 'provision_chitragupta_socket_token' ? status('approval_required') : current)
    const { result } = renderHook(() => useChitraguptaPairing('/vault'))
    await waitFor(() => expect(result.current.status?.state).toBe('pairing_required'))
    await act(async () => { await result.current.connect('123456') })
    expect(result.current.phase).toBe('waiting')
    expect(mockInvoke).toHaveBeenCalledWith('provision_chitragupta_socket_token', { vaultPath: '/vault', pairingCode: '123456' })
    current = status('ready')
    await act(async () => { await result.current.checkConnection() })
    expect(result.current.phase).toBe('connected')
    expect(mockInvoke.mock.calls.filter(([command]) => command === 'provision_chitragupta_socket_token')).toHaveLength(1)
    expect(mockInvoke).toHaveBeenLastCalledWith('get_chitragupta_socket_status', { vaultPath: '/vault' })
  })

  it.each(['denied', 'revoked', 'expired'])('never treats %s as ready or re-pairs on a status refresh', async (state) => {
    mockInvoke.mockResolvedValue(status(state))
    const { result } = renderHook(() => useChitraguptaPairing('/vault'))
    await waitFor(() => expect(result.current.status?.state).toBe(state))
    expect(result.current.phase).not.toBe('connected')
    expect(mockInvoke).toHaveBeenCalledTimes(1)
  })

  it('rejects legacy health/token evidence and statuses for another vault', async () => {
    mockInvoke.mockResolvedValue({ healthy: true, token_present: true })
    const { result } = renderHook(() => useChitraguptaPairing('/vault'))
    await waitFor(() => expect(result.current.phase).toBe('error'))
    mockInvoke.mockResolvedValue(status('ready', '/other-vault'))
    await act(async () => { await result.current.checkConnection() })
    expect(result.current.status).toBeNull()
    expect(result.current.phase).toBe('error')
  })

  it('drops an in-flight pairing receipt when the selected vault changes', async () => {
    let release: ((value: unknown) => void) | undefined
    mockInvoke.mockImplementation((command: string, args: { vaultPath: string }) => command === 'provision_chitragupta_socket_token'
      ? new Promise((resolve) => { release = resolve }) : Promise.resolve(status('pairing_required', args.vaultPath)))
    const { result, rerender } = renderHook(({ vaultPath }) => useChitraguptaPairing(vaultPath), { initialProps: { vaultPath: '/vault' } })
    await waitFor(() => expect(result.current.status?.projectPath).toBe('/vault'))
    let pairing: Promise<unknown>
    act(() => { pairing = result.current.connect('123456') })
    rerender({ vaultPath: '/other-vault' })
    await waitFor(() => expect(result.current.status?.projectPath).toBe('/other-vault'))
    await act(async () => { release?.(status('ready')); await pairing })
    expect(result.current.status).toEqual(status('pairing_required', '/other-vault'))
    expect(result.current.phase).toBe('idle')
  })

  it('does not contact the connector without a selected vault', async () => {
    const { result } = renderHook(() => useChitraguptaPairing())
    await act(async () => { await result.current.connect() })
    expect(mockInvoke).not.toHaveBeenCalled()
  })
})
