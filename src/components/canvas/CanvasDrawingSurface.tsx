import { useCallback, useEffect, useRef, useState } from 'react'
import {
  resolveVaultAttachmentPath,
  type CanvasDocument,
  type CanvasPoint,
  type CanvasStroke,
} from '../../utils/canvasAttachments'
import { resolveVaultImageSrc } from '../../utils/vaultImages'
import {
  appendCanvasShape,
  appendCanvasTextBox,
  appendStroke,
  CANVAS_COLORS,
  canvasLayerBounds,
  drawCanvasDocument,
  EMPTY_CANVAS_SELECTION,
  eraseStrokesAt,
  findCanvasLayerAt,
  moveCanvasLayer,
  moveCanvasSelection,
  selectCanvasLayersInRect,
  type CanvasRect,
  type CanvasSelection,
} from './canvasDrawing'

export type CanvasTool = 'pen' | 'highlighter' | 'eraser' | 'hand' | 'rectangle' | 'ellipse' | 'line' | 'text' | 'lasso'

interface HandDragState {
  x: number
  y: number
  scrollLeft: number
  scrollTop: number
}

interface ImageDragState {
  hit: NonNullable<ReturnType<typeof findCanvasLayerAt>>
  lastPoint: CanvasPoint
}

interface CanvasDrawingSurfaceProps {
  color: string
  document: CanvasDocument
  setDocument: (updater: (document: CanvasDocument) => CanvasDocument) => void
  size: number
  textValue: string
  tool: CanvasTool
  vaultPath?: string
}

function pointerPoint(event: React.PointerEvent<HTMLCanvasElement>, canvas: HTMLCanvasElement): CanvasPoint {
  const rect = canvas.getBoundingClientRect()
  const scaleX = canvas.width / rect.width
  const scaleY = canvas.height / rect.height
  return {
    x: (event.clientX - rect.left) * scaleX,
    y: (event.clientY - rect.top) * scaleY,
    pressure: event.pressure || 0.5,
    at: Date.now(),
  }
}

function newStroke(tool: CanvasTool, color: string, size: number, point: CanvasPoint): CanvasStroke {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    color,
    size: tool === 'highlighter' ? size * 2.4 : size,
    tool: tool === 'highlighter' ? 'highlighter' : 'pen',
    points: [point],
  }
}

function selectionIds(selection: CanvasSelection): string[] {
  return [...selection.images, ...selection.shapes, ...selection.strokes, ...selection.textBoxes]
}

function emptySelection(selection: CanvasSelection): boolean {
  return selectionIds(selection).length === 0
}

function rectFromPoints(start: CanvasPoint, end: CanvasPoint): CanvasRect {
  return {
    x: Math.min(start.x, end.x),
    y: Math.min(start.y, end.y),
    width: Math.abs(end.x - start.x),
    height: Math.abs(end.y - start.y),
  }
}

function drawRectOverlay(ctx: CanvasRenderingContext2D, rect: CanvasRect, color: string) {
  ctx.save()
  ctx.strokeStyle = color
  ctx.lineWidth = 2
  ctx.setLineDash([10, 8])
  ctx.strokeRect(rect.x, rect.y, rect.width, rect.height)
  ctx.restore()
}

function readCanvasStyleColor(variableName: string, fallback: string): string {
  const root = globalThis.document?.documentElement
  if (!root || typeof globalThis.getComputedStyle !== 'function') return fallback
  const value = globalThis.getComputedStyle(root).getPropertyValue(variableName).trim()
  if (!value || value.includes('var(')) return fallback
  return value
}

