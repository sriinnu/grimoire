import { describe, it, expect, vi } from 'vitest'

// Mock the mock-tauri module before importing ai-agent
vi.mock('../mock-tauri', () => ({
  isTauri: () => false,
}))

import { buildAgentSystemPrompt, streamClaudeAgent } from './ai-agent'

// --- buildAgentSystemPrompt ---

describe('buildAgentSystemPrompt', () => {
  it('returns preamble when no vault context', () => {
    const prompt = buildAgentSystemPrompt()
    expect(prompt).toContain('working inside Grimoire')
    expect(prompt).toContain('full shell access')
    expect(prompt).not.toContain('Vault context')
  })

  it('appends vault context when provided', () => {
    const prompt = buildAgentSystemPrompt('Recent notes: foo, bar')
    expect(prompt).toContain('working inside Grimoire')
    expect(prompt).toContain('Vault context:')
    expect(prompt).toContain('Recent notes: foo, bar')
  })

  it('instructs AI to use wikilink syntax', () => {
    const prompt = buildAgentSystemPrompt()
    expect(prompt).toContain('[[')
    expect(prompt).toMatch(/wikilink/i)
  })
})

// --- streamClaudeAgent ---

describe('streamClaudeAgent', () => {
  it('calls onText and onDone in non-Tauri environment', async () => {
    const onText = vi.fn()
    const onThinking = vi.fn()
    const onToolStart = vi.fn()
    const onToolDone = vi.fn()
    const onDone = vi.fn()
    const onError = vi.fn()

    await streamClaudeAgent('test message', 'system prompt', '/tmp/vault', {
      onText,
      onThinking,
      onToolStart,
      onToolDone,
      onError,
      onDone,
    })

    expect(onText).not.toHaveBeenCalled()
    expect(onError).toHaveBeenCalledWith(expect.stringContaining('native Grimoire app'))
    expect(onDone).toHaveBeenCalled()
    expect(onToolStart).not.toHaveBeenCalled()
  })
})
