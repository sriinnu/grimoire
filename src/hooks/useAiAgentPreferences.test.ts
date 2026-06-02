import { renderHook, act } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useAiAgentPreferences } from './useAiAgentPreferences'

const settings = {
  auto_pull_interval_minutes: 5,
  telemetry_consent: true,
  crash_reporting_enabled: false,
  analytics_enabled: false,
  anonymous_id: null,
  release_channel: 'stable',
  default_ai_agent: 'claude_code' as const,
  ai_agent_models: null,
  ai_agent_providers: null,
}

const aiAgentsStatus = {
  claude_code: { status: 'installed' as const, version: '1.0.20' },
  codex: { status: 'missing' as const, version: null },
  chitragupta: { status: 'installed' as const, version: '0.1.16' },
}

describe('useAiAgentPreferences', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('resolves the selected label and readiness', () => {
    const { result } = renderHook(() => useAiAgentPreferences({
      settings,
      saveSettings: vi.fn(),
      aiAgentsStatus,
    }))

    expect(result.current.defaultAiAgent).toBe('claude_code')
    expect(result.current.defaultAiAgentLabel).toBe('Claude Code')
    expect(result.current.defaultAiAgentReady).toBe(true)
  })

  it('cycles to the next agent and persists the selection', () => {
    const saveSettings = vi.fn()
    const onToast = vi.fn()

    const { result } = renderHook(() => useAiAgentPreferences({
      settings,
      saveSettings,
      aiAgentsStatus,
      onToast,
    }))

    act(() => {
      result.current.cycleDefaultAiAgent()
    })

    expect(saveSettings).toHaveBeenCalledWith({
      ...settings,
      default_ai_agent: 'codex',
    })
    expect(onToast).toHaveBeenCalledWith('Default AI agent: Codex')
  })

  it('marks the selected agent unavailable when no CLI is installed', () => {
    const { result } = renderHook(() => useAiAgentPreferences({
      settings,
      saveSettings: vi.fn(),
      aiAgentsStatus: {
        claude_code: { status: 'missing', version: null },
        codex: { status: 'missing', version: null },
        chitragupta: { status: 'missing', version: null },
      },
    }))

    expect(result.current.defaultAiAgentReady).toBe(false)
  })

  it('uses the first installed local agent when the stored default is missing', () => {
    const { result } = renderHook(() => useAiAgentPreferences({
      settings: { ...settings, default_ai_agent: null },
      saveSettings: vi.fn(),
      aiAgentsStatus: {
        claude_code: { status: 'missing', version: null },
        codex: { status: 'installed', version: '0.37.0' },
        chitragupta: { status: 'installed', version: '0.1.16' },
      },
    }))

    expect(result.current.defaultAiAgent).toBe('codex')
    expect(result.current.defaultAiAgentLabel).toBe('Codex')
    expect(result.current.defaultAiAgentReady).toBe(true)
  })

  it('persists a model override for the selected local agent', () => {
    const saveSettings = vi.fn()
    const onToast = vi.fn()

    const { result } = renderHook(() => useAiAgentPreferences({
      settings,
      saveSettings,
      aiAgentsStatus,
      onToast,
    }))

    act(() => {
      result.current.setDefaultAiModel(' sonnet ')
    })

    expect(saveSettings).toHaveBeenCalledWith({
      ...settings,
      ai_agent_models: { claude_code: 'sonnet' },
    })
    expect(onToast).toHaveBeenCalledWith('Claude Code model: sonnet')
  })

  it('persists a provider override for the selected local agent', () => {
    const saveSettings = vi.fn()
    const onToast = vi.fn()

    const { result } = renderHook(() => useAiAgentPreferences({
      settings: { ...settings, default_ai_agent: 'chitragupta' },
      saveSettings,
      aiAgentsStatus,
      onToast,
    }))

    act(() => {
      result.current.setDefaultAiProvider(' openai ')
    })

    expect(saveSettings).toHaveBeenCalledWith({
      ...settings,
      default_ai_agent: 'chitragupta',
      ai_agent_providers: { chitragupta: 'openai' },
    })
    expect(onToast).toHaveBeenCalledWith('Chitragupta provider: openai')
  })

  it('uses Chitragupta CLI defaults when no provider override is set', () => {
    const { result } = renderHook(() => useAiAgentPreferences({
      settings: { ...settings, default_ai_agent: 'chitragupta' },
      saveSettings: vi.fn(),
      aiAgentsStatus,
    }))

    expect(result.current.defaultAiProvider).toBeNull()
  })

  it('ignores stale provider overrides for Codex', () => {
    const { result } = renderHook(() => useAiAgentPreferences({
      settings: {
        ...settings,
        default_ai_agent: 'codex',
        ai_agent_providers: { codex: 'google', chitragupta: 'openai' },
      },
      saveSettings: vi.fn(),
      aiAgentsStatus,
    }))

    expect(result.current.defaultAiProvider).toBeNull()
  })
})
