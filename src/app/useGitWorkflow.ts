import { useCallback, useEffect, useMemo } from 'react'
import { useAutoGit } from '../hooks/useAutoGit'
import { useCommitFlow } from '../hooks/useCommitFlow'
import { useDeleteActions } from '../hooks/useDeleteActions'
import { useEntryActions } from '../hooks/useEntryActions'
import { isTauri, mockInvoke } from '../mock-tauri'
import { triggerCommitEntryAction } from '../utils/commitEntryAction'
import { generateCommitMessage } from '../utils/commitMessage'
import { appendMarkdownBlock } from '../utils/markdownBlock'
import type { NoteWorkspace } from './useNoteWorkspace'
import type { VaultFoundation } from './useVaultFoundation'

export function useGitWorkflow(foundation: VaultFoundation, workspace: NoteWorkspace) {
  const { gitRemoteStatus, isGitVault, resolvedPath, setToastMessage, settings, vault } = foundation
  const { appSave, autoSync, notes } = workspace
  const commitFlow = useCommitFlow({
    enabled: isGitVault,
    savePending: appSave.savePending,
    loadModifiedFiles: vault.loadModifiedFiles,
    resolveRemoteStatus: gitRemoteStatus.refreshRemoteStatus,
    setToastMessage,
    onPushRejected: autoSync.handlePushRejected,
    vaultPath: resolvedPath,
  })
  const suggestedCommitMessage = useMemo(() => generateCommitMessage(vault.modifiedFiles), [vault.modifiedFiles])
  const modifiedFilesSignature = useMemo(
    () => vault.modifiedFiles.map((file) => `${file.relativePath}:${file.status}`).sort().join('|'),
    [vault.modifiedFiles],
  )
  const autoGit = useAutoGit({
    enabled: settings.autogit_enabled === true,
    idleThresholdSeconds: settings.autogit_idle_threshold_seconds ?? 90,
    inactiveThresholdSeconds: settings.autogit_inactive_threshold_seconds ?? 30,
    isGitVault,
    hasPendingChanges: vault.modifiedFiles.length > 0
      || ((autoSync.remoteStatus?.hasRemote ?? false) && (autoSync.remoteStatus?.ahead ?? 0) > 0),
    hasUnsavedChanges: vault.unsavedPaths.size > 0,
    onCheckpoint: () => commitFlow.runAutomaticCheckpoint(),
  })
  const recordAutoGitActivity = autoGit.recordActivity
  const openCommitDialog = commitFlow.openCommitDialog
  const runAutomaticCheckpoint = commitFlow.runAutomaticCheckpoint
  const handleAppContentChange = appSave.handleContentChange
  const handleAppSave = appSave.handleSave
  const loadModifiedFiles = vault.loadModifiedFiles

  useEffect(() => {
    if (modifiedFilesSignature.length === 0) return
    recordAutoGitActivity()
  }, [modifiedFilesSignature, recordAutoGitActivity])

  const handleCommitPush = useCallback(() => {
    if (!isGitVault) {
      setToastMessage('Git is not enabled for this vault')
      return
    }
    triggerCommitEntryAction({
      autoGitEnabled: settings.autogit_enabled === true,
      openCommitDialog,
      runAutomaticCheckpoint,
    })
  }, [isGitVault, openCommitDialog, runAutomaticCheckpoint, settings.autogit_enabled, setToastMessage])

  const handleTrackedContentChange = useCallback((path: string, content: string) => {
    recordAutoGitActivity()
    handleAppContentChange(path, content)
  }, [handleAppContentChange, recordAutoGitActivity])

  const handleInsertWeatherSnapshot = useCallback((markdown: string) => {
    const activePath = notes.activeTabPath
    const activeTab = activePath
      ? notes.tabs.find((tab) => tab.entry.path === activePath)
      : null

    if (!activePath || !activeTab) {
      setToastMessage('Open a note before adding weather')
      return
    }

    handleTrackedContentChange(activePath, appendMarkdownBlock(activeTab.content, markdown))
    setToastMessage('Weather added to note')
  }, [handleTrackedContentChange, notes.activeTabPath, notes.tabs, setToastMessage])

  const handleTrackedSave = useCallback(async (...args: Parameters<typeof handleAppSave>) => {
    const result = await handleAppSave(...args)
    recordAutoGitActivity()
    return result
  }, [handleAppSave, recordAutoGitActivity])

  const seedAutoGitSavedChange = useCallback(async () => {
    if (isTauri()) {
      throw new Error('seedAutoGitSavedChange is only available in browser smoke tests')
    }

    const activePath = notes.activeTabPath
    const activeTab = activePath
      ? notes.tabs.find((tab) => tab.entry.path === activePath)
      : null

    if (!activePath || !activeTab) {
      throw new Error('No active note is available for the AutoGit test bridge')
    }

    const saveNoteContent = window.__mockHandlers?.save_note_content
    if (typeof saveNoteContent === 'function') {
      await Promise.resolve(saveNoteContent({ path: activePath, content: activeTab.content }))
    } else {
      await mockInvoke('save_note_content', { path: activePath, content: activeTab.content })
    }

    await loadModifiedFiles()
    recordAutoGitActivity()
  }, [loadModifiedFiles, notes.activeTabPath, notes.tabs, recordAutoGitActivity])

  useEffect(() => {
    window.__grimoireTest = {
      ...window.__grimoireTest,
      activeTabPath: notes.activeTabPath,
      seedAutoGitSavedChange,
    }

    return () => {
      if (window.__grimoireTest?.seedAutoGitSavedChange === seedAutoGitSavedChange) {
        delete window.__grimoireTest.seedAutoGitSavedChange
      }
    }
  }, [notes.activeTabPath, seedAutoGitSavedChange])

  const entryActions = useEntryActions({
    entries: vault.entries, updateEntry: vault.updateEntry,
    handleUpdateFrontmatter: notes.handleUpdateFrontmatter,
    handleDeleteProperty: notes.handleDeleteProperty, setToastMessage,
    createTypeEntry: notes.createTypeEntrySilent,
    onBeforeAction: appSave.flushBeforeAction,
  })

  const deleteActions = useDeleteActions({
    onDeselectNote: (path: string) => { if (notes.activeTabPath === path) notes.closeAllTabs() },
    removeEntry: vault.removeEntry,
    removeEntries: vault.removeEntries,
    refreshModifiedFiles: vault.loadModifiedFiles,
    reloadVault: vault.reloadVault,
    setToastMessage,
  })

  return {
    commitFlow, suggestedCommitMessage, handleCommitPush, handleTrackedContentChange,
    handleInsertWeatherSnapshot, handleTrackedSave, entryActions, deleteActions,
  }
}

export type GitWorkflow = ReturnType<typeof useGitWorkflow>
