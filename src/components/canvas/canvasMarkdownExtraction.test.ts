import { describe, expect, it } from 'vitest'
import type { CanvasDocument } from '../../utils/canvasAttachments'
import { createCanvasDocument } from '../../utils/canvasAttachments'
import { extractCanvasDocumentMarkdown } from './canvasMarkdownExtraction'

function documentWithLayers(): CanvasDocument {
  return {
    ...createCanvasDocument('whiteboard'),
    layerOrder: ['shape-1', 'stroke-1', 'text-1', 'image-1'],
    images: [{
      id: 'image-1',
      src: 'attachments/photo.png',
      x: 400,
      y: 120,
      width: 300,
      height: 180,
    }],
    shapes: [{
      id: 'shape-1',
      kind: 'rectangle',
      x: 20,
      y: 40,
      width: 120,
      height: 80,
      color: '#171717',
      size: 5,
    }],
    strokes: [{
      id: 'stroke-1',
      color: '#171717',
      size: 5,
      tool: 'pen',
      points: [
        { x: 10, y: 10, pressure: 0.5, at: 1 },
        { x: 20, y: 30, pressure: 0.5, at: 2 },
        { x: 60, y: 50, pressure: 0.5, at: 3 },
      ],
    }],
    textBoxes: [{
      id: 'text-1',
      text: 'Remember this\nbefore release',
      x: 200,
      y: 220,
      width: 320,
      color: '#171717',
      size: 20,
    }],
  }
}

describe('canvasMarkdownExtraction', () => {
  it('extracts canvas shapes, strokes, text, and images as portable markdown', () => {
    const markdown = extractCanvasDocumentMarkdown(documentWithLayers(), { title: 'Launch Board' })

    expect(markdown).toContain('## Canvas Extraction - Launch Board')
    expect(markdown).toContain('- Scope: All layers')
    expect(markdown).toContain('- Layers: 4')
    expect(markdown).toContain('- Rectangle: (20, 40), 120x80')
    expect(markdown).toContain('- Pen stroke: 3 points, bounds (10, 10) -> (60, 50), path (10, 10) -> (20, 30) -> (60, 50)')
    expect(markdown).toContain('- Text: Remember this / before release at (200, 220)')
    expect(markdown).toContain('- Image: attachments/photo.png at (400, 120), 300x180')
  })

  it('can extract only lasso-selected canvas layers', () => {
    const markdown = extractCanvasDocumentMarkdown(documentWithLayers(), {
      selection: {
        images: [],
        shapes: [],
        strokes: ['stroke-1'],
        textBoxes: ['text-1'],
      },
    })

    expect(markdown).toContain('- Scope: Selected layers')
    expect(markdown).toContain('- Layers: 2')
    expect(markdown).toContain('Pen stroke')
    expect(markdown).toContain('Text: Remember this')
    expect(markdown).not.toContain('Rectangle')
    expect(markdown).not.toContain('attachments/photo.png')
  })
})
