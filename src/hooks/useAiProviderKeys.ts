import { useCallback, useEffect, useRef, useState, type SetStateAction } from 'react'
import { invoke } from '../lib/tauriRuntime'
import type { AiProviderKeyStatus } from '../lib/aiProviderKeys'
import { isTauri, mockInvoke } from '../mock-tauri'

interface AiProviderKeysState {
  statuses: AiProviderKeyStatus[]
  loading: boolean
  error: string | null
}

function invokeAiProviderKeys<T>(command: string, args?: Record<string, unknown>): Promise<T> {
  return isTauri() ? invoke<T>(command, args) : mockInvoke<T>(command, args)
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

/** Loads redacted provider key readiness and mutates macOS Keychain-backed keys. */
export function useAiProviderKeys() {
  const mountedRef = useRef(true)
  const [state, setState] = useState<AiProviderKeysState>({
    statuses: [],
    loading: true,
    error: null,
  })

  const safeSetState = useCallback((nextState: SetStateAction<AiProviderKeysState>) => {
    if (mountedRef.current) setState(nextState)
  }, [])

  const refresh = useCallback(async () => {
    safeSetState((current) => ({ ...current, loading: true, error: null }))
    try {
      const statuses = await invokeAiProviderKeys<AiProviderKeyStatus[]>(
        'get_ai_provider_key_statuses',
      )
      safeSetState({ statuses, loading: false, error: null })
      return statuses
    } catch (error) {
      safeSetState((current) => ({ ...current, loading: false, error: errorMessage(error) }))
      return []
    }
  }, [safeSetState])

  const saveProviderApiKey = useCallback(async (providerId: string, apiKey: string) => {
    const statuses = await invokeAiProviderKeys<AiProviderKeyStatus[]>(
      'save_ai_provider_api_key',
      { providerId, apiKey },
    )
    safeSetState({ statuses, loading: false, error: null })
    return statuses
  }, [safeSetState])

  const clearProviderApiKey = useCallback(async (providerId: string) => {
    const statuses = await invokeAiProviderKeys<AiProviderKeyStatus[]>(
      'clear_ai_provider_api_key',
      { providerId },
    )
    safeSetState({ statuses, loading: false, error: null })
    return statuses
  }, [safeSetState])

  useEffect(() => {
    void refresh()
  }, [refresh])

  useEffect(() => () => {
    mountedRef.current = false
  }, [])

  return {
    ...state,
    refresh,
    saveProviderApiKey,
    clearProviderApiKey,
  }
}
