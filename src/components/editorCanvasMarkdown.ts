const CANVAS_CONTRACT_MARKER = 'grimoire-canvas'

/** Minimal BlockNote block shape needed to detect Grimoire canvas fences. */
export type EditorBlockSnapshot = {
  type?: string
  props?: { language?: string }
  content?: unknown
  children?: EditorBlockSnapshot[]
}

/** Editor surface contract used to produce a live Markdown snapshot on demand. */
export interface MarkdownSnapshotEditor {
  document: readonly EditorBlockSnapshot[]
  blocksToMarkdownLossy: (blocks: readonly EditorBlockSnapshot[]) => string
}

function inlineText(value: unknown): string {
  if (typeof value === 'string') return value
  if (!Array.isArray(value)) return ''
  return value.map((item) => {
    if (typeof item === 'string') return item
    if (typeof item === 'object' && item && 'text' in item) {
      return String((item as { text?: unknown }).text ?? '')
    }
    return ''
  }).join('')
}

function blockContainsCanvasContract(block: EditorBlockSnapshot): boolean {
  if (block.type === 'codeBlock' && block.props?.language === CANVAS_CONTRACT_MARKER) return true
  if (inlineText(block.content).includes(CANVAS_CONTRACT_MARKER)) return true
  return block.children?.some(blockContainsCanvasContract) ?? false
}

/** Return a live Markdown snapshot only when an unsaved canvas contract appears in the editor. */
export function syncCanvasMarkdownSnapshot(
  editor: MarkdownSnapshotEditor,
  fallbackMarkdown: string,
  currentMarkdown: string,
): string {
  if (fallbackMarkdown.includes(CANVAS_CONTRACT_MARKER)) return currentMarkdown
  if (currentMarkdown.includes(CANVAS_CONTRACT_MARKER)) return currentMarkdown
  if (!editor.document.some(blockContainsCanvasContract)) return currentMarkdown

  try {
    return editor.blocksToMarkdownLossy(editor.document)
  } catch {
    return currentMarkdown
  }
}
