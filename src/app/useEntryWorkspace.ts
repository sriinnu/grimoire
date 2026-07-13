import { useCallback } from 'react'
import type { DeletedNoteEntry } from '../components/note-list/noteListUtils'
import { extractDeletedContentFromDiff } from '../components/note-list/noteListUtils'
import { openNoteListPropertiesPicker } from '../components/note-list/noteListPropertiesEvents'
import { focusNoteIconPropertyEditor } from '../components/noteIconPropertyEvents'
import { useFolderActions } from '../hooks/useFolderActions'
import { isTauri } from '../mock-tauri'
import type { VaultEntry } from '../types'
import { initializeNoteProperties } from '../utils/initializeNoteProperties'
import { openNoteInNewWindow } from '../utils/openNoteWindow'
import { invokeAppCommand } from './appRuntimeSupport'
import type { NoteWorkspace } from './useNoteWorkspace'
import type { VaultFoundation } from './useVaultFoundation'

export function useEntryWorkspace(foundation: VaultFoundation, workspace: NoteWorkspace) {
  const {
    effectiveSelection, handleSetSelection, resolvedPath, setInspectorCollapsed, setToastMessage,
    updateConfig, vault, vaultConfig,
  } = foundation
  const { notes, queuePendingDiff } = workspace
  const handleInitializeProperties = useCallback(async (path: string) => {
    await initializeNoteProperties(notes.handleUpdateFrontmatter, path)
  }, [notes])

  const handleRemoveNoteIcon = useCallback(async (path: string) => {
    await notes.handleDeleteProperty(path, 'icon')
  }, [notes])

  const handleSetNoteIconCommand = useCallback(() => {
    setInspectorCollapsed(false)
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        focusNoteIconPropertyEditor()
      })
    })
  }, [setInspectorCollapsed])

  const handleCustomizeNoteListColumns = useCallback(() => {
    if (effectiveSelection.kind === 'view') {
      openNoteListPropertiesPicker('view')
      return
    }

    if (effectiveSelection.kind !== 'filter') return
    if (effectiveSelection.filter === 'all') {
      openNoteListPropertiesPicker('all')
      return
    }
    if (effectiveSelection.filter === 'inbox') {
      openNoteListPropertiesPicker('inbox')
    }
  }, [effectiveSelection])

  const handleUpdateAllNotesNoteListProperties = useCallback((value: string[] | null) => {
    updateConfig('allNotes', {
      ...(vaultConfig.allNotes ?? { noteListProperties: null }),
      noteListProperties: value && value.length > 0 ? value : null,
    })
  }, [updateConfig, vaultConfig.allNotes])

  const handleUpdateInboxNoteListProperties = useCallback((value: string[] | null) => {
    updateConfig('inbox', {
      ...(vaultConfig.inbox ?? { noteListProperties: null }),
      noteListProperties: value && value.length > 0 ? value : null,
    })
  }, [updateConfig, vaultConfig.inbox])

  const handleCreateFolder = useCallback(async (name: string) => {
    try {
      await invokeAppCommand('create_vault_folder', { vaultPath: resolvedPath, folderName: name })
      await vault.reloadFolders()
      setToastMessage(`Created folder "${name}"`)
      return true
    } catch (e) {
      setToastMessage(`Failed to create folder: ${e}`)
      return false
    }
  }, [resolvedPath, vault, setToastMessage])

  const folderActions = useFolderActions({
    vaultPath: resolvedPath,
    selection: effectiveSelection,
    setSelection: handleSetSelection,
    setTabs: notes.setTabs,
    activeTabPathRef: notes.activeTabPathRef,
    handleSwitchTab: notes.handleSwitchTab,
    closeAllTabs: notes.closeAllTabs,
    reloadVault: vault.reloadVault,
    reloadFolders: vault.reloadFolders,
    setToastMessage,
  })

  const handleRemoveNoteIconCommand = useCallback(() => {
    if (notes.activeTabPath) handleRemoveNoteIcon(notes.activeTabPath)
  }, [notes.activeTabPath, handleRemoveNoteIcon])

  const handleOpenInNewWindow = useCallback(() => {
    const activeTab = notes.tabs.find(t => t.entry.path === notes.activeTabPath)
    if (activeTab) openNoteInNewWindow(activeTab.entry.path, resolvedPath, activeTab.entry.title)
  }, [notes.tabs, notes.activeTabPath, resolvedPath])

  const handleRevealPathInFinder = useCallback(async (path: string, successMessage: string) => {
    if (!resolvedPath || !path) {
      setToastMessage('Open a vault before revealing files in Finder')
      return
    }
    if (!isTauri()) {
      setToastMessage('Reveal in Finder is available in the Mac app')
      return
    }
    try {
      await invokeAppCommand('reveal_path_in_finder', { vaultPath: resolvedPath, path })
      setToastMessage(successMessage)
    } catch (err) {
      setToastMessage(`Could not reveal in Finder: ${err}`)
    }
  }, [resolvedPath, setToastMessage])

  const handleRevealNoteInFinder = useCallback((path: string) => {
    void handleRevealPathInFinder(path, 'Revealed note in Finder')
  }, [handleRevealPathInFinder])

  const handlePreviewNoteWithQuickLook = useCallback(async (path: string) => {
    if (!resolvedPath || !path) {
      setToastMessage('Open a vault before previewing notes with Quick Look')
      return
    }
    if (!isTauri()) {
      setToastMessage('Quick Look preview is available in the Mac app')
      return
    }
    try {
      await invokeAppCommand('preview_path_with_quick_look', { vaultPath: resolvedPath, path })
      setToastMessage('Opened note in Quick Look')
    } catch (err) {
      setToastMessage(`Could not open Quick Look: ${err}`)
    }
  }, [resolvedPath, setToastMessage])

  const handleRevealVaultInFinder = useCallback(() => {
    void handleRevealPathInFinder(resolvedPath, 'Opened vault in Finder')
  }, [handleRevealPathInFinder, resolvedPath])

  const handleOpenEntryInNewWindow = useCallback((entry: { path: string; title: string }) => {
    openNoteInNewWindow(entry.path, resolvedPath, entry.title)
  }, [resolvedPath])

  const handleDiscardFile = useCallback(async (relativePath: string) => {
    const targetFile = vault.modifiedFiles.find((file) => file.relativePath === relativePath)
    const activePathBefore = notes.activeTabPath
    try {
      await invokeAppCommand('git_discard_file', { vaultPath: resolvedPath, relativePath })
      const reloadedEntries = await vault.reloadVault()
      const affectedActiveTab = !!activePathBefore
        && (activePathBefore === targetFile?.path || activePathBefore.endsWith('/' + relativePath))
      if (!affectedActiveTab) return
      const refreshedEntry = reloadedEntries.find((entry) =>
        entry.path === targetFile?.path || entry.path.endsWith('/' + relativePath),
      )
      if (refreshedEntry) {
        await notes.handleReplaceActiveTab(refreshedEntry)
      } else {
        notes.closeAllTabs()
      }
    } catch (err) {
      setToastMessage(typeof err === 'string' ? err : 'Failed to discard changes')
    }
  }, [resolvedPath, vault, notes, setToastMessage])

  const handleOpenDeletedNote = useCallback(async (entry: DeletedNoteEntry) => {
    let previewContent = 'Content not available (untracked)'
    let hasDiff = false
    try {
      const diff = await vault.loadDiff(entry.path)
      hasDiff = diff.length > 0
      previewContent = extractDeletedContentFromDiff(diff) ?? previewContent
    } catch (err) {
      console.warn('Failed to load deleted note preview:', err)
    }
    notes.openTabWithContent(entry, previewContent)
    if (hasDiff) {
      queuePendingDiff(entry.path)
    } else {
      setToastMessage('Content not available (untracked)')
    }
  }, [vault, notes, queuePendingDiff, setToastMessage])

  const handleReplaceActiveTabWithQueuedDiff = useCallback((entry: VaultEntry) => {
    const openNote = notes.handleReplaceActiveTab(entry)
    if (effectiveSelection.kind === 'filter' && effectiveSelection.filter === 'changes') {
      queuePendingDiff(entry.path)
    }
    return openNote
  }, [effectiveSelection, notes, queuePendingDiff])
  return {
    handleInitializeProperties, handleSetNoteIconCommand, handleCustomizeNoteListColumns,
    handleUpdateAllNotesNoteListProperties, handleUpdateInboxNoteListProperties, handleCreateFolder,
    folderActions, handleRemoveNoteIconCommand, handleOpenInNewWindow, handleRevealNoteInFinder,
    handlePreviewNoteWithQuickLook, handleRevealVaultInFinder, handleOpenEntryInNewWindow,
    handleDiscardFile, handleOpenDeletedNote, handleReplaceActiveTabWithQueuedDiff,
  }
}

export type EntryWorkspace = ReturnType<typeof useEntryWorkspace>
