import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createCanvasDocument, type CanvasDocument } from '../../utils/canvasAttachments'
import { CanvasDrawingSurface } from './CanvasDrawingSurface'

function canvasContext() {
  return {
    beginPath: vi.fn(),
    clearRect: vi.fn(),
    ellipse: vi.fn(),
    fillRect: vi.fn(),
    lineTo: vi.fn(),
    moveTo: vi.fn(),
    quadraticCurveTo: vi.fn(),
    restore: vi.fn(),
    save: vi.fn(),
    setLineDash: vi.fn(),
    stroke: vi.fn(),
    strokeRect: vi.fn(),
  } as unknown as CanvasRenderingContext2D
}

function setCanvasGeometry(canvas: HTMLCanvasElement) {
  Object.defineProperty(canvas, 'getBoundingClientRect', {
    configurable: true,
    value: () => ({
      bottom: 1000,
      height: 1000,
      left: 0,
      right: 1600,
      toJSON: () => ({}),
      top: 0,
      width: 1600,
      x: 0,
      y: 0,
    }),
  })
}

describe('CanvasDrawingSurface', () => {
  beforeEach(() => {
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(() => canvasContext())
    HTMLCanvasElement.prototype.setPointerCapture = vi.fn()
    HTMLCanvasElement.prototype.releasePointerCapture = vi.fn()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('shows a live rectangle draft while dragging and commits only on release', async () => {
    const setDocument = vi.fn()
    render(
      <CanvasDrawingSurface
        color="#171717"
        document={createCanvasDocument('whiteboard')}
        setDocument={setDocument}
        size={5}
        textValue=""
        tool="rectangle"
      />,
    )
    const canvas = screen.getByLabelText('Canvas drawing surface') as HTMLCanvasElement
    setCanvasGeometry(canvas)

    fireEvent.pointerDown(canvas, { pointerId: 1, clientX: 10, clientY: 20, pressure: 0.5 })
    fireEvent.pointerMove(canvas, { pointerId: 1, clientX: 90, clientY: 70, pressure: 0.5 })

    await waitFor(() => expect(canvas).toHaveAttribute('data-canvas-draft-shape', 'rectangle'))
    expect(setDocument).not.toHaveBeenCalled()

    fireEvent.pointerUp(canvas, { pointerId: 1, clientX: 90, clientY: 70, pressure: 0.5 })

    expect(setDocument).toHaveBeenCalledTimes(1)
    const updater = setDocument.mock.calls[0][0] as (current: CanvasDocument) => CanvasDocument
    const updated = updater(createCanvasDocument('whiteboard'))
    expect(updated.shapes[0]).toMatchObject({ kind: 'rectangle', x: 10, y: 20, width: 80, height: 50 })
    await waitFor(() => expect(canvas).toHaveAttribute('data-canvas-draft-shape', 'none'))
  })
})
