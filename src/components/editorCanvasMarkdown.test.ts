import { describe, expect, it, vi } from 'vitest'
import {
  syncCanvasMarkdownSnapshot,
  type MarkdownSnapshotEditor,
} from './editorCanvasMarkdown'

function makeEditor(
  document: MarkdownSnapshotEditor['document'],
  markdown = 'rendered markdown',
) {
  const blocksToMarkdownLossy = vi.fn(() => markdown)
  const editor: MarkdownSnapshotEditor = { document, blocksToMarkdownLossy }
  return { blocksToMarkdownLossy, editor }
}

describe('syncCanvasMarkdownSnapshot', () => {
  it('keeps normal typing off the markdown serialization path', () => {
    const { blocksToMarkdownLossy, editor } = makeEditor([
      { type: 'paragraph', content: [{ type: 'text', text: 'hello' }], children: [] },
    ])

    expect(syncCanvasMarkdownSnapshot(editor, '# Note', '# Note')).toBe('# Note')
    expect(blocksToMarkdownLossy).not.toHaveBeenCalled()
  })

  it('serializes once when a new unsaved canvas contract appears', () => {
    const rendered = [
      '![Handwritten Canvas](attachments/handwriting-1.png)',
      '',
      '```grimoire-canvas',
      'type: handwriting',
      'source: attachments/handwriting-1.grimoire-canvas.json',
      'preview: attachments/handwriting-1.png',
      '```',
    ].join('\n')
    const { blocksToMarkdownLossy, editor } = makeEditor([
      {
        type: 'codeBlock',
        props: { language: 'grimoire-canvas' },
        content: [{ type: 'text', text: 'source: attachments/handwriting-1.grimoire-canvas.json' }],
        children: [],
      },
    ], rendered)

    expect(syncCanvasMarkdownSnapshot(editor, '', '')).toBe(rendered)
    expect(blocksToMarkdownLossy).toHaveBeenCalledOnce()
  })

  it('uses the cached markdown for existing canvas notes while typing', () => {
    const currentMarkdown = '```grimoire-canvas\nsource: attachments/a.json\n```'
    const { blocksToMarkdownLossy, editor } = makeEditor([
      {
        type: 'codeBlock',
        props: { language: 'grimoire-canvas' },
        content: [],
        children: [],
      },
    ])

    expect(syncCanvasMarkdownSnapshot(editor, currentMarkdown, currentMarkdown)).toBe(currentMarkdown)
    expect(blocksToMarkdownLossy).not.toHaveBeenCalled()
  })
})
