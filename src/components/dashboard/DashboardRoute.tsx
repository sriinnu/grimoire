import { useCallback } from 'react'
import type { SyncStatus, VaultEntry } from '../../types'
import { useDashboardCapture } from '../../hooks/useDashboardCapture'
import { useVaultPulsePreview } from '../../hooks/useVaultPulsePreview'
import type { DashboardCaptureRequest } from '../../utils/dashboardCapture'
import type { VaultOption } from '../status-bar/types'
import { VaultDashboard } from './VaultDashboard'

interface DashboardRouteProps {
  activeVault?: VaultOption
  addEntry: (entry: VaultEntry) => void
  addPendingSave?: (path: string) => void
  conflictCount: number
  createTypeEntry?: (typeName: string) => Promise<VaultEntry>
  entries: VaultEntry[]
  isGitVault: boolean
  loadModifiedFiles?: () => Promise<unknown>
  modifiedCount: number
  onCaptureCreated: (entry: VaultEntry) => void
  onOpenCreateVault: () => void
  onOpenNote: (entry: VaultEntry) => void
  onPendingCaptureConsumed?: () => void
  openTabWithContent: (entry: VaultEntry, content: string) => void
  pendingCaptureRequest?: DashboardCaptureRequest | null
  removeEntry: (path: string) => void
  removePendingSave?: (path: string) => void
  setToastMessage: (message: string | null) => void
  syncStatus: SyncStatus
  vaultPath: string
}

/** Owns dashboard-only capture plumbing so normal startup can skip dashboard modules. */
export function DashboardRoute({
  activeVault,
  addEntry,
  addPendingSave,
  conflictCount,
  createTypeEntry,
  entries,
  isGitVault,
  loadModifiedFiles,
  modifiedCount,
  onCaptureCreated,
  onOpenCreateVault,
  onOpenNote,
  onPendingCaptureConsumed,
  openTabWithContent,
  pendingCaptureRequest,
  removeEntry,
  removePendingSave,
  setToastMessage,
  syncStatus,
  vaultPath,
}: DashboardRouteProps) {
  const createDashboardCapture = useDashboardCapture({
    addEntry,
    addPendingSave,
    createTypeEntry,
    entries,
    loadModifiedFiles,
    openTabWithContent,
    removeEntry,
    removePendingSave,
    setToastMessage,
    vaultPath,
  })
  const handleCapture = useCallback(async (...args: Parameters<typeof createDashboardCapture>) => {
    const result = await createDashboardCapture(...args)
    if (result.status === 'created') onCaptureCreated(result.entry)
    return result
  }, [createDashboardCapture, onCaptureCreated])
  const vaultPulsePreview = useVaultPulsePreview(vaultPath, isGitVault)

  return (
    <VaultDashboard
      activeVault={activeVault}
      conflictCount={conflictCount}
      entries={entries}
      isGitVault={isGitVault}
      modifiedCount={modifiedCount}
      onCapture={handleCapture}
      onOpenCreateVault={onOpenCreateVault}
      onOpenNote={onOpenNote}
      onPendingCaptureConsumed={onPendingCaptureConsumed}
      pendingCaptureRequest={pendingCaptureRequest}
      pulseCommits={vaultPulsePreview.commits}
      syncStatus={syncStatus}
      vaultPath={vaultPath}
    />
  )
}
