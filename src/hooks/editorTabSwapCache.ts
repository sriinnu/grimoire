import type { MutableRefObject } from 'react'
import { compactMarkdown } from '../utils/compact-markdown'
import { injectMathInBlocks, preProcessMathMarkdown, serializeMathAwareBlocks } from '../utils/mathMarkdown'
import { resolveImageUrls } from '../utils/vaultImages'
import { injectWikilinks, preProcessWikilinks, restoreWikilinksInBlocks } from '../utils/wikilinks'
import { extractEditorBody, normalizeParsedImageBlocks } from './editorTabContent'
import { EDITOR_CONTAINER_SELECTOR } from './editorDomSelection'
import { TAB_STATE_CACHE_LIMIT, type CachedTabState, type Editor, type EditorBlocks } from './editorTabSwapTypes'

export function readEditorScrollTop(): number {
  const scrollEl = document.querySelector(EDITOR_CONTAINER_SELECTOR)
  return scrollEl?.scrollTop ?? 0
}

export function cacheEditorState(
  cache: Map<string, CachedTabState>,
  path: string,
  nextState: CachedTabState,
) {
  if (cache.has(path)) cache.delete(path)
  cache.set(path, nextState)
  while (cache.size > TAB_STATE_CACHE_LIMIT) {
    const oldestPath = cache.keys().next().value
    if (!oldestPath) return
    cache.delete(oldestPath)
  }
}

