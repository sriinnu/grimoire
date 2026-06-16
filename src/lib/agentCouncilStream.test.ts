import { describe, expect, it } from 'vitest'
import type { AgentStreamCallbacks } from '../utils/ai-agent'
import { buildCouncilRunner, collectAgentStream } from './agentCouncilStream'

describe('collectAgentStream', () => {
  it('accumulates onText deltas and resolves with the full answer on done', async () => {
    const text = await collectAgentStream((cb) => {
      cb.onText('Hello')
      cb.onText(', ')
      cb.onText('world.')
      cb.onDone()
    })
    expect(text).toBe('Hello, world.')
  })

  it('ignores thinking and tool callbacks — only onText contributes', async () => {
    const text = await collectAgentStream((cb) => {
      cb.onThinking('reasoning...')
      cb.onToolStart('bash', 't1', 'ls')
      cb.onText('answer')
      cb.onToolDone('t1', 'done')
      cb.onDone()
    })
    expect(text).toBe('answer')
  })

  it('rejects on onError', async () => {
    await expect(
      collectAgentStream((cb) => {
        cb.onError('claude not installed')
      }),
    ).rejects.toThrow('claude not installed')
  })

  it('lets the error win over a trailing onDone (streams emit Done after Error)', async () => {
    await expect(
      collectAgentStream((cb) => {
        cb.onText('partial')
        cb.onError('boom')
        cb.onDone()
      }),
    ).rejects.toThrow('boom')
  })

  it('rejects when the driver throws synchronously', async () => {
    await expect(
      collectAgentStream(() => {
        throw new Error('spawn failed')
      }),
    ).rejects.toThrow('spawn failed')
  })

  it('rejects when the driver Promise rejects', async () => {
    await expect(
      collectAgentStream(() => Promise.reject(new Error('invoke rejected'))),
    ).rejects.toThrow('invoke rejected')
  })

  it('resolves empty when an agent finishes with no text', async () => {
    expect(await collectAgentStream((cb) => cb.onDone())).toBe('')
  })
})

describe('buildCouncilRunner', () => {
  const echo =
    (answer: string) =>
    (cb: AgentStreamCallbacks): void => {
      cb.onText(answer)
      cb.onDone()
    }

  it('routes each agent id to its driver', async () => {
    const runOne = buildCouncilRunner({
      claude_code: echo('from claude'),
      codex: echo('from codex'),
    })
    expect(await runOne('claude_code')).toBe('from claude')
    expect(await runOne('codex')).toBe('from codex')
  })

  it('rejects for an agent without a driver so the council records it failed', async () => {
    const runOne = buildCouncilRunner({ claude_code: echo('ok') })
    await expect(runOne('chitragupta')).rejects.toThrow('No stream driver for agent: chitragupta')
  })
})
