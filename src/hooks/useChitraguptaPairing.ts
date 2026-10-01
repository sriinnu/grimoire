import { useCallback, useEffect, useRef, useState } from 'react'
import { invoke } from '../lib/tauriRuntime'
import { isTauri, mockInvoke } from '../mock-tauri'
import type { ChitraguptaSocketStatus } from '../lib/chitraguptaSocket'

interface ConnectionOptions { reconnect?: boolean; requestApproval?: boolean; pairingInvitation?: string }

export type ChitraguptaPairingPhase = 'idle' | 'provisioning' | 'waiting' | 'connected' | 'error'
export function chitraguptaSocketCall<T>(command: string, args?: Record<string, unknown>): Promise<T> {
  return isTauri() ? invoke<T>(command, args) : mockInvoke<T>(command, args)
}

/** Pairing is separate from the selected vault's live workspace approval. */
export function useChitraguptaPairing(vaultPath?: string) {
  const [status, setStatus] = useState<ChitraguptaSocketStatus | null>(null)
  const [phase, setPhase] = useState<ChitraguptaPairingPhase>('idle')
  const [error, setError] = useState<string | null>(null)
  const generation = useRef(0)

  const load = useCallback(async (connect: boolean, pairingCode?: string, options: ConnectionOptions = {}) => {
    const current = ++generation.current
    setError(null)
    if (!vaultPath) {
      setStatus(null)
      setPhase('idle')
      return null
    }
    if (connect) setPhase('provisioning')
    try {
      const next = await chitraguptaSocketCall<ChitraguptaSocketStatus>(
        connect ? 'provision_chitragupta_socket_token' : 'get_chitragupta_socket_status',
        { vaultPath, ...(connect && pairingCode ? { pairingCode } : {}), ...(connect ? options : {}) },
      )
      if (current !== generation.current) return null
      if (next.contractVersion !== 1 || (next.selectedVaultPath ?? next.projectPath) !== vaultPath) throw new Error('Chitragupta returned a status for a different vault or contract.')
      setStatus(next)
      setPhase(next.state === 'ready' ? 'connected' : next.state === 'approval_required' ? 'waiting' : 'idle')
      return next
    } catch (failure) {
      if (current === generation.current) {
        setStatus(null)
        setError(failure instanceof Error ? failure.message : String(failure))
        setPhase('error')
      }
      return null
    }
  }, [vaultPath])

  const refreshStatus = useCallback(() => load(false), [load])
  useEffect(() => {
    setStatus(null)
    setPhase('idle')
    void refreshStatus()
    return () => { generation.current++ }
  }, [refreshStatus])
  const connect = useCallback((pairingCode?: string, options?: ConnectionOptions) => load(true, pairingCode, options), [load])
  return { status, phase, error, connect, checkConnection: refreshStatus, refreshStatus }
}
