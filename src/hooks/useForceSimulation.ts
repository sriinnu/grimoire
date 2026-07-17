import { useCallback, useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import { createSpringEngine } from '../lib/graphForceEngine'
import {
  GRAPH_CENTER_X,
  GRAPH_CENTER_Y,
  type GraphLayout,
  type PositionedGraphNode,
} from '../utils/graphDisplay'

/**
 * Alpha is the single energy value that gives both the feel and the battery
 * safety: interactions reheat it, it decays every tick, and the rAF loop stops
 * itself once the graph is cold, still, and not being panned. True idle = zero frames.
 */
const ALPHA = { reheat: 0.9, dragHot: 1, decay: 0.03, min: 0.004, vEps: 0.05 }
// Hide labels only during *big* motion (settle/drag). Pan and zoom never raise
// alpha, so reading a label never fights the physics.
const LABEL_HIDE_ALPHA = 0.22
const DRAG_THRESHOLD = 6 // world units before a press becomes a drag (vs. a tap)
const ZOOM = { min: 0.45, max: 2.4, sensitivity: 0.0015 }
const PAN_INERTIA_DECAY = 0.86
const PAN_VEL_EPS = 0.12
const VIEW_EASE = 0.22 // how fast double-click eases the view back to home

interface Viewport { tx: number; ty: number; scale: number }

interface UseForceSimulationResult {
  nodes: PositionedGraphNode[]
  nodeById: Map<string, PositionedGraphNode>
  onNodePointerDown: (node: PositionedGraphNode, event: ReactPointerEvent) => void
  onBackgroundPointerDown: (event: ReactPointerEvent) => void
  resetView: () => void
  bindSvg: (el: SVGSVGElement | null) => void
  viewportTransform: string
  /** Current viewport zoom — lets the renderer make semantic-zoom decisions. */
  viewportScale: number
  /** Zoom around the canvas center — the button path to the wheel's cursor-anchored zoom. */
  zoomBy: (factor: number) => void
  /** True while the simulation is actively moving — used to hide labels mid-motion. */
  hot: boolean
}

/**
 * Drives a force simulation over a seed layout and exposes live node positions
 * plus pan/zoom. The renderer is untouched: every edge, badge, label and orbit
 * derives from node.x/node.y, so mutating those animates all of it.
 * Node positions live in group-local space; pan/zoom only transforms the wrapping
 * <g>, and toWorld() undoes that transform so drag stays cursor-accurate.
 */
export function useForceSimulation(
  seed: GraphLayout,
  opts: { pinnedId: string | null },
): UseForceSimulationResult {
  const reduced = useMemo(
    () => (typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) ?? false,
    [],
  )
  const engineRef = useRef(createSpringEngine())
  const engine = engineRef.current
  const svgRef = useRef<SVGSVGElement | null>(null)
  const draggingRef = useRef<string | null>(null)
  // Nodes the user parked by dragging. They stay put until the "let go"
  // gesture (double-click background / reset view) releases them all at once.
  const userPinsRef = useRef(new Set<string>())
  const panningRef = useRef(false)
  const panVelRef = useRef({ x: 0, y: 0 })
  const vpRef = useRef<Viewport>({ tx: 0, ty: 0, scale: 1 })
  const vpTargetRef = useRef<Viewport | null>(null) // non-null while easing the view home
  const alphaRef = useRef(0)
  const rafRef = useRef<number | null>(null)
  const runningRef = useRef(false)
  const [, paint] = useState(0)

  const startLoop = useCallback(() => {
    runningRef.current = true
    const step = () => {
      engine.tick(alphaRef.current)
      // Pan inertia — glide after a flick, decaying to rest. Reduced-motion
      // keeps direct manipulation but never adds movement after release.
      if (!reduced && !panningRef.current) {
        const v = panVelRef.current
        if (Math.hypot(v.x, v.y) > PAN_VEL_EPS) {
          vpRef.current = { ...vpRef.current, tx: vpRef.current.tx + v.x, ty: vpRef.current.ty + v.y }
          v.x *= PAN_INERTIA_DECAY
          v.y *= PAN_INERTIA_DECAY
        } else { v.x = 0; v.y = 0 }
      }
      // Ease the view back home after a double-click.
      if (!reduced && vpTargetRef.current) {
        const t = vpTargetRef.current
        const c = vpRef.current
        const ntx = c.tx + (t.tx - c.tx) * VIEW_EASE
        const nty = c.ty + (t.ty - c.ty) * VIEW_EASE
        const ns = c.scale + (t.scale - c.scale) * VIEW_EASE
        if (Math.abs(ntx - t.tx) < 0.4 && Math.abs(nty - t.ty) < 0.4 && Math.abs(ns - t.scale) < 0.002) {
          vpRef.current = { ...t }
          vpTargetRef.current = null
        } else {
          vpRef.current = { tx: ntx, ty: nty, scale: ns }
        }
      }
      paint((n) => n + 1) // re-render → renderer cascades from new positions/transform
      alphaRef.current *= 1 - ALPHA.decay
      const resting =
        alphaRef.current < ALPHA.min &&
        engine.maxVelocity() < ALPHA.vEps &&
        !draggingRef.current &&
        !panningRef.current &&
        !vpTargetRef.current &&
        Math.hypot(panVelRef.current.x, panVelRef.current.y) < PAN_VEL_EPS
      if (resting || document.hidden) {
        runningRef.current = false
        rafRef.current = null
        return // STOP AT REST — no reschedule, zero frames when idle
      }
      rafRef.current = requestAnimationFrame(step)
    }
    rafRef.current = requestAnimationFrame(step)
  }, [engine, reduced])

  const wake = useCallback(() => { if (!runningRef.current) startLoop() }, [startLoop])
  const reheat = useCallback(
    (to: number) => {
      if (reduced) return
      alphaRef.current = Math.max(alphaRef.current, to)
      wake()
    },
    [reduced, wake],
  )

  // Reseed only when the node/edge *set* changes (not on color/coordinate-only updates).
  const structKey = useMemo(
    () => `${seed.nodes.map((n) => n.id).join('|')}#${seed.edges.map((e) => e.id).join('|')}`,
    [seed.nodes, seed.edges],
  )
  useEffect(() => {
    engine.seed(seed.nodes, seed.edges)
    engine.setPinned(opts.pinnedId)
    // Nodes that left the graph take their user pin with them.
    for (const id of userPinsRef.current) {
      if (!seed.nodes.some((n) => n.id === id)) userPinsRef.current.delete(id)
    }
    if (!reduced) reheat(ALPHA.reheat) // entrance settle / absorb the structure change
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [structKey, opts.pinnedId])

  // Reset run state on unmount, not just cancel the frame — otherwise a remount
  // (StrictMode, or reopening the modal) sees runningRef=true with no live frame
  // and reheat() never restarts the loop.
  useEffect(() => () => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current)
    rafRef.current = null
    runningRef.current = false
  }, [])

  /** Screen point → group-local world coords (undoes viewBox CTM *and* pan/zoom). */
  const toWorld = useCallback((clientX: number, clientY: number) => {
    const svg = svgRef.current
    if (!svg) return null
    const ctm = svg.getScreenCTM()
    if (!ctm) return null
    const pt = svg.createSVGPoint()
    pt.x = clientX
    pt.y = clientY
    const vb = pt.matrixTransform(ctm.inverse()) // viewBox coords
    const { tx, ty, scale } = vpRef.current
    return { x: (vb.x - tx) / scale, y: (vb.y - ty) / scale }
  }, [])

  const onNodePointerDown = useCallback(
    (node: PositionedGraphNode, event: ReactPointerEvent) => {
      event.stopPropagation() // don't let the press also start a background pan
      if (reduced) return // static graph under reduced-motion; tap still selects via onClick
      if (event.pointerType === 'mouse' && event.button !== 0) return
      const start = toWorld(event.clientX, event.clientY)
      if (!start) return
      let moved = false

      const move = (ev: globalThis.PointerEvent) => {
        const w = toWorld(ev.clientX, ev.clientY)
        if (!w) return
        if (!moved && Math.hypot(w.x - start.x, w.y - start.y) > DRAG_THRESHOLD) {
          moved = true
          draggingRef.current = node.id
        }
        if (moved) {
          engine.pin(node.id, w.x, w.y)
          reheat(ALPHA.dragHot)
        }
      }
      const up = () => {
        window.removeEventListener('pointermove', move)
        window.removeEventListener('pointerup', up)
        window.removeEventListener('pointercancel', up)
        // A drag is a deliberate placement — the node stays pinned where it was
        // dropped instead of elastically undoing the user's work. Double-click
        // the background (reset view) to release every parked node at once.
        if (moved && node.id !== opts.pinnedId) userPinsRef.current.add(node.id)
        draggingRef.current = null
        if (moved) reheat(ALPHA.reheat) // let the web settle around the drop, then sleep
      }

      window.addEventListener('pointermove', move)
      window.addEventListener('pointerup', up)
      window.addEventListener('pointercancel', up)
    },
    [engine, opts.pinnedId, reduced, reheat, toWorld],
  )

  const onBackgroundPointerDown = useCallback(
    (event: ReactPointerEvent) => {
      if (event.pointerType === 'mouse' && event.button !== 0) return
      const svg = svgRef.current
      if (!svg) return
      const ctm0 = svg.getScreenCTM()
      if (!ctm0) return
      const toViewBox = (cx: number, cy: number) => {
        const ctm = svg.getScreenCTM()
        if (!ctm) return null
        const pt = svg.createSVGPoint()
        pt.x = cx; pt.y = cy
        return pt.matrixTransform(ctm.inverse())
      }
      let last = toViewBox(event.clientX, event.clientY)
      if (!last) return
      vpTargetRef.current = null // a manual pan cancels any in-flight reset
      panningRef.current = true
      panVelRef.current = { x: 0, y: 0 }
      wake()

      const move = (ev: globalThis.PointerEvent) => {
        const now = toViewBox(ev.clientX, ev.clientY)
        if (!now || !last) return
        const dx = now.x - last.x
        const dy = now.y - last.y
        vpRef.current = { ...vpRef.current, tx: vpRef.current.tx + dx, ty: vpRef.current.ty + dy }
        panVelRef.current = reduced ? { x: 0, y: 0 } : { x: dx, y: dy } // last delta seeds inertia
        last = now
        wake()
      }
      const up = () => {
        window.removeEventListener('pointermove', move)
        window.removeEventListener('pointerup', up)
        window.removeEventListener('pointercancel', up)
        panningRef.current = false
        if (reduced) panVelRef.current = { x: 0, y: 0 }
        wake() // let inertia play out
      }
      window.addEventListener('pointermove', move)
      window.addEventListener('pointerup', up)
      window.addEventListener('pointercancel', up)
    },
    [reduced, wake],
  )

  // Native, non-passive wheel listener so preventDefault actually suppresses page
  // scroll while zooming (React attaches onWheel as passive). Kept in a ref so the
  // listener is stable but always runs the latest closure.
  const handleWheel = useCallback((event: WheelEvent) => {
    const svg = svgRef.current
    if (!svg) return
    const ctm = svg.getScreenCTM()
    if (!ctm) return
    event.preventDefault()
    vpTargetRef.current = null // a manual zoom cancels any in-flight reset
    const pt = svg.createSVGPoint()
    pt.x = event.clientX; pt.y = event.clientY
    const cursor = pt.matrixTransform(ctm.inverse()) // viewBox coords under cursor
    const { tx, ty, scale } = vpRef.current
    const next = Math.min(ZOOM.max, Math.max(ZOOM.min, scale * Math.exp(-event.deltaY * ZOOM.sensitivity)))
    // Keep the world point under the cursor fixed while zooming.
    const localX = (cursor.x - tx) / scale
    const localY = (cursor.y - ty) / scale
    vpRef.current = { scale: next, tx: cursor.x - next * localX, ty: cursor.y - next * localY }
    wake()
  }, [wake])
  const handleWheelRef = useRef(handleWheel)
  handleWheelRef.current = handleWheel

  /** Step-zoom anchored on the canvas center (the wheel anchors on the cursor instead). */
  const zoomBy = useCallback((factor: number) => {
    vpTargetRef.current = null // a manual zoom cancels any in-flight reset
    const { tx, ty, scale } = vpRef.current
    const next = Math.min(ZOOM.max, Math.max(ZOOM.min, scale * factor))
    if (next === scale) return
    // Keep the world point at the canvas center fixed while zooming.
    const localX = (GRAPH_CENTER_X - tx) / scale
    const localY = (GRAPH_CENTER_Y - ty) / scale
    vpRef.current = { scale: next, tx: GRAPH_CENTER_X - next * localX, ty: GRAPH_CENTER_Y - next * localY }
    wake()
  }, [wake])

  const resetView = useCallback(() => {
    // Reset is also the "let go" gesture: every node parked by a drag rejoins the web.
    if (userPinsRef.current.size > 0) {
      for (const id of userPinsRef.current) engine.unpin(id)
      userPinsRef.current.clear()
      reheat(ALPHA.reheat)
    }
    if (vpRef.current.tx === 0 && vpRef.current.ty === 0 && vpRef.current.scale === 1) return
    panVelRef.current = { x: 0, y: 0 }
    if (reduced) {
      vpRef.current = { tx: 0, ty: 0, scale: 1 }
      vpTargetRef.current = null
      paint((n) => n + 1)
      return
    }
    vpTargetRef.current = { tx: 0, ty: 0, scale: 1 }
    wake()
  }, [engine, reduced, reheat, wake])

  const positions = engine.positions()
  const nodes = seed.nodes.map((n) => {
    const p = positions.get(n.id)
    return p ? { ...n, x: p.x, y: p.y } : n
  })
  const nodeById = new Map(nodes.map((n) => [n.id, n]))
  const { tx, ty, scale } = vpRef.current
  const viewportTransform = `translate(${tx.toFixed(2)} ${ty.toFixed(2)}) scale(${scale.toFixed(4)})`
  const hot = alphaRef.current > LABEL_HIDE_ALPHA // only big motion hides labels, not hover/pan

  const nativeWheel = useCallback((e: WheelEvent) => handleWheelRef.current(e), [])
  const bindSvg = useCallback((el: SVGSVGElement | null) => {
    if (svgRef.current) svgRef.current.removeEventListener('wheel', nativeWheel)
    svgRef.current = el
    if (el) el.addEventListener('wheel', nativeWheel, { passive: false })
  }, [nativeWheel])

  return {
    nodes,
    nodeById,
    onNodePointerDown,
    onBackgroundPointerDown,
    resetView,
    bindSvg,
    viewportTransform,
    viewportScale: scale,
    zoomBy,
    hot,
  }
}
