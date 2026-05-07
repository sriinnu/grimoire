import { describe, expect, it } from 'vitest'
import {
  canvasAttachmentForImageSrc,
  createCanvasDocument,
  parseCanvasAttachments,
  parseCanvasDocumentJson,
  resolveVaultAttachmentPath,
} from './canvasAttachments'

describe('canvasAttachments', () => {
  it('extracts Grimoire canvas fences with their preview images', () => {
    const markdown = [
      '## Sketch',
      '',
      '![Handwritten Canvas](attachments/handwriting-1.png)',
      '',
      '```grimoire-canvas',
      'type: handwriting',
      'source: attachments/handwriting-1.grimoire-canvas.json',
      'preview: attachments/handwriting-1.png',
      '```',
    ].join('\n')

    expect(parseCanvasAttachments(markdown)).toEqual([
      {
        index: 0,
        title: 'Handwritten Canvas',
        kind: 'handwriting',
        source: 'attachments/handwriting-1.grimoire-canvas.json',
        preview: 'attachments/handwriting-1.png',
      },
    ])
  })

  it('matches clicked Tauri asset urls back to canvas previews', () => {
    const [attachment] = parseCanvasAttachments([
      '![Canvas](attachments/sketch.png)',
      '```grimoire-canvas',
      'type: whiteboard',
      'source: attachments/sketch.grimoire-canvas.json',
      'preview: attachments/sketch.png',
      '```',
    ].join('\n'))

    const matched = canvasAttachmentForImageSrc(
      [attachment],
      'asset://localhost/%2Fvault%2Fattachments%2Fsketch.png',
    )

    expect(matched?.source).toBe('attachments/sketch.grimoire-canvas.json')
  })

  it('falls back to a blank document for malformed saved JSON', () => {
    const document = parseCanvasDocumentJson('{nope', 'whiteboard')

    expect(document).toMatchObject({
      version: 1,
      kind: 'whiteboard',
      strokes: [],
    })
  })

  it('resolves attachment paths under the vault root', () => {
    expect(resolveVaultAttachmentPath('/vault/', '/attachments/a.png')).toBe('/vault/attachments/a.png')
    expect(createCanvasDocument('handwriting').background).toBe('#fffdf8')
  })
})
