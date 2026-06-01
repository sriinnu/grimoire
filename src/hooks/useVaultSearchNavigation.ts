import { useCallback, useEffect, useMemo, useState } from 'react'
import type { VaultOption } from '../components/status-bar/types'
import type { SearchResult, VaultEntry } from '../types'

interface VaultSearchScope {
  path: string
  label: string
}

interface VaultSearchScopeOptions {
  activeVaultLabel?: string
  allVaults: VaultOption[]
  resolvedPath: string
}

interface SearchResultNavigationOptions {
  entries: VaultEntry[]
  isLoading: boolean
  onOpenEntry: (entry: VaultEntry) => void
  onSwitchVault: (path: string) => void
  onToast: (message: string) => void
  resolvedPath: string
}

function labelFromVaultPath(path: string): string {
  return path.split('/').filter(Boolean).pop() || 'Local Vault'
}

/** Builds available vault scopes for the sidebar Spotlight search. */
export function useVaultSearchScopes({
  activeVaultLabel,
  allVaults,
  resolvedPath,
}: VaultSearchScopeOptions): VaultSearchScope[] {
  return useMemo(() => {
    const scopes = allVaults
      .filter((vaultOption) => vaultOption.available !== false && vaultOption.path.trim().length > 0)
      .map((vaultOption) => ({ path: vaultOption.path, label: vaultOption.label }))

    if (!scopes.some((scope) => scope.path === resolvedPath) && resolvedPath.trim().length > 0) {
      scopes.unshift({
        path: resolvedPath,
        label: activeVaultLabel ?? labelFromVaultPath(resolvedPath),
      })
    }

    return scopes
  }, [activeVaultLabel, allVaults, resolvedPath])
}

/** Opens active-vault results immediately and defers cross-vault results until the target vault loads. */
export function useSearchResultNavigation({
  entries,
  isLoading,
  onOpenEntry,
  onSwitchVault,
  onToast,
  resolvedPath,
}: SearchResultNavigationOptions) {
  const [pendingOpen, setPendingOpen] = useState<{ vaultPath: string; path: string } | null>(null)

  const handleSearchResultSelect = useCallback((result: SearchResult) => {
    const activeEntry = entries.find((entry) => entry.path === result.path)
    if (activeEntry) {
      onOpenEntry(activeEntry)
      return
    }

    const targetVaultPath = result.vaultPath ?? resolvedPath
    if (targetVaultPath !== resolvedPath) {
      setPendingOpen({ vaultPath: targetVaultPath, path: result.path })
      onSwitchVault(targetVaultPath)
      return
    }

    onToast(`Search result is not loaded in this vault: ${result.title}`)
  }, [entries, onOpenEntry, onSwitchVault, onToast, resolvedPath])

  useEffect(() => {
    if (!pendingOpen) return
    if (resolvedPath !== pendingOpen.vaultPath || isLoading) return

    const entry = entries.find((candidate) => candidate.path === pendingOpen.path)
    if (entry) {
      onOpenEntry(entry)
    } else {
      onToast('Search result was found, but the target vault did not load that file.')
    }
    setPendingOpen(null)
  }, [entries, isLoading, onOpenEntry, onToast, pendingOpen, resolvedPath])

  return handleSearchResultSelect
}
