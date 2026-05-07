import type { CanvasDocument, CanvasPoint, CanvasStroke } from '../../utils/canvasAttachments'

export const CANVAS_COLORS = ['#171717', '#b91c1c', '#1d4ed8', '#047857', '#7c3aed', '#d97706']
export const CANVAS_SIZES = [3, 5, 8, 12]

const ERASE_RADIUS = 18

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

function strokeAlpha(stroke: CanvasStroke): number {
  return stroke.tool === 'highlighter' ? 0.28 : 1
}

function drawStroke(ctx: CanvasRenderingContext2D, stroke: CanvasStroke) {
  if (stroke.points.length === 0) return

  ctx.save()
  ctx.globalAlpha = strokeAlpha(stroke)
  ctx.strokeStyle = stroke.color
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  ctx.lineWidth = stroke.size

  const [first, second] = stroke.points
  ctx.beginPath()
  ctx.moveTo(first.x, first.y)
  if (!second) {
    ctx.lineTo(first.x + 0.1, first.y + 0.1)
  } else {
    for (let index = 1; index < stroke.points.length - 1; index++) {
      const current = stroke.points[index]
      const next = stroke.points[index + 1]
      ctx.quadraticCurveTo(current.x, current.y, (current.x + next.x) / 2, (current.y + next.y) / 2)
    }
    const last = stroke.points[stroke.points.length - 1]
    ctx.lineTo(last.x, last.y)
  }
  ctx.stroke()
  ctx.restore()
}

/** Draws a saved Grimoire canvas document into a 2D canvas context. */
export function drawCanvasDocument(ctx: CanvasRenderingContext2D, document: CanvasDocument) {
  ctx.clearRect(0, 0, document.width, document.height)
  ctx.fillStyle = document.background
  ctx.fillRect(0, 0, document.width, document.height)
  for (const stroke of document.strokes) drawStroke(ctx, stroke)
}

/** Returns a document with the current pointer stroke committed. */
export function appendStroke(document: CanvasDocument, stroke: CanvasStroke): CanvasDocument {
  if (stroke.points.length === 0) return document
  return {
    ...document,
    strokes: [...document.strokes, stroke],
    updatedAt: new Date().toISOString(),
  }
}

/** Removes strokes near a pointer location, matching common whiteboard eraser behavior. */
export function eraseStrokesAt(document: CanvasDocument, point: CanvasPoint): CanvasDocument {
  const strokes = document.strokes.filter((stroke) => !strokeIntersectsPoint(stroke, point))
  if (strokes.length === document.strokes.length) return document
  return { ...document, strokes, updatedAt: new Date().toISOString() }
}

/** Exports the canvas document as base64 PNG data for the Markdown preview image. */
export function exportCanvasPreview(document: CanvasDocument): string {
  const canvas = window.document.createElement('canvas')
  canvas.width = document.width
  canvas.height = document.height
  const ctx = canvas.getContext('2d')
  if (!ctx) return ''
  drawCanvasDocument(ctx, document)
  return canvas.toDataURL('image/png').replace(/^data:image\/png;base64,/, '')
}
