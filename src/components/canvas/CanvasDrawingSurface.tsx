import { useCallback, useEffect, useRef, useState } from 'react'
import type { CanvasDocument, CanvasPoint, CanvasStroke } from '../../utils/canvasAttachments'
import { appendStroke, drawCanvasDocument, eraseStrokesAt } from './canvasDrawing'

export type CanvasTool = 'pen' | 'highlighter' | 'eraser' | 'hand'

interface HandDragState {
  x: number
  y: number
  scrollLeft: number
  scrollTop: number
}

interface CanvasDrawingSurfaceProps {
  color: string
  document: CanvasDocument
  setDocument: (updater: (document: CanvasDocument) => CanvasDocument) => void
  size: number
  tool: CanvasTool
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

/** Pointer-driven drawing surface for Grimoire canvas attachments. */
export function CanvasDrawingSurface({
  color,
  document,
  setDocument,
  size,
  tool,
}: CanvasDrawingSurfaceProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const scrollerRef = useRef<HTMLDivElement | null>(null)
  const [activeStroke, setActiveStroke] = useState<CanvasStroke | null>(null)
  const pointerIdRef = useRef<number | null>(null)
  const handDragRef = useRef<HandDragState | null>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return
    drawCanvasDocument(ctx, activeStroke ? { ...document, strokes: [...document.strokes, activeStroke] } : document)
  }, [activeStroke, document])

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

  const handlePointerDown = useCallback((event: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas || pointerIdRef.current !== null) return

    pointerIdRef.current = event.pointerId
    canvas.setPointerCapture?.(event.pointerId)

    if (tool === 'hand') {
      beginHandDrag(event)
      return
    }

    const point = pointerPoint(event, canvas)
    if (tool === 'eraser') {
      setDocument((current) => eraseStrokesAt(current, point))
      return
    }

    setActiveStroke(newStroke(tool, color, size, point))
  }, [beginHandDrag, color, setDocument, size, tool])

  const handlePointerMove = useCallback((event: React.PointerEvent<HTMLCanvasElement>) => {
    if (pointerIdRef.current !== event.pointerId) return
    const canvas = canvasRef.current
    if (!canvas) return

    if (tool === 'hand') {
      updateHandDrag(event)
      return
    }

    const point = pointerPoint(event, canvas)
    if (tool === 'eraser') {
      setDocument((current) => eraseStrokesAt(current, point))
      return
    }

    setActiveStroke((stroke) => stroke ? { ...stroke, points: [...stroke.points, point] } : stroke)
  }, [setDocument, tool, updateHandDrag])

  const finishPointer = useCallback((event: React.PointerEvent<HTMLCanvasElement>) => {
    if (pointerIdRef.current !== event.pointerId) return
    pointerIdRef.current = null
    handDragRef.current = null
    canvasRef.current?.releasePointerCapture?.(event.pointerId)
    setActiveStroke((stroke) => {
      if (stroke) setDocument((current) => appendStroke(current, stroke))
      return null
    })
  }, [setDocument])

  const cursor = tool === 'hand' ? 'grab' : tool === 'eraser' ? 'cell' : 'crosshair'

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
