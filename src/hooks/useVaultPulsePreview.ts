import { useEffect, useState } from 'react'
import { invoke } from '../lib/tauriRuntime'
import { isTauri, mockInvoke } from '../mock-tauri'
import type { PulseCommit } from '../types'

const DEFAULT_LIMIT = 20

interface VaultPulsePreview {
  commits: PulseCommit[]
  error: string | null
  loading: boolean
}

interface VaultPulsePreviewState extends VaultPulsePreview {
  vaultPath: string | null
}

function tauriCall<T>(command: string, args: Record<string, unknown>): Promise<T> {
  return isTauri() ? invoke<T>(command, args) : mockInvoke<T>(command, args)
}

/** Loads a small vault-level commit preview for metadata-only dashboard summaries. */
export function useVaultPulsePreview(
  vaultPath: string,
  enabled: boolean,
  limit = DEFAULT_LIMIT,
): VaultPulsePreview {
  const [preview, setPreview] = useState<VaultPulsePreviewState>({
    commits: [],
    error: null,
    loading: true,
    vaultPath: null,
  })

  useEffect(() => {
    if (!enabled || vaultPath.trim().length === 0) return

    let cancelled = false

    void tauriCall<PulseCommit[]>('get_vault_pulse', { vaultPath, limit, skip: 0 })
      .then((commits) => {
        if (!cancelled) setPreview({ commits, error: null, loading: false, vaultPath })
      })
      .catch((error: unknown) => {
        if (cancelled) return
        setPreview({
          commits: [],
          error: typeof error === 'string' ? error : 'Failed to load vault pulse',
          loading: false,
          vaultPath,
        })
      })

    return () => {
      cancelled = true
    }
  }, [enabled, limit, vaultPath])

  const active = enabled && vaultPath.trim().length > 0
  if (!active) return { commits: [], error: null, loading: false }
  if (preview.vaultPath !== vaultPath) return { commits: [], error: null, loading: true }
  return {
    commits: preview.commits,
    error: preview.error,
    loading: preview.loading,
  }
}
