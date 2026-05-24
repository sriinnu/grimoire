import { describe, expect, it } from 'vitest'
import type { Settings } from '../../types'
import {
  buildSettingsFromDraft,
  createSettingsDraft,
  updateAiAgentProviderDraft,
} from './settingsDraft'

const baseSettings: Settings = {
  analytics_enabled: false,
  anonymous_id: null,
  auto_pull_interval_minutes: null,
  crash_reporting_enabled: false,
  release_channel: null,
  telemetry_consent: null,
}

describe('settingsDraft', () => {
  it('drops stale provider overrides for agents without provider routing', () => {
    const draft = createSettingsDraft({
      ...baseSettings,
      ai_agent_providers: { chitragupta: 'openai', codex: 'google', claude_code: 'anthropic' },
    }, true)

    expect(draft.aiAgentProviders).toEqual({ chitragupta: 'openai' })
    expect(buildSettingsFromDraft(baseSettings, draft).ai_agent_providers).toEqual({ chitragupta: 'openai' })
  })

  it('refuses to add provider overrides for Codex or Claude Code drafts', () => {
    expect(updateAiAgentProviderDraft({ chitragupta: 'openai' }, 'codex', 'google')).toEqual({
      chitragupta: 'openai',
    })
    expect(updateAiAgentProviderDraft({ chitragupta: 'openai' }, 'chitragupta', ' google ')).toEqual({
      chitragupta: 'google',
    })
  })
})
