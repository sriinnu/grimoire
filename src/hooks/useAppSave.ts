import { useRef } from 'react'
import { useAppSaveHandlers, useEditorPersistence, useReplaceRenamedEntry } from './appSavePersistence'
import { useCurrentValueRef, useUntitledRenameCoordinator } from './appSaveRename'
import type { AppSaveDeps } from './appSaveTypes'

function useAppSaveStateRefs({
  tabs,
  activeTabPath,
  unsavedPaths,
}: Pick<AppSaveDeps, 'tabs' | 'activeTabPath' | 'unsavedPaths'>) {
  return {
    tabsRef: useCurrentValueRef(tabs),
    activeTabPathRef: useCurrentValueRef(activeTabPath),
    unsavedPathsRef: useCurrentValueRef(unsavedPaths),
  }
}

/** Coordinates editor save, flush-before-action, and note rename behavior. */
export function useAppSave({
  updateEntry, setTabs, handleSwitchTab, setToastMessage, loadModifiedFiles, reloadViews,
  trackUnsaved, clearUnsaved, unsavedPaths, tabs, activeTabPath, handleRenameNote,
  handleRenameFilename: handleRenameFilenameRaw, replaceEntry, resolvedPath,
  initialH1AutoRenameEnabled,
}: AppSaveDeps) {
  const contentChangeRef = useRef<(path: string, content: string) => void>(() => {})
  const { tabsRef, activeTabPathRef, unsavedPathsRef } = useAppSaveStateRefs({ tabs, activeTabPath, unsavedPaths })
  const {
    pendingUntitledRenameRef, cancelPendingUntitledRename, registerRenamedPath,
    resolveCurrentPath, resolvePathBeforeSave, flushPendingUntitledRename, scheduleUntitledRename,
  } = useUntitledRenameCoordinator({
    resolvedPath,
    tabsRef,
    activeTabPathRef,
    setTabs,
    handleSwitchTab,
    replaceEntry,
    loadModifiedFiles,
    initialH1AutoRenameEnabled,
  })
  const { handleSaveRaw, handleContentChange, savePendingForPath, savePending } = useEditorPersistence({
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
  })
  const replaceRenamedEntry = useReplaceRenamedEntry({ registerRenamedPath, replaceEntry })
  const { handleFilenameRename, handleSave, handleTitleSync, flushBeforeAction } = useAppSaveHandlers({
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
    handleRenameFilename: handleRenameFilenameRaw,
    resolvedPath,
    replaceRenamedEntry,
    loadModifiedFiles,
    handleSaveRaw,
    tabs,
    unsavedPaths,
  })

  return {
    contentChangeRef,
    handleContentChange,
    handleFilenameRename,
    handleSave,
    handleTitleSync,
    savePending,
    savePendingForPath,
    trackRenamedPath: registerRenamedPath,
    flushBeforeAction,
  }
}
