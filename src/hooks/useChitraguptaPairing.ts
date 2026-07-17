import { useCallback, useEffect, useState } from 'react'
import { invoke } from '../lib/tauriRuntime'
import { isTauri, mockInvoke } from '../mock-tauri'
import type {
  ChitraguptaProvisionResult,
  ChitraguptaSocketStatus,
} from '../lib/chitraguptaSocket'

export type ChitraguptaPairingPhase = 'idle' | 'provisioning' | 'waiting' | 'connected' | 'error'

export function chitraguptaSocketCall<T>(command: string, args?: Record<string, unknown>): Promise<T> {
  return isTauri() ? invoke<T>(command, args) : mockInvoke<T>(command, args)
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

/**
 * One-click Chitragupta daemon pairing, shared by the Settings card and the
 * onboarding step so both drive the same state machine.
 *
 * Phases: idle → provisioning → connected, or `waiting` when the key was
 * created but the daemon has not refreshed it yet (an expected 401 right
 * after rotation), or `error` — manual token paste stays the fallback.
 * Backend errors arrive pre-sanitized; the token value never reaches here.
 */
export function useChitraguptaPairing() {
  const [status, setStatus] = useState<ChitraguptaSocketStatus | null>(null)
  const [phase, setPhase] = useState<ChitraguptaPairingPhase>('idle')
  const [error, setError] = useState<string | null>(null)

  const refreshStatus = useCallback(async (): Promise<ChitraguptaSocketStatus | null> => {
    try {
      const next = await chitraguptaSocketCall<ChitraguptaSocketStatus>('get_chitragupta_socket_status')
      setStatus(next ?? null)
      return next ?? null
    } catch (statusError) {
      setError(errorMessage(statusError))
      return null
    }
  }, [])

  useEffect(() => {
    void refreshStatus()
  }, [refreshStatus])

  const connect = useCallback(async () => {
    setPhase('provisioning')
    setError(null)
    try {
      const result = await chitraguptaSocketCall<ChitraguptaProvisionResult>(
        'provision_chitragupta_socket_token',
      )
      await refreshStatus()
      setPhase(result.connected ? 'connected' : 'waiting')
    } catch (connectError) {
      setError(errorMessage(connectError))
      setPhase('error')
    }
  }, [refreshStatus])

  const checkConnection = useCallback(async () => {
    const next = await refreshStatus()
    if (next?.healthy && next.token_present) {
      setPhase('connected')
      setError(null)
    }
  }, [refreshStatus])

  return { status, phase, error, connect, checkConnection, refreshStatus }
}
