import { startTransition, useCallback, useEffect, useRef, type MutableRefObject } from 'react'
import { isTauri } from '../mock-tauri'
import type { VaultEntry } from '../types'
import { invoke } from '../lib/tauriRuntime'
import { extractH1TitleFromContent } from '../utils/noteTitle'
import type {
  AppSaveDeps,
  AppSaveTabState,
  InFlightRenameMap,
  PendingUntitledRename,
  RenamedPathMap,
} from './appSaveTypes'

const UNTITLED_RENAME_DEBOUNCE_MS = 2500

function resolveLatestPath(renamedPaths: RenamedPathMap, path: string): string {
  let current = path
  const visited = new Set<string>()

  while (!visited.has(current)) {
    visited.add(current)
    const next = renamedPaths.get(current)
    if (!next || next === current) break
    current = next
  }

  return current
}

function trackRenamedPath(renamedPaths: RenamedPathMap, oldPath: string, newPath: string): void {
  if (oldPath === newPath) return
  renamedPaths.set(oldPath, newPath)
}

async function waitForSettledPath({
  path,
  renamedPaths,
  inFlightRenames,
}: {
  path: string
  renamedPaths: RenamedPathMap
  inFlightRenames: InFlightRenameMap
}): Promise<string> {
  let current = resolveLatestPath(renamedPaths, path)
  const visited = new Set<string>()

  while (!visited.has(current)) {
    visited.add(current)
    const inFlightRename = inFlightRenames.get(current)
    if (!inFlightRename) return resolveLatestPath(renamedPaths, current)
    current = resolveLatestPath(renamedPaths, await inFlightRename)
  }

  return current
}

function isUntitledRenameCandidate(path: string): boolean {
  const filename = path.split('/').pop() ?? ''
  const stem = filename.replace(/\.md$/, '')
  return stem.startsWith('untitled-') && /\d+$/.test(stem)
}

function shouldScheduleUntitledRename({
  path,
  content,
  initialH1AutoRenameEnabled,
}: {
  path: string
  content: string
  initialH1AutoRenameEnabled: boolean
}): boolean {
  return isTauri()
    && initialH1AutoRenameEnabled
    && isUntitledRenameCandidate(path)
    && extractH1TitleFromContent(content) !== null
}

function matchingPendingRename({
  pending,
  path,
}: {
  pending: PendingUntitledRename | null
  path?: string
}): PendingUntitledRename | null {
  if (!pending) return null
  if (path && pending.path !== path) return null
  return pending
}

function takePendingRename({
  pendingRenameRef,
  path,
}: {
  pendingRenameRef: MutableRefObject<PendingUntitledRename | null>
  path?: string
}): PendingUntitledRename | null {
  const pending = matchingPendingRename({ pending: pendingRenameRef.current, path })
  if (!pending) return null
  clearTimeout(pending.timer)
  pendingRenameRef.current = null
  return pending
}

function schedulePendingRename({
  pendingRenameRef,
  path,
  onFire,
}: {
  pendingRenameRef: MutableRefObject<PendingUntitledRename | null>
  path: string
  onFire: (path: string) => void
}): void {
  takePendingRename({ pendingRenameRef })
  const timer = setTimeout(() => {
    const pending = takePendingRename({ pendingRenameRef, path })
    if (pending) onFire(pending.path)
  }, UNTITLED_RENAME_DEBOUNCE_MS)
  pendingRenameRef.current = { path, timer }
}

