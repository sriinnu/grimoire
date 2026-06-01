import { renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useVaultPulsePreview } from './useVaultPulsePreview'

const mockInvoke = vi.fn()

vi.mock('../lib/tauriRuntime', () => ({
  invoke: (...args: unknown[]) => mockInvoke(...args),
}))

vi.mock('../mock-tauri', () => ({
  isTauri: () => false,
  mockInvoke: (...args: unknown[]) => mockInvoke(...args),
}))

describe('useVaultPulsePreview', () => {
  beforeEach(() => {
    mockInvoke.mockReset()
  })

  it('does not load when disabled', () => {
    const { result } = renderHook(() => useVaultPulsePreview('/vault', false))

    expect(result.current).toEqual({ commits: [], error: null, loading: false })
    expect(mockInvoke).not.toHaveBeenCalled()
  })

  it('loads a bounded vault pulse preview when enabled', async () => {
    const commits = [{
      hash: 'abc',
      shortHash: 'abc1234',
      message: 'Update notes',
      date: 1,
      githubUrl: null,
      files: [],
      added: 0,
      modified: 1,
      deleted: 0,
    }]
    mockInvoke.mockResolvedValueOnce(commits)

    const { result } = renderHook(() => useVaultPulsePreview('/vault', true, 3))

    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(mockInvoke).toHaveBeenCalledWith('get_vault_pulse', {
      vaultPath: '/vault',
      limit: 3,
      skip: 0,
    })
    expect(result.current.commits).toEqual(commits)
  })

  it('keeps failures local to the preview state', async () => {
    mockInvoke.mockRejectedValueOnce('Not a git repository')

    const { result } = renderHook(() => useVaultPulsePreview('/vault', true))

    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.commits).toEqual([])
    expect(result.current.error).toBe('Not a git repository')
  })
})
