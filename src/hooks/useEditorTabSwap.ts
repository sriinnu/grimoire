import { useCallback, useEffect, useRef, type MutableRefObject } from 'react'
import { compactMarkdown } from '../utils/compact-markdown'
import { serializeMathAwareBlocks } from '../utils/mathMarkdown'
import { portableImageUrls } from '../utils/vaultImages'
import { restoreWikilinksInBlocks, splitFrontmatter } from '../utils/wikilinks'
import { cacheEditorState, readEditorScrollTop } from './editorTabSwapCache'
import { runTabSwapEffect } from './editorTabSwapSchedule'
import type { CachedTabState, Editor, PendingLocalContent, Tab } from './editorTabSwapTypes'

export { extractEditorBody, getH1TextFromBlocks, replaceTitleInFrontmatter } from './editorTabContent'

interface UseEditorTabSwapOptions {
  tabs: Tab[]
  activeTabPath: string | null
  editor: Editor
  onContentChange?: (path: string, content: string) => void
  /** When true, the BlockNote editor is hidden (raw/CodeMirror mode active). */
  rawMode?: boolean
  vaultPath?: string
}

function useLatestRef<T>(value: T): MutableRefObject<T> {
  const ref = useRef(value)
  useEffect(() => {
    ref.current = value
  }, [value])
  return ref
}

function useEditorMountState(
  editor: Editor,
  editorMountedRef: MutableRefObject<boolean>,
  pendingSwapRef: MutableRefObject<(() => void) | null>,
) {
  useEffect(() => {
    if (editor.prosemirrorView) {
      editorMountedRef.current = true
    }
    const cleanup = editor.onMount(() => {
      editorMountedRef.current = true
      if (pendingSwapRef.current) {
        const swap = pendingSwapRef.current
        pendingSwapRef.current = null
        queueMicrotask(swap)
      }
    })
    return cleanup
  }, [editor, editorMountedRef, pendingSwapRef])
}

function useEditorChangeHandler(options: {
  editor: Editor
  tabsRef: MutableRefObject<Tab[]>
  onContentChangeRef: MutableRefObject<((path: string, content: string) => void) | undefined>
  prevActivePathRef: MutableRefObject<string | null>
  suppressChangeRef: MutableRefObject<boolean>
  tabCacheRef: MutableRefObject<Map<string, CachedTabState>>
  pendingLocalContentRef: MutableRefObject<PendingLocalContent | null>
  vaultPathRef: MutableRefObject<string | undefined>
}) {
  const {
    editor,
    tabsRef,
    onContentChangeRef,
    prevActivePathRef,
    suppressChangeRef,
    tabCacheRef,
    pendingLocalContentRef,
    vaultPathRef,
  } = options

  return useCallback(() => {
    if (suppressChangeRef.current) return
    const path = prevActivePathRef.current
    if (!path) return

    const tab = tabsRef.current.find(t => t.entry.path === path)
    if (!tab) return

    const blocks = editor.document
    const restored = restoreWikilinksInBlocks(blocks)
    const rawBodyMarkdown = compactMarkdown(serializeMathAwareBlocks(editor, restored as typeof blocks))
    const bodyMarkdown = vaultPathRef.current
      ? portableImageUrls(rawBodyMarkdown, vaultPathRef.current)
      : rawBodyMarkdown
    const [frontmatter] = splitFrontmatter(tab.content)
    const nextContent = `${frontmatter}${bodyMarkdown}`
    pendingLocalContentRef.current = { path, content: nextContent }
    cacheEditorState(tabCacheRef.current, path, {
      blocks,
      scrollTop: readEditorScrollTop(),
      sourceContent: nextContent,
    })
    onContentChangeRef.current?.(path, nextContent)
  }, [editor, onContentChangeRef, pendingLocalContentRef, prevActivePathRef, suppressChangeRef, tabCacheRef, tabsRef, vaultPathRef])
}

function useTabSwapEffect(options: {
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
  vaultPathRef: MutableRefObject<string | undefined>
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
    vaultPathRef,
  } = options

  useEffect(() => {
    runTabSwapEffect({
      tabs,
      activeTabPath,
      editor,
      rawMode,
      tabCacheRef,
      editorMountedRef,
      prevActivePathRef,
      pendingSwapRef,
      prevRawModeRef,
      rawSwapPendingRef,
      suppressChangeRef,
      pendingLocalContentRef,
      vaultPath: vaultPathRef.current,
    })
  }, [
    activeTabPath,
    editor,
    editorMountedRef,
    pendingSwapRef,
    prevActivePathRef,
    prevRawModeRef,
    rawMode,
    rawSwapPendingRef,
    suppressChangeRef,
    tabCacheRef,
    tabs,
    pendingLocalContentRef,
    vaultPathRef,
  ])
}

/**
 * Manages BlockNote document swapping, cache lifecycle, and change serialization
 * for the active editor tab.
 */
export function useEditorTabSwap({ tabs, activeTabPath, editor, onContentChange, rawMode, vaultPath }: UseEditorTabSwapOptions) {
  const tabCacheRef = useRef<Map<string, CachedTabState>>(new Map())
  const pendingLocalContentRef = useRef<PendingLocalContent | null>(null)
  const prevActivePathRef = useRef<string | null>(null)
  const editorMountedRef = useRef(false)
  const pendingSwapRef = useRef<(() => void) | null>(null)
  const prevRawModeRef = useRef(!!rawMode)
  const rawSwapPendingRef = useRef(false)
  const suppressChangeRef = useRef(false)
  const onContentChangeRef = useLatestRef(onContentChange)
  const tabsRef = useLatestRef(tabs)
  const vaultPathRef = useLatestRef(vaultPath)
  const handleEditorChange = useEditorChangeHandler({
    editor,
    tabsRef,
    onContentChangeRef,
    prevActivePathRef,
    suppressChangeRef,
    tabCacheRef,
    pendingLocalContentRef,
    vaultPathRef,
  })

  useEditorMountState(editor, editorMountedRef, pendingSwapRef)
  useTabSwapEffect({
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
    vaultPathRef,
  })

  return { handleEditorChange, editorMountedRef }
}
