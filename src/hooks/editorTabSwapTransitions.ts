import type { MutableRefObject } from 'react'
import {
  getH1TextFromBlocks,
  isUntitledPath,
  pathStem,
  slugifyPathStem,
} from './editorTabContent'
import { cacheEditorState, normalizeTabBody, readEditorScrollTop, serializeEditorBody } from './editorTabSwapCache'
import { signalEditorTabSwapped } from './editorTabSwapSignals'
import type { CachedTabState, Editor, PendingLocalContent, Tab } from './editorTabSwapTypes'

function renameBodiesOverlap(options: {
  currentBody: string
  nextBody: string
}): boolean {
  const { currentBody, nextBody } = options
  const current = currentBody.trimEnd()
  const next = nextBody.trimEnd()
  return current === next
    || current.startsWith(next)
    || next.startsWith(current)
}

function isUntitledRenameTransition(
  prevPath: string | null,
  nextPath: string | null,
  activeTab: Tab | undefined,
  editor: Editor,
): boolean {
  if (!prevPath || !nextPath || !activeTab || !isUntitledPath(prevPath)) return false

  const currentHeading = getH1TextFromBlocks(editor.document)
  if (!currentHeading || slugifyPathStem(currentHeading) !== pathStem(nextPath)) return false

  return renameBodiesOverlap({
    currentBody: serializeEditorBody(editor),
    nextBody: normalizeTabBody({ content: activeTab.content }),
  })
}

export function consumeRawModeTransition(
  prevRawModeRef: MutableRefObject<boolean>,
  rawMode: boolean | undefined,
) {
  const rawModeJustEnded = prevRawModeRef.current && !rawMode
  prevRawModeRef.current = !!rawMode
  return rawModeJustEnded
}

function cachePreviousTabOnPathChange(options: {
  prevPath: string | null
  previousTab: Tab | undefined
  pathChanged: boolean
  editorMountedRef: MutableRefObject<boolean>
  cache: Map<string, CachedTabState>
  editor: Editor
}) {
  const { prevPath, previousTab, pathChanged, editorMountedRef, cache, editor } = options
  if (!prevPath || !previousTab || !pathChanged || !editorMountedRef.current) return
  cacheEditorState(cache, prevPath, {
    blocks: editor.document,
    scrollTop: readEditorScrollTop(),
    sourceContent: previousTab.content,
  })
}

function shouldWaitForActiveTab(options: {
  pathChanged: boolean
  activeTabPath: string | null
  activeTab: Tab | undefined
}) {
  const { pathChanged, activeTabPath, activeTab } = options
  return pathChanged && !!activeTabPath && !activeTab
}

export function syncActivePathTransition(options: {
  prevPath: string | null
  pathChanged: boolean
  activeTabPath: string | null
  activeTab: Tab | undefined
  previousTab: Tab | undefined
  cache: Map<string, CachedTabState>
  editor: Editor
  editorMountedRef: MutableRefObject<boolean>
  prevActivePathRef: MutableRefObject<string | null>
}) {
  const {
    prevPath,
    pathChanged,
    activeTabPath,
    activeTab,
    previousTab,
    cache,
    editor,
    editorMountedRef,
    prevActivePathRef,
  } = options

  cachePreviousTabOnPathChange({
    prevPath,
    previousTab,
    pathChanged,
    editorMountedRef,
    cache,
    editor,
  })
  if (shouldWaitForActiveTab({ pathChanged, activeTabPath, activeTab })) return true

  if (!preserveUntitledRenameState({
    prevPath,
    activeTabPath,
    activeTab,
    cache,
    editor,
    editorMountedRef,
  })) {
    prevActivePathRef.current = activeTabPath
    return false
  }

  prevActivePathRef.current = activeTabPath
  return true
}

function markRawModeReswapPending(options: {
  activeTabPath: string | null
  cache: Map<string, CachedTabState>
  rawSwapPendingRef: MutableRefObject<boolean>
}) {
  const { activeTabPath, cache, rawSwapPendingRef } = options
  if (!activeTabPath) return false
  cache.delete(activeTabPath)
  rawSwapPendingRef.current = true
  return true
}

function currentEditorMatchesActiveTab(options: {
  activeTabPath: string | null
  activeTab: Tab | undefined
  editor: Editor
  editorMountedRef: MutableRefObject<boolean>
}) {
  const {
    activeTabPath,
    activeTab,
    editor,
    editorMountedRef,
  } = options

  return Boolean(
    activeTabPath
      && activeTab
      && editorMountedRef.current
      && typeof editor.blocksToMarkdownLossy === 'function'
      && serializeEditorBody(editor) === normalizeTabBody({ content: activeTab.content }),
  )
}

function cacheStableActiveTabAndClearPending(options: {
  cache: Map<string, CachedTabState>
  activeTabPath: string | null
  activeTab: Tab | undefined
  editor: Editor
  editorMountedRef: MutableRefObject<boolean>
  pendingLocalContentRef: MutableRefObject<PendingLocalContent | null>
}) {
  const {
    cache,
    activeTabPath,
    activeTab,
    editor,
    editorMountedRef,
    pendingLocalContentRef,
  } = options

  cacheStableActivePath({
    cache,
    activeTabPath,
    activeTab,
    editor,
    editorMountedRef,
  })
  pendingLocalContentRef.current = null
  return true
}