function buildFastPathBlocks(options: { preprocessed: string }): EditorBlocks | null {
  const { preprocessed } = options
  const trimmed = preprocessed.trim()

  if (!trimmed) {
    return [{ type: 'paragraph', content: [] }]
  }

  if (trimmed === '#') {
    return [
      { type: 'heading', props: { level: 1, textColor: 'default', backgroundColor: 'default', textAlignment: 'left' }, content: [], children: [] },
      { type: 'paragraph', content: [], children: [] },
    ]
  }

  const h1OnlyMatch = trimmed.match(/^# (.+)$/)
  if (!h1OnlyMatch) return null

  return [
    { type: 'heading', props: { level: 1, textColor: 'default', backgroundColor: 'default', textAlignment: 'left' }, content: [{ type: 'text', text: h1OnlyMatch[1], styles: {} }], children: [] },
    { type: 'paragraph', content: [], children: [] },
  ]
}

export function isBlankBodyContent(options: { content: string }): boolean {
  const { content } = options
  return extractEditorBody(content).trim() === ''
}

export function extractBodyRemainderAfterEmptyH1(options: { content: string }): string | null {
  const { content } = options
  const body = extractEditorBody(content)
  const [firstLine, secondLine, ...rest] = body.split('\n')
  if (!firstLine) return null

  const normalizedFirstLine = firstLine.trimEnd()
  if (normalizedFirstLine !== '#' && normalizedFirstLine !== '# ') return null

  if (secondLine === '') {
    return rest.join('\n').trimStart()
  }

  return [secondLine, ...rest].join('\n').trimStart()
}

export function blankParagraphBlocks(): EditorBlocks {
  return [{ type: 'paragraph', content: [], children: [] }]
}

async function parseMarkdownBlocks(
  editor: Editor,
  preprocessed: string,
): Promise<EditorBlocks> {
  const result = editor.tryParseMarkdownToBlocks(preprocessed)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- tryParseMarkdownToBlocks returns sync or async BlockNote blocks.
  if (result && typeof (result as any).then === 'function') {
    return (result as unknown as Promise<EditorBlocks>)
  }
  return result as EditorBlocks
}

export async function resolveBlocksForTarget(
  options: {
    editor: Editor
    cache: Map<string, CachedTabState>
    targetPath: string
    content: string
    vaultPath?: string
  },
): Promise<CachedTabState> {
  const { editor, cache, targetPath, content, vaultPath } = options
  const cached = cache.get(targetPath)
  if (cached?.sourceContent === content) return cached

  const body = extractEditorBody(content)
  const withImages = vaultPath ? resolveImageUrls(body, vaultPath) : body
  const preprocessed = preProcessMathMarkdown({ markdown: preProcessWikilinks(withImages) })
  const fastPathBlocks = buildFastPathBlocks({ preprocessed })
  if (fastPathBlocks) {
    const nextState = { blocks: fastPathBlocks, scrollTop: 0, sourceContent: content }
    cacheEditorState(cache, targetPath, nextState)
    return nextState
  }

  const parsed = normalizeParsedImageBlocks(await parseMarkdownBlocks(editor, preprocessed)) as EditorBlocks
  const withWikilinks = injectWikilinks(parsed)
  const withMath = injectMathInBlocks(withWikilinks)
  const nextState = { blocks: withMath, scrollTop: 0, sourceContent: content }
  cacheEditorState(cache, targetPath, nextState)
  return nextState
}

export function applyBlocksToEditor(
  editor: Editor,
  blocks: EditorBlocks,
  scrollTop: number,
  suppressChangeRef: MutableRefObject<boolean>,
) {
  suppressChangeRef.current = true
  try {
    const current = editor.document
    if (current.length > 0 && blocks.length > 0) {
      editor.replaceBlocks(current, blocks)
    } else if (blocks.length > 0) {
      editor.insertBlocks(blocks, current[0], 'before')
    }
  } catch (err) {
    console.error('applyBlocks failed, trying fallback:', err)
    try {
      const html = editor.blocksToHTMLLossy(blocks)
      editor._tiptapEditor.commands.setContent(html)
    } catch (err2) {
      console.error('Fallback also failed:', err2)
    }
  } finally {
    queueMicrotask(() => { suppressChangeRef.current = false })
  }

  requestAnimationFrame(() => {
    const scrollEl = document.querySelector(EDITOR_CONTAINER_SELECTOR)
    if (scrollEl) scrollEl.scrollTop = scrollTop
  })
}

export function applyBlankStateToEditor(
  editor: Editor,
  suppressChangeRef: MutableRefObject<boolean>,
) {
  suppressChangeRef.current = true
  try {
    editor._tiptapEditor.commands.setContent('<p></p>')
  } catch (err) {
    console.error('applyBlankStateToEditor failed, falling back to replaceBlocks:', err)
    applyBlocksToEditor(editor, blankParagraphBlocks(), 0, suppressChangeRef)
    return
  }

  queueMicrotask(() => { suppressChangeRef.current = false })
  requestAnimationFrame(() => {
    const scrollEl = document.querySelector(EDITOR_CONTAINER_SELECTOR)
    if (scrollEl) scrollEl.scrollTop = 0
  })
}

export function applyHtmlStateToEditor(
  editor: Editor,
  html: string,
  suppressChangeRef: MutableRefObject<boolean>,
) {
  suppressChangeRef.current = true
  try {
    editor._tiptapEditor.commands.setContent(html)
  } catch (err) {
    console.error('applyHtmlStateToEditor failed:', err)
    suppressChangeRef.current = false
    throw err
  }

  queueMicrotask(() => { suppressChangeRef.current = false })
  requestAnimationFrame(() => {
    const scrollEl = document.querySelector(EDITOR_CONTAINER_SELECTOR)
    if (scrollEl) scrollEl.scrollTop = 0
  })
}

export async function resolveEmptyHeadingHtml(
  editor: Editor,
  content: string,
  vaultPath?: string,
): Promise<string | null> {
  const remainder = extractBodyRemainderAfterEmptyH1({ content })
  if (remainder === null) return null
  if (!remainder.trim()) return '<h1></h1><p></p>'

  const withImages = vaultPath ? resolveImageUrls(remainder, vaultPath) : remainder
  const parsed = normalizeParsedImageBlocks(
    await parseMarkdownBlocks(editor, preProcessMathMarkdown({ markdown: preProcessWikilinks(withImages) })),
  ) as EditorBlocks
  const withWikilinks = injectWikilinks(parsed)
  const withMath = injectMathInBlocks(withWikilinks)
  return `<h1></h1>${editor.blocksToHTMLLossy(withMath as typeof parsed)}`
}

export function serializeEditorBody(editor: Editor): string {
  const restored = restoreWikilinksInBlocks(editor.document)
  return compactMarkdown(serializeMathAwareBlocks(editor, restored))
}

export function normalizeTabBody(options: { content: string }): string {
  const { content } = options
  return compactMarkdown(extractEditorBody(content))
}
