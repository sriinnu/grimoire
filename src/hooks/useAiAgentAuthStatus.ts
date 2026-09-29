import { useEffect, useState } from 'react'
import { tauriCall } from './vaultSwitcherShared'
import { isTauri } from '../mock-tauri'

export interface AiAgentAuthStatus {
  signed_in: boolean
  /** "subscription" or "api_key" when the CLI reports it. */
  method: 'subscription' | 'api_key' | null
  detail: string | null
}

export interface AiAgentsAuthStatus {
  claude_code: AiAgentAuthStatus
  codex: AiAgentAuthStatus
}

/**
 * How Claude Code and Codex are signed in, as the CLIs report it. Native only:
 * the browser preview has no CLIs to ask, so it stays null.
 */
export function useAiAgentAuthStatus(enabled = true): { status: AiAgentsAuthStatus | null; loading: boolean; refresh: () => void } {
  const [status, setStatus] = useState<AiAgentsAuthStatus | null>(null)
  const [loading, setLoading] = useState(false)
  const [tick, setTick] = useState(0)

  useEffect(() => {
    if (!enabled || !isTauri()) return
    let cancelled = false
    setLoading(true)
    tauriCall<AiAgentsAuthStatus>('get_ai_agent_auth_status', {})
      .then((next) => { if (!cancelled) setStatus(next) })
      .catch(() => { if (!cancelled) setStatus(null) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [enabled, tick])

  return { status, loading, refresh: () => setTick((current) => current + 1) }
}
