import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { act, renderHook } from '@testing-library/react'
import { AI_AGENTS_STATUS_SCAN_FAILED_DETAIL } from '../lib/aiAgents'
import {
  AI_AGENTS_STATUS_FOCUS_DEBOUNCE_MS,
  AI_AGENTS_STATUS_IDLE_DELAY_MS,
  AI_AGENTS_STATUS_REFRESH_EVENT,
  useAiAgentsStatus,
} from './useAiAgentsStatus'

vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn(),
}))

vi.mock('../mock-tauri', () => ({
  isTauri: () => false,
  mockInvoke: vi.fn(),
}))

const { mockInvoke } = await import('../mock-tauri') as { mockInvoke: ReturnType<typeof vi.fn> }

let visibilityState: DocumentVisibilityState = 'visible'

describe('useAiAgentsStatus', () => {
  beforeEach(() => {
    visibilityState = 'visible'
    vi.useFakeTimers()
    vi.clearAllMocks()
    vi.spyOn(document, 'visibilityState', 'get').mockImplementation(() => visibilityState)
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.useRealTimers()
  })

  async function advanceStatusProbe(ms = AI_AGENTS_STATUS_IDLE_DELAY_MS) {
    await act(async () => {
      vi.advanceTimersByTime(ms)
      await Promise.resolve()
      await Promise.resolve()
    })
  }

  it('starts in checking state, defers the first probe, and resolves both agent statuses', async () => {
    mockInvoke.mockImplementation((command: string) => {
      if (command === 'get_ai_agents_status') {
        return Promise.resolve({
          claude_code: { installed: true, version: '1.0.20' },
          codex: { installed: false, version: null },
          chitragupta: {
            installed: true,
            version: '0.1.16',
            detail: 'Chitragupta CLI chat route found. MCP memory is checked separately.',
          },
        })
      }
      return Promise.resolve(null)
    })

    const { result } = renderHook(() => useAiAgentsStatus())

    expect(result.current.claude_code.status).toBe('checking')
    expect(result.current.codex.status).toBe('checking')
    expect(result.current.chitragupta.status).toBe('checking')
    expect(mockInvoke).not.toHaveBeenCalled()

    await advanceStatusProbe()

    expect(result.current.claude_code).toEqual({ status: 'installed', version: '1.0.20' })
    expect(result.current.codex).toEqual({ status: 'missing', version: null })
    expect(result.current.chitragupta).toEqual({
      status: 'installed',
      version: '0.1.16',
      detail: 'Chitragupta CLI chat route found. MCP memory is checked separately.',
    })
  })

  it('does not run CLI status probes while the app is hidden', async () => {
    visibilityState = 'hidden'
    mockInvoke.mockResolvedValue({
      claude_code: { installed: true, version: '1.0.20' },
      codex: { installed: true, version: '0.37.0' },
      chitragupta: { installed: true, version: '0.1.16' },
    })

    const { result } = renderHook(() => useAiAgentsStatus())
    await advanceStatusProbe()

    expect(mockInvoke).not.toHaveBeenCalled()
    expect(result.current.chitragupta.status).toBe('checking')

    visibilityState = 'visible'
    act(() => { document.dispatchEvent(new Event('visibilitychange')) })
    await advanceStatusProbe(AI_AGENTS_STATUS_FOCUS_DEBOUNCE_MS)

    expect(mockInvoke).toHaveBeenCalledOnce()
    expect(result.current.chitragupta).toEqual({ status: 'installed', version: '0.1.16' })
  })

  it('marks scan failure separately from missing installs when the status call fails', async () => {
    mockInvoke.mockRejectedValue(new Error('failed'))

    const { result } = renderHook(() => useAiAgentsStatus())
    await advanceStatusProbe()

    expect(result.current.claude_code).toEqual({
      status: 'missing',
      version: null,
      detail: AI_AGENTS_STATUS_SCAN_FAILED_DETAIL,
    })
    expect(result.current.codex.detail).toBe(AI_AGENTS_STATUS_SCAN_FAILED_DETAIL)
    expect(result.current.chitragupta.detail).toBe(AI_AGENTS_STATUS_SCAN_FAILED_DETAIL)
  })

  it('refreshes stale CLI status when the app is focused again', async () => {
    mockInvoke
      .mockResolvedValueOnce({
        claude_code: { installed: false, version: null },
        codex: { installed: false, version: null },
        chitragupta: { installed: false, version: null },
      })
      .mockResolvedValueOnce({
        claude_code: { installed: true, version: '1.0.20' },
        codex: { installed: true, version: '0.37.0' },
        chitragupta: { installed: true, version: '0.1.16' },
      })

    const { result } = renderHook(() => useAiAgentsStatus())
    await advanceStatusProbe()

    expect(result.current.claude_code.status).toBe('missing')

    await act(async () => {
      window.dispatchEvent(new Event(AI_AGENTS_STATUS_REFRESH_EVENT))
      await Promise.resolve()
      await Promise.resolve()
    })

    expect(result.current.claude_code).toEqual({ status: 'installed', version: '1.0.20' })
    expect(result.current.codex.status).toBe('installed')
    expect(result.current.chitragupta.status).toBe('installed')
    expect(mockInvoke).toHaveBeenCalledTimes(2)
  })

  it('uses a short cache for focus refreshes instead of spawning status probes repeatedly', async () => {
    mockInvoke.mockResolvedValue({
      claude_code: { installed: true, version: '1.0.20' },
      codex: { installed: true, version: '0.37.0' },
      chitragupta: { installed: true, version: '0.1.16' },
    })

    const { result } = renderHook(() => useAiAgentsStatus())
    await advanceStatusProbe()

    expect(result.current.chitragupta.status).toBe('installed')

    act(() => {
      window.dispatchEvent(new Event('focus'))
    })
    await advanceStatusProbe(AI_AGENTS_STATUS_FOCUS_DEBOUNCE_MS)

    expect(result.current.chitragupta).toEqual({ status: 'installed', version: '0.1.16' })
    expect(mockInvoke).toHaveBeenCalledTimes(1)
  })
})
