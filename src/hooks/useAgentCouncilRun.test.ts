import { describe, it, expect, vi } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { useAgentCouncilRun } from './useAgentCouncilRun'
import type { streamAiAgent, StreamAiAgentRequest } from '../utils/streamAiAgent'

type StreamFn = typeof streamAiAgent

/** Build a mock stream that emits scripted text (or an error) per agent. */
function scriptedStream(script: Record<string, { chunks?: string[]; error?: string }>): StreamFn {
  return vi.fn(async (req: StreamAiAgentRequest) => {
    const plan = script[req.agent] ?? { chunks: [''] }
    if (plan.error) {
      req.callbacks.onError(plan.error)
      req.callbacks.onDone()
      return
    }
    for (const chunk of plan.chunks ?? []) req.callbacks.onText(chunk)
    req.callbacks.onDone()
  })
}

const INPUT = { prompt: 'How do I rate-limit input?', vaultPath: '/vault' }

describe('useAgentCouncilRun', () => {
  it('runs agents in parallel and synthesizes their answers', async () => {
    const stream = scriptedStream({
      claude_code: { chunks: ['Use a ', 'debounce.'] },
      codex: { chunks: ['Throttle it.'] },
    })
    const { result } = renderHook(() => useAgentCouncilRun(stream))

    await act(async () => {
      await result.current.run({ ...INPUT, agentIds: ['claude_code', 'codex'] })
    })

    expect(result.current.phase).toBe('done')
    expect(result.current.agents.claude_code).toMatchObject({ status: 'completed', text: 'Use a debounce.' })
    expect(result.current.agents.codex).toMatchObject({ status: 'completed', text: 'Throttle it.' })
    expect(result.current.synthesis).toContain('## Claude Code')
    expect(result.current.synthesis).toContain('## Codex')
    expect(stream).toHaveBeenCalledTimes(2)
  })

  it('isolates a failing agent without blocking the others', async () => {
    const stream = scriptedStream({
      claude_code: { chunks: ['Answer.'] },
      codex: { error: 'codex not installed' },
    })
    const { result } = renderHook(() => useAgentCouncilRun(stream))

    await act(async () => {
      await result.current.run({ ...INPUT, agentIds: ['claude_code', 'codex'] })
    })

    expect(result.current.agents.claude_code).toMatchObject({ status: 'completed' })
    expect(result.current.agents.codex).toMatchObject({ status: 'failed', error: 'codex not installed' })
    expect(result.current.synthesis).toContain('Codex: failed — codex not installed')
  })

  it('de-duplicates agent ids', async () => {
    const stream = scriptedStream({ claude_code: { chunks: ['ok'] } })
    const { result } = renderHook(() => useAgentCouncilRun(stream))

    await act(async () => {
      await result.current.run({ ...INPUT, agentIds: ['claude_code', 'claude_code'] })
    })
    expect(stream).toHaveBeenCalledTimes(1)
  })

  it('exposes live per-agent text while streaming, before completion', async () => {
    // A controllable stream: emits text immediately, finishes only when released.
    let release: () => void = () => {}
    const stream: StreamFn = vi.fn((req: StreamAiAgentRequest) => {
      req.callbacks.onText('partial answer')
      return new Promise<void>((resolve) => {
        release = () => {
          req.callbacks.onDone()
          resolve()
        }
      })
    })
    const { result } = renderHook(() => useAgentCouncilRun(stream))

    let runPromise: Promise<void>
    act(() => {
      runPromise = result.current.run({ ...INPUT, agentIds: ['claude_code'] })
    })

    await waitFor(() => expect(result.current.agents.claude_code?.text).toBe('partial answer'))
    expect(result.current.phase).toBe('running')
    expect(result.current.agents.claude_code?.status).toBe('running')

    await act(async () => {
      release()
      await runPromise
    })
    expect(result.current.phase).toBe('done')
    expect(result.current.agents.claude_code).toMatchObject({ status: 'completed', text: 'partial answer' })
  })
})
