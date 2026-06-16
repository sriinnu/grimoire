import { describe, expect, it, vi } from 'vitest'
import {
  runAgentCouncil,
  synthesizeAgentCouncil,
  type CouncilRunResult,
  type RunCouncilAgent,
} from './agentCouncilRun'

describe('runAgentCouncil', () => {
  it('runs every agent concurrently and collects their answers', async () => {
    const started: string[] = []
    let releaseAll: () => void = () => {}
    const gate = new Promise<void>((resolve) => {
      releaseAll = resolve
    })
    const runOne: RunCouncilAgent = async (agentId) => {
      started.push(agentId)
      // Do not resolve until every agent has started — proves parallelism.
      await gate
      return `answer from ${agentId}`
    }

    const promise = runAgentCouncil(['claude_code', 'codex'], runOne)
    await Promise.resolve()
    expect(started).toEqual(['claude_code', 'codex'])
    releaseAll()

    const run = await promise
    expect(run.completedCount).toBe(2)
    expect(run.results.map((r) => r.text)).toEqual([
      'answer from claude_code',
      'answer from codex',
    ])
  })

  it('isolates failures — one agent throwing does not block the others', async () => {
    const runOne: RunCouncilAgent = async (agentId) => {
      if (agentId === 'codex') throw new Error('codex not installed')
      return `ok ${agentId}`
    }

    const run = await runAgentCouncil(['claude_code', 'codex', 'chitragupta'], runOne)

    expect(run.completedCount).toBe(2)
    expect(run.failedCount).toBe(1)
    const codex = run.results.find((r) => r.agentId === 'codex')
    expect(codex).toMatchObject({ status: 'failed', text: '', error: 'codex not installed' })
  })

  it('marks whitespace-only answers as empty, not completed', async () => {
    const run = await runAgentCouncil(['claude_code'], async () => '   \n  ')
    expect(run.results[0].status).toBe('empty')
    expect(run.emptyCount).toBe(1)
    expect(run.completedCount).toBe(0)
  })

  it('de-duplicates repeated agent ids and runs each once', async () => {
    const runOne = vi.fn<RunCouncilAgent>(async (agentId) => `ok ${agentId}`)
    const run = await runAgentCouncil(['claude_code', 'claude_code', 'codex'], runOne)
    expect(runOne).toHaveBeenCalledTimes(2)
    expect(run.results.map((r) => r.agentId)).toEqual(['claude_code', 'codex'])
  })
})

describe('synthesizeAgentCouncil', () => {
  const baseRun = (): CouncilRunResult => ({
    results: [
      { agentId: 'claude_code', status: 'completed', text: 'Use a debounce.' },
      { agentId: 'codex', status: 'completed', text: 'Throttle the handler.' },
    ],
    completedCount: 2,
    failedCount: 0,
    emptyCount: 0,
  })

  it('renders each completed agent under its label, with the prompt', () => {
    const md = synthesizeAgentCouncil(baseRun(), 'How do I rate-limit input?')
    expect(md).toContain('# Council synthesis')
    expect(md).toContain('**Prompt:** How do I rate-limit input?')
    expect(md).toContain('## Claude Code\n\nUse a debounce.')
    expect(md).toContain('## Codex\n\nThrottle the handler.')
  })

  it('flags divergence when answers differ', () => {
    expect(synthesizeAgentCouncil(baseRun())).toContain('diverged')
  })

  it('notes convergence when answers match (whitespace-insensitive)', () => {
    const run: CouncilRunResult = {
      results: [
        { agentId: 'claude_code', status: 'completed', text: 'Use a   debounce.' },
        { agentId: 'codex', status: 'completed', text: 'use a debounce.' },
      ],
      completedCount: 2,
      failedCount: 0,
      emptyCount: 0,
    }
    expect(synthesizeAgentCouncil(run)).toContain('converged')
  })

  it('records failed and empty agents in a footer', () => {
    const run: CouncilRunResult = {
      results: [
        { agentId: 'claude_code', status: 'completed', text: 'Answer.' },
        { agentId: 'codex', status: 'failed', text: '', error: 'not installed' },
        { agentId: 'chitragupta', status: 'empty', text: '' },
      ],
      completedCount: 1,
      failedCount: 1,
      emptyCount: 1,
    }
    const md = synthesizeAgentCouncil(run)
    expect(md).toContain('## Not counted')
    expect(md).toContain('- Codex: failed — not installed')
    expect(md).toContain('- Chitragupta: returned no answer')
    expect(md).not.toContain('## Where they land')
  })

  it('handles a run where no agent produced an answer', () => {
    const run: CouncilRunResult = {
      results: [{ agentId: 'claude_code', status: 'failed', text: '', error: 'boom' }],
      completedCount: 0,
      failedCount: 1,
      emptyCount: 0,
    }
    expect(synthesizeAgentCouncil(run)).toContain('No agent produced an answer.')
  })
})
