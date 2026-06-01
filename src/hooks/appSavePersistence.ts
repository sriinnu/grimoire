import { useCallback, useEffect, type MutableRefObject } from 'react'
import type { VaultEntry } from '../types'
import { useEditorSaveWithLinks } from './useEditorSaveWithLinks'
import { flushEditorContent } from '../utils/autoSave'
import type {
  AppSaveDeps,
  AppSaveTabState,
  PendingUntitledRename,
  UnsavedFallback,
} from './appSaveTypes'

function findUnsavedFallback({
  tabs,
  activeTabPath,
  unsavedPaths,
}: {
  tabs: AppSaveTabState[]
  activeTabPath: string | null
  unsavedPaths: Set<string>
}): UnsavedFallback | undefined {
  const activeTab = tabs.find(t => t.entry.path === activeTabPath)
  if (!activeTab || !unsavedPaths.has(activeTab.entry.path)) return undefined
  return { path: activeTab.entry.path, content: activeTab.content }
}

function useContentChangeRefEffect({
  contentChangeRef,
  handleContentChange,
}: {
  contentChangeRef: MutableRefObject<(path: string, content: string) => void>
  handleContentChange: (path: string, content: string) => void
}) {
  useEffect(() => {
    contentChangeRef.current = handleContentChange
  }, [contentChangeRef, handleContentChange])
}

function usePendingRenameEffects({
  cancelPendingUntitledRename,
  pendingUntitledRenameRef,
  activeTabPath,
}: {
  cancelPendingUntitledRename: (path?: string) => boolean
  pendingUntitledRenameRef: MutableRefObject<PendingUntitledRename | null>
  activeTabPath: string | null
}) {
  useEffect(() => () => {
    cancelPendingUntitledRename()
  }, [cancelPendingUntitledRename])

  useEffect(() => {
    const pending = pendingUntitledRenameRef.current
    if (pending && pending.path !== activeTabPath) {
      cancelPendingUntitledRename(pending.path)
    }
  }, [activeTabPath, cancelPendingUntitledRename, pendingUntitledRenameRef])
}

function useFlushBeforeAction({
  resolveCurrentPath,
  savePendingForPath,
  tabsRef,
  unsavedPathsRef,
  clearUnsaved,
  setToastMessage,
  flushPendingUntitledRename,
}: {
  resolveCurrentPath: (path: string) => string
  savePendingForPath: (path: string) => Promise<boolean>
  tabsRef: MutableRefObject<AppSaveTabState[]>
  unsavedPathsRef: MutableRefObject<Set<string>>
  clearUnsaved: AppSaveDeps['clearUnsaved']
  setToastMessage: AppSaveDeps['setToastMessage']
  flushPendingUntitledRename: (path?: string) => Promise<boolean>
}) {
  return useCallback(async (path: string) => {
    const currentPath = resolveCurrentPath(path)
    try {
      await flushEditorContent(currentPath, {
        savePendingForPath,
        getTabContent: (p) => tabsRef.current.find(t => t.entry.path === p)?.content,
        isUnsaved: (p) => unsavedPathsRef.current.has(p),
        onSaved: (p) => {
          clearUnsaved(p)
        },
      })
      await flushPendingUntitledRename(currentPath)
    } catch (err) {
      setToastMessage(`Auto-save failed: ${err}`)
      throw err
    }
  }, [resolveCurrentPath, savePendingForPath, tabsRef, unsavedPathsRef, clearUnsaved, setToastMessage, flushPendingUntitledRename])
}

async function preparePathForManualRename({
  path,
  resolveCurrentPath,
  savePendingForPath,
  cancelPendingUntitledRename,
}: {
  path: string
  resolveCurrentPath: (path: string) => string
  savePendingForPath: (path: string) => Promise<boolean>
  cancelPendingUntitledRename: (path?: string) => boolean
}): Promise<string> {
  const currentPath = resolveCurrentPath(path)
  await savePendingForPath(currentPath)
  cancelPendingUntitledRename(currentPath)
  return currentPath
}

