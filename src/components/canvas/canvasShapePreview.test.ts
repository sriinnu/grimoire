import { describe, expect, it, vi } from 'vitest'
import { drawCanvasShapeDraft, isCanvasShapeTool, type CanvasShapeDraft } from './canvasShapePreview'

function draft(kind: CanvasShapeDraft['kind']): CanvasShapeDraft {
  return {
    kind,
    start: { x: 10, y: 20, pressure: 0.5, at: 1 },
    end: { x: 90, y: 70, pressure: 0.5, at: 2 },
  }
}

function context() {
  return {
    beginPath: vi.fn(),
    ellipse: vi.fn(),
    lineTo: vi.fn(),
    moveTo: vi.fn(),
    restore: vi.fn(),
    save: vi.fn(),
    setLineDash: vi.fn(),
    stroke: vi.fn(),
    strokeRect: vi.fn(),
  } as unknown as CanvasRenderingContext2D
}

describe('canvasShapePreview', () => {
  it('recognizes vector shape tools only', () => {
    expect(isCanvasShapeTool('rectangle')).toBe(true)
    expect(isCanvasShapeTool('ellipse')).toBe(true)
    expect(isCanvasShapeTool('line')).toBe(true)
    expect(isCanvasShapeTool('pen')).toBe(false)
  })

  it('draws rectangle, ellipse, and line draft previews', () => {
    const rectCtx = context()
    const ellipseCtx = context()
    const lineCtx = context()

    drawCanvasShapeDraft(rectCtx, draft('rectangle'), '#171717', 5)
    drawCanvasShapeDraft(ellipseCtx, draft('ellipse'), '#171717', 5)
    drawCanvasShapeDraft(lineCtx, draft('line'), '#171717', 5)

    expect(rectCtx.strokeRect).toHaveBeenCalledWith(10, 20, 80, 50)
    expect(ellipseCtx.ellipse).toHaveBeenCalledWith(50, 45, 40, 25, 0, 0, Math.PI * 2)
    expect(lineCtx.moveTo).toHaveBeenCalledWith(10, 20)
    expect(lineCtx.lineTo).toHaveBeenCalledWith(90, 70)
  })
})
