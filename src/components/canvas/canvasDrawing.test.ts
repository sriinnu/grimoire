import { afterEach, describe, expect, it, vi } from 'vitest'
import { createCanvasDocument, type CanvasStroke } from '../../utils/canvasAttachments'
import {
  appendCanvasImage,
  appendCanvasShape,
  appendCanvasTextBox,
  appendStroke,
  clearCanvasDocument,
  eraseStrokesAt,
  findCanvasImageAt,
  moveCanvasSelection,
  moveCanvasImage,
  selectCanvasLayersInRect,
  undoCanvasDocument,
} from './canvasDrawing'

function stroke(): CanvasStroke {
  return {
    id: 'stroke-1',
    color: '#171717',
    size: 5,
    tool: 'pen',
    points: [
      { x: 100, y: 100, pressure: 0.5, at: 1 },
      { x: 120, y: 120, pressure: 0.5, at: 2 },
    ],
  }
}

describe('canvasDrawing image layers', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('adds portable image layers with deterministic placement offsets', () => {
    vi.spyOn(Date, 'now').mockReturnValue(10)
    vi.spyOn(Math, 'random').mockReturnValue(0.5)

    const document = appendCanvasImage(createCanvasDocument('whiteboard'), 'attachments/photo.png')

    expect(document.images).toEqual([
      expect.objectContaining({
        src: 'attachments/photo.png',
        x: 96,
        y: 96,
        width: 420,
        height: 280,
      }),
    ])
    expect(document.layerOrder).toEqual([document.images[0].id])
  })

  it('finds, moves, erases, and undoes mixed layers by creation order', () => {
    const withImage = appendCanvasImage(createCanvasDocument('whiteboard'), 'attachments/photo.png')
    const image = withImage.images[0]

    expect(findCanvasImageAt(withImage, { x: image.x + 1, y: image.y + 1, pressure: 0.5, at: 1 })?.id)
      .toBe(image.id)

    const moved = moveCanvasImage(withImage, image.id, 12, 18)
    expect(moved.images[0]).toMatchObject({ x: image.x + 12, y: image.y + 18 })

    const erased = eraseStrokesAt(moved, { x: image.x + 13, y: image.y + 19, pressure: 0.5, at: 2 })
    expect(erased.images).toEqual([])

    const withStroke = appendStroke(withImage, stroke())
    expect(withStroke.layerOrder).toEqual([image.id, 'stroke-1'])
    expect(undoCanvasDocument(withStroke).strokes).toEqual([])
    expect(undoCanvasDocument(withImage).images).toEqual([])
  })

  it('adds shapes and text boxes as ordered editable layers', () => {
    vi.spyOn(Date, 'now').mockReturnValue(20)
    vi.spyOn(Math, 'random').mockReturnValue(0.25)

    const start = { x: 10, y: 20, pressure: 0.5, at: 1 }
    const end = { x: 90, y: 70, pressure: 0.5, at: 2 }
    const shaped = appendCanvasShape(createCanvasDocument('whiteboard'), 'rectangle', start, end, '#171717', 5)
    const withText = appendCanvasTextBox(shaped, end, 'Remember this', '#171717', 5)

    expect(withText.shapes[0]).toMatchObject({ kind: 'rectangle', x: 10, y: 20, width: 80, height: 50 })
    expect(withText.textBoxes[0]).toMatchObject({ text: 'Remember this', x: 90, y: 70, width: 320 })
    expect(withText.layerOrder).toEqual([withText.shapes[0].id, withText.textBoxes[0].id])
  })

  it('selects and moves mixed lasso layers without persisting selection state', () => {
    const start = { x: 10, y: 20, pressure: 0.5, at: 1 }
    const end = { x: 90, y: 70, pressure: 0.5, at: 2 }
    const document = appendCanvasTextBox(
      appendCanvasShape(createCanvasDocument('whiteboard'), 'ellipse', start, end, '#171717', 5),
      { x: 100, y: 100, pressure: 0.5, at: 3 },
      'Label',
      '#171717',
      5,
    )

    const selection = selectCanvasLayersInRect(document, { x: 0, y: 0, width: 200, height: 140 })
    const moved = moveCanvasSelection(document, selection, 12, 18)

    expect(selection.shapes).toEqual([document.shapes[0].id])
    expect(selection.textBoxes).toEqual([document.textBoxes[0].id])
    expect(moved.shapes[0]).toMatchObject({ x: 22, y: 38 })
    expect(moved.textBoxes[0]).toMatchObject({ x: 112, y: 118 })
    expect(moved).not.toHaveProperty('selection')
  })

  it('keeps zero-distance and stale canvas moves as no-ops', () => {
    const document = appendCanvasImage(createCanvasDocument('whiteboard'), 'attachments/photo.png')
    const image = document.images[0]

    expect(moveCanvasImage(document, image.id, 0, 0)).toBe(document)
    expect(moveCanvasImage(document, 'missing-image', 12, 18)).toBe(document)
    expect(moveCanvasSelection(document, { images: [image.id], shapes: [], strokes: [], textBoxes: [] }, 0, 0))
      .toBe(document)
    expect(moveCanvasSelection(document, { images: ['missing-image'], shapes: [], strokes: [], textBoxes: [] }, 12, 18))
      .toBe(document)
  })

  it('clears drawable layers without leaving stale layer order ids in saved JSON', () => {
    const document = appendStroke(
      appendCanvasImage(createCanvasDocument('whiteboard'), 'attachments/photo.png'),
      stroke(),
    )

    const cleared = clearCanvasDocument(document)

    expect(cleared.images).toEqual([])
    expect(cleared.strokes).toEqual([])
    expect(cleared.shapes).toEqual([])
    expect(cleared.textBoxes).toEqual([])
    expect(cleared.layerOrder).toEqual([])
  })

  it('keeps empty canvas clear as a no-op so the dialog does not become dirty', () => {
    const document = createCanvasDocument('whiteboard')

    expect(clearCanvasDocument(document)).toBe(document)
  })
})
