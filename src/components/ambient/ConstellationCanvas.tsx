/**
 * The living graph snapshot — raw-WebGL1 constellation that replaces the
 * static SVG when WebGL is available and motion is allowed. Falls back by
 * rendering nothing (the parent keeps the SVG).
 *
 * World space matches the old viewBox: 100 x 62, y down, center (50, 31).
 */
import { useEffect, useMemo, useRef } from 'react'
import {
  AmbientRenderer,
  createGlowTexture,
  hexToVec3,
  isWebGLAvailable,
  prefersReducedMotion,
  type AmbientDrawContext,
} from './webgl'

export interface ConstellationNode {
  key: string
  title: string
  typeName: string
  fill: string
  direction: 'in' | 'out' | 'both'
  degree: number
  target: string
}

export interface ConstellationCanvasProps {
  centerTitle: string
  nodes: ConstellationNode[]
  centerFill: string
  borderColor: string
  onSelect: (target: string) => void
  onUnavailable?: () => void
  className?: string
}

const WORLD_W = 100
const WORLD_H = 62
const CENTER = { x: 50, y: 31 }
const NEIGHBOR_CAP = 8
const HOVER_RADIUS_CSS_PX = 12

/** Additive-intensity cap so overlaps bloom without ever clipping to white. */
const GAIN = 0.85

interface NodeAnim {
  key: string
  title: string
  target: string
  direction: 'in' | 'out' | 'both'
  fill: [number, number, number]
  anchorX: number
  anchorY: number
  amp: number
  speed: number
  phase: number
  pulsePhase: number
  sizePx: number
  degree: number
}

function hash01(text: string, salt: number): number {
  let h = 2166136261 + salt
  for (let i = 0; i < text.length; i += 1) {
    h ^= text.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return ((h >>> 0) % 10000) / 10000
}

function buildNodeAnim(nodes: ConstellationNode[]): NodeAnim[] {
  const capped = nodes.slice(0, NEIGHBOR_CAP)
  const count = capped.length
  return capped.map((node, index) => {
    const angle = (index / Math.max(1, count)) * 2 * Math.PI - Math.PI / 2
    return {
      key: node.key,
      title: node.title,
      target: node.target,
      direction: node.direction,
      fill: hexToVec3(node.fill),
      anchorX: CENTER.x + 38 * Math.cos(angle),
      anchorY: CENTER.y + 23 * Math.sin(angle),
      amp: 0.7 + hash01(node.key, 7) * 0.6,
      speed: 0.5 + hash01(node.key, 13) * 0.4,
      phase: hash01(node.key, 29) * Math.PI * 2,
      pulsePhase: hash01(node.key, 43),
      sizePx: (3.1 + Math.min(2.2, node.degree * 0.4)) * 2.4,
      degree: node.degree,
    }
  })
}

interface GLResources {
  pointsProgram: WebGLProgram
  linesProgram: WebGLProgram
  pointsBuffer: WebGLBuffer
  linesBuffer: WebGLBuffer
  glowTexture: WebGLTexture
  pointStride: number
  lineStride: number
}

const POINTS_VS = `
attribute vec2 a_pos;
attribute float a_size;
attribute vec4 a_color;
uniform vec2 u_scale;
uniform vec2 u_offset;
varying vec4 v_color;
void main() {
  gl_Position = vec4(a_pos * u_scale + u_offset, 0.0, 1.0);
  gl_PointSize = a_size;
  v_color = a_color;
}
`

const POINTS_FS = `
precision mediump float;
uniform sampler2D u_texture;
varying vec4 v_color;
void main() {
  vec4 sprite = texture2D(u_texture, gl_PointCoord);
  gl_FragColor = vec4(v_color.rgb, v_color.a * sprite.a);
}
`

const LINES_VS = `
attribute vec2 a_pos;
attribute vec4 a_color;
uniform vec2 u_scale;
uniform vec2 u_offset;
varying vec4 v_color;
void main() {
  gl_Position = vec4(a_pos * u_scale + u_offset, 0.0, 1.0);
  v_color = a_color;
}
`

const LINES_FS = `
precision mediump float;
varying vec4 v_color;
void main() {
  gl_FragColor = vec4(v_color.rgb, v_color.a);
}
`

function compileShader(gl: WebGLRenderingContext, type: number, source: string): WebGLShader {
  const shader = gl.createShader(type)
  if (!shader) throw new Error('createShader returned null')
  gl.shaderSource(shader, source)
  gl.compileShader(shader)
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    throw new Error(`shader compile failed: ${gl.getShaderInfoLog(shader) ?? 'unknown'}`)
  }
  return shader
}

