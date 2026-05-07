import { describe, expect, it } from 'vitest'
import {
  getProjectExecutionProvider,
  listProjectExecutionProviders,
  normalizeProjectExecutionProvider,
} from './executionProviders'

describe('project execution providers', () => {
  it('reports availability from caller-supplied commands', () => {
    const providers = listProjectExecutionProviders(['codex', 'chitragupta-daemon'])

    expect(providers.find((provider) => provider.id === 'codex')?.available).toBe(true)
    expect(providers.find((provider) => provider.id === 'chitragupta')?.available).toBe(true)
    expect(providers.find((provider) => provider.id === 'claude_code')?.available).toBe(false)
  })

  it('looks up and normalizes providers', () => {
    expect(getProjectExecutionProvider('opencode')?.label).toBe('OpenCode')
    expect(normalizeProjectExecutionProvider('claude_code')).toBe('claude_code')
    expect(normalizeProjectExecutionProvider('missing')).toBeNull()
  })
})

