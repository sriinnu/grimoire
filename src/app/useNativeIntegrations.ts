import { useCallback, useEffect, useState } from 'react'
import type { DetectedRename } from '../components/RenameDetectedBanner'
import { useConflictResolver } from '../hooks/useConflictResolver'
import { isTauri } from '../mock-tauri'
import { invokeTauri } from './appRuntimeSupport'
import type { DeferredAppActions } from './useDeferredAppActions'
import type { VaultFoundation } from './useVaultFoundation'

export function useNativeIntegrations(foundation: VaultFoundation, deferred: DeferredAppActions) {
  const { dialogs, isGitVault, resolvedPath, setToastMessage, vault } = foundation
  const [detectedRenames, setDetectedRenames] = useState<DetectedRename[]>([])
  useEffect(() => {
    if (!isTauri() || !resolvedPath || !isGitVault) return
    const handleFocus = () => {
      invokeTauri<DetectedRename[]>('detect_renames', { vaultPath: resolvedPath })
        .then(renames => { if (renames.length > 0) setDetectedRenames(renames) })
        .catch((err) => console.warn('[vault] Git rename detection failed:', err))
    }
    window.addEventListener('focus', handleFocus)
    return () => window.removeEventListener('focus', handleFocus)
  }, [isGitVault, resolvedPath])

  useEffect(() => {
    if (!isTauri()) return
    let unlisten: (() => void) | undefined
    let cancelled = false
    import('@tauri-apps/api/window').then(({ getCurrentWindow }) => {
      if (cancelled) return
      const currentWindow = getCurrentWindow()
      if (typeof currentWindow.onFocusChanged !== 'function') return
      currentWindow.onFocusChanged(({ payload: focused }) => {
        document.body.classList.toggle('window-inactive', !focused)
      }).then(fn => { unlisten = fn })
    }).catch(() => {
      // Window focus styling is optional polish; unsupported runtimes stay usable.
    })
    return () => {
      cancelled = true
      unlisten?.()
    }
  }, [])

  const handleUpdateWikilinks = useCallback(async () => {
    if (!isTauri()) return
    try {
      const count = await invokeTauri<number>('update_wikilinks_for_renames', {
        vaultPath: resolvedPath,
        renames: detectedRenames,
      })
      setDetectedRenames([])
      vault.reloadVault()
      setToastMessage(`Updated wikilinks in ${count} file${count !== 1 ? 's' : ''}`)
    } catch (err) {
      setToastMessage(`Failed to update wikilinks: ${err}`)
    }
  }, [detectedRenames, resolvedPath, setToastMessage, vault])
  const handleDismissRenames = useCallback(() => setDetectedRenames([]), [])
  const conflictResolver = useConflictResolver({
    vaultPath: resolvedPath,
    onResolved: () => {
      dialogs.closeConflictResolver()
      deferred.onConflictsResolved.current()
    },
    onToast: setToastMessage,
    onOpenFile: (relativePath) => deferred.openConflictFile.current(relativePath),
  })

  return { detectedRenames, handleUpdateWikilinks, handleDismissRenames, conflictResolver }
}
