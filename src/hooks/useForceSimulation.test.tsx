import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { PointerEvent as ReactPointerEvent } from 'react'
import type { GraphLayout, PositionedGraphNode } from '../utils/graphDisplay'
import { useForceSimulation } from './useForceSimulation'

function node(id: string, x: number, y: number, active = false): PositionedGraphNode {
  return {
    id,
    path: `${id}.md`,
    title: id,
    type: 'note',
    degree: 1,
    active,
    neighborhood: true,
    color: '#64748b',
    lightColor: '#cbd5e1',
    x,
    y,
  }
}

/**
 * jsdom has no layout, so getScreenCTM/createSVGPoint are stubbed as identity —
 * client coordinates pass straight through as world coordinates.
 */
function fakeSvg(): SVGSVGElement {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg') as SVGSVGElement
  const matrix = { inverse: () => matrix } as unknown as DOMMatrix
  svg.getScreenCTM = () => matrix
  svg.createSVGPoint = () => {
    const pt = { x: 0, y: 0, matrixTransform: () => ({ x: pt.x, y: pt.y }) }
    return pt as unknown as DOMPoint
  }
  return svg
}

function reactPointerDown(clientX: number, clientY: number): ReactPointerEvent {
  return {
    stopPropagation: () => {},
    pointerType: 'mouse',
    button: 0,
    clientX,
    clientY,
  } as unknown as ReactPointerEvent
}

describe('useForceSimulation', () => {
  let rafQueue: FrameRequestCallback[] = []

  beforeEach(() => {
    rafQueue = []
    vi.stubGlobal('requestAnimationFrame', vi.fn((cb: FrameRequestCallback) => {
      rafQueue.push(cb)
      return rafQueue.length
    }))
    vi.stubGlobal('cancelAnimationFrame', vi.fn())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  /** Run queued rAF callbacks like the browser would, up to `count` frames. */
  function pumpFrames(count: number) {
    for (let i = 0; i < count; i += 1) {
      const queue = rafQueue
      rafQueue = []
      if (queue.length === 0) break
      act(() => {
        for (const cb of queue) cb(16 * (i + 1))
      })
    }
  }

  function setup() {
    const layout: GraphLayout = {
      nodes: [node('anchor', 500, 310, true), node('loose', 700, 310)],
      edges: [],
    }
    const rendered = renderHook(() => useForceSimulation(layout, { pinnedId: null }))
    act(() => rendered.result.current.bindSvg(fakeSvg()))
    pumpFrames(4) // let the entrance reheat start ticking
    return rendered
  }

  function drag(result: { current: ReturnType<typeof useForceSimulation> }, id: string, toX: number, toY: number) {
    const dragged = result.current.nodeById.get(id)
    expect(dragged).toBeDefined()
    act(() => {
      result.current.onNodePointerDown(dragged as PositionedGraphNode, reactPointerDown(dragged?.x ?? 0, dragged?.y ?? 0))
      window.dispatchEvent(new MouseEvent('pointermove', { clientX: toX, clientY: toY }))
    })
    pumpFrames(2) // the drag pin takes effect on the next tick
    act(() => {
      window.dispatchEvent(new MouseEvent('pointerup'))
    })
  }

  it('keeps a dragged node parked where it was dropped', () => {
    const { result } = setup()
    drag(result, 'loose', 780, 390)

    pumpFrames(40) // plenty of settle time — an unpinned node would spring back
    expect(result.current.nodeById.get('loose')).toMatchObject({ x: 780, y: 390 })
  })

  it('releases every parked node when the view resets', () => {
    const { result } = setup()
    drag(result, 'loose', 780, 390)
    pumpFrames(10)

    act(() => result.current.resetView())
    pumpFrames(40)

    const released = result.current.nodeById.get('loose')
    expect(released?.x).not.toBe(780) // back in the simulation, pulled home again
  })

  it('zooms around the canvas center and clamps at the viewport limits', () => {
    const { result } = setup()
    expect(result.current.viewportScale).toBe(1)

    act(() => result.current.zoomBy(1.25))
    pumpFrames(1)
    expect(result.current.viewportScale).toBeCloseTo(1.25, 4)

    act(() => result.current.zoomBy(100))
    pumpFrames(1)
    expect(result.current.viewportScale).toBeCloseTo(2.4, 4) // ZOOM.max

    act(() => result.current.resetView())
    pumpFrames(60)
    expect(result.current.viewportScale).toBe(1)
  })
})
