import type { CanvasPoint, CanvasShapeKind } from '../../utils/canvasAttachments'

/** In-progress vector shape shown while the pointer drag is still active. */
export interface CanvasShapeDraft {
  end: CanvasPoint
  kind: CanvasShapeKind
  start: CanvasPoint
}

/** Returns true when the active canvas tool creates a vector shape layer. */
export function isCanvasShapeTool(tool: string): tool is CanvasShapeKind {
  return tool === 'rectangle' || tool === 'ellipse' || tool === 'line'
}

function draftBounds(draft: CanvasShapeDraft) {
  return {
    x: Math.min(draft.start.x, draft.end.x),
    y: Math.min(draft.start.y, draft.end.y),
    width: Math.abs(draft.end.x - draft.start.x),
    height: Math.abs(draft.end.y - draft.start.y),
  }
}

/** Draws the live shape preview before the shape is committed to the canvas document. */
export function drawCanvasShapeDraft(
  ctx: CanvasRenderingContext2D,
  draft: CanvasShapeDraft,
  color: string,
  size: number,
) {
  const bounds = draftBounds(draft)
  ctx.save()
  ctx.globalAlpha = 0.72
  ctx.strokeStyle = color
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  ctx.lineWidth = Math.max(1, size)
  ctx.setLineDash([12, 8])

  if (draft.kind === 'rectangle') {
    ctx.strokeRect(bounds.x, bounds.y, bounds.width, bounds.height)
  } else if (draft.kind === 'ellipse') {
    ctx.beginPath()
    ctx.ellipse(
      bounds.x + bounds.width / 2,
      bounds.y + bounds.height / 2,
      Math.max(bounds.width / 2, 1),
      Math.max(bounds.height / 2, 1),
      0,
      0,
      Math.PI * 2,
    )
    ctx.stroke()
  } else {
    ctx.beginPath()
    ctx.moveTo(draft.start.x, draft.start.y)
    ctx.lineTo(draft.end.x, draft.end.y)
    ctx.stroke()
  }

  ctx.restore()
}
