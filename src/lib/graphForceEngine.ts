import {
  GRAPH_VIEWBOX_WIDTH as W,
  GRAPH_VIEWBOX_HEIGHT as H,
  GRAPH_CENTER_X as CX,
  GRAPH_CENTER_Y as CY,
  type PositionedGraphNode,
} from '../utils/graphDisplay'
import type { NoteGraph } from '../utils/noteGraph'

/**
 * Swappable boundary for graph physics. The in-house spring engine is the
 * default; a d3-force adapter could implement the same interface later without
 * touching the hook or renderer. The engine owns positions; the renderer reads
 * them. Nothing here knows about React or the DOM.
 */
export interface GraphForceEngine {
  /** (Re)seed bodies from a layout, preserving momentum for nodes that persist by id. */
  seed(nodes: PositionedGraphNode[], edges: NoteGraph['edges']): void
  /** Hold a node at a fixed world point (drag). */
  pin(id: string, x: number, y: number): void
  /** Release a held node back into the simulation. */
  unpin(id: string): void
  /** The active note, hard-pinned to canvas center (null clears). */
  setPinned(id: string | null): void
  /** Advance the simulation one step, scaled by alpha energy (0..1). */
  tick(alpha: number): void
  /** Current world positions by node id. */
  positions(): Map<string, { x: number; y: number }>
  /** Largest current node speed — used to decide rest. */
  maxVelocity(): number
}

/**
 * Every knob that shapes the "feel" lives here — one object is the tuning dial.
 * springK: edge stiffness · restLength: relaxed edge length (≈ ring spacing so
 * the graph still reads radial) · repulsion: node-node push · centerGravity:
 * gentle pull home so it never flies apart · velocityDecay: damping · maxStep:
 * per-frame clamp so a GC stall can't fling a node.
 */
export const GRAPH_PHYSICS = {
  springK: 0.08,
  restLength: 118,
  repulsion: 17000,
  minDist: 14,
  centerGravity: 0.004,
  velocityDecay: 0.82,
  maxStep: 18,
}

/** Must match GraphNode.tsx:33 exactly, or collision and labels disagree with the render. */
const radiusOf = (n: PositionedGraphNode): number =>
  n.active ? 23 : Math.min(19, 10 + n.degree * 1.7)

interface Body {
  x: number
  y: number
  vx: number
  vy: number
  r: number
  fx: number | null
  fy: number | null
}

export function createSpringEngine(): GraphForceEngine {
  const P = GRAPH_PHYSICS
  let bodies = new Map<string, Body>()
  let edges: NoteGraph['edges'] = []
  let degrees = new Map<string, number>()
  let pinnedId: string | null = null
  const clamp = (v: number, m: number) => Math.max(-m, Math.min(m, v))

  return {
    seed(nodes, e) {
      const next = new Map<string, Body>()
      for (const n of nodes) {
        const prev = bodies.get(n.id)
        if (prev) {
          prev.r = radiusOf(n)
          next.set(n.id, prev) // keep position + momentum across re-layout
        } else {
          next.set(n.id, { x: n.x, y: n.y, vx: 0, vy: 0, r: radiusOf(n), fx: null, fy: null })
        }
      }
      bodies = next
      edges = e
      degrees = new Map()
      for (const edge of edges) {
        degrees.set(edge.source, (degrees.get(edge.source) ?? 0) + 1)
        degrees.set(edge.target, (degrees.get(edge.target) ?? 0) + 1)
      }
    },
    pin(id, x, y) {
      const b = bodies.get(id)
      if (b) { b.fx = x; b.fy = y }
    },
    unpin(id) {
      const b = bodies.get(id)
      if (b) { b.fx = null; b.fy = null }
    },
    setPinned(id) { pinnedId = id },
    maxVelocity() {
      let m = 0
      for (const b of bodies.values()) m = Math.max(m, Math.hypot(b.vx, b.vy))
      return m
    },
    positions() {
      const out = new Map<string, { x: number; y: number }>()
      for (const [id, b] of bodies) out.set(id, { x: b.x, y: b.y })
      return out
    },
    tick(alpha) {
      const arr = [...bodies.values()]
      const ids = [...bodies.keys()]

      // Node-node repulsion — O(n²), safe at the 180-node display cap and only hot during interaction.
      for (let i = 0; i < arr.length; i++) {
        for (let j = i + 1; j < arr.length; j++) {
          const a = arr[i]
          const b = arr[j]
          const dx = a.x - b.x
          const dy = a.y - b.y
          const d = Math.max(Math.hypot(dx, dy), P.minDist)
          const f = (P.repulsion / (d * d)) * alpha
          const ux = dx / d
          const uy = dy / d
          a.vx += ux * f; a.vy += uy * f
          b.vx -= ux * f; b.vy -= uy * f
        }
      }

      // Edge springs (Hooke) — pull connected notes toward restLength. Strength
      // is normalized by endpoint degree (d3's link default): a hub with many
      // edges must not accumulate their full combined pull, or the connected
      // core contracts into an unreadable knot.
      for (const e of edges) {
        const a = bodies.get(e.source)
        const b = bodies.get(e.target)
        if (!a || !b) continue
        const dx = b.x - a.x
        const dy = b.y - a.y
        const d = Math.hypot(dx, dy) || 0.01
        const strength = 1 / Math.min(degrees.get(e.source) ?? 1, degrees.get(e.target) ?? 1)
        const f = P.springK * strength * (d - P.restLength) * alpha
        const ux = dx / d
        const uy = dy / d
        a.vx += ux * f; a.vy += uy * f
        b.vx -= ux * f; b.vy -= uy * f
      }

      // Integrate.
      for (let k = 0; k < arr.length; k++) {
        const b = arr[k]
        const id = ids[k]
        if (id === pinnedId) { b.x = CX; b.y = CY; b.vx = 0; b.vy = 0; continue } // active note centered
        if (b.fx != null && b.fy != null) { b.x = b.fx; b.y = b.fy; b.vx = 0; b.vy = 0; continue } // dragged: follow finger
        b.vx += (CX - b.x) * P.centerGravity * alpha
        b.vy += (CY - b.y) * P.centerGravity * alpha
        b.vx *= P.velocityDecay
        b.vy *= P.velocityDecay
        b.x += clamp(b.vx, P.maxStep)
        b.y += clamp(b.vy, P.maxStep)
        b.x = Math.min(W - b.r, Math.max(b.r, b.x))
        b.y = Math.min(H - b.r, Math.max(b.r, b.y))
      }
    },
  }
}