function shouldKeepPendingLocalContent(options: {
  activeTabPath: string | null
  activeTab: Tab | undefined
  pendingLocalContentRef: MutableRefObject<PendingLocalContent | null>
}) {
  const {
    activeTabPath,
    activeTab,
    pendingLocalContentRef,
  } = options

  const pendingLocalContent = pendingLocalContentRef.current
  if (!activeTabPath || !activeTab || pendingLocalContent?.path !== activeTabPath) return false
  return true
}

function consumePendingLocalContent(options: {
  cache: Map<string, CachedTabState>
  activeTabPath: string | null
  activeTab: Tab | undefined
  editor: Editor
  editorMountedRef: MutableRefObject<boolean>
  pendingLocalContentRef: MutableRefObject<PendingLocalContent | null>
}) {
  const {
    cache,
    activeTabPath,
    activeTab,
    editor,
    editorMountedRef,
    pendingLocalContentRef,
  } = options

  const pendingLocalContent = pendingLocalContentRef.current
  if (!pendingLocalContent || pendingLocalContent.content !== activeTab?.content) return true
  return cacheStableActiveTabAndClearPending({
    cache,
    activeTabPath,
    activeTab,
    editor,
    editorMountedRef,
    pendingLocalContentRef,
  })
}

export function handleStableActivePath(options: {
  pathChanged: boolean
  rawModeJustEnded: boolean
  activeTabPath: string | null
  activeTab: Tab | undefined
  cache: Map<string, CachedTabState>
  editor: Editor
  editorMountedRef: MutableRefObject<boolean>
  rawSwapPendingRef: MutableRefObject<boolean>
  pendingLocalContentRef: MutableRefObject<PendingLocalContent | null>
}) {
  const {
    pathChanged,
    rawModeJustEnded,
    activeTabPath,
    activeTab,
    cache,
    editor,
    editorMountedRef,
    rawSwapPendingRef,
    pendingLocalContentRef,
  } = options

  if (pathChanged) return false
  if (rawModeJustEnded) {
    return !markRawModeReswapPending({ activeTabPath, cache, rawSwapPendingRef })
  }
  if (currentEditorMatchesActiveTab({ activeTabPath, activeTab, editor, editorMountedRef })) {
    return cacheStableActiveTabAndClearPending({
      cache,
      activeTabPath,
      activeTab,
      editor,
      editorMountedRef,
      pendingLocalContentRef,
    })
  }
  if (shouldKeepPendingLocalContent({ activeTabPath, activeTab, pendingLocalContentRef })) {
    return consumePendingLocalContent({
      cache,
      activeTabPath,
      activeTab,
      editor,
      editorMountedRef,
      pendingLocalContentRef,
    })
  }
  if (shouldRefreshStableActivePath({ activeTabPath, activeTab, cache })) return false
  if (rawSwapPendingRef.current) return true

  cacheStableActivePath({
    cache,
    activeTabPath,
    activeTab,
    editor,
    editorMountedRef,
  })
  return true
}

function shouldRefreshStableActivePath(options: {
  activeTabPath: string | null
  activeTab: Tab | undefined
  cache: Map<string, CachedTabState>
}): boolean {
  const {
    activeTabPath,
    activeTab,
    cache,
  } = options

  if (!activeTabPath || !activeTab) return false
  const cachedState = cache.get(activeTabPath)
  return !cachedState || cachedState.sourceContent !== activeTab.content
}

function cacheStableActivePath(options: {
  cache: Map<string, CachedTabState>
  activeTabPath: string | null
  activeTab: Tab | undefined
  editor: Editor
  editorMountedRef: MutableRefObject<boolean>
}) {
  const {
    cache,
    activeTabPath,
    activeTab,
    editor,
    editorMountedRef,
  } = options

  if (!activeTabPath || !activeTab || !editorMountedRef.current) return
  cacheEditorState(cache, activeTabPath, {
    blocks: editor.document,
    scrollTop: readEditorScrollTop(),
    sourceContent: activeTab.content,
  })
}

function preserveUntitledRenameState(options: {
  prevPath: string | null
  activeTabPath: string | null
  activeTab: Tab | undefined
  cache: Map<string, CachedTabState>
  editor: Editor
  editorMountedRef: MutableRefObject<boolean>
}) {
  const {
    prevPath,
    activeTabPath,
    activeTab,
    cache,
    editor,
    editorMountedRef,
  } = options

  if (!prevPath || !activeTabPath) return false
  if (!isUntitledRenameTransition(prevPath, activeTabPath, activeTab, editor)) return false

  cache.delete(prevPath)
  cacheStableActivePath({
    cache,
    activeTabPath,
    activeTab,
    editor,
    editorMountedRef,
  })
  requestAnimationFrame(() => signalEditorTabSwapped(activeTabPath))
  return true
}
