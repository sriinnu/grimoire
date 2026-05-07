import { useCallback, useMemo } from 'react'
import { isTauri } from '../mock-tauri'
import {
  getAiAgentDefinition,
  getNextAiAgentId,
  isAiAgentInstalled,
  resolveDefaultAiAgent,
  type AiAgentId,
  type AiAgentsStatus,
} from '../lib/aiAgents'
import type { Settings } from '../types'

interface UseAiAgentPreferencesArgs {
  settings: Settings
  saveSettings: (settings: Settings) => void
  aiAgentsStatus: AiAgentsStatus
  onToast?: (message: string) => void
}

export function useAiAgentPreferences({
  settings,
  saveSettings,
  aiAgentsStatus,
  onToast,
}: UseAiAgentPreferencesArgs) {
  const defaultAiAgent = useMemo(
    () => resolveDefaultAiAgent(settings.default_ai_agent),
    [settings.default_ai_agent],
  )

  const defaultAiAgentLabel = getAiAgentDefinition(defaultAiAgent).label
  const defaultAiAgentReady = !isTauri() || isAiAgentInstalled(aiAgentsStatus, defaultAiAgent)
  const defaultAiModel = settings.ai_agent_models?.[defaultAiAgent]?.trim() || null

  const setDefaultAiAgent = useCallback((agent: AiAgentId) => {
    saveSettings({
      ...settings,
      default_ai_agent: agent,
    })
    onToast?.(`Default AI agent: ${getAiAgentDefinition(agent).label}`)
  }, [onToast, saveSettings, settings])

  const setDefaultAiModel = useCallback((model: string) => {
    const normalized = model.trim()
    const aiAgentModels = { ...(settings.ai_agent_models ?? {}) }
    if (normalized) {
      aiAgentModels[defaultAiAgent] = normalized
    } else {
      delete aiAgentModels[defaultAiAgent]
    }

    saveSettings({
      ...settings,
      ai_agent_models: Object.keys(aiAgentModels).length > 0 ? aiAgentModels : null,
    })
    onToast?.(`${defaultAiAgentLabel} model: ${normalized || 'CLI default'}`)
  }, [defaultAiAgent, defaultAiAgentLabel, onToast, saveSettings, settings])

  const cycleDefaultAiAgent = useCallback(() => {
    setDefaultAiAgent(getNextAiAgentId(defaultAiAgent))
  }, [defaultAiAgent, setDefaultAiAgent])

  return {
    defaultAiAgent,
    defaultAiAgentLabel,
    defaultAiAgentReady,
    defaultAiModel,
    setDefaultAiAgent,
    setDefaultAiModel,
    cycleDefaultAiAgent,
  }
}