function linkProgram(gl: WebGLRenderingContext, vs: string, fs: string): WebGLProgram {
  const program = gl.createProgram()
  if (!program) throw new Error('createProgram returned null')
  gl.attachShader(program, compileShader(gl, gl.VERTEX_SHADER, vs))
  gl.attachShader(program, compileShader(gl, gl.FRAGMENT_SHADER, fs))
  gl.linkProgram(program)
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    throw new Error(`program link failed: ${gl.getProgramInfoLog(program) ?? 'unknown'}`)
  }
  return program
}

/** 8 fixed sparkle seeds drifting slowly upward, twinkling white. */
const SPARKLES = Array.from({ length: 8 }, (_, i) => ({
  seedX: (i * 37 + 11) % 100,
  seedY: (i * 53 + 7) % 62,
  driftX: (hash01(`spark-${i}`, 3) - 0.5) * 2.4,
  size: 1.2 + hash01(`spark-${i}`, 5) * 0.8,
  phase: hash01(`spark-${i}`, 9) * Math.PI * 2,
}))

export function ConstellationCanvas({
  centerTitle,
  nodes,
  centerFill,
  borderColor,
  onSelect,
  onUnavailable,
  className,
}: ConstellationCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const nodeAnims = useMemo(() => buildNodeAnim(nodes), [nodes])
  const centerColor = useMemo(() => hexToVec3(centerFill), [centerFill])
  const borderColorVec = useMemo(() => hexToVec3(borderColor), [borderColor])
  const tealVec = useMemo(() => hexToVec3('#0e7c78'), [])

  const resourcesRef = useRef<GLResources | null>(null)
  const hoverRef = useRef(-1)
  const latestRef = useRef({ nodeAnims, centerColor, borderColorVec, tealVec, onSelect })
  latestRef.current = { nodeAnims, centerColor, borderColorVec, tealVec, onSelect }
  const onUnavailableRef = useRef(onUnavailable)
  onUnavailableRef.current = onUnavailable

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const reportUnavailable = () => onUnavailableRef.current?.()
    if (!isWebGLAvailable() || prefersReducedMotion()) {
      reportUnavailable()
      return
    }

    const createResources = (gl: WebGLRenderingContext): GLResources => {
      const pointsProgram = linkProgram(gl, POINTS_VS, POINTS_FS)
      const linesProgram = linkProgram(gl, LINES_VS, LINES_FS)
      const pointsBuffer = gl.createBuffer()
      const linesBuffer = gl.createBuffer()
      if (!pointsBuffer || !linesBuffer) throw new Error('createBuffer returned null')
      return {
        pointsProgram,
        linesProgram,
        pointsBuffer,
        linesBuffer,
        glowTexture: createGlowTexture(gl),
        pointStride: 7 * 4, // x, y, size, r, g, b, a
        lineStride: 6 * 4, // x, y, r, g, b, a
      }
    }

    let renderer: AmbientRenderer
    try {
      const glOrNull = canvas.getContext('webgl', {
        alpha: true,
        antialias: true,
        premultipliedAlpha: false,
        powerPreference: 'low-power',
      })
      if (!glOrNull) throw new Error('webgl unavailable')
      resourcesRef.current = createResources(glOrNull)
    } catch {
      reportUnavailable()
      return
    }

    const draw = (ctx: AmbientDrawContext, t: number): void => {
      const gl = ctx.gl
      const res = resourcesRef.current
      if (!res) return
      const { nodeAnims: anims, centerColor: center, borderColorVec: border, tealVec: teal } = latestRef.current

      const scaleX = 2 / WORLD_W
      const scaleY = -2 / WORLD_H
      const offsetX = -1
      const offsetY = 1

      const dpr = ctx.dpr
      const pointScale = ctx.height / WORLD_H
      const hover = hoverRef.current

      gl.clearColor(0, 0, 0, 0)
      gl.clear(gl.COLOR_BUFFER_BIT)
      gl.enable(gl.BLEND)

      // ---- Lines: center → each node (hairline, brighter when mutual). ----
      const lineData = new Float32Array(anims.length * 2 * 6)
      anims.forEach((node, i) => {
        const breathe = Math.sin(t * node.speed + node.phase) * node.amp
        // drift along the radius direction, projected to world axes
        const dx = node.anchorX - CENTER.x
        const dy = node.anchorY - CENTER.y
        const len = Math.hypot(dx, dy) || 1
        const nx = dx / len
        const ny = dy / len
        const px = node.anchorX + nx * breathe
        const py = node.anchorY + ny * breathe
        const mutual = node.direction === 'both'
        const mix = mutual ? 0.25 : 0
        const r = (border[0] * (1 - mix) + teal[0] * mix) * GAIN
        const g = (border[1] * (1 - mix) + teal[1] * mix) * GAIN
        const b = (border[2] * (1 - mix) + teal[2] * mix) * GAIN
        const alpha = mutual ? 0.75 : 0.55
        const o = i * 12
        lineData[o] = CENTER.x; lineData[o + 1] = CENTER.y
        lineData[o + 2] = r; lineData[o + 3] = g; lineData[o + 4] = b; lineData[o + 5] = alpha
        lineData[o + 6] = px; lineData[o + 7] = py
        lineData[o + 8] = r; lineData[o + 9] = g; lineData[o + 10] = b; lineData[o + 11] = alpha
      })
      gl.useProgram(res.linesProgram)
      gl.uniform2f(gl.getUniformLocation(res.linesProgram, 'u_scale'), scaleX, scaleY)
      gl.uniform2f(gl.getUniformLocation(res.linesProgram, 'u_offset'), offsetX, offsetY)
      gl.bindBuffer(gl.ARRAY_BUFFER, res.linesBuffer)
      gl.bufferData(gl.ARRAY_BUFFER, lineData, gl.DYNAMIC_DRAW)
      const linePos = gl.getAttribLocation(res.linesProgram, 'a_pos')
      const lineColor = gl.getAttribLocation(res.linesProgram, 'a_color')
      gl.enableVertexAttribArray(linePos)
      gl.vertexAttribPointer(linePos, 2, gl.FLOAT, false, res.lineStride, 0)
      gl.enableVertexAttribArray(lineColor)
      gl.vertexAttribPointer(lineColor, 4, gl.FLOAT, false, res.lineStride, 8)
      gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA)
      gl.drawArrays(gl.LINES, 0, anims.length * 2)

      // ---- Points: nodes, pulses, sparkles (additive glow). ----
      const pointCount =
        2 + anims.length + // center ×2 (halo bloom) + neighbors
        anims.reduce((sum, n) => sum + (n.direction === 'both' ? 2 : 1), 0) +
        SPARKLES.length
      const pointData = new Float32Array(pointCount * 7)
      let p = 0
      const pushPoint = (x: number, y: number, size: number, r: number, g: number, b: number, a: number) => {
        pointData[p] = x; pointData[p + 1] = y; pointData[p + 2] = size
        pointData[p + 3] = r; pointData[p + 4] = g; pointData[p + 5] = b; pointData[p + 6] = a
        p += 7
      }

      // Center: main + wide soft halo pass, gently pulsing.
      const pulse = 1 + 0.06 * Math.sin(t * 1.4)
      const centerSize = 14 * pointScale * pulse
      pushPoint(CENTER.x, CENTER.y, centerSize * 1.8, center[0] * GAIN, center[1] * GAIN, center[2] * GAIN, 0.35)
      pushPoint(CENTER.x, CENTER.y, centerSize, center[0] * GAIN, center[1] * GAIN, center[2] * GAIN, 0.9)

      // Neighbors with breathing offsets.
      const nodePositions: Array<{ x: number; y: number }> = []
      anims.forEach((node, i) => {
        const breathe = Math.sin(t * node.speed + node.phase) * node.amp
        const dx = node.anchorX - CENTER.x
        const dy = node.anchorY - CENTER.y
        const len = Math.hypot(dx, dy) || 1
        const px = node.anchorX + (dx / len) * breathe
        const py = node.anchorY + (dy / len) * breathe
        nodePositions[i] = { x: px, y: py }
        const hovered = hover === i
        const dimmed = hover !== -1 && !hovered
        const size = node.sizePx * dpr * (hovered ? 1.35 : 1)
        const alpha = hovered ? 1 : dimmed ? 0.45 : 0.75
        pushPoint(px, py, size, node.fill[0] * GAIN, node.fill[1] * GAIN, node.fill[2] * GAIN, alpha)
      })

      // Direction pulses: one traveling glow per edge (two when mutual).
      anims.forEach((node, i) => {
        const { x: nx, y: ny } = nodePositions[i]
        const passes = node.direction === 'both' ? 2 : 1
        for (let pass = 0; pass < passes; pass += 1) {
          const s = (t * 0.12 + node.pulsePhase + pass * 0.5) % 1
          // out: center → node; in: node → center; both: opposite streams.
          const forward = node.direction === 'out' || (node.direction === 'both' && pass === 0)
          const k = forward ? s : 1 - s
          const px = CENTER.x + (nx - CENTER.x) * k
          const py = CENTER.y + (ny - CENTER.y) * k
          const tint = 0.35
          pushPoint(
            px, py, 2.2 * dpr,
            (1 - tint + node.fill[0] * tint) * GAIN,
            (1 - tint + node.fill[1] * tint) * GAIN,
            (1 - tint + node.fill[2] * tint) * GAIN,
            0.8,
          )
        }
      })

      // Sparkles.
      SPARKLES.forEach((spark) => {
        const x = (((spark.seedX + spark.driftX * t) % WORLD_W) + WORLD_W) % WORLD_W
        const y = (((spark.seedY - t * 0.55) % WORLD_H) + WORLD_H) % WORLD_H
        const twinkle = 0.12 + 0.18 * (0.5 + 0.5 * Math.sin(t * 1.7 + spark.phase))
        pushPoint(x, y, spark.size * dpr, GAIN, GAIN, GAIN, twinkle)
      })

      gl.useProgram(res.pointsProgram)
      gl.uniform2f(gl.getUniformLocation(res.pointsProgram, 'u_scale'), scaleX, scaleY)
      gl.uniform2f(gl.getUniformLocation(res.pointsProgram, 'u_offset'), offsetX, offsetY)
      gl.activeTexture(gl.TEXTURE0)
      gl.bindTexture(gl.TEXTURE_2D, res.glowTexture)
      gl.uniform1i(gl.getUniformLocation(res.pointsProgram, 'u_texture'), 0)
      gl.bindBuffer(gl.ARRAY_BUFFER, res.pointsBuffer)
      gl.bufferData(gl.ARRAY_BUFFER, pointData, gl.DYNAMIC_DRAW)
      const pointPos = gl.getAttribLocation(res.pointsProgram, 'a_pos')
      const pointSize = gl.getAttribLocation(res.pointsProgram, 'a_size')
      const pointColor = gl.getAttribLocation(res.pointsProgram, 'a_color')
      gl.enableVertexAttribArray(pointPos)
      gl.vertexAttribPointer(pointPos, 2, gl.FLOAT, false, res.pointStride, 0)
      gl.enableVertexAttribArray(pointSize)
      gl.vertexAttribPointer(pointSize, 1, gl.FLOAT, false, res.pointStride, 8)
      gl.enableVertexAttribArray(pointColor)
      gl.vertexAttribPointer(pointColor, 4, gl.FLOAT, false, res.pointStride, 12)
      gl.blendFunc(gl.ONE, gl.ONE)
      gl.drawArrays(gl.POINTS, 0, pointCount)
    }

    try {
      renderer = new AmbientRenderer(canvas, {
        draw,
        onContextRestored: () => {
          const gl = canvas.getContext('webgl')
          if (!gl) return
          try {
            resourcesRef.current = createResources(gl)
          } catch {
            reportUnavailable()
          }
        },
        onUnavailable: reportUnavailable,
      })
    } catch {
      reportUnavailable()
      return
    }

    if (!renderer.start()) {
      reportUnavailable()
      return
    }

    const handlePointerMove = (event: PointerEvent) => {
      const rect = canvas.getBoundingClientRect()
      const cssX = event.clientX - rect.left
      const cssY = event.clientY - rect.top
      const { nodeAnims: anims } = latestRef.current
      let nearest = -1
      let nearestDist = HOVER_RADIUS_CSS_PX
      anims.forEach((node, i) => {
        // Hover is judged against the ring anchor; the breathing amplitude
        // (≤1.3 world units ≈ 4px) stays well inside the 12px tolerance.
        const wx = (node.anchorX / WORLD_W) * rect.width
        const wy = (node.anchorY / WORLD_H) * rect.height
        const dist = Math.hypot(wx - cssX, wy - cssY)
        if (dist < nearestDist) {
          nearestDist = dist
          nearest = i
        }
      })
      if (nearest !== hoverRef.current) {
        hoverRef.current = nearest
        canvas.style.cursor = nearest >= 0 ? 'pointer' : 'default'
      }
    }
    const handlePointerLeave = () => {
      hoverRef.current = -1
      canvas.style.cursor = 'default'
    }
    const handleClick = () => {
      const index = hoverRef.current
      if (index >= 0) {
        const node = latestRef.current.nodeAnims[index]
        if (node) latestRef.current.onSelect(node.target)
      }
    }

    canvas.addEventListener('pointermove', handlePointerMove)
    canvas.addEventListener('pointerleave', handlePointerLeave)
    canvas.addEventListener('click', handleClick)

    return () => {
      canvas.removeEventListener('pointermove', handlePointerMove)
      canvas.removeEventListener('pointerleave', handlePointerLeave)
      canvas.removeEventListener('click', handleClick)
      renderer.destroy()
      resourcesRef.current = null
    }
  }, [])

  return (
    <>
      <canvas
        ref={canvasRef}
        className={className}
        role="img"
        aria-label="Graph snapshot of linked notes"
      />
      <ul className="sb-sr-only">
        {nodes.slice(0, NEIGHBOR_CAP).map((node) => (
          <li key={node.key}>
            <a
              href="#"
              onClick={(event) => {
                event.preventDefault()
                onSelect(node.target)
              }}
            >
              {node.title}
              {node.typeName ? ` (${node.typeName})` : ''}
            </a>
          </li>
        ))}
      </ul>
      <span className="sb-sr-only">{centerTitle}</span>
    </>
  )
}
