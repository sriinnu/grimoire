import { useCallback, useEffect, useRef, useState } from 'react'
import type { VaultEntry } from '../types'
import {
  cacheNoteContent,
  clearPrefetchCache,
  NOTE_CONTENT_CACHE_MAX_BYTES,
  NOTE_CONTENT_CACHE_LIMIT,
  NOTE_CONTENT_ENTRY_MAX_BYTES,
  prefetchNoteContent,
} from './tabContentCache'
import {
  beginReplaceActiveTabTrace,
  beginSelectNoteTrace,
  navigateToEntry,
  pathsMatch,
  setSingleTab,
  syncActiveTabPath,
} from './tabNavigation'
import type { Tab, TabManagementOptions } from './tabNavigation'
import { failNoteOpenTrace, markNoteOpenTrace } from '../utils/noteOpenPerformance'

export {
  cacheNoteContent,
  clearPrefetchCache,
  NOTE_CONTENT_CACHE_MAX_BYTES,
  NOTE_CONTENT_CACHE_LIMIT,
  NOTE_CONTENT_ENTRY_MAX_BYTES,
  prefetchNoteContent,
}

export type { Tab }

function useStableTabRefs(tabs: Tab[], activeTabPath: string | null) {
  const activeTabPathRef = useRef(activeTabPath)
  useEffect(() => { activeTabPathRef.current = activeTabPath })

  const tabsRef = useRef(tabs)
  useEffect(() => { tabsRef.current = tabs })

  return { activeTabPathRef, tabsRef }
}

/** Manages the app's single-note tab model and note-content navigation boundary. */
export function useTabManagement(options: TabManagementOptions = {}) {
  const [tabs, setTabs] = useState<Tab[]>([])
  const [activeTabPath, setActiveTabPath] = useState<string | null>(null)
  const { activeTabPathRef, tabsRef } = useStableTabRefs(tabs, activeTabPath)

  // Sequence counter for rapid-switch safety: only the latest navigation wins.
  const navSeqRef = useRef(0)
  const beforeNavigateSeqRef = useRef(0)
  const beforeNavigate = options.beforeNavigate
  const onMissingNotePath = options.onMissingNotePath
  const onUnreadableNoteContent = options.onUnreadableNoteContent

  const executeNavigationWithBoundary = useCallback(async (
    targetPath: string,
    navigate: () => void | Promise<void>,
  ) => {
    const seq = ++beforeNavigateSeqRef.current
    const currentPath = activeTabPathRef.current
    if (beforeNavigate && currentPath && !pathsMatch(currentPath, targetPath)) {
      try {
        markNoteOpenTrace(targetPath, 'beforeNavigateStart')
        await beforeNavigate(currentPath, targetPath)
        markNoteOpenTrace(targetPath, 'beforeNavigateEnd')
      } catch (err) {
        console.warn('Failed to persist note before navigation:', err)
        failNoteOpenTrace(targetPath, 'before-navigate-failed')
        return
      }
      if (beforeNavigateSeqRef.current !== seq) return
    }
    await navigate()
  }, [activeTabPathRef, beforeNavigate])

  const handleSelectNote = useCallback(async (entry: VaultEntry) => {
    beginSelectNoteTrace(entry, activeTabPathRef)
    await executeNavigationWithBoundary(entry.path, () => navigateToEntry({
      entry,
      navSeqRef,
      tabsRef,
      activeTabPathRef,
      setTabs,
      setActiveTabPath,
      onMissingNotePath,
      onUnreadableNoteContent,
    }))
  }, [activeTabPathRef, executeNavigationWithBoundary, onMissingNotePath, onUnreadableNoteContent, tabsRef])

  const handleSwitchTab = useCallback((path: string) => {
    syncActiveTabPath(activeTabPathRef, setActiveTabPath, path)
  }, [activeTabPathRef])

  const openTabWithContent = useCallback((entry: VaultEntry, content: string) => {
    void executeNavigationWithBoundary(entry.path, () => {
      setSingleTab(tabsRef, setTabs, { entry, content })
      syncActiveTabPath(activeTabPathRef, setActiveTabPath, entry.path)
    })
  }, [activeTabPathRef, executeNavigationWithBoundary, tabsRef])

  const handleReplaceActiveTab = useCallback(async (entry: VaultEntry) => {
    beginReplaceActiveTabTrace(entry, activeTabPathRef)
    await executeNavigationWithBoundary(entry.path, () => navigateToEntry({
      entry,
      forceReload: true,
      navSeqRef,
      tabsRef,
      activeTabPathRef,
      setTabs,
      setActiveTabPath,
      onMissingNotePath,
      onUnreadableNoteContent,
    }))
  }, [activeTabPathRef, executeNavigationWithBoundary, onMissingNotePath, onUnreadableNoteContent, tabsRef])

  const closeAllTabs = useCallback(() => {
    tabsRef.current = []
    setTabs([])
    syncActiveTabPath(activeTabPathRef, setActiveTabPath, null)
  }, [activeTabPathRef, tabsRef])

  return {
    tabs,
    setTabs,
    activeTabPath,
    activeTabPathRef,
    handleSelectNote,
    openTabWithContent,
    handleSwitchTab,
    handleReplaceActiveTab,
    closeAllTabs,
  }
}