/** Pointer-driven drawing surface for Grimoire canvas attachments. */
export function CanvasDrawingSurface({
  color,
  document,
  setDocument,
  size,
  textValue,
  tool,
  vaultPath,
}: CanvasDrawingSurfaceProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const scrollerRef = useRef<HTMLDivElement | null>(null)
  const [activeStroke, setActiveStroke] = useState<CanvasStroke | null>(null)
  const [lassoRect, setLassoRect] = useState<CanvasRect | null>(null)
  const [selection, setSelection] = useState<CanvasSelection>(EMPTY_CANVAS_SELECTION)
  const pointerIdRef = useRef<number | null>(null)
  const handDragRef = useRef<HandDragState | null>(null)
  const imageDragRef = useRef<ImageDragState | null>(null)
  const lassoStartRef = useRef<CanvasPoint | null>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return
    const snapshot = activeStroke ? { ...document, strokes: [...document.strokes, activeStroke] } : document
    let cancelled = false
    void drawCanvasDocument(ctx, snapshot, (src) => (
      vaultPath ? resolveVaultImageSrc(resolveVaultAttachmentPath(vaultPath, src)) : src
    ), () => !cancelled).then(() => {
      if (cancelled) return
      const selectionColor = readCanvasStyleColor('--accent-blue', CANVAS_COLORS[2])
      const lassoColor = readCanvasStyleColor('--accent-purple', CANVAS_COLORS[4])
      for (const id of selectionIds(selection)) {
        const bounds = canvasLayerBounds(snapshot, id)
        if (bounds) drawRectOverlay(ctx, bounds, selectionColor)
      }
      if (lassoRect) drawRectOverlay(ctx, lassoRect, lassoColor)
    })
    return () => { cancelled = true }
  }, [activeStroke, document, lassoRect, selection, vaultPath])

  const beginHandDrag = useCallback((event: React.PointerEvent<HTMLCanvasElement>) => {
    const scroller = scrollerRef.current
    if (!scroller) return
    handDragRef.current = {
      x: event.clientX,
      y: event.clientY,
      scrollLeft: scroller.scrollLeft,
      scrollTop: scroller.scrollTop,
    }
  }, [])

  const updateHandDrag = useCallback((event: React.PointerEvent<HTMLCanvasElement>) => {
    const scroller = scrollerRef.current
    const start = handDragRef.current
    if (!scroller || !start) return
    scroller.scrollLeft = start.scrollLeft - (event.clientX - start.x)
    scroller.scrollTop = start.scrollTop - (event.clientY - start.y)
  }, [])

  const beginLayerDrag = useCallback((point: CanvasPoint) => {
    const hit = findCanvasLayerAt(document, point)
    if (!hit) return false
    imageDragRef.current = { hit, lastPoint: point }
    return true
  }, [document])

  const updateLayerDrag = useCallback((point: CanvasPoint) => {
    const start = imageDragRef.current
    if (!start) return false
    const deltaX = point.x - start.lastPoint.x
    const deltaY = point.y - start.lastPoint.y
    imageDragRef.current = { ...start, lastPoint: point }
    setDocument((current) => moveCanvasLayer(current, start.hit, deltaX, deltaY))
    return true
  }, [setDocument])

  const beginSelectionDrag = useCallback((point: CanvasPoint) => {
    const hit = findCanvasLayerAt(document, point)
    if (!hit || !selectionIds(selection).includes(hit.id)) return false
    imageDragRef.current = { hit, lastPoint: point }
    return true
  }, [document, selection])

  const updateSelectionDrag = useCallback((point: CanvasPoint) => {
    const start = imageDragRef.current
    if (!start || emptySelection(selection)) return false
    const deltaX = point.x - start.lastPoint.x
    const deltaY = point.y - start.lastPoint.y
    imageDragRef.current = { ...start, lastPoint: point }
    setDocument((current) => moveCanvasSelection(current, selection, deltaX, deltaY))
    return true
  }, [selection, setDocument])

  const handlePointerDown = useCallback((event: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas || pointerIdRef.current !== null) return

    pointerIdRef.current = event.pointerId
    canvas.setPointerCapture?.(event.pointerId)
    const point = pointerPoint(event, canvas)

    if (tool === 'hand') {
      if (beginLayerDrag(point)) return
      beginHandDrag(event)
      return
    }

    if (tool === 'text') {
      setSelection(EMPTY_CANVAS_SELECTION)
      setDocument((current) => appendCanvasTextBox(current, point, textValue, color, size))
      return
    }

    if (tool === 'rectangle' || tool === 'ellipse' || tool === 'line') {
      lassoStartRef.current = point
      return
    }

    if (tool === 'lasso') {
      if (beginSelectionDrag(point)) return
      setSelection(EMPTY_CANVAS_SELECTION)
      lassoStartRef.current = point
      setLassoRect({ x: point.x, y: point.y, width: 0, height: 0 })
      return
    }

    if (tool === 'eraser') {
      setSelection(EMPTY_CANVAS_SELECTION)
      setDocument((current) => eraseStrokesAt(current, point))
      return
    }

    setSelection(EMPTY_CANVAS_SELECTION)
    setActiveStroke(newStroke(tool, color, size, point))
  }, [beginHandDrag, beginLayerDrag, beginSelectionDrag, color, setDocument, size, textValue, tool])

  const handlePointerMove = useCallback((event: React.PointerEvent<HTMLCanvasElement>) => {
    if (pointerIdRef.current !== event.pointerId) return
    const canvas = canvasRef.current
    if (!canvas) return

    if (tool === 'hand') {
      const point = pointerPoint(event, canvas)
      if (updateLayerDrag(point)) return
      updateHandDrag(event)
      return
    }

    const point = pointerPoint(event, canvas)
    if (tool === 'rectangle' || tool === 'ellipse' || tool === 'line') {
      return
    }

    if (tool === 'lasso') {
      if (updateSelectionDrag(point)) return
      const start = lassoStartRef.current
      if (start) setLassoRect(rectFromPoints(start, point))
      return
    }

    if (tool === 'eraser') {
      setDocument((current) => eraseStrokesAt(current, point))
      return
    }

    setActiveStroke((stroke) => stroke ? { ...stroke, points: [...stroke.points, point] } : stroke)
  }, [setDocument, tool, updateHandDrag, updateLayerDrag, updateSelectionDrag])

  const finishPointer = useCallback((event: React.PointerEvent<HTMLCanvasElement>) => {
    if (pointerIdRef.current !== event.pointerId) return
    pointerIdRef.current = null
    handDragRef.current = null
    imageDragRef.current = null
    canvasRef.current?.releasePointerCapture?.(event.pointerId)
    const canvas = canvasRef.current
    const point = canvas ? pointerPoint(event, canvas) : null

    if (point && lassoStartRef.current && (tool === 'rectangle' || tool === 'ellipse' || tool === 'line')) {
      const start = lassoStartRef.current
      lassoStartRef.current = null
      setDocument((current) => appendCanvasShape(current, tool, start, point, color, size))
      return
    }

    if (point && lassoStartRef.current && tool === 'lasso') {
      const rect = rectFromPoints(lassoStartRef.current, point)
      lassoStartRef.current = null
      setLassoRect(null)
      setSelection(selectCanvasLayersInRect(document, rect))
      return
    }

    lassoStartRef.current = null
    setActiveStroke((stroke) => {
      if (stroke) setDocument((current) => appendStroke(current, stroke))
      return null
    })
  }, [color, document, setDocument, size, tool])

  const cursor = tool === 'hand' ? 'grab' : tool === 'eraser' ? 'cell' : tool === 'text' ? 'text' : 'crosshair'

  return (
    <div ref={scrollerRef} className="canvas-attachment__viewport">
      <canvas
        ref={canvasRef}
        aria-label="Canvas drawing surface"
        className="canvas-attachment__surface"
        height={document.height}
        onPointerCancel={finishPointer}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={finishPointer}
        style={{ cursor }}
        width={document.width}
      />
    </div>
  )
}
