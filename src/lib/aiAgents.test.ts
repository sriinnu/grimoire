import { describe, expect, it } from 'vitest'
import {
  createBrowserPreviewAiAgentsStatus,
  describeAiAgentRoute,
  getNextAiAgentId,
  isBrowserPreviewAiAgentsStatus,
  normalizeAiAgentsStatus,
  normalizeStoredAiAgent,
  resolveDefaultAiAgent,
  resolveDefaultAiProvider,
  supportsAiAgentProviderRoute,
} from './aiAgents'

describe('aiAgents helpers', () => {
  it('normalizes stored agent ids', () => {
    expect(normalizeStoredAiAgent('claude_code')).toBe('claude_code')
    expect(normalizeStoredAiAgent('codex')).toBe('codex')
    expect(normalizeStoredAiAgent('chitragupta')).toBe('chitragupta')
    expect(normalizeStoredAiAgent('cursor')).toBeNull()
  })

  it('falls back to Claude Code as the default agent', () => {
    expect(resolveDefaultAiAgent(undefined)).toBe('claude_code')
    expect(resolveDefaultAiAgent(null)).toBe('claude_code')
  })

  it('normalizes raw status payloads', () => {
    const statuses = normalizeAiAgentsStatus({
      claude_code: { installed: true, version: '1.0.20' },
      codex: { installed: false, version: null },
      chitragupta: { installed: true, version: '0.1.16' },
    })

    expect(statuses.claude_code).toEqual({ status: 'installed', version: '1.0.20' })
    expect(statuses.codex).toEqual({ status: 'missing', version: null })
    expect(statuses.chitragupta).toEqual({ status: 'installed', version: '0.1.16' })
  })

  it('cycles between the supported agents', () => {
    expect(getNextAiAgentId('claude_code')).toBe('codex')
    expect(getNextAiAgentId('codex')).toBe('chitragupta')
    expect(getNextAiAgentId('chitragupta')).toBe('claude_code')
  })

  it('marks browser preview as unavailable without pretending agents are installed', () => {
    const statuses = createBrowserPreviewAiAgentsStatus()

    expect(isBrowserPreviewAiAgentsStatus(statuses)).toBe(true)
    expect(statuses.claude_code.status).toBe('missing')
    expect(statuses.claude_code.version).toContain('native Grimoire app')
  })

  it('describes the visible runtime route for Chitragupta', () => {
    expect(describeAiAgentRoute('chitragupta', null, null)).toBe('provider: CLI default · model: CLI default')
    expect(describeAiAgentRoute('chitragupta', ' google ', ' gemini-2.5-pro ')).toBe(
      'provider: google · model: gemini-2.5-pro',
    )
    expect(describeAiAgentRoute('codex', null, null)).toBeNull()
    expect(describeAiAgentRoute('codex', null, 'gpt-5.3-codex')).toBe('model: gpt-5.3-codex')
  })

  it('only honors provider overrides for agents that support provider routing', () => {
    expect(supportsAiAgentProviderRoute('chitragupta')).toBe(true)
    expect(supportsAiAgentProviderRoute('codex')).toBe(false)
    expect(resolveDefaultAiProvider('chitragupta', ' google ')).toBe('google')
    expect(resolveDefaultAiProvider('codex', ' google ')).toBeNull()
  })
})