function useRenameHandlers({
  resolveCurrentPath,
  savePendingForPath,
  cancelPendingUntitledRename,
  handleRenameNote,
  handleRenameFilename,
  resolvedPath,
  replaceRenamedEntry,
  loadModifiedFiles,
}: {
  resolveCurrentPath: (path: string) => string
  savePendingForPath: (path: string) => Promise<boolean>
  cancelPendingUntitledRename: (path?: string) => boolean
  handleRenameNote: AppSaveDeps['handleRenameNote']
  handleRenameFilename: AppSaveDeps['handleRenameFilename']
  resolvedPath: string
  replaceRenamedEntry: (oldPath: string, newEntry: Partial<VaultEntry> & { path: string }, newContent: string) => void
  loadModifiedFiles: AppSaveDeps['loadModifiedFiles']
}) {
  const handleFilenameRename = useCallback(async (path: string, newFilenameStem: string) => {
    const currentPath = await preparePathForManualRename({
      path,
      resolveCurrentPath,
      savePendingForPath,
      cancelPendingUntitledRename,
    })
    await handleRenameFilename(currentPath, newFilenameStem, resolvedPath, replaceRenamedEntry).then(loadModifiedFiles)
  }, [resolveCurrentPath, savePendingForPath, cancelPendingUntitledRename, handleRenameFilename, resolvedPath, replaceRenamedEntry, loadModifiedFiles])

  const handleTitleSync = useCallback((path: string, newTitle: string) => {
    void preparePathForManualRename({
      path,
      resolveCurrentPath,
      savePendingForPath,
      cancelPendingUntitledRename,
    })
      .then((currentPath) => handleRenameNote(currentPath, newTitle, resolvedPath, replaceRenamedEntry))
      .then(loadModifiedFiles)
      .catch((err) => console.error('Title rename failed:', err))
  }, [resolveCurrentPath, savePendingForPath, cancelPendingUntitledRename, handleRenameNote, resolvedPath, replaceRenamedEntry, loadModifiedFiles])

  return { handleFilenameRename, handleTitleSync }
}

function useHandleSaveAction({
  handleSaveRaw,
  tabs,
  activeTabPath,
  unsavedPaths,
  flushPendingUntitledRename,
  resolveCurrentPath,
}: {
  handleSaveRaw: (unsavedFallback?: UnsavedFallback) => Promise<void>
  tabs: AppSaveTabState[]
  activeTabPath: string | null
  unsavedPaths: Set<string>
  flushPendingUntitledRename: (path?: string) => Promise<boolean>
  resolveCurrentPath: (path: string) => string
}) {
  return useCallback(async () => {
    const resolvedActiveTabPath = activeTabPath ? resolveCurrentPath(activeTabPath) : null
    await handleSaveRaw(findUnsavedFallback({
      tabs,
      activeTabPath: resolvedActiveTabPath,
      unsavedPaths,
    }))
    await flushPendingUntitledRename(resolvedActiveTabPath ?? undefined)
  }, [handleSaveRaw, tabs, activeTabPath, unsavedPaths, flushPendingUntitledRename, resolveCurrentPath])
}

/** Wires editor persistence to local unsaved tracking and title-derived rename scheduling. */
export function useEditorPersistence({
  updateEntry,
  setTabs,
  setToastMessage,
  loadModifiedFiles,
  trackUnsaved,
  clearUnsaved,
  reloadViews,
  scheduleUntitledRename,
  resolveCurrentPath,
  resolvePathBeforeSave,
}: {
  updateEntry: AppSaveDeps['updateEntry']
  setTabs: AppSaveDeps['setTabs']
  setToastMessage: AppSaveDeps['setToastMessage']
  loadModifiedFiles: AppSaveDeps['loadModifiedFiles']
  trackUnsaved?: AppSaveDeps['trackUnsaved']
  clearUnsaved: AppSaveDeps['clearUnsaved']
  reloadViews: AppSaveDeps['reloadViews']
  scheduleUntitledRename: (path: string, content: string) => void
  resolveCurrentPath: (path: string) => string
  resolvePathBeforeSave: (path: string) => Promise<string>
}) {
  const onAfterSave = useCallback(() => {
    loadModifiedFiles()
  }, [loadModifiedFiles])

  const onNotePersisted = useCallback((path: string, content: string) => {
    clearUnsaved(path)
    if (path.endsWith('.yml')) reloadViews?.()
    scheduleUntitledRename(path, content)
  }, [clearUnsaved, reloadViews, scheduleUntitledRename])

  const {
    handleSave: handleSaveRaw,
    handleContentChange: handleContentChangeRaw,
    savePendingForPath: savePendingForPathRaw,
    savePending,
  } = useEditorSaveWithLinks({
    updateEntry,
    setTabs,
    setToastMessage,
    onAfterSave,
    onNotePersisted,
    resolvePath: resolveCurrentPath,
    resolvePathBeforeSave,
  })

  const handleContentChange = useCallback((path: string, content: string) => {
    const resolvedPath = resolveCurrentPath(path)
    trackUnsaved?.(resolvedPath)
    handleContentChangeRaw(resolvedPath, content)
  }, [handleContentChangeRaw, resolveCurrentPath, trackUnsaved])

  const savePendingForPath = useCallback((path: string) => (
    savePendingForPathRaw(resolveCurrentPath(path))
  ), [savePendingForPathRaw, resolveCurrentPath])

  return { handleSaveRaw, handleContentChange, savePendingForPath, savePending }
}