async function reloadAutoRenamedNote(
  {
    oldPath,
    newPath,
    tabsRef,
    activeTabPathRef,
    setTabs,
    handleSwitchTab,
    replaceEntry,
    loadModifiedFiles,
  }: {
    oldPath: string
    newPath: string
    tabsRef: MutableRefObject<AppSaveTabState[]>
    activeTabPathRef: MutableRefObject<string | null>
    setTabs: AppSaveDeps['setTabs']
    handleSwitchTab: AppSaveDeps['handleSwitchTab']
    replaceEntry: AppSaveDeps['replaceEntry']
    loadModifiedFiles: AppSaveDeps['loadModifiedFiles']
  },
): Promise<void> {
  const newEntry = await invoke<VaultEntry>('reload_vault_entry', { path: newPath })
  const preservedContent = tabsRef.current.find((tab) => tab.entry.path === oldPath)?.content
    ?? await invoke<string>('get_note_content', { path: newPath })

  const otherTabPaths = tabsRef.current
    .filter((tab) => tab.entry.path !== oldPath && tab.entry.path !== newPath)
    .map((tab) => tab.entry.path)

  startTransition(() => {
    setTabs((prev) => prev.map((tab) => (
      tab.entry.path === oldPath
        ? { entry: { ...tab.entry, ...newEntry, path: newPath }, content: preservedContent }
        : tab
    )))
    if (activeTabPathRef.current === oldPath) handleSwitchTab(newPath)
    replaceEntry(oldPath, { ...newEntry, path: newPath }, preservedContent)
  })

  void Promise.all(otherTabPaths.map(async (path) => {
    const content = await invoke<string>('get_note_content', { path })
    startTransition(() => {
      setTabs((prev) => prev.map((tab) => (
        tab.entry.path === path ? { ...tab, content } : tab
      )))
    })
  })).finally(() => {
    startTransition(() => {
      loadModifiedFiles()
    })
  })
}

/** Keeps a callback dependency current without forcing downstream hook churn. */
export function useCurrentValueRef<T>(value: T) {
  const ref = useRef(value)
  useEffect(() => {
    ref.current = value
  }, [value])
  return ref
}

function useRenamePathRegistry() {
  const renamedPathsRef = useRef<RenamedPathMap>(new Map())
  const inFlightUntitledRenameRef = useRef<InFlightRenameMap>(new Map())

  const registerRenamedPath = useCallback((oldPath: string, newPath: string) => {
    trackRenamedPath(renamedPathsRef.current, oldPath, newPath)
  }, [])

  const resolveCurrentPath = useCallback((path: string) => resolveLatestPath(renamedPathsRef.current, path), [])
  const resolvePathBeforeSave = useCallback(
    (path: string) => waitForSettledPath({
      path,
      renamedPaths: renamedPathsRef.current,
      inFlightRenames: inFlightUntitledRenameRef.current,
    }),
    [],
  )

  return {
    renamedPathsRef,
    inFlightUntitledRenameRef,
    registerRenamedPath,
    resolveCurrentPath,
    resolvePathBeforeSave,
  }
}

function useUntitledRenameExecutor({
  resolvedPath,
  tabsRef,
  activeTabPathRef,
  setTabs,
  handleSwitchTab,
  replaceEntry,
  loadModifiedFiles,
  renamedPathsRef,
  inFlightUntitledRenameRef,
}: {
  resolvedPath: string
  tabsRef: MutableRefObject<AppSaveTabState[]>
  activeTabPathRef: MutableRefObject<string | null>
  setTabs: AppSaveDeps['setTabs']
  handleSwitchTab: AppSaveDeps['handleSwitchTab']
  replaceEntry: AppSaveDeps['replaceEntry']
  loadModifiedFiles: AppSaveDeps['loadModifiedFiles']
  renamedPathsRef: MutableRefObject<RenamedPathMap>
  inFlightUntitledRenameRef: MutableRefObject<InFlightRenameMap>
}) {
  return useCallback(async (path: string) => {
    const existingRename = inFlightUntitledRenameRef.current.get(path)
    if (existingRename) return (await existingRename) !== path

    const renamePromise = (async () => {
      try {
        const result = await invoke<{ new_path: string; updated_files: number } | null>('auto_rename_untitled', {
          vaultPath: resolvedPath,
          notePath: path,
        })
        if (!result) return path
        trackRenamedPath(renamedPathsRef.current, path, result.new_path)
        await reloadAutoRenamedNote({
          oldPath: path,
          newPath: result.new_path,
          tabsRef,
          activeTabPathRef,
          setTabs,
          handleSwitchTab,
          replaceEntry,
          loadModifiedFiles,
        })
        return result.new_path
      } catch {
        return path
      } finally {
        inFlightUntitledRenameRef.current.delete(path)
      }
    })()

    inFlightUntitledRenameRef.current.set(path, renamePromise)
    return (await renamePromise) !== path
  }, [
    resolvedPath,
    tabsRef,
    activeTabPathRef,
    setTabs,
    handleSwitchTab,
    replaceEntry,
    loadModifiedFiles,
    renamedPathsRef,
    inFlightUntitledRenameRef,
  ])
}

