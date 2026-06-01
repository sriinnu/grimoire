import { act, renderHook, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useVaultAiGuidanceStatus } from './useVaultAiGuidanceStatus'

vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn(),
}))

vi.mock('../mock-tauri', () => ({
  isTauri: () => false,
  mockInvoke: vi.fn(),
}))

const { mockInvoke } = await import('../mock-tauri') as { mockInvoke: ReturnType<typeof vi.fn> }

let visibilityState: DocumentVisibilityState = 'visible'
let visibilitySpy: ReturnType<typeof vi.spyOn> | null = null

describe('useVaultAiGuidanceStatus', () => {
  beforeEach(() => {
    visibilityState = 'visible'
    vi.clearAllMocks()
    visibilitySpy = vi.spyOn(document, 'visibilityState', 'get').mockImplementation(() => visibilityState)
  })

  afterEach(() => {
    visibilitySpy?.mockRestore()
    visibilitySpy = null
  })

  it('starts in checking state and resolves guidance status', async () => {
    mockInvoke.mockResolvedValue({
      agents_state: 'managed',
      claude_state: 'broken',
      can_restore: true,
    })

    const { result } = renderHook(() => useVaultAiGuidanceStatus('/vault'))

    expect(result.current.status.agentsState).toBe('checking')
    expect(result.current.status.claudeState).toBe('checking')

    await waitFor(() => {
      expect(result.current.status).toEqual({
        agentsState: 'managed',
        claudeState: 'broken',
        canRestore: true,
      })
    })
  })

  it('waits for a visible window before reading vault guidance files', async () => {
    visibilityState = 'hidden'
    mockInvoke.mockResolvedValue({
      agents_state: 'managed',
      claude_state: 'managed',
      can_restore: false,
    })

    const { result } = renderHook(() => useVaultAiGuidanceStatus('/vault'))

    expect(result.current.status.agentsState).toBe('checking')
    expect(mockInvoke).not.toHaveBeenCalled()

    visibilityState = 'visible'
    act(() => { document.dispatchEvent(new Event('visibilitychange')) })

    await waitFor(() => {
      expect(result.current.status).toEqual({
        agentsState: 'managed',
        claudeState: 'managed',
        canRestore: false,
      })
    })
    expect(mockInvoke).toHaveBeenCalledWith('get_vault_ai_guidance_status', { vaultPath: '/vault' })
  })

  it('refreshes on demand', async () => {
    mockInvoke
      .mockResolvedValueOnce({
        agents_state: 'managed',
        claude_state: 'managed',
        can_restore: false,
      })
      .mockResolvedValueOnce({
        agents_state: 'managed',
        claude_state: 'broken',
        can_restore: true,
      })

    const { result } = renderHook(() => useVaultAiGuidanceStatus('/vault'))

    await waitFor(() => {
      expect(result.current.status.canRestore).toBe(false)
    })

    await act(async () => {
      await result.current.refresh()
    })

    expect(result.current.status).toEqual({
      agentsState: 'managed',
      claudeState: 'broken',
      canRestore: true,
    })
  })
})
