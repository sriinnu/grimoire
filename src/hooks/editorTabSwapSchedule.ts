import type { MutableRefObject } from 'react'
import { failNoteOpenTrace } from '../utils/noteOpenPerformance'
import { clearEditorDomSelection } from './editorDomSelection'
import {
  applyBlankStateToEditor,
  applyBlocksToEditor,
  applyHtmlStateToEditor,
  blankParagraphBlocks,
  cacheEditorState,
  extractBodyRemainderAfterEmptyH1,
  isBlankBodyContent,
  resolveBlocksForTarget,
  resolveEmptyHeadingHtml,
} from './editorTabSwapCache'
import { signalTabSwap } from './editorTabSwapSignals'
import {
  consumeRawModeTransition,
  handleStableActivePath,
  syncActivePathTransition,
} from './editorTabSwapTransitions'
import type { CachedTabState, Editor, PendingLocalContent, Tab, TabSwapState } from './editorTabSwapTypes'

function findActiveTab(options: {
  tabs: Tab[]
  activeTabPath: string | null
}): Tab | undefined {
  const { tabs, activeTabPath } = options
  return activeTabPath
    ? tabs.find(tab => tab.entry.path === activeTabPath)
    : undefined
}

function clearStaleSwap(options: {
  targetPath: string
  prevActivePathRef: MutableRefObject<string | null>,
  suppressChangeRef: MutableRefObject<boolean>,
}): boolean {
  const {
    targetPath,
    prevActivePathRef,
    suppressChangeRef,
  } = options
  if (prevActivePathRef.current === targetPath) return false
  suppressChangeRef.current = false
  return true
}

function applyBlankTabState(options: {
  cache: Map<string, CachedTabState>
  targetPath: string
  content: string
  editor: Editor
  suppressChangeRef: MutableRefObject<boolean>
}) {
  const {
    cache,
    targetPath,
    content,
    editor,
    suppressChangeRef,
  } = options

  cacheEditorState(cache, targetPath, {
    blocks: blankParagraphBlocks(),
    scrollTop: 0,
    sourceContent: content,
  })
  applyBlankStateToEditor(editor, suppressChangeRef)
  signalTabSwap({ path: targetPath })
}

function scheduleEmptyHeadingSwap(options: {
  editor: Editor
  targetPath: string
  content: string
  prevActivePathRef: MutableRefObject<string | null>
  suppressChangeRef: MutableRefObject<boolean>
  vaultPath?: string
}) {
  const {
    editor,
    targetPath,
    content,
    prevActivePathRef,
    suppressChangeRef,
    vaultPath,
  } = options

  if (extractBodyRemainderAfterEmptyH1({ content }) === null) return false

  void resolveEmptyHeadingHtml(editor, content, vaultPath)
    .then((html) => {
      if (prevActivePathRef.current !== targetPath || !html) return
      applyHtmlStateToEditor(editor, html, suppressChangeRef)
      signalTabSwap({ path: targetPath })
    })
    .catch((err: unknown) => {
      suppressChangeRef.current = false
      console.error('Failed to render empty heading state:', err)
      failNoteOpenTrace(targetPath, 'empty-heading-swap-failed')
    })

  return true
}

function scheduleParsedBlockSwap(options: {
  editor: Editor
  cache: Map<string, CachedTabState>
  targetPath: string
  content: string
  prevActivePathRef: MutableRefObject<string | null>
  suppressChangeRef: MutableRefObject<boolean>
  vaultPath?: string
}) {
  const {
    editor,
    cache,
    targetPath,
    content,
    prevActivePathRef,
    suppressChangeRef,
    vaultPath,
  } = options

  void resolveBlocksForTarget({ editor, cache, targetPath, content, vaultPath })
    .then(({ blocks, scrollTop }) => {
      if (prevActivePathRef.current !== targetPath) return
      applyBlocksToEditor(editor, blocks, scrollTop, suppressChangeRef)
      signalTabSwap({ path: targetPath })
    })
    .catch((err: unknown) => {
      suppressChangeRef.current = false
      console.error('Failed to parse/swap editor content:', err)
      failNoteOpenTrace(targetPath, 'parsed-swap-failed')
    })
}

