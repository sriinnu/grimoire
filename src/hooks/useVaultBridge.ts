import { useCallback } from 'react'
import type { VaultEntry } from '../types'
import { refreshPulledVaultState } from '../utils/pulledVaultRefresh'

interface VaultBridgeDeps {
  entriesByPath: Map<string, VaultEntry>
  resolvedPath: string
  /**
   * Incremental vault refresh (no cache invalidation). Agent writes are plain
   * uncommitted changes, so a soft reload picks them up without the full
   * rescan reserved for vault switches and manual refreshes.
   *
   * `extraPaths` names files to force-re-parse even when git cannot see them
   * (gitignored notes). Resolves to `null` when the reload aborted — callers
   * treat that as "keep current state", never as an empty vault.
   */
  reloadVaultSoft: (extraPaths?: string[]) => Promise<VaultEntry[] | null>
  /**
   * Hard vault refresh (cache invalidation + full rescan). Used only for the
   * pathless bulk vault-changed event: without knowing which files changed,
   * the full scan is the only path that stays correct for gitignored notes.
   */
  reloadVault: () => Promise<VaultEntry[] | null>
  reloadFolders: () => Promise<unknown> | unknown
  reloadViews: () => Promise<unknown> | unknown
  closeAllTabs: () => void
  replaceActiveTab: (entry: VaultEntry) => Promise<void>
  hasUnsavedChanges: (path: string) => boolean
  onSelectNote: (entry: VaultEntry) => void
  activeTabPath: string | null
}

function findEntry(entriesByPath: Map<string, VaultEntry>, resolvedPath: string, path: string): VaultEntry | undefined {
  return entriesByPath.get(path) ?? entriesByPath.get(`${resolvedPath}/${path}`)
}

function findInFresh(entries: VaultEntry[], resolvedPath: string, path: string): VaultEntry | undefined {
  return entries.find(e => e.path === path || e.path === `${resolvedPath}/${path}`)
}

export function useVaultBridge({
  entriesByPath,
  resolvedPath,
  reloadVaultSoft,
  reloadVault,
  reloadFolders,
  reloadViews,
  closeAllTabs,
  replaceActiveTab,
  hasUnsavedChanges,
  onSelectNote,
  activeTabPath,
}: VaultBridgeDeps) {
  const reloadAndOpen = useCallback((path: string) => {
    reloadVaultSoft([path]).then(fresh => {
      if (!fresh) return // reload aborted — keep current state
      const entry = findInFresh(fresh, resolvedPath, path)
      if (entry) onSelectNote(entry)
    })
  }, [reloadVaultSoft, onSelectNote, resolvedPath])

  const refreshAgentChanges = useCallback((updatedFiles: string[]) => (
    refreshPulledVaultState({
      activeTabPath,
      closeAllTabs,
      hasUnsavedChanges,
      reloadFolders,
      // Per-file agent events know exactly which paths changed, so the soft
      // reload force-re-parses them even when git can't see them (gitignored
      // notes). The pathless bulk event can't name its files, so it falls
      // back to the hard reload — the only path that stays correct for
      // gitignored files. Bulk events are much rarer than per-file ones, so
      // the incremental perf win is preserved where it matters.
      reloadVault: updatedFiles.length > 0
        ? () => reloadVaultSoft(updatedFiles)
        : reloadVault,
      reloadViews,
      replaceActiveTab,
      updatedFiles,
      vaultPath: resolvedPath,
    })
  ), [
    activeTabPath,
    closeAllTabs,
    hasUnsavedChanges,
    reloadFolders,
    reloadVault,
    reloadVaultSoft,
    reloadViews,
    replaceActiveTab,
    resolvedPath,
  ])

  const openNoteByPath = useCallback((path: string) => {
    const entry = findEntry(entriesByPath, resolvedPath, path)
    if (entry) onSelectNote(entry)
    else reloadAndOpen(path)
  }, [entriesByPath, resolvedPath, onSelectNote, reloadAndOpen])

  const handlePulseOpenNote = useCallback((relativePath: string) => {
    const entry = findEntry(entriesByPath, resolvedPath, `${resolvedPath}/${relativePath}`)
      ?? entriesByPath.get(relativePath)
    if (entry) onSelectNote(entry)
  }, [entriesByPath, resolvedPath, onSelectNote])

  const handleAgentFileModified = useCallback((relativePath: string) => {
    void refreshAgentChanges([relativePath])
  }, [refreshAgentChanges])

  const handleAgentVaultChanged = useCallback(() => {
    void refreshAgentChanges([])
  }, [refreshAgentChanges])

  return {
    openNoteByPath,
    handlePulseOpenNote,
    handleAgentFileCreated: reloadAndOpen,
    handleAgentFileModified,
    handleAgentVaultChanged,
  }
}
