import type { Dispatch, MutableRefObject, SetStateAction } from 'react'
import type { VaultEntry } from '../types'
import {
  beginNoteOpenTrace,
  failNoteOpenTrace,
  finishNoteOpenTrace,
  markNoteOpenTrace,
} from '../utils/noteOpenPerformance'
import { isOpaqueBinaryEntry, isPreviewableImageEntry } from '../utils/filePreviews'
import { clearPrefetchCache, getCachedNoteContent, loadNoteContent } from './tabContentCache'
import {
  getEntryLoadFailureKind,
  type RecoverableEntryLoadFailureKind,
} from './tabContentErrors'

export interface Tab {
  entry: VaultEntry
  content: string
}

export interface TabManagementOptions {
  beforeNavigate?: (fromPath: string, toPath: string) => Promise<void>
  onMissingNotePath?: (entry: VaultEntry, error: unknown) => void | Promise<void>
  onUnreadableNoteContent?: (entry: VaultEntry, error: unknown) => void | Promise<void>
}

interface TabStateRefs {
  activeTabPathRef: MutableRefObject<string | null>
  setActiveTabPath: Dispatch<SetStateAction<string | null>>
  setTabs: Dispatch<SetStateAction<Tab[]>>
  tabsRef: MutableRefObject<Tab[]>
}

interface NavigationRefs extends TabStateRefs {
  navSeqRef: MutableRefObject<number>
}

/** Synchronizes active-tab state and the imperative ref used by keyboard/save handlers. */
export function syncActiveTabPath(
  activeTabPathRef: MutableRefObject<string | null>,
  setActiveTabPath: Dispatch<SetStateAction<string | null>>,
  path: string | null,
) {
  activeTabPathRef.current = path
  setActiveTabPath(path)
}

/** Compares vault paths after normalizing separators and macOS temporary path aliases. */
export function pathsMatch(leftPath: string | null, rightPath: string | null): boolean {
  if (!leftPath || !rightPath) return false
  return normalizeComparablePath(leftPath) === normalizeComparablePath(rightPath)
}

/** Opens the given entry/content as the only tab in the single-note model. */
export function setSingleTab(
  tabsRef: MutableRefObject<Tab[]>,
  setTabs: Dispatch<SetStateAction<Tab[]>>,
  nextTab: Tab,
) {
  tabsRef.current = [nextTab]
  setTabs([nextTab])
}

/** Clears all tabs in the single-note model. */
export function clearTabs(
  tabsRef: MutableRefObject<Tab[]>,
  setTabs: Dispatch<SetStateAction<Tab[]>>,
) {
  tabsRef.current = []
  setTabs([])
}

/** Runs the note-content navigation flow and applies only the latest selected entry. */
export async function navigateToEntry(options: {
  entry: VaultEntry
  forceReload?: boolean
  navSeqRef: MutableRefObject<number>
  tabsRef: MutableRefObject<Tab[]>
  activeTabPathRef: MutableRefObject<string | null>
  setTabs: Dispatch<SetStateAction<Tab[]>>
  setActiveTabPath: Dispatch<SetStateAction<string | null>>
  onMissingNotePath?: (entry: VaultEntry, error: unknown) => void | Promise<void>
  onUnreadableNoteContent?: (entry: VaultEntry, error: unknown) => void | Promise<void>
}) {
  const {
    entry,
    forceReload = false,
    navSeqRef,
    tabsRef,
    activeTabPathRef,
    setTabs,
    setActiveTabPath,
    onMissingNotePath,
    onUnreadableNoteContent,
  } = options

  if (isPreviewableImageEntry(entry)) {
    syncActiveTabPath(activeTabPathRef, setActiveTabPath, entry.path)
    setSingleTab(tabsRef, setTabs, { entry, content: '' })
    finishNoteOpenTrace(entry.path)
    return
  }

  if (isOpaqueBinaryEntry(entry)) {
    failNoteOpenTrace(entry.path, 'binary-entry')
    return
  }
  if (!forceReload && isAlreadyViewingPath(tabsRef, activeTabPathRef, entry.path)) {
    syncActiveTabPath(activeTabPathRef, setActiveTabPath, entry.path)
    finishNoteOpenTrace(entry.path)
    return
  }

  const { seq, cachedContent } = startEntryNavigation({
    entry,
    navSeqRef,
    tabsRef,
    activeTabPathRef,
    setTabs,
    setActiveTabPath,
  })

  try {
    markNoteOpenTrace(entry.path, 'contentLoadStart')
    // Cached content keeps note switches instant, but synced vaults can make
    // the underlying path disappear between opens. Reopened notes still need a
    // fresh disk read so missing-file recovery can run.
    const content = await loadNoteContent(entry.path, forceReload || cachedContent !== null)
    markNoteOpenTrace(entry.path, 'contentLoadEnd')
    if (!shouldApplyLoadedEntry({
      seq,
      navSeqRef,
      cachedContent,
      content,
      forceReload,
      activeTabPathRef,
      path: entry.path,
    })) return
    setSingleTab(tabsRef, setTabs, { entry, content })
  } catch (err) {
    handleEntryLoadFailure({
      entry,
      seq,
      navSeqRef,
      tabsRef,
      activeTabPathRef,
      setTabs,
      setActiveTabPath,
      error: err,
      onMissingNotePath,
      onUnreadableNoteContent,
    })
  }
}

/** Starts the latency trace for a user-selected note when it differs from the active tab. */
export function beginSelectNoteTrace(entry: VaultEntry, activeTabPathRef: MutableRefObject<string | null>) {
  if (!pathsMatch(entry.path, activeTabPathRef.current)) {
    beginNoteOpenTrace(entry.path, 'select-note')
  }
}

