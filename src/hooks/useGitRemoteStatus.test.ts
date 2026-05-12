import { renderHook, waitFor, act } from '@testing-library/react'
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { useGitRemoteStatus } from './useGitRemoteStatus'

const mockInvokeFn = vi.fn()

vi.mock('@tauri-apps/api/core', () => ({
  invoke: (command: string, args: Record<string, unknown>) => mockInvokeFn(command, args),
}))

vi.mock('../mock-tauri', () => ({
  isTauri: () => false,
  mockInvoke: (command: string, args: Record<string, unknown>) => mockInvokeFn(command, args),
}))

describe('useGitRemoteStatus', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('loads remote status on mount', async () => {
    mockInvokeFn.mockResolvedValue({ branch: 'main', ahead: 0, behind: 0, hasRemote: false })

    const { result } = renderHook(() => useGitRemoteStatus('/vault'))

    await waitFor(() => {
      expect(result.current.remoteStatus).toEqual({ branch: 'main', ahead: 0, behind: 0, hasRemote: false })
    })
    expect(mockInvokeFn).toHaveBeenCalledWith('git_remote_status', { vaultPath: '/vault' })
  })

  it('refreshRemoteStatus updates the current remote state', async () => {
    mockInvokeFn
      .mockResolvedValueOnce({ branch: 'main', ahead: 0, behind: 0, hasRemote: true })
      .mockResolvedValueOnce({ branch: 'main', ahead: 1, behind: 0, hasRemote: false })

    const { result } = renderHook(() => useGitRemoteStatus('/vault'))

    await waitFor(() => {
      expect(result.current.remoteStatus?.hasRemote).toBe(true)
    })

    await act(async () => {
      await result.current.refreshRemoteStatus()
    })

    expect(result.current.remoteStatus).toEqual({ branch: 'main', ahead: 1, behind: 0, hasRemote: false })
  })

  it('does not poll git remote status when disabled', async () => {
    const { result } = renderHook(() => useGitRemoteStatus('/vault', { enabled: false }))

    await act(async () => {
      const status = await result.current.refreshRemoteStatus()
      expect(status).toBeNull()
    })

    expect(result.current.remoteStatus).toBeNull()
    expect(mockInvokeFn).not.toHaveBeenCalled()
  })

  it('does not apply a stale manual refresh after git is disabled', async () => {
    let resolveRefresh: ((value: { branch: string; ahead: number; behind: number; hasRemote: boolean }) => void) | null = null
    mockInvokeFn
      .mockResolvedValueOnce({ branch: 'main', ahead: 0, behind: 0, hasRemote: false })
      .mockImplementationOnce(() => new Promise((resolve) => {
        resolveRefresh = resolve
      }))

    const { result, rerender } = renderHook(
      ({ enabled }) => useGitRemoteStatus('/vault', { enabled }),
      { initialProps: { enabled: true } },
    )

    await waitFor(() => {
      expect(result.current.remoteStatus?.hasRemote).toBe(false)
    })

    let refreshPromise: Promise<unknown> | null = null
    await act(async () => {
      refreshPromise = result.current.refreshRemoteStatus()
      rerender({ enabled: false })
    })
    await act(async () => {
      resolveRefresh?.({ branch: 'main', ahead: 3, behind: 0, hasRemote: true })
      await refreshPromise
    })

    expect(result.current.remoteStatus).toBeNull()
  })
})