/** Wraps entry replacement so manual renames also update the stale-path registry. */
export function useReplaceRenamedEntry({
  registerRenamedPath,
  replaceEntry,
}: {
  registerRenamedPath: (oldPath: string, newPath: string) => void
  replaceEntry: AppSaveDeps['replaceEntry']
}) {
  return useCallback((oldPath: string, newEntry: Partial<VaultEntry> & { path: string }, newContent: string) => {
    registerRenamedPath(oldPath, newEntry.path)
    replaceEntry(oldPath, newEntry, newContent)
  }, [registerRenamedPath, replaceEntry])
}

/** Builds the stable app save command handlers exposed by useAppSave. */
export function useAppSaveHandlers({
  contentChangeRef,
  handleContentChange,
  cancelPendingUntitledRename,
  pendingUntitledRenameRef,
  activeTabPath,
  resolveCurrentPath,
  savePendingForPath,
  tabsRef,
  unsavedPathsRef,
  clearUnsaved,
  setToastMessage,
  flushPendingUntitledRename,
  handleRenameNote,
  handleRenameFilename,
  resolvedPath,
  replaceRenamedEntry,
  loadModifiedFiles,
  handleSaveRaw,
  tabs,
  unsavedPaths,
}: {
  contentChangeRef: MutableRefObject<(path: string, content: string) => void>
  handleContentChange: (path: string, content: string) => void
  cancelPendingUntitledRename: (path?: string) => boolean
  pendingUntitledRenameRef: MutableRefObject<PendingUntitledRename | null>
  activeTabPath: string | null
  resolveCurrentPath: (path: string) => string
  savePendingForPath: (path: string) => Promise<boolean>
  tabsRef: MutableRefObject<AppSaveTabState[]>
  unsavedPathsRef: MutableRefObject<Set<string>>
  clearUnsaved: AppSaveDeps['clearUnsaved']
  setToastMessage: AppSaveDeps['setToastMessage']
  flushPendingUntitledRename: (path?: string) => Promise<boolean>
  handleRenameNote: AppSaveDeps['handleRenameNote']
  handleRenameFilename: AppSaveDeps['handleRenameFilename']
  resolvedPath: string
  replaceRenamedEntry: (oldPath: string, newEntry: Partial<VaultEntry> & { path: string }, newContent: string) => void
  loadModifiedFiles: AppSaveDeps['loadModifiedFiles']
  handleSaveRaw: (unsavedFallback?: UnsavedFallback) => Promise<void>
  tabs: AppSaveTabState[]
  unsavedPaths: Set<string>
}) {
  useContentChangeRefEffect({ contentChangeRef, handleContentChange })
  usePendingRenameEffects({
    cancelPendingUntitledRename,
    pendingUntitledRenameRef,
    activeTabPath,
  })

  const flushBeforeAction = useFlushBeforeAction({
    resolveCurrentPath,
    savePendingForPath,
    tabsRef,
    unsavedPathsRef,
    clearUnsaved,
    setToastMessage,
    flushPendingUntitledRename,
  })
  const { handleFilenameRename, handleTitleSync } = useRenameHandlers({
    resolveCurrentPath,
    savePendingForPath,
    cancelPendingUntitledRename,
    handleRenameNote,
    handleRenameFilename,
    resolvedPath,
    replaceRenamedEntry,
    loadModifiedFiles,
  })
  const handleSave = useHandleSaveAction({
    handleSaveRaw,
    tabs,
    activeTabPath,
    unsavedPaths,
    flushPendingUntitledRename,
    resolveCurrentPath,
  })

  return { handleFilenameRename, handleSave, handleTitleSync, flushBeforeAction }
}
