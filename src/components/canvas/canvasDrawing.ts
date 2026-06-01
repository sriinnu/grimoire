import type {
  CanvasDocument,
  CanvasPlacedImage,
  CanvasPoint,
  CanvasShape,
  CanvasShapeKind,
  CanvasStroke,
  CanvasTextBox,
} from '../../utils/canvasAttachments'

export const CANVAS_COLORS = ['#171717', '#b91c1c', '#1d4ed8', '#047857', '#7c3aed', '#d97706']
export const CANVAS_SIZES = [3, 5, 8, 12]
export { drawCanvasDocument, exportCanvasPreview } from './canvasRendering'

const ERASE_RADIUS = 18
const DEFAULT_IMAGE_SIZE = { width: 420, height: 280 }
const DEFAULT_TEXT_WIDTH = 320

export interface CanvasSelection {
  images: string[]
  shapes: string[]
  strokes: string[]
  textBoxes: string[]
}

export interface CanvasRect {
  x: number
  y: number
  width: number
  height: number
}

export type CanvasLayerHit =
  | { kind: 'image'; id: string }
  | { kind: 'shape'; id: string }
  | { kind: 'stroke'; id: string }
  | { kind: 'textBox'; id: string }

export const EMPTY_CANVAS_SELECTION: CanvasSelection = {
  images: [],
  shapes: [],
  strokes: [],
  textBoxes: [],
}