/** Starts the latency trace for a forced active-tab replacement. */
export function beginReplaceActiveTabTrace(entry: VaultEntry, activeTabPathRef: MutableRefObject<string | null>) {
  if (!pathsMatch(entry.path, activeTabPathRef.current)) {
    beginNoteOpenTrace(entry.path, 'replace-active-tab')
  }
}

function normalizeComparablePath(path: string): string {
  return path
    .replaceAll('\\', '/')
    .replace(/^\/private\/tmp(?=\/|$)/u, '/tmp')
    .replace(/\/+$/u, '')
}

function isAlreadyViewingPath(
  tabsRef: MutableRefObject<Tab[]>,
  activeTabPathRef: MutableRefObject<string | null>,
  path: string,
) {
  return pathsMatch(activeTabPathRef.current, path)
    || tabsRef.current.some((tab) => pathsMatch(tab.entry.path, path))
}

function startEntryNavigation(options: {
  entry: VaultEntry
  navSeqRef: MutableRefObject<number>
  tabsRef: MutableRefObject<Tab[]>
  activeTabPathRef: MutableRefObject<string | null>
  setTabs: Dispatch<SetStateAction<Tab[]>>
  setActiveTabPath: Dispatch<SetStateAction<string | null>>
}) {
  const {
    entry,
    navSeqRef,
    tabsRef,
    activeTabPathRef,
    setTabs,
    setActiveTabPath,
  } = options

  const seq = ++navSeqRef.current
  const cachedContent = getCachedNoteContent(entry.path)
  syncActiveTabPath(activeTabPathRef, setActiveTabPath, entry.path)
  if (cachedContent !== null) {
    markNoteOpenTrace(entry.path, 'cacheReady')
    setSingleTab(tabsRef, setTabs, { entry, content: cachedContent })
  }

  return { seq, cachedContent }
}

function shouldApplyLoadedEntry(options: {
  seq: number
  navSeqRef: MutableRefObject<number>
  cachedContent: string | null
  content: string
  forceReload: boolean
  activeTabPathRef: MutableRefObject<string | null>
  path: string
}) {
  const {
    seq,
    navSeqRef,
    cachedContent,
    content,
    forceReload,
    activeTabPathRef,
    path,
  } = options

  if (navSeqRef.current !== seq) return false
  if (forceReload) return true
  return cachedContent !== content || !pathsMatch(activeTabPathRef.current, path)
}

function resetFailedEntrySelection(options: TabStateRefs) {
  const { tabsRef, activeTabPathRef, setTabs, setActiveTabPath } = options
  clearTabs(tabsRef, setTabs)
  syncActiveTabPath(activeTabPathRef, setActiveTabPath, null)
}

function runEntryFailureCallback(options: {
  callback?: (entry: VaultEntry, error: unknown) => void | Promise<void>
  entry: VaultEntry
  error: unknown
  warning: string
}) {
  const { callback, entry, error, warning } = options
  Promise.resolve(callback?.(entry, error)).catch((callbackError) => {
    console.warn(warning, callbackError)
  })
}

function handleRecoverableEntryLoadFailure(options: {
  kind: RecoverableEntryLoadFailureKind
  entry: VaultEntry
  error: unknown
  onMissingNotePath?: (entry: VaultEntry, error: unknown) => void | Promise<void>
  onUnreadableNoteContent?: (entry: VaultEntry, error: unknown) => void | Promise<void>
} & TabStateRefs) {
  const {
    kind,
    entry,
    tabsRef,
    activeTabPathRef,
    setTabs,
    setActiveTabPath,
    error,
    onMissingNotePath,
    onUnreadableNoteContent,
  } = options

  if (kind === 'missing-active-vault') {
    clearPrefetchCache()
  }

  resetFailedEntrySelection({
    tabsRef,
    activeTabPathRef,
    setTabs,
    setActiveTabPath,
  })
  failNoteOpenTrace(entry.path, kind)

  if (kind === 'missing-path') {
    runEntryFailureCallback({
      callback: onMissingNotePath,
      entry,
      error,
      warning: 'Failed to handle missing note path:',
    })
    return
  }

  if (kind === 'unreadable-content') {
    runEntryFailureCallback({
      callback: onUnreadableNoteContent,
      entry,
      error,
      warning: 'Failed to handle unreadable note content:',
    })
  }
}

function handleEntryLoadFailure(options: {
  entry: VaultEntry
  seq: number
  error: unknown
  onMissingNotePath?: (entry: VaultEntry, error: unknown) => void | Promise<void>
  onUnreadableNoteContent?: (entry: VaultEntry, error: unknown) => void | Promise<void>
} & NavigationRefs) {
  const {
    entry,
    seq,
    navSeqRef,
    tabsRef,
    activeTabPathRef,
    setTabs,
    setActiveTabPath,
    error,
    onMissingNotePath,
    onUnreadableNoteContent,
  } = options

  console.warn('Failed to load note content:', error)
  if (navSeqRef.current !== seq) return

  const failureKind = getEntryLoadFailureKind(error)
  if (failureKind !== 'load-failed') {
    handleRecoverableEntryLoadFailure({
      kind: failureKind,
      entry,
      tabsRef,
      activeTabPathRef,
      setTabs,
      setActiveTabPath,
      error,
      onMissingNotePath,
      onUnreadableNoteContent,
    })
    return
  }

  setSingleTab(tabsRef, setTabs, { entry, content: '' })
  failNoteOpenTrace(entry.path, 'load-failed')
}
