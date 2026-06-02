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
import { isDocumentVisible } from './visibleDocument'

type RawAiAgentsStatus = Partial<Record<AiAgentId, { installed?: boolean | null; version?: string | null; detail?: string | null }>>

export const AI_AGENTS_STATUS_REFRESH_EVENT = 'grimoire:refresh-ai-agents'
export const AI_AGENTS_STATUS_IDLE_DELAY_MS = 120
export const AI_AGENTS_STATUS_FOCUS_DEBOUNCE_MS = 750
export const AI_AGENTS_STATUS_CACHE_TTL_MS = 30_000

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
    let cachedStatuses: AiAgentsStatus | null = null
    let cachedAt = 0
    let idleCallbackId: number | null = null
    let initialRefreshTimeout: ReturnType<typeof window.setTimeout> | null = null
    let focusRefreshTimeout: ReturnType<typeof window.setTimeout> | null = null

    if (!isTauri() && import.meta.env.MODE !== 'test') {
      return () => { cancelled = true }
    }

    const clearScheduledInitialRefresh = () => {
      if (idleCallbackId !== null && 'cancelIdleCallback' in window) {
        window.cancelIdleCallback(idleCallbackId)
      }
      if (initialRefreshTimeout !== null) {
        window.clearTimeout(initialRefreshTimeout)
      }
      idleCallbackId = null
      initialRefreshTimeout = null
    }

    const refresh = (force = false) => {
      clearScheduledInitialRefresh()
      if (!force && !isDocumentVisible()) return

      if (!force && cachedStatuses && Date.now() - cachedAt < AI_AGENTS_STATUS_CACHE_TTL_MS) {
        setStatuses(cachedStatuses)
        return
      }

      const currentRequest = requestId + 1
      requestId = currentRequest
      setStatuses((current) => (
        isAiAgentsStatusChecking(current) ? current : createCheckingAiAgentsStatus()
      ))

      tauriCall<RawAiAgentsStatus>('get_ai_agents_status')
        .then((result) => {
          if (!cancelled && requestId === currentRequest) {
            const nextStatuses = normalizeAiAgentsStatus(result)
            cachedStatuses = nextStatuses
            cachedAt = Date.now()
            setStatuses(nextStatuses)
          }
        })
        .catch(() => {
          if (!cancelled && requestId === currentRequest) {
            setStatuses(createMissingAiAgentsStatus())
          }
        })
    }

    const scheduleInitialRefresh = () => {
      if (!isDocumentVisible()) return
      if (import.meta.env.MODE !== 'test' && 'requestIdleCallback' in window) {
        idleCallbackId = window.requestIdleCallback(() => refresh(), { timeout: AI_AGENTS_STATUS_IDLE_DELAY_MS })
        return
      }
      initialRefreshTimeout = window.setTimeout(() => refresh(), AI_AGENTS_STATUS_IDLE_DELAY_MS)
    }

    const refreshWhenVisible = () => {
      if (!isDocumentVisible()) return
      if (focusRefreshTimeout !== null) window.clearTimeout(focusRefreshTimeout)
      focusRefreshTimeout = window.setTimeout(() => {
        focusRefreshTimeout = null
        refresh()
      }, AI_AGENTS_STATUS_FOCUS_DEBOUNCE_MS)
    }

    const refreshExplicitly = () => refresh(true)

    scheduleInitialRefresh()
    window.addEventListener('focus', refreshWhenVisible)
    window.addEventListener(AI_AGENTS_STATUS_REFRESH_EVENT, refreshExplicitly)
    document.addEventListener('visibilitychange', refreshWhenVisible)

    return () => {
      cancelled = true
      clearScheduledInitialRefresh()
      if (focusRefreshTimeout !== null) window.clearTimeout(focusRefreshTimeout)
      window.removeEventListener('focus', refreshWhenVisible)
      window.removeEventListener(AI_AGENTS_STATUS_REFRESH_EVENT, refreshExplicitly)
      document.removeEventListener('visibilitychange', refreshWhenVisible)
    }
  }, [])

  return statuses
}
