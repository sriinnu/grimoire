import { useEffect, useState } from 'react'
import { invoke } from '@tauri-apps/api/core'
import { isTauri, mockInvoke } from '../mock-tauri'
import {
  createBrowserPreviewAiAgentsStatus,
  createCheckingAiAgentsStatus,
  createMissingAiAgentsStatus,
  normalizeAiAgentsStatus,
  type AiAgentsStatus,
  type AiAgentId,
} from '../lib/aiAgents'

type RawAiAgentsStatus = Partial<Record<AiAgentId, { installed?: boolean | null; version?: string | null }>>

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

    if (!isTauri() && import.meta.env.MODE !== 'test') {
      return () => { cancelled = true }
    }

    tauriCall<RawAiAgentsStatus>('get_ai_agents_status')
      .then((result) => {
        if (!cancelled) {
          setStatuses(normalizeAiAgentsStatus(result))
        }
      })
      .catch(() => {
        if (!cancelled) {
          setStatuses(createMissingAiAgentsStatus())
        }
      })

    return () => { cancelled = true }
  }, [])

  return statuses
}
