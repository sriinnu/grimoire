import { renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useChitraguptaNoteSessions } from './useChitraguptaNoteSessions'

const { mockInvoke } = vi.hoisted(() => ({ mockInvoke: vi.fn() }))

vi.mock('../mock-tauri', () => ({
  isTauri: () => false,
  mockInvoke,
}))

const HEALTHY_STATUS = {
  healthy: true,
  version: '0.1.10',
  token_present: true,
  token_source: 'keychain',
  base_url: 'http://127.0.0.1:3141',
}

const OFFLINE_STATUS = {
  healthy: false,
  version: null,
  token_present: false,
  token_source: 'missing',
  base_url: 'http://127.0.0.1:3141',
}

const SESSION = {
  id: 'ses_1',
  title: 'Alpha planning',
  updated_at: 1752570000,
  created_at: 1752500000,
  message_count: 4,
  gist: 'Rollout details',
}

function sessionListCalls(): number {
  return mockInvoke.mock.calls.filter(([cmd]) => cmd === 'list_chitragupta_note_sessions').length
}

describe('useChitraguptaNoteSessions', () => {
  beforeEach(() => {
    mockInvoke.mockReset()
  })

  it('fetches sessions only after a healthy status with a token', async () => {
    mockInvoke.mockImplementation(async (cmd: string) => {
      if (cmd === 'get_chitragupta_socket_status') return HEALTHY_STATUS
      if (cmd === 'list_chitragupta_note_sessions') return [SESSION]
      throw new Error(`unexpected command ${cmd}`)
    })

    const { result } = renderHook(() =>
      useChitraguptaNoteSessions('/vault/notes/alpha.md', '/vault', true))

    await waitFor(() => expect(result.current.sessions).toEqual([SESSION]))
    expect(result.current.status).toEqual(HEALTHY_STATUS)
    const listCall = mockInvoke.mock.calls.find(([cmd]) => cmd === 'list_chitragupta_note_sessions')
    expect(listCall?.[1]).toEqual({ vaultPath: '/vault', notePath: 'notes/alpha.md' })
  })

  it('never requests sessions when the daemon is unreachable or has no token', async () => {
    mockInvoke.mockImplementation(async (cmd: string) => {
      if (cmd === 'get_chitragupta_socket_status') return OFFLINE_STATUS
      throw new Error(`unexpected command ${cmd}`)
    })

    const { result } = renderHook(() =>
      useChitraguptaNoteSessions('/vault/notes/alpha.md', '/vault', true))

    await waitFor(() => expect(result.current.status).toEqual(OFFLINE_STATUS))
    expect(result.current.sessions).toEqual([])
    expect(sessionListCalls()).toBe(0)
  })

  it('does nothing when disabled or without a note', async () => {
    renderHook(() => useChitraguptaNoteSessions('/vault/notes/alpha.md', '/vault', false))
    renderHook(() => useChitraguptaNoteSessions(null, '/vault', true))

    await new Promise((resolve) => setTimeout(resolve, 400))
    expect(mockInvoke).not.toHaveBeenCalled()
  })

  it('drops stale results when the note changes mid-flight', async () => {
    let releaseFirstList: (() => void) | null = null
    mockInvoke.mockImplementation(async (cmd: string, args?: Record<string, unknown>) => {
      if (cmd === 'get_chitragupta_socket_status') return HEALTHY_STATUS
      if (cmd === 'list_chitragupta_note_sessions') {
        if (args?.notePath === 'notes/alpha.md') {
          await new Promise<void>((resolve) => { releaseFirstList = resolve })
          return [SESSION]
        }
        return [{ ...SESSION, id: 'ses_beta', title: 'Beta session' }]
      }
      throw new Error(`unexpected command ${cmd}`)
    })

    const { result, rerender } = renderHook(
      ({ notePath }: { notePath: string }) => useChitraguptaNoteSessions(notePath, '/vault', true),
      { initialProps: { notePath: '/vault/notes/alpha.md' } },
    )

    // Wait until the slow alpha fetch is actually in flight, then switch notes.
    await waitFor(() => expect(releaseFirstList).not.toBeNull())
    rerender({ notePath: '/vault/notes/beta.md' })

    await waitFor(() => expect(result.current.sessions.map((s) => s.id)).toEqual(['ses_beta']))
    releaseFirstList!()
    await new Promise((resolve) => setTimeout(resolve, 50))
    expect(result.current.sessions.map((s) => s.id)).toEqual(['ses_beta'])
  })
})