function useUntitledRenameScheduler({
  executeUntitledRename,
  initialH1AutoRenameEnabled,
}: {
  executeUntitledRename: (path: string) => Promise<boolean>
  initialH1AutoRenameEnabled: boolean
}) {
  const pendingUntitledRenameRef = useRef<PendingUntitledRename | null>(null)

  const cancelPendingUntitledRename = useCallback((path?: string) => (
    takePendingRename({ pendingRenameRef: pendingUntitledRenameRef, path }) !== null
  ), [])

  const flushPendingUntitledRename = useCallback(async (path?: string) => {
    const pending = takePendingRename({ pendingRenameRef: pendingUntitledRenameRef, path })
    if (!pending) return false
    return executeUntitledRename(pending.path)
  }, [executeUntitledRename])

  const scheduleUntitledRename = useCallback((path: string, content: string) => {
    if (!shouldScheduleUntitledRename({ path, content, initialH1AutoRenameEnabled })) {
      cancelPendingUntitledRename(path)
      return
    }

    schedulePendingRename({
      pendingRenameRef: pendingUntitledRenameRef,
      path,
      onFire: (pendingPath) => {
        void executeUntitledRename(pendingPath)
      },
    })
  }, [cancelPendingUntitledRename, executeUntitledRename, initialH1AutoRenameEnabled])

  return {
    pendingUntitledRenameRef,
    cancelPendingUntitledRename,
    flushPendingUntitledRename,
    scheduleUntitledRename,
  }
}

/** Coordinates title-derived auto-renames while keeping stale paths saveable. */
export function useUntitledRenameCoordinator({
  resolvedPath,
  tabsRef,
  activeTabPathRef,
  setTabs,
  handleSwitchTab,
  replaceEntry,
  loadModifiedFiles,
  initialH1AutoRenameEnabled,
}: {
  resolvedPath: string
  tabsRef: MutableRefObject<AppSaveTabState[]>
  activeTabPathRef: MutableRefObject<string | null>
  setTabs: AppSaveDeps['setTabs']
  handleSwitchTab: AppSaveDeps['handleSwitchTab']
  replaceEntry: AppSaveDeps['replaceEntry']
  loadModifiedFiles: AppSaveDeps['loadModifiedFiles']
  initialH1AutoRenameEnabled: boolean
}) {
  const {
    renamedPathsRef,
    inFlightUntitledRenameRef,
    registerRenamedPath,
    resolveCurrentPath,
    resolvePathBeforeSave,
  } = useRenamePathRegistry()
  const executeUntitledRename = useUntitledRenameExecutor({
    resolvedPath,
    tabsRef,
    activeTabPathRef,
    setTabs,
    handleSwitchTab,
    replaceEntry,
    loadModifiedFiles,
    renamedPathsRef,
    inFlightUntitledRenameRef,
  })
  const {
    pendingUntitledRenameRef,
    cancelPendingUntitledRename,
    flushPendingUntitledRename,
    scheduleUntitledRename,
  } = useUntitledRenameScheduler({ executeUntitledRename, initialH1AutoRenameEnabled })

  return {
    pendingUntitledRenameRef,
    cancelPendingUntitledRename,
    registerRenamedPath,
    resolveCurrentPath,
    resolvePathBeforeSave,
    flushPendingUntitledRename,
    scheduleUntitledRename,
  }
}