function scheduleTabSwap(options: {
  editor: Editor
  cache: Map<string, CachedTabState>
  targetPath: string
  activeTab: Tab
  clearDomSelection: boolean
  pendingSwapRef: MutableRefObject<(() => void) | null>
  prevActivePathRef: MutableRefObject<string | null>
  rawSwapPendingRef: MutableRefObject<boolean>
  suppressChangeRef: MutableRefObject<boolean>
  vaultPath?: string
}) {
  const {
    editor,
    cache,
    targetPath,
    activeTab,
    clearDomSelection,
    pendingSwapRef,
    prevActivePathRef,
    rawSwapPendingRef,
    suppressChangeRef,
    vaultPath,
  } = options

  suppressChangeRef.current = true

  const doSwap = () => {
    if (clearStaleSwap({ targetPath, prevActivePathRef, suppressChangeRef })) return
    rawSwapPendingRef.current = false
    if (clearDomSelection) clearEditorDomSelection()

    if (isBlankBodyContent({ content: activeTab.content })) {
      applyBlankTabState({
        cache,
        targetPath,
        content: activeTab.content,
        editor,
        suppressChangeRef,
      })
      return
    }

    if (scheduleEmptyHeadingSwap({
      editor,
      targetPath,
      content: activeTab.content,
      prevActivePathRef,
      suppressChangeRef,
      vaultPath,
    })) {
      return
    }

    scheduleParsedBlockSwap({
      editor,
      cache,
      targetPath,
      content: activeTab.content,
      prevActivePathRef,
      suppressChangeRef,
      vaultPath,
    })
  }

  if (editor.prosemirrorView) {
    queueMicrotask(doSwap)
    return
  }
  pendingSwapRef.current = doSwap
}

function resolveTabSwapState(options: {
  tabs: Tab[]
  activeTabPath: string | null
  tabCacheRef: MutableRefObject<Map<string, CachedTabState>>
  prevActivePathRef: MutableRefObject<string | null>
  rawModeJustEnded: boolean
}): TabSwapState {
  const {
    tabs,
    activeTabPath,
    tabCacheRef,
    prevActivePathRef,
    rawModeJustEnded,
  } = options

  const prevPath = prevActivePathRef.current
  return {
    cache: tabCacheRef.current,
    prevPath,
    pathChanged: prevPath !== activeTabPath,
    activeTab: findActiveTab({ tabs, activeTabPath }),
    previousTab: findActiveTab({ tabs, activeTabPath: prevPath }),
    rawModeJustEnded,
  }
}

function shouldSkipScheduledTabSwap(options: {
  state: TabSwapState
  activeTabPath: string | null
  editor: Editor
  editorMountedRef: MutableRefObject<boolean>
  prevActivePathRef: MutableRefObject<string | null>
  rawSwapPendingRef: MutableRefObject<boolean>
  pendingLocalContentRef: MutableRefObject<PendingLocalContent | null>
}) {
  const {
    state,
    activeTabPath,
    editor,
    editorMountedRef,
    prevActivePathRef,
    rawSwapPendingRef,
    pendingLocalContentRef,
  } = options

  if (state.pathChanged) {
    pendingLocalContentRef.current = null
  }

  if (syncActivePathTransition({
    prevPath: state.prevPath,
    pathChanged: state.pathChanged,
    activeTabPath,
    activeTab: state.activeTab,
    previousTab: state.previousTab,
    cache: state.cache,
    editor,
    editorMountedRef,
    prevActivePathRef,
  })) {
    return true
  }

  return handleStableActivePath({
    pathChanged: state.pathChanged,
    rawModeJustEnded: state.rawModeJustEnded,
    activeTabPath,
    activeTab: state.activeTab,
    cache: state.cache,
    editor,
    editorMountedRef,
    rawSwapPendingRef,
    pendingLocalContentRef,
  })
}

export function runTabSwapEffect(options: {
  tabs: Tab[]
  activeTabPath: string | null
  editor: Editor
  rawMode?: boolean
  tabCacheRef: MutableRefObject<Map<string, CachedTabState>>
  prevActivePathRef: MutableRefObject<string | null>
  editorMountedRef: MutableRefObject<boolean>
  pendingSwapRef: MutableRefObject<(() => void) | null>
  prevRawModeRef: MutableRefObject<boolean>
  rawSwapPendingRef: MutableRefObject<boolean>
  suppressChangeRef: MutableRefObject<boolean>
  pendingLocalContentRef: MutableRefObject<PendingLocalContent | null>
  vaultPath?: string
}) {
  const {
    tabs,
    activeTabPath,
    editor,
    rawMode,
    tabCacheRef,
    prevActivePathRef,
    editorMountedRef,
    pendingSwapRef,
    prevRawModeRef,
    rawSwapPendingRef,
    suppressChangeRef,
    pendingLocalContentRef,
    vaultPath,
  } = options

  const rawModeJustEnded = consumeRawModeTransition(prevRawModeRef, rawMode)
  if (rawMode) return
  const state = resolveTabSwapState({
    tabs,
    activeTabPath,
    tabCacheRef,
    prevActivePathRef,
    rawModeJustEnded,
  })

  if (shouldSkipScheduledTabSwap({
    state,
    activeTabPath,
    editor,
    editorMountedRef,
    prevActivePathRef,
    rawSwapPendingRef,
    pendingLocalContentRef,
  })) {
    return
  }

  if (!activeTabPath || !state.activeTab) return

  scheduleTabSwap({
    editor,
    cache: state.cache,
    targetPath: activeTabPath,
    activeTab: state.activeTab,
    clearDomSelection: state.pathChanged,
    pendingSwapRef,
    prevActivePathRef,
    rawSwapPendingRef,
    suppressChangeRef,
    vaultPath,
  })
}
