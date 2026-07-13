import { useCallback, useEffect, useMemo, useRef } from 'react'
import { useAudioTranscription } from '../hooks/useAudioTranscription'
import { useBuildNumber } from '../hooks/useBuildNumber'
import {
  applyMainWindowSizeConstraints,
  getMainWindowMinWidth,
  useMainWindowSizeConstraints,
} from '../hooks/useMainWindowSizeConstraints'
import { useNoteLayout } from '../hooks/useNoteLayout'
import { useNoteRetargetingUi } from '../hooks/useNoteRetargetingUi'
import { useSidebarColumnCollapse } from '../hooks/useSidebarColumnCollapse'
import { restartApp, useUpdater } from '../hooks/useUpdater'
import { useViewMode, type ViewMode } from '../hooks/useViewMode'
import { useZoom } from '../hooks/useZoom'
import { normalizeReleaseChannel } from '../lib/releaseChannel'
import type { VaultEntry } from '../types'
import { hasNoteIconValue } from '../utils/noteIcon'
import {
  focusNoteListContainer,
  isEditableElement,
  isEditorEscapeTarget,
  shouldProcessNeighborhoodEscape,
} from '../utils/neighborhoodHistory'
import { getNextVisibleInboxEntry, invokeAppCommand } from './appRuntimeSupport'
import type { EntryWorkspace } from './useEntryWorkspace'
import type { GitWorkflow } from './useGitWorkflow'
import type { NoteWorkspace } from './useNoteWorkspace'
import type { VaultFoundation } from './useVaultFoundation'

