import { useEffect, useState } from 'react'
import { invoke } from '../lib/tauriRuntime'
import { isTauri, mockInvoke } from '../mock-tauri'
import {
  createBrowserPreviewAiAgentsStatus,
  createCheckingAiAgentsStatus,
  createMissingAiAgentsStatus,
  isAiAgentsStatusChecking,
  normalizeAiAgentsStatus,
  type AiAgentsStatus,
  type AiAgentId,
} from '../lib/aiAgents'

type RawAiAgentsStatus = Partial<Record<AiAgentId, { installed?: boolean | null; version?: string | null }>>

export const AI_AGENTS_STATUS_REFRESH_EVENT = 'grimoire:refresh-ai-agents'

function tauriCall<T>(command: string): Promise<T> {
  if (isTauri()) return invoke<T>(command)
  return mockInvoke<T>(command)
}

function initialAiAgentsStatus(): AiAgentsStatus {
  return !isTauri() && import.meta.env.MODE !== 'test'
    ? createBrowserPreviewAiAgentsStatus()
    : createCheckingAiAgentsStatus()
}

export function useAiAgentsStatus(): AiAgentsStatus {
  const [statuses, setStatuses] = useState<AiAgentsStatus>(() => initialAiAgentsStatus())

  useEffect(() => {
    let cancelled = false
    let requestId = 0

    if (!isTauri() && import.meta.env.MODE !== 'test') {
      return () => { cancelled = true }
    }

    const refresh = () => {
      const currentRequest = requestId + 1
      requestId = currentRequest
      setStatuses((current) => (
        isAiAgentsStatusChecking(current) ? current : createCheckingAiAgentsStatus()
      ))

      tauriCall<RawAiAgentsStatus>('get_ai_agents_status')
        .then((result) => {
          if (!cancelled && requestId === currentRequest) {
            setStatuses(normalizeAiAgentsStatus(result))
          }
        })
        .catch(() => {
          if (!cancelled && requestId === currentRequest) {
            setStatuses(createMissingAiAgentsStatus())
          }
        })
    }

    const refreshWhenVisible = () => {
      if (document.visibilityState === 'hidden') return
      refresh()
    }

    refresh()
    window.addEventListener('focus', refresh)
    window.addEventListener(AI_AGENTS_STATUS_REFRESH_EVENT, refresh)
    document.addEventListener('visibilitychange', refreshWhenVisible)

    return () => {
      cancelled = true
      window.removeEventListener('focus', refresh)
      window.removeEventListener(AI_AGENTS_STATUS_REFRESH_EVENT, refresh)
      document.removeEventListener('visibilitychange', refreshWhenVisible)
    }
  }, [])

  return statuses
}
