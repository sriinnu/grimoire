import { useCallback, useRef, useState } from 'react'
import type { VaultEntry } from '../types'
import {
  cancelVaultRebuild,
  reloadVaultWithProgress,
  type VaultRebuildProgressEvent,
} from '../utils/vaultRebuild'
import { clearPrefetchCache } from './useTabManagement'

export interface VaultRebuildProgressState {
  operationId: string
  processedFiles: number
  totalFiles: number | null
  currentPath: string | null
  phase: 'starting' | 'scanning' | 'cancelling'
}

interface ActiveRebuild {
  operationId: string
  cancelled: boolean
}

function createRebuildOperationId(): string {
  return `vault-rebuild-${Date.now()}-${Math.random().toString(36).slice(2)}`
}

function progressFromEvent(
  operationId: string,
  event: VaultRebuildProgressEvent,
): VaultRebuildProgressState | null {
  if (event.event === 'Started') {
    return {
      operationId,
      processedFiles: 0,
      totalFiles: event.data.totalFiles || null,
      currentPath: null,
      phase: 'starting',
    }
  }
  if (event.event === 'Progress') {
    return {
      operationId,
      processedFiles: event.data.processedFiles,
      totalFiles: event.data.totalFiles,
      currentPath: event.data.currentPath,
      phase: 'scanning',
    }
  }
  if (event.event === 'Cancelled') {
    return {
      operationId,
      processedFiles: 0,
      totalFiles: null,
      currentPath: null,
      phase: 'cancelling',
    }
  }
  return null
}

/** Coordinates visible progress and cancellation for a user-triggered vault rebuild. */
export function useVaultRebuildProgress(
  vaultPath: string,
  isCurrentVaultPath: (path: string) => boolean,
  loadModifiedFiles: () => Promise<void>,
  setEntries: (entries: VaultEntry[]) => void,
) {
  const [rebuildProgress, setRebuildProgress] = useState<VaultRebuildProgressState | null>(null)
  const activeRebuildRef = useRef<ActiveRebuild | null>(null)

  const handleProgressEvent = useCallback((operationId: string, event: VaultRebuildProgressEvent) => {
    if (activeRebuildRef.current?.operationId !== operationId) return
    const nextProgress = progressFromEvent(operationId, event)
    if (nextProgress) setRebuildProgress(nextProgress)
  }, [])

  const reloadVault = useCallback(async () => {
    const path = vaultPath
    const operationId = createRebuildOperationId()
    activeRebuildRef.current = { operationId, cancelled: false }
    setRebuildProgress({
      operationId,
      processedFiles: 0,
      totalFiles: null,
      currentPath: null,
      phase: 'starting',
    })
    clearPrefetchCache()

    try {
      const entries = await reloadVaultWithProgress(path, operationId, (event) => {
        handleProgressEvent(operationId, event)
      })
      const active = activeRebuildRef.current
      if (!active || active.operationId !== operationId || active.cancelled) return []
      if (!isCurrentVaultPath(path)) return []
      setEntries(entries)
      void loadModifiedFiles()
      return entries
    } catch (err) {
      if (!activeRebuildRef.current?.cancelled) {
        console.warn('Vault reload failed:', err)
      }
      return []
    } finally {
      if (activeRebuildRef.current?.operationId === operationId) {
        activeRebuildRef.current = null
        setRebuildProgress(null)
      }
    }
  }, [vaultPath, handleProgressEvent, isCurrentVaultPath, loadModifiedFiles, setEntries])

  const cancelVaultReload = useCallback(async () => {
    const active = activeRebuildRef.current
    if (!active) return false
    active.cancelled = true
    setRebuildProgress((current) => current?.operationId === active.operationId
      ? { ...current, phase: 'cancelling' }
      : current)
    return cancelVaultRebuild(active.operationId)
  }, [])

  return { rebuildProgress, reloadVault, cancelVaultReload }
}