export function useAppShellState(
  foundation: VaultFoundation,
  workspace: NoteWorkspace,
  entryWorkspace: EntryWorkspace,
  gitWorkflow: GitWorkflow,
) {
  const {
    closeGraphModal, dialogs, effectiveSelection, explicitOrganizationEnabled,
    handleNeighborhoodHistoryBack, handleSetSelection, layout, noteWindowParams,
    openDashboardCapture, openWeatherSnapshotDialog, refreshVaultAiGuidance, resolvedPath,
    selectionRef, setToastMessage, settings, showAudioRecordingDialog, showFeedback,
    showGraphModal, showMcpSetupDialog, showWeatherSnapshotDialog, vault, vaultSwitcher,
    visibleNotesRef,
  } = foundation
  const { handleSelectNote, notes } = workspace
  const { handleDiscardFile } = entryWorkspace
  const { entryActions } = gitWorkflow
  const rawToggleRef = useRef<() => void>(() => {})
  // Diff-toggle ref: Editor registers its handleToggleDiff here so the command palette can call it
  const diffToggleRef = useRef<() => void>(() => {})

  const { setViewMode, sidebarVisible, noteListVisible } = useViewMode(noteWindowParams ? 'editor-only' : undefined)
  const { sidebarColumnCollapsed, setSidebarColumnCollapsed } = useSidebarColumnCollapse()
  const { noteLayout, toggleNoteLayout } = useNoteLayout()
  const zoom = useZoom()
  const buildNumber = useBuildNumber()

  const updateMainWindowConstraints = useCallback((
    nextSidebarVisible: boolean,
    nextNoteListVisible: boolean,
    nextInspectorCollapsed: boolean = layout.inspectorCollapsed,
    nextSidebarCollapsed: boolean = sidebarColumnCollapsed,
  ) => {
    if (noteWindowParams) return

    const minWidth = getMainWindowMinWidth({
      sidebarVisible: nextSidebarVisible,
      sidebarCollapsed: nextSidebarCollapsed,
      noteListVisible: nextNoteListVisible,
      inspectorCollapsed: nextInspectorCollapsed,
    })

    void applyMainWindowSizeConstraints(minWidth).catch((err) => console.warn('[window] Size constraints failed:', err))
  }, [layout.inspectorCollapsed, noteWindowParams, sidebarColumnCollapsed])

  const handleSetViewMode = useCallback((mode: ViewMode) => {
    setViewMode(mode)
    updateMainWindowConstraints(mode === 'all', mode !== 'editor-only')
  }, [setViewMode, updateMainWindowConstraints])

  const handleToggleInspector = useCallback(() => {
    const nextInspectorCollapsed = !layout.inspectorCollapsed
    layout.setInspectorCollapsed(nextInspectorCollapsed)
    updateMainWindowConstraints(sidebarVisible, noteListVisible, nextInspectorCollapsed)
  }, [
    layout,
    noteListVisible,
    sidebarVisible,
    updateMainWindowConstraints,
  ])

  const handleSetSidebarColumnCollapsed = useCallback((collapsed: boolean) => {
    setSidebarColumnCollapsed(collapsed)
    updateMainWindowConstraints(sidebarVisible, noteListVisible, layout.inspectorCollapsed, collapsed)
  }, [
    layout.inspectorCollapsed,
    noteListVisible,
    setSidebarColumnCollapsed,
    sidebarVisible,
    updateMainWindowConstraints,
  ])

  useMainWindowSizeConstraints({
    enabled: !noteWindowParams,
    sidebarVisible,
    sidebarCollapsed: sidebarColumnCollapsed,
    noteListVisible,
    inspectorCollapsed: layout.inspectorCollapsed,
  })

  const { status: updateStatus, actions: updateActions } = useUpdater(settings.release_channel)

  const handleCheckForUpdates = useCallback(async () => {
    if (updateStatus.state === 'downloading') {
      setToastMessage('Update is downloading…')
      return
    }
    if (updateStatus.state === 'ready') {
      await restartApp()
      return
    }
    const result = await updateActions.checkForUpdates()
    if (result.kind === 'up-to-date') {
      const checkedChannel = normalizeReleaseChannel(settings.release_channel)
      setToastMessage(`No newer ${checkedChannel} update is available right now`)
    } else if (result.kind === 'available') {
      setToastMessage(`Grimoire ${result.displayVersion} is available`)
    } else {
      setToastMessage(result.message)
    }
  }, [settings.release_channel, updateActions, updateStatus.state, setToastMessage])

  const handleRepairVault = useCallback(async () => {
    if (!resolvedPath) return
    try {
      const msg = await invokeAppCommand<string>('repair_vault', { vaultPath: resolvedPath })
      await vault.reloadVault()
      await refreshVaultAiGuidance()
      setToastMessage(msg)
    } catch (err) {
      setToastMessage(`Failed to repair vault: ${err}`)
    }
  }, [refreshVaultAiGuidance, resolvedPath, vault, setToastMessage])

  const restoreVaultAiGuidance = useCallback(async (successToast: string | null = 'Grimoire AI guidance restored') => {
    if (!resolvedPath) return
    try {
      await invokeAppCommand('restore_vault_ai_guidance', { vaultPath: resolvedPath })
      await vault.reloadVault()
      await refreshVaultAiGuidance()
      if (successToast) setToastMessage(successToast)
    } catch (err) {
      setToastMessage(`Failed to restore Grimoire AI guidance: ${err}`)
    }
  }, [refreshVaultAiGuidance, resolvedPath, vault, setToastMessage])

  const activeDeletedFile = useMemo(() => {
    const activeTabPath = notes.activeTabPath
    if (!activeTabPath) return null
    return vault.modifiedFiles.find((file) =>
      file.status === 'deleted'
      && (file.path === activeTabPath || activeTabPath.endsWith('/' + file.relativePath)),
    ) ?? null
  }, [notes.activeTabPath, vault.modifiedFiles])

  const activeCommandEntry = useMemo(() => {
    if (!notes.activeTabPath) return null
    return notes.tabs.find((tab) => tab.entry.path === notes.activeTabPath)?.entry
      ?? vault.entries.find((entry) => entry.path === notes.activeTabPath)
      ?? null
  }, [notes.activeTabPath, notes.tabs, vault.entries])
  const noteRetargetingUi = useNoteRetargetingUi({
    activeEntry: activeCommandEntry,
    activeNoteBlocked: !!activeDeletedFile,
    entries: vault.entries,
    folders: vault.folders,
    selection: effectiveSelection,
    setSelection: handleSetSelection,
    setToastMessage,
    vaultPath: resolvedPath,
    updateFrontmatter: notes.handleUpdateFrontmatter,
    moveNoteToFolder: notes.handleMoveNoteToFolder,
  })

  const canToggleRichEditor = !!activeCommandEntry
    && activeCommandEntry.filename.toLowerCase().endsWith('.md')
    && !activeDeletedFile
  const shouldBlockNeighborhoodEscape = (
    dialogs.showCreateTypeDialog
    || dialogs.showQuickOpen
    || dialogs.showCommandPalette
    || dialogs.showAIChat
    || dialogs.showSettings
    || dialogs.showCloneVault
    || dialogs.showSearch
    || dialogs.showConflictResolver
    || dialogs.showCreateViewDialog
    || noteRetargetingUi.isDialogOpen
    || showFeedback
    || showMcpSetupDialog
    || showGraphModal
    || showWeatherSnapshotDialog
    || showAudioRecordingDialog
  )

  useEffect(() => {
    const handleWindowKeyDown = (event: KeyboardEvent) => {
      if (!shouldProcessNeighborhoodEscape(event, selectionRef.current, shouldBlockNeighborhoodEscape)) return

      const activeElement = document.activeElement
      if (isEditorEscapeTarget(activeElement)) {
        event.preventDefault()
        activeElement.blur()
        focusNoteListContainer(document)
        requestAnimationFrame(() => {
          focusNoteListContainer(document)
        })
        return
      }

      if (isEditableElement(activeElement)) return

      if (handleNeighborhoodHistoryBack()) {
        event.preventDefault()
      }
    }

    window.addEventListener('keydown', handleWindowKeyDown)
    return () => window.removeEventListener('keydown', handleWindowKeyDown)
  }, [handleNeighborhoodHistoryBack, selectionRef, shouldBlockNeighborhoodEscape])

  const noteListColumnsLabel = useMemo(() => {
    if (effectiveSelection.kind === 'view') {
      const selectedView = vault.views.find((view) => view.filename === effectiveSelection.filename)
      return selectedView ? `Customize ${selectedView.definition.name} columns` : 'Customize View columns'
    }

    return effectiveSelection.kind === 'filter' && effectiveSelection.filter === 'all'
      ? 'Customize Pages columns'
      : 'Customize Inbox columns'
  }, [effectiveSelection, vault.views])
  const activeNoteModified = useMemo(
    () => vault.modifiedFiles.some((file) => file.path === notes.activeTabPath),
    [notes.activeTabPath, vault.modifiedFiles],
  )
  const toggleDiffCommand = useCallback(() => diffToggleRef.current(), [])
  const toggleRawEditorCommand = useMemo(
    () => canToggleRichEditor ? () => rawToggleRef.current() : undefined,
    [canToggleRichEditor],
  )
  const removeActiveVaultCommand = useCallback(() => {
    vaultSwitcher.removeVault(vaultSwitcher.vaultPath)
  }, [vaultSwitcher])
  const restoreVaultAiGuidanceCommand = useCallback(() => {
    void restoreVaultAiGuidance()
  }, [restoreVaultAiGuidance])
  const changeNoteTypeCommand = useMemo(
    () => noteRetargetingUi.canChangeActiveNoteType ? noteRetargetingUi.openChangeNoteTypeDialog : undefined,
    [noteRetargetingUi.canChangeActiveNoteType, noteRetargetingUi.openChangeNoteTypeDialog],
  )
  const moveNoteToFolderCommand = useMemo(
    () => noteRetargetingUi.canMoveActiveNoteToFolder ? noteRetargetingUi.openMoveNoteToFolderDialog : undefined,
    [noteRetargetingUi.canMoveActiveNoteToFolder, noteRetargetingUi.openMoveNoteToFolderDialog],
  )
  const activeNoteHasIcon = useMemo(() => {
    const entry = vault.entries.find((candidate) => candidate.path === notes.activeTabPath)
    return hasNoteIconValue(entry?.icon)
  }, [notes.activeTabPath, vault.entries])
  const handleToggleOrganizedWithInboxAdvance = useCallback(async (path: string) => {
    const entry = vault.entries.find((candidate) => candidate.path === path)
    if (!entry) return

    const shouldAutoAdvance = settings.auto_advance_inbox_after_organize === true
      && !entry.organized
      && notes.activeTabPath === path
      && effectiveSelection.kind === 'filter'
      && effectiveSelection.filter === 'inbox'
    const nextVisibleInboxEntry = shouldAutoAdvance
      ? getNextVisibleInboxEntry(visibleNotesRef.current, path)
      : null

    const organized = await entryActions.handleToggleOrganized(path)

    if (organized && nextVisibleInboxEntry) {
      void notes.handleSelectNote(nextVisibleInboxEntry)
    }
  }, [effectiveSelection, entryActions, notes, settings.auto_advance_inbox_after_organize, vault.entries, visibleNotesRef])
  const toggleOrganizedCommand = explicitOrganizationEnabled ? handleToggleOrganizedWithInboxAdvance : undefined
  const canCustomizeNoteListColumns = useMemo(() => (
    effectiveSelection.kind === 'view'
      || (
        effectiveSelection.kind === 'filter'
        && (effectiveSelection.filter === 'all' || (explicitOrganizationEnabled && effectiveSelection.filter === 'inbox'))
      )
  ), [effectiveSelection, explicitOrganizationEnabled])
  const restoreDeletedNoteCommand = useMemo(
    () => activeDeletedFile ? () => { void handleDiscardFile(activeDeletedFile.relativePath) } : undefined,
    [activeDeletedFile, handleDiscardFile],
  )
  const insertWeatherSnapshotCommand = useMemo(
    () => activeDeletedFile ? undefined : openWeatherSnapshotDialog,
    [activeDeletedFile, openWeatherSnapshotDialog],
  )
  const audioTranscription = useAudioTranscription({
    vaultPath: resolvedPath,
    entries: vault.entries,
    transcriptionProvider: settings.transcription_provider,
    cloudTranscriptionEnabled: settings.cloud_transcription_enabled,
    addEntry: vault.addEntry,
    openTabWithContent: notes.openTabWithContent,
    loadModifiedFiles: vault.loadModifiedFiles,
    setToastMessage,
  })
  const handleOpenGraphNote = useCallback((entry: VaultEntry) => {
    void handleSelectNote(entry)
    closeGraphModal()
  }, [closeGraphModal, handleSelectNote])
  const handleCaptureThoughtCommand = useCallback(() => openDashboardCapture('note'), [openDashboardCapture])
  const handleCaptureJournalCommand = useCallback(() => openDashboardCapture('journal'), [openDashboardCapture])
  const handleCaptureDreamCommand = useCallback(() => openDashboardCapture('dream'), [openDashboardCapture])
  return {
    rawToggleRef, diffToggleRef, sidebarVisible, noteListVisible, sidebarColumnCollapsed,
    noteLayout, toggleNoteLayout, zoom, buildNumber, handleSetViewMode, handleToggleInspector,
    handleSetSidebarColumnCollapsed, updateStatus, updateActions, handleCheckForUpdates,
    handleRepairVault, restoreVaultAiGuidance, activeDeletedFile, noteRetargetingUi,
    noteListColumnsLabel, activeNoteModified, toggleDiffCommand, toggleRawEditorCommand, removeActiveVaultCommand,
    restoreVaultAiGuidanceCommand, changeNoteTypeCommand, moveNoteToFolderCommand,
    activeNoteHasIcon, toggleOrganizedCommand, canCustomizeNoteListColumns,
    restoreDeletedNoteCommand, insertWeatherSnapshotCommand, audioTranscription,
    handleOpenGraphNote, handleCaptureThoughtCommand, handleCaptureJournalCommand,
    handleCaptureDreamCommand,
  }
}

export type AppShellState = ReturnType<typeof useAppShellState>
