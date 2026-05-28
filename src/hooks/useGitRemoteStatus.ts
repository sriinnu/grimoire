import { useCallback, useEffect, useRef, useState } from 'react'
import { invoke } from '../lib/tauriRuntime'
import { isTauri, mockInvoke } from '../mock-tauri'
import type { GitRemoteStatus } from '../types'
import { scheduleVisibleWork } from './visibleDocument'

function tauriCall<T>(command: string, args: Record<string, unknown>): Promise<T> {
  return isTauri() ? invoke<T>(command, args) : mockInvoke<T>(command, args)
}

export interface GitRemoteState {
  remoteStatus: GitRemoteStatus | null
  refreshRemoteStatus: () => Promise<GitRemoteStatus | null>
}

interface UseGitRemoteStatusOptions {
  enabled?: boolean
}

async function readRemoteStatus(vaultPath: string): Promise<GitRemoteStatus> {
  return tauriCall<GitRemoteStatus>('git_remote_status', { vaultPath })
}

export function useGitRemoteStatus(
  vaultPath: string,
  options: UseGitRemoteStatusOptions = {},
): GitRemoteState {
  const enabled = options.enabled ?? true
  const [remoteStatus, setRemoteStatus] = useState<GitRemoteStatus | null>(null)
  const activeRequestRef = useRef({ enabled, vaultPath })

  useEffect(() => {
    activeRequestRef.current = { enabled, vaultPath }
  }, [enabled, vaultPath])

  const shouldApply = useCallback(
    (path: string) => activeRequestRef.current.enabled && activeRequestRef.current.vaultPath === path,
    [],
  )

  const refreshRemoteStatus = useCallback(async () => {
    const path = vaultPath
    if (!enabled || !path) {
      setRemoteStatus(null)
      return null
    }

    try {
      const status = await readRemoteStatus(path)
      if (shouldApply(path)) setRemoteStatus(status)
      return status
    } catch {
      if (shouldApply(path)) setRemoteStatus(null)
      return null
    }
  }, [enabled, shouldApply, vaultPath])

  useEffect(() => {
    let cancelled = false

    async function loadRemoteStatus() {
      if (!enabled || !vaultPath) {
        setRemoteStatus(null)
        return
      }

      try {
        const status = await readRemoteStatus(vaultPath)
        if (!cancelled && shouldApply(vaultPath)) setRemoteStatus(status)
      } catch {
        if (!cancelled && shouldApply(vaultPath)) setRemoteStatus(null)
      }
    }

    const cancelVisibleWork = scheduleVisibleWork(() => {
      void loadRemoteStatus()
    })

    return () => {
      cancelled = true
      cancelVisibleWork()
    }
  }, [enabled, shouldApply, vaultPath])

  return { remoteStatus, refreshRemoteStatus }
}
