import { useCallback, useEffect, useRef, useState } from 'react'
import { useAiActivity } from '../hooks/useAiActivity'
import { useAppNavigation } from '../hooks/useAppNavigation'
import { useAppSave } from '../hooks/useAppSave'
import { useAutoSync } from '../hooks/useAutoSync'
import { useConflictFlow } from '../hooks/useConflictFlow'
import type { CommitDiffRequest } from '../hooks/useDiffMode'
import { useNoteActions } from '../hooks/useNoteActions'
import { useSearchResultNavigation } from '../hooks/useVaultSearchNavigation'
import { useVaultBridge } from '../hooks/useVaultBridge'
import { isTauri } from '../mock-tauri'
import type { SidebarSelection, VaultEntry } from '../types'
import { refreshPulledVaultState } from '../utils/pulledVaultRefresh'
import { createPulseDeletedNoteEntry, loadNoteWindowContent, resolveNoteWindowEntry, selectionScreenKey } from './appRuntimeSupport'
import type { DeferredAppActions } from './useDeferredAppActions'
import type { useNativeIntegrations } from './useNativeIntegrations'
import type { VaultFoundation } from './useVaultFoundation'

type NativeIntegrations = ReturnType<typeof useNativeIntegrations>

export function useNoteWorkspace(
  foundation: VaultFoundation,
  native: NativeIntegrations,
  deferred: DeferredAppActions,
) {
  const {
    dialogs, gitRemoteStatus, handleEnterNeighborhood, handleSetSelection, handleStatusBarSwitchVault,
    isGitVault, noteWindowParams, resolvedPath, selectionRef, setToastMessage, settings, vault,
  } = foundation
  const { conflictResolver } = native
  const flushPendingRawContentRef = useRef<((path: string) => void) | null>(null)
  const flushEditorStateBeforeAction = (path: string) => deferred.flushEditorState.current(path)

  const notes = useNoteActions({
    addEntry: vault.addEntry,
    removeEntry: vault.removeEntry,
    entries: vault.entries,
    flushBeforeNoteSwitch: flushEditorStateBeforeAction,
    flushBeforeFrontmatterChange: flushEditorStateBeforeAction,
    flushBeforePathRename: flushEditorStateBeforeAction,
    reloadVault: vault.reloadVault,
    setToastMessage,
    updateEntry: vault.updateEntry,
    vaultPath: resolvedPath,
    addPendingSave: vault.addPendingSave,
    removePendingSave: vault.removePendingSave,
    trackUnsaved: vault.trackUnsaved,
    clearUnsaved: vault.clearUnsaved,
    unsavedPaths: vault.unsavedPaths,
    markContentPending: (path, content) => deferred.markContentPending.current(path, content),
    onNewNotePersisted: vault.loadModifiedFiles,
    replaceEntry: vault.replaceEntry,
    onFrontmatterPersisted: vault.loadModifiedFiles,
    onPathRenamed: (oldPath, newPath) => deferred.trackRenamedPath.current(oldPath, newPath),
  })
  const {
    handleSelectNote,
    handleReplaceActiveTab,
    closeAllTabs,
    openTabWithContent,
  } = notes
  deferred.closeAllTabs.current = closeAllTabs
  const noteWindowActionsRef = useRef({ handleSelectNote, openTabWithContent })
  useEffect(() => {
    noteWindowActionsRef.current = { handleSelectNote, openTabWithContent }
  }, [handleSelectNote, openTabWithContent])
  // Switching primary screens from the sidebar (Pages → Dreams → Journal → …)
  // should not leave the previously opened document in the editor. A genuine
  // change to a different screen closes open tabs; re-selecting the current
  // screen and neighborhood/entity focus leave the editor untouched. Note opens
  // go through onSelectNote, not this handler, so they are unaffected.
  const handleSidebarSelect = useCallback(
    (sel: SidebarSelection, options?: { preserveNeighborhoodHistory?: boolean }) => {
      const nextKey = selectionScreenKey(sel)
      const currentKey = selectionScreenKey(selectionRef.current)
      handleSetSelection(sel, options)
      if (nextKey !== null && nextKey !== currentKey) {
        closeAllTabs()
      }
    },
    [handleSetSelection, closeAllTabs, selectionRef],
  )
  const handleDashboardCaptureCreated = useCallback((entry: VaultEntry) => {
    const typeName = entry.isA
    handleSetSelection(typeName && typeName !== 'Note'
      ? { kind: 'sectionGroup', type: typeName }
      : { kind: 'filter', filter: 'all' })
  }, [handleSetSelection])
  const handleDashboardOpenNote = useCallback((entry: VaultEntry) => {
    const typeName = entry.isA
    handleSetSelection(typeName && typeName !== 'Note'
      ? { kind: 'sectionGroup', type: typeName }
      : { kind: 'filter', filter: 'all' })
    void handleSelectNote(entry)
  }, [handleSelectNote, handleSetSelection])
  const handleSearchResultSelect = useSearchResultNavigation({
    entries: vault.entries,
    isLoading: vault.isLoading,
    onOpenEntry: handleDashboardOpenNote,
    onSwitchVault: handleStatusBarSwitchVault,
    onToast: setToastMessage,
    resolvedPath,
  })
  const handlePulledVaultUpdate = useCallback(async (updatedFiles: string[]) => {
    await refreshPulledVaultState({
      activeTabPath: notes.activeTabPath,
      closeAllTabs,
      hasUnsavedChanges: (path) => vault.unsavedPaths.has(path),
      reloadFolders: vault.reloadFolders,
      reloadVault: vault.reloadVault,
      reloadViews: vault.reloadViews,
      replaceActiveTab: handleReplaceActiveTab,
      updatedFiles,
      vaultPath: resolvedPath,
    })
  }, [
      closeAllTabs,
      handleReplaceActiveTab,
      notes.activeTabPath,
      resolvedPath,
      vault.reloadFolders,
      vault.reloadVault,
      vault.reloadViews,
      vault.unsavedPaths,
    ])
  const autoSync = useAutoSync({
    vaultPath: resolvedPath,
    enabled: isGitVault,
    intervalMinutes: settings.auto_pull_interval_minutes,
    onVaultUpdated: handlePulledVaultUpdate,
    onConflict: (files) => {
      const names = files.map((f) => f.split('/').pop()).join(', ')
      setToastMessage(`Conflict in ${names} — click to resolve`)
    },
    onToast: (msg) => setToastMessage(msg),
  })
  const effectiveRemoteStatus = autoSync.remoteStatus ?? gitRemoteStatus.remoteStatus
  const canAddRemote = !isGitVault || effectiveRemoteStatus?.hasRemote === false
  const pendingDiffRequestIdRef = useRef(0)
  const [pendingDiffRequest, setPendingDiffRequest] = useState<CommitDiffRequest | null>(null)

  // Note window: auto-open the note from URL params without scanning the whole vault.
  const noteWindowOpenedRef = useRef(false)
  const noteWindowMissingPathRef = useRef<string | null>(null)
  useEffect(() => {
    if (!noteWindowParams || noteWindowOpenedRef.current) return

    void resolveNoteWindowEntry(noteWindowParams).then(async (entry) => {
      if (noteWindowOpenedRef.current) return
      if (entry) {
        try {
          const content = await loadNoteWindowContent(entry.path, noteWindowParams.vaultPath)
          if (noteWindowOpenedRef.current) return
          noteWindowOpenedRef.current = true
          noteWindowMissingPathRef.current = null
          noteWindowActionsRef.current.openTabWithContent(entry, content)
        } catch {
          if (noteWindowOpenedRef.current) return
          noteWindowOpenedRef.current = true
          noteWindowMissingPathRef.current = null
          void noteWindowActionsRef.current.handleSelectNote(entry)
        }
        return
      }
      if (noteWindowMissingPathRef.current === noteWindowParams.notePath) return
      noteWindowMissingPathRef.current = noteWindowParams.notePath
      setToastMessage(`Could not open "${noteWindowParams.noteTitle}" in this window`)
    })
  }, [noteWindowParams, setToastMessage])

  // Note window: update window title when active note changes
  useEffect(() => {
    if (!noteWindowParams) return
    const activeEntry = notes.tabs.find(t => t.entry.path === notes.activeTabPath)?.entry
    const title = activeEntry?.title ?? noteWindowParams.noteTitle
    if (!isTauri()) { document.title = title; return }
    import('@tauri-apps/api/window').then(({ getCurrentWindow }) => {
      getCurrentWindow().setTitle(title)
    }).catch((err) => console.warn('[window] Failed to update note window title:', err))
  }, [noteWindowParams, notes.tabs, notes.activeTabPath])

  // Keep note entry in sync with vault entries so banners (trash/archive)
  // and read-only state react immediately without reopening the note.
  useEffect(() => {
    notes.setTabs(prev => {
      let changed = false
      const next = prev.map(tab => {
        const fresh = vault.entries.find(e => e.path === tab.entry.path)
        if (fresh && fresh !== tab.entry) {
          changed = true
          return { ...tab, entry: fresh }
        }
        return tab
      })
      return changed ? next : prev
    })
  }, [vault.entries]) // eslint-disable-line react-hooks/exhaustive-deps -- notes.setTabs is stable (useState setter)

  const { handleGoBack, handleGoForward, canGoBack, canGoForward, entriesByPath } = useAppNavigation({
    entries: vault.entries,
    activeTabPath: notes.activeTabPath,
    onSelectNote: notes.handleSelectNote,
  })

  const queuePendingDiff = useCallback((path: string, commitHash?: string) => {
    pendingDiffRequestIdRef.current += 1
    setPendingDiffRequest({
      requestId: pendingDiffRequestIdRef.current,
      path,
      commitHash,
    })
  }, [])

  const handlePendingDiffHandled = useCallback((requestId: number) => {
    setPendingDiffRequest((current) =>
      current?.requestId === requestId ? null : current,
    )
  }, [])

  const handlePulseOpenNote = useCallback((relativePath: string, commitHash?: string) => {
    const fullPath = `${resolvedPath}/${relativePath}`
    const entry = entriesByPath.get(fullPath) ?? entriesByPath.get(relativePath)

    if (commitHash) {
      const targetPath = entry?.path ?? fullPath
      queuePendingDiff(targetPath, commitHash)
      if (entry) {
        void handleSelectNote(entry)
      } else {
        openTabWithContent(createPulseDeletedNoteEntry(fullPath, relativePath), 'Content not available')
      }
      return
    }

    if (entry) {
      void handleSelectNote(entry)
    }
  }, [entriesByPath, resolvedPath, queuePendingDiff, handleSelectNote, openTabWithContent])

  const handleOpenFavorite = useCallback(async (entry: VaultEntry) => {
    await handleReplaceActiveTab(entry)
    handleEnterNeighborhood(entry)
  }, [handleEnterNeighborhood, handleReplaceActiveTab])

  const vaultBridge = useVaultBridge({
    entriesByPath,
    resolvedPath,
    reloadVault: vault.reloadVault,
    reloadFolders: vault.reloadFolders,
    reloadViews: vault.reloadViews,
    closeAllTabs,
    replaceActiveTab: handleReplaceActiveTab,
    hasUnsavedChanges: (path) => vault.unsavedPaths.has(path),
    onSelectNote: notes.handleSelectNote,
    activeTabPath: notes.activeTabPath,
  })

  const conflictFlow = useConflictFlow({
    resolvedPath, entries: vault.entries,
    conflictFiles: autoSync.conflictFiles,
    pausePull: autoSync.pausePull, resumePull: autoSync.resumePull,
    triggerSync: autoSync.triggerSync, reloadVault: vault.reloadVault,
    initConflictFiles: conflictResolver.initFiles,
    openConflictResolver: dialogs.openConflictResolver,
    closeConflictResolver: dialogs.closeConflictResolver,
    onSelectNote: notes.handleSelectNote,
    activeTabPath: notes.activeTabPath,
    setToastMessage,
  })

  const appSave = useAppSave({
    updateEntry: vault.updateEntry, setTabs: notes.setTabs, handleSwitchTab: notes.handleSwitchTab, setToastMessage,
    loadModifiedFiles: vault.loadModifiedFiles, reloadViews: async () => { await vault.reloadViews() },
    trackUnsaved: vault.trackUnsaved, clearUnsaved: vault.clearUnsaved, unsavedPaths: vault.unsavedPaths,
    tabs: notes.tabs, activeTabPath: notes.activeTabPath,
    handleRenameNote: notes.handleRenameNote, handleRenameFilename: notes.handleRenameFilename,
    replaceEntry: vault.replaceEntry, resolvedPath,
    initialH1AutoRenameEnabled: settings.initial_h1_auto_rename_enabled !== false,
  })
  deferred.flushEditorState.current = async (path) => {
    flushPendingRawContentRef.current?.(path)
    await appSave.flushBeforeAction(path)
  }
  deferred.markContentPending.current = (path, content) => appSave.contentChangeRef.current(path, content)
  deferred.trackRenamedPath.current = appSave.trackRenamedPath
  deferred.onConflictsResolved.current = () => {
    autoSync.resumePull()
    vault.reloadVault()
    autoSync.triggerSync()
  }
  deferred.openConflictFile.current = (relativePath) => conflictFlow.openConflictFileRef.current(relativePath)

  const aiActivity = useAiActivity({
    onOpenNote: vaultBridge.openNoteByPath,
    onOpenTab: vaultBridge.openNoteByPath,
    onSetFilter: (filterType) => {
      handleSetSelection({ kind: 'sectionGroup', type: filterType })
    },
    onVaultChanged: () => { vault.reloadVault() },
  })

  return {
    flushPendingRawContentRef, notes, handleSelectNote, handleReplaceActiveTab, closeAllTabs,
    openTabWithContent, handleSidebarSelect, handleDashboardCaptureCreated, handleDashboardOpenNote,
    handleSearchResultSelect, autoSync, effectiveRemoteStatus, canAddRemote, pendingDiffRequest,
    handlePendingDiffHandled, queuePendingDiff, handlePulseOpenNote, handleOpenFavorite, vaultBridge, conflictFlow,
    appSave, aiActivity, handleGoBack, handleGoForward, canGoBack, canGoForward,
  }
}

export type NoteWorkspace = ReturnType<typeof useNoteWorkspace>