function uniqueId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}`
}

function distanceToSegment(point: CanvasPoint, start: CanvasPoint, end: CanvasPoint): number {
  const dx = end.x - start.x
  const dy = end.y - start.y
  if (dx === 0 && dy === 0) return Math.hypot(point.x - start.x, point.y - start.y)

  const t = Math.max(0, Math.min(1, ((point.x - start.x) * dx + (point.y - start.y) * dy) / (dx * dx + dy * dy)))
  return Math.hypot(point.x - (start.x + t * dx), point.y - (start.y + t * dy))
}

function strokeIntersectsPoint(stroke: CanvasStroke, point: CanvasPoint): boolean {
  if (stroke.points.length === 1) {
    return Math.hypot(stroke.points[0].x - point.x, stroke.points[0].y - point.y) <= ERASE_RADIUS
  }

  return stroke.points.some((current, index) => {
    const next = stroke.points[index + 1]
    return next ? distanceToSegment(point, current, next) <= ERASE_RADIUS + stroke.size : false
  })
}

function imageContainsPoint(image: CanvasPlacedImage, point: CanvasPoint): boolean {
  return point.x >= image.x
    && point.x <= image.x + image.width
    && point.y >= image.y
    && point.y <= image.y + image.height
}

function rectFromPoints(start: CanvasPoint, end: CanvasPoint): CanvasRect {
  return {
    x: Math.min(start.x, end.x),
    y: Math.min(start.y, end.y),
    width: Math.abs(end.x - start.x),
    height: Math.abs(end.y - start.y),
  }
}

function rectContainsPoint(rect: CanvasRect, point: CanvasPoint): boolean {
  return point.x >= rect.x && point.x <= rect.x + rect.width && point.y >= rect.y && point.y <= rect.y + rect.height
}

function rectsIntersect(first: CanvasRect, second: CanvasRect): boolean {
  return first.x <= second.x + second.width
    && first.x + first.width >= second.x
    && first.y <= second.y + second.height
    && first.y + first.height >= second.y
}

function shapeBounds(shape: CanvasShape): CanvasRect {
  if (shape.kind === 'line') {
    return rectFromPoints(
      { x: shape.x, y: shape.y, pressure: 0.5, at: 0 },
      { x: shape.x + shape.width, y: shape.y + shape.height, pressure: 0.5, at: 0 },
    )
  }
  return { x: shape.x, y: shape.y, width: shape.width, height: shape.height }
}

function strokeBounds(stroke: CanvasStroke): CanvasRect {
  if (stroke.points.length === 0) return { x: 0, y: 0, width: 0, height: 0 }
  const xs = stroke.points.map((point) => point.x)
  const ys = stroke.points.map((point) => point.y)
  const padding = stroke.size + ERASE_RADIUS
  return {
    x: Math.min(...xs) - padding,
    y: Math.min(...ys) - padding,
    width: Math.max(...xs) - Math.min(...xs) + padding * 2,
    height: Math.max(...ys) - Math.min(...ys) + padding * 2,
  }
}

function textBoxBounds(textBox: CanvasTextBox): CanvasRect {
  const lines = Math.max(1, textBox.text.split('\n').length)
  return { x: textBox.x, y: textBox.y - textBox.size, width: textBox.width, height: textBox.size * 1.35 * lines }
}

/** Returns the visible bounds for a canvas layer id. */
export function canvasLayerBounds(document: CanvasDocument, id: string): CanvasRect | null {
  const image = document.images.find((item) => item.id === id)
  if (image) return image
  const shape = document.shapes.find((item) => item.id === id)
  if (shape) return shapeBounds(shape)
  const stroke = document.strokes.find((item) => item.id === id)
  if (stroke) return strokeBounds(stroke)
  const textBox = document.textBoxes.find((item) => item.id === id)
  if (textBox) return textBoxBounds(textBox)
  return null
}

function layerOrder(document: CanvasDocument): string[] {
  const ids = [
    ...document.images.map((image) => image.id),
    ...document.shapes.map((shape) => shape.id),
    ...document.strokes.map((stroke) => stroke.id),
    ...document.textBoxes.map((textBox) => textBox.id),
  ]
  return [...document.layerOrder.filter((id) => ids.includes(id)), ...ids.filter((id) => !document.layerOrder.includes(id))]
}

/** Adds a vault-relative image layer to the canvas. */
export function appendCanvasImage(document: CanvasDocument, src: string): CanvasDocument {
  const offset = Math.min(document.images.length * 28, 168)
  const id = uniqueId('image')
  return {
    ...document,
    images: [
      ...document.images,
      {
        id,
        src,
        x: 96 + offset,
        y: 96 + offset,
        width: DEFAULT_IMAGE_SIZE.width,
        height: DEFAULT_IMAGE_SIZE.height,
      },
    ],
    layerOrder: [...layerOrder(document), id],
    updatedAt: new Date().toISOString(),
  }
}

/** Adds a vector shape layer from a pointer drag. */
export function appendCanvasShape(
  document: CanvasDocument,
  kind: CanvasShapeKind,
  start: CanvasPoint,
  end: CanvasPoint,
  color: string,
  size: number,
): CanvasDocument {
  const id = uniqueId('shape')
  const box = kind === 'line' ? { x: start.x, y: start.y, width: end.x - start.x, height: end.y - start.y } : rectFromPoints(start, end)
  if (Math.abs(box.width) < 4 && Math.abs(box.height) < 4) return document
  return {
    ...document,
    layerOrder: [...layerOrder(document), id],
    shapes: [...document.shapes, { id, kind, ...box, color, size }],
    updatedAt: new Date().toISOString(),
  }
}

/** Adds a plain text layer at a canvas point. */
export function appendCanvasTextBox(
  document: CanvasDocument,
  point: CanvasPoint,
  text: string,
  color: string,
  size: number,
): CanvasDocument {
  const trimmed = text.trim()
  if (!trimmed) return document
  const id = uniqueId('text')
  return {
    ...document,
    layerOrder: [...layerOrder(document), id],
    textBoxes: [
      ...document.textBoxes,
      { id, text: trimmed, x: point.x, y: point.y, width: DEFAULT_TEXT_WIDTH, color, size: Math.max(18, size * 4) },
    ],
    updatedAt: new Date().toISOString(),
  }
}

/** Returns a document with the current pointer stroke committed. */
export function appendStroke(document: CanvasDocument, stroke: CanvasStroke): CanvasDocument {
  if (stroke.points.length === 0) return document
  return {
    ...document,
    layerOrder: [...layerOrder(document), stroke.id],
    strokes: [...document.strokes, stroke],
    updatedAt: new Date().toISOString(),
  }
}

/** Finds the top-most placed image under a canvas point. */
export function findCanvasImageAt(document: CanvasDocument, point: CanvasPoint): CanvasPlacedImage | null {
  const hit = findCanvasLayerAt(document, point)
  return hit?.kind === 'image'
    ? document.images.find((image) => image.id === hit.id) ?? null
    : null
}

/** Finds the top-most editable layer under a canvas point. */
export function findCanvasLayerAt(document: CanvasDocument, point: CanvasPoint): CanvasLayerHit | null {
  const ordered = layerOrder(document)
  for (let index = ordered.length - 1; index >= 0; index -= 1) {
    const id = ordered[index]
    const image = document.images.find((item) => item.id === id)
    if (image && imageContainsPoint(image, point)) return { kind: 'image', id }
    const shape = document.shapes.find((item) => item.id === id)
    if (shape && rectContainsPoint(shapeBounds(shape), point)) return { kind: 'shape', id }
    const textBox = document.textBoxes.find((item) => item.id === id)
    if (textBox && rectContainsPoint(textBoxBounds(textBox), point)) return { kind: 'textBox', id }
    const stroke = document.strokes.find((item) => item.id === id)
    if (stroke && strokeIntersectsPoint(stroke, point)) return { kind: 'stroke', id }
  }
  return null
}

/** Moves a placed image by canvas-space delta. */
export function moveCanvasImage(
  document: CanvasDocument,
  imageId: string,
  deltaX: number,
  deltaY: number,
): CanvasDocument {
  return moveCanvasLayer(document, { kind: 'image', id: imageId }, deltaX, deltaY)
}

/** Moves one editable canvas layer by canvas-space delta. */
export function moveCanvasLayer(
  document: CanvasDocument,
  hit: CanvasLayerHit,
  deltaX: number,
  deltaY: number,
): CanvasDocument {
  if ((deltaX === 0 && deltaY === 0) || !canvasLayerBounds(document, hit.id)) return document
  return {
    ...document,
    images: document.images.map((image) => (
      hit.kind === 'image' && image.id === hit.id ? { ...image, x: image.x + deltaX, y: image.y + deltaY } : image
    )),
    shapes: document.shapes.map((shape) => (
      hit.kind === 'shape' && shape.id === hit.id ? { ...shape, x: shape.x + deltaX, y: shape.y + deltaY } : shape
    )),
    strokes: document.strokes.map((stroke) => (
      hit.kind === 'stroke' && stroke.id === hit.id
        ? { ...stroke, points: stroke.points.map((point) => ({ ...point, x: point.x + deltaX, y: point.y + deltaY })) }
        : stroke
    )),
    textBoxes: document.textBoxes.map((textBox) => (
      hit.kind === 'textBox' && textBox.id === hit.id
        ? { ...textBox, x: textBox.x + deltaX, y: textBox.y + deltaY }
        : textBox
    )),
    updatedAt: new Date().toISOString(),
  }
}

/** Selects all drawable layers that intersect a lasso rectangle. */
export function selectCanvasLayersInRect(document: CanvasDocument, rect: CanvasRect): CanvasSelection {
  return {
    images: document.images.filter((image) => rectsIntersect(rect, image)).map((image) => image.id),
    shapes: document.shapes.filter((shape) => rectsIntersect(rect, shapeBounds(shape))).map((shape) => shape.id),
    strokes: document.strokes.filter((stroke) => rectsIntersect(rect, strokeBounds(stroke))).map((stroke) => stroke.id),
    textBoxes: document.textBoxes.filter((textBox) => rectsIntersect(rect, textBoxBounds(textBox))).map((textBox) => textBox.id),
  }
}

/** Moves a lasso-selected group of mixed canvas layers. */
export function moveCanvasSelection(
  document: CanvasDocument,
  selection: CanvasSelection,
  deltaX: number,
  deltaY: number,
): CanvasDocument {
  const selected = new Set([...selection.images, ...selection.shapes, ...selection.strokes, ...selection.textBoxes])
  const hasSelectedLayer = document.images.some((image) => selected.has(image.id))
    || document.shapes.some((shape) => selected.has(shape.id))
    || document.strokes.some((stroke) => selected.has(stroke.id))
    || document.textBoxes.some((textBox) => selected.has(textBox.id))
  if ((deltaX === 0 && deltaY === 0) || !hasSelectedLayer) return document
  return {
    ...document,
    images: document.images.map((image) => (
      selection.images.includes(image.id) ? { ...image, x: image.x + deltaX, y: image.y + deltaY } : image
    )),
    shapes: document.shapes.map((shape) => (
      selection.shapes.includes(shape.id) ? { ...shape, x: shape.x + deltaX, y: shape.y + deltaY } : shape
    )),
    strokes: document.strokes.map((stroke) => (
      selection.strokes.includes(stroke.id)
        ? { ...stroke, points: stroke.points.map((point) => ({ ...point, x: point.x + deltaX, y: point.y + deltaY })) }
        : stroke
    )),
    textBoxes: document.textBoxes.map((textBox) => (
      selection.textBoxes.includes(textBox.id) ? { ...textBox, x: textBox.x + deltaX, y: textBox.y + deltaY } : textBox
    )),
    updatedAt: new Date().toISOString(),
  }
}

/** Removes the latest drawable layer for simple undo. */
export function undoCanvasDocument(document: CanvasDocument): CanvasDocument {
  const ordered = layerOrder(document)
  const latest = ordered.at(-1)
  if (!latest) return document
  return {
    ...document,
    images: document.images.filter((image) => image.id !== latest),
    layerOrder: ordered.slice(0, -1),
    shapes: document.shapes.filter((shape) => shape.id !== latest),
    strokes: document.strokes.filter((stroke) => stroke.id !== latest),
    textBoxes: document.textBoxes.filter((textBox) => textBox.id !== latest),
    updatedAt: new Date().toISOString(),
  }
}

/** Removes every editable layer and clears persisted ordering metadata. */
export function clearCanvasDocument(document: CanvasDocument): CanvasDocument {
  if (
    document.images.length === 0
    && document.shapes.length === 0
    && document.strokes.length === 0
    && document.textBoxes.length === 0
    && document.layerOrder.length === 0
  ) {
    return document
  }

  return {
    ...document,
    images: [],
    layerOrder: [],
    shapes: [],
    strokes: [],
    textBoxes: [],
    updatedAt: new Date().toISOString(),
  }
}

/** Removes drawable layers near a pointer location, matching common whiteboard eraser behavior. */
export function eraseStrokesAt(document: CanvasDocument, point: CanvasPoint): CanvasDocument {
  const strokes = document.strokes.filter((stroke) => !strokeIntersectsPoint(stroke, point))
  const images = document.images.filter((image) => !imageContainsPoint(image, point))
  const shapes = document.shapes.filter((shape) => !rectContainsPoint(shapeBounds(shape), point))
  const textBoxes = document.textBoxes.filter((textBox) => !rectContainsPoint(textBoxBounds(textBox), point))
  const removed = new Set([
    ...document.images.filter((image) => !images.includes(image)).map((image) => image.id),
    ...document.shapes.filter((shape) => !shapes.includes(shape)).map((shape) => shape.id),
    ...document.strokes.filter((stroke) => !strokes.includes(stroke)).map((stroke) => stroke.id),
    ...document.textBoxes.filter((textBox) => !textBoxes.includes(textBox)).map((textBox) => textBox.id),
  ])
  if (removed.size === 0) return document
  return {
    ...document,
    images,
    layerOrder: layerOrder(document).filter((id) => !removed.has(id)),
    shapes,
    strokes,
    textBoxes,
    updatedAt: new Date().toISOString(),
  }
}
