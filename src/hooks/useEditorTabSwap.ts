import { useCallback, useEffect, useRef, type MutableRefObject } from 'react'
import { stripInjectedCodeLanguages } from '../utils/codeLanguageDetect'
import { compactMarkdown } from '../utils/compact-markdown'
import { serializeMathAwareBlocks } from '../utils/mathMarkdown'
import { portableImageUrls } from '../utils/vaultImages'
import { restoreWikilinksInBlocks, splitFrontmatter } from '../utils/wikilinks'
import { cacheEditorState } from './editorTabSwapCache'
import { runTabSwapEffect } from './editorTabSwapSchedule'
import type { CachedTabState, Editor, PendingLocalContent, Tab } from './editorTabSwapTypes'

export { extractEditorBody, getH1TextFromBlocks, replaceTitleInFrontmatter } from './editorTabContent'

/** Idle delay before the debounced markdown serialization runs. */
const SERIALIZE_DEBOUNCE_MS = 200

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
  prevActivePathRef: MutableRefObject<string | null>
  suppressChangeRef: MutableRefObject<boolean>
  serializeTimerRef: MutableRefObject<ReturnType<typeof setTimeout> | null>
  pendingEditRef: MutableRefObject<{ path: string; tab: Tab } | null>
  flushRef: MutableRefObject<(() => void) | null>
}) {
  const {
    prevActivePathRef,
    suppressChangeRef,
    serializeTimerRef,
    pendingEditRef,
    flushRef,
    tabsRef,
  } = options

  return useCallback(() => {
    if (suppressChangeRef.current) return
    const path = prevActivePathRef.current
    if (!path) return

    const tab = tabsRef.current.find(t => t.entry.path === path)
    if (!tab) return

    // FLUSH CONTRACT: this handler only records the keystroke. The expensive
    // markdown serialization (block transforms → serialize → compact → image
    // urls → frontmatter split) runs in flushPendingSerialization(), which MUST
    // run before anything reads serialized content: the 200ms idle timer here,
    // plus tab swap (runTabSwapEffect), editor blur, save requests
    // (useEditorSave.flushPending via beforeFlushPending), and unmount.
    // pendingLocalContentRef, the tab cache, and onContentChange consumers all
    // observe content only through that flush.
    pendingEditRef.current = { path, tab }
    if (serializeTimerRef.current) clearTimeout(serializeTimerRef.current)
    serializeTimerRef.current = setTimeout(() => {
      serializeTimerRef.current = null
      flushRef.current?.()
    }, SERIALIZE_DEBOUNCE_MS)
  }, [flushRef, pendingEditRef, prevActivePathRef, serializeTimerRef, suppressChangeRef, tabsRef])
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
  flushPendingSerialization: () => void
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
    flushPendingSerialization,
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
      flushPendingSerialization,
    })
  }, [
    activeTabPath,
    editor,
    editorMountedRef,
    flushPendingSerialization,
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
  const serializeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const pendingEditRef = useRef<{ path: string; tab: Tab } | null>(null)
  const flushRef = useRef<(() => void) | null>(null)

  const flushPendingSerialization = useCallback(() => {
    if (serializeTimerRef.current) {
      clearTimeout(serializeTimerRef.current)
      serializeTimerRef.current = null
    }
    const pending = pendingEditRef.current
    if (!pending) return
    pendingEditRef.current = null
    const { path, tab } = pending
    // The document is re-read here rather than at keystroke time: between the
    // last change event and this flush there is no tab swap (swaps flush
    // first), so editor.document is still the pending edit's document — and it
    // may include trailing micro-edits made within the same frame.
    const blocks = editor.document
    // Detected code languages are display-only; keep them out of saved markdown.
    const restored = restoreWikilinksInBlocks(stripInjectedCodeLanguages(blocks))
    const rawBodyMarkdown = compactMarkdown(serializeMathAwareBlocks(editor, restored as typeof blocks))
    const bodyMarkdown = vaultPathRef.current
      ? portableImageUrls(rawBodyMarkdown, vaultPathRef.current)
      : rawBodyMarkdown
    const [frontmatter] = splitFrontmatter(tab.content)
    const nextContent = `${frontmatter}${bodyMarkdown}`
    pendingLocalContentRef.current = { path, content: nextContent }
    cacheEditorState(tabCacheRef.current, path, {
      blocks,
      // Reading scrollTop right after a DOM mutation forces a synchronous
      // layout on every keystroke. Tab swaps and raw-mode toggles re-read the
      // live scroll position themselves, so keep the last known value here.
      scrollTop: tabCacheRef.current.get(path)?.scrollTop ?? 0,
      sourceContent: nextContent,
    })
    onContentChangeRef.current?.(path, nextContent)
  }, [editor, onContentChangeRef, pendingLocalContentRef, tabCacheRef, vaultPathRef])
  useEffect(() => {
    flushRef.current = flushPendingSerialization
  }, [flushPendingSerialization])

  useEffect(() => () => {
    // Unmount flush: serialized state must be pushed to the save pipeline even
    // if the editor disappears before the idle timer fires (e.g. closing the
    // last tab unmounts the editor surface).
    flushRef.current?.()
  }, [])

  useEffect(() => {
    const dom = editor.dom
    if (!dom) return
    // Blur flush: leaving the editor is an explicit "done typing" signal; push
    // pending serialization immediately so saves and panel reads that follow
    // the blur never see pre-debounce content.
    dom.addEventListener('blur', flushPendingSerialization, true)
    return () => dom.removeEventListener('blur', flushPendingSerialization, true)
  }, [editor, flushPendingSerialization])

  const handleEditorChange = useEditorChangeHandler({
    editor,
    prevActivePathRef,
    suppressChangeRef,
    serializeTimerRef,
    pendingEditRef,
    flushRef,
    tabsRef,
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
    flushPendingSerialization,
  })

  return { handleEditorChange, editorMountedRef, flushPendingSerialization }
}
