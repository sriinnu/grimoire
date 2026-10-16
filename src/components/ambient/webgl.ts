/**
 * Ambient WebGL layer — shared lifecycle for the Second Brain constellation
 * and the dashboard aurora. Raw WebGL1, zero dependencies.
 *
 * Contract (the "Apple-quiet" part):
 * - DPR capped at 2; loop paused when the tab is hidden or the canvas leaves
 *   the viewport; everything animates in rAF.
 * - prefers-reduced-motion renders exactly one static frame.
 * - webglcontextlost/restored are handled; init failure is reported so the
 *   parent can swap back to the static SVG/gradient.
 * - FPS guard: if the first 90 frames average < 45fps we drop to DPR 1 and
 *   re-measure; if still < 45fps we stop the loop on a final static frame and
 *   report degradation.
 */
import { useEffect, useState } from 'react'

export interface AmbientDrawContext {
  gl: WebGLRenderingContext
  /** Canvas backing-store size in device pixels. */
  width: number
  height: number
  /** CSS-pixel size of the canvas. */
  cssWidth: number
  cssHeight: number
  dpr: number
}

export interface AmbientRendererOptions {
  draw: (ctx: AmbientDrawContext, timeSeconds: number) => void
  onContextLost?: () => void
  onContextRestored?: () => void
  /** Init failed or the fps guard gave up — parent should show the fallback. */
  onUnavailable?: () => void
}

const DPR_CAP = 2
const FPS_SAMPLE_FRAMES = 90
const FPS_FLOOR = 45

let webglAvailability: boolean | null = null

/** Probe WebGL1 once (jsdom returns null → callers render the SVG fallback). */
export function isWebGLAvailable(): boolean {
  if (webglAvailability !== null) return webglAvailability
  try {
    const canvas = document.createElement('canvas')
    webglAvailability = canvas.getContext('webgl') !== null
  } catch {
    webglAvailability = false
  }
  return webglAvailability
}

export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

/**
 * Procedural radial glow sprite: white, alpha = quadratic falloff to the
 * edge. This is the "orb" sprite sampled by every point in the constellation.
 */
export function createGlowTexture(gl: WebGLRenderingContext, size = 64): WebGLTexture {
  const data = new Uint8Array(size * size * 4)
  const half = (size - 1) / 2
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const dx = (x - half) / half
      const dy = (y - half) / half
      const dist = Math.min(1, Math.sqrt(dx * dx + dy * dy))
      const alpha = Math.pow(1 - dist, 2)
      const i = (y * size + x) * 4
      data[i] = 255
      data[i + 1] = 255
      data[i + 2] = 255
      data[i + 3] = Math.round(alpha * 255)
    }
  }
  const texture = gl.createTexture()
  if (!texture) throw new Error('createGlowTexture: gl.createTexture returned null')
  gl.bindTexture(gl.TEXTURE_2D, texture)
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, size, size, 0, gl.RGBA, gl.UNSIGNED_BYTE, data)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
  return texture
}

/** "#rgb" / "#rrggbb" → sRGB 0-1 triple. */
export function hexToVec3(hex: string): [number, number, number] {
  let value = hex.trim().replace(/^#/, '')
  if (value.length === 3) {
    value = value.split('').map((c) => c + c).join('')
  }
  const int = Number.parseInt(value, 16)
  if (Number.isNaN(int) || value.length !== 6) return [1, 1, 1]
  return [((int >> 16) & 0xff) / 255, ((int >> 8) & 0xff) / 255, (int & 0xff) / 255]
}

/** Observes `data-theme` on <html> so ambient palettes follow the app theme. */
export function useDocumentTheme(): 'light' | 'dark' {
  const [theme, setTheme] = useState<'light' | 'dark'>(() =>
    typeof document !== 'undefined' &&
    document.documentElement.getAttribute('data-theme') === 'dark'
      ? 'dark'
      : 'light',
  )

  useEffect(() => {
    const root = document.documentElement
    const observer = new MutationObserver(() => {
      setTheme(root.getAttribute('data-theme') === 'dark' ? 'dark' : 'light')
    })
    observer.observe(root, { attributes: true, attributeFilter: ['data-theme'] })
    return () => observer.disconnect()
  }, [])

  return theme
}

export class AmbientRenderer {
  private readonly canvas: HTMLCanvasElement
  private readonly options: AmbientRendererOptions
  private readonly reducedMotion: boolean

  private gl: WebGLRenderingContext | null = null
  private dprCap = DPR_CAP
  private rafHandle = 0
  private loopRunning = false
  private started = false
  private destroyed = false
  private degraded = false
  private tabVisible = true
  private onscreen = true
  private frameCount = 0
  private windowStart = 0
  private retriedAtDpr1 = false
  private startTime = 0

  private resizeObserver: ResizeObserver | null = null
  private intersectionObserver: IntersectionObserver | null = null

  constructor(canvas: HTMLCanvasElement, options: AmbientRendererOptions) {
    this.canvas = canvas
    this.options = options
    this.reducedMotion = prefersReducedMotion()
  }

  /** Begin the lifecycle. Returns false when WebGL init failed. */
  start(): boolean {
    if (this.started || this.destroyed) return this.gl !== null
    this.started = true

    if (!this.initContext()) return false

    this.canvas.addEventListener('webglcontextlost', this.handleContextLost)
    this.canvas.addEventListener('webglcontextrestored', this.handleContextRestored)
    document.addEventListener('visibilitychange', this.handleVisibilityChange)

    this.resizeObserver = new ResizeObserver(() => {
      this.syncSize()
      if (!this.loopRunning) this.renderStaticFrame()
    })
    this.resizeObserver.observe(this.canvas)

    this.intersectionObserver = new IntersectionObserver((entries) => {
      this.onscreen = entries.some((entry) => entry.isIntersecting)
      if (this.onscreen) this.maybeStartLoop()
      else this.stopLoop()
    }, { threshold: 0 })
    this.intersectionObserver.observe(this.canvas)

    if (this.reducedMotion) {
      this.renderStaticFrame()
      return true
    }

    this.maybeStartLoop()
    return true
  }

  destroy(): void {
    this.destroyed = true
    this.stopLoop()
    this.resizeObserver?.disconnect()
    this.intersectionObserver?.disconnect()
    this.canvas.removeEventListener('webglcontextlost', this.handleContextLost)
    this.canvas.removeEventListener('webglcontextrestored', this.handleContextRestored)
    document.removeEventListener('visibilitychange', this.handleVisibilityChange)
    this.gl = null
  }

  /** Current drawing context, or null while the context is lost. */
  get context(): AmbientDrawContext | null {
    const gl = this.gl
    if (!gl) return null
    return {
      gl,
      width: this.canvas.width,
      height: this.canvas.height,
      cssWidth: this.canvas.clientWidth,
      cssHeight: this.canvas.clientHeight,
      dpr: Math.min(window.devicePixelRatio || 1, this.dprCap),
    }
  }

  private initContext(): boolean {
    const gl = this.canvas.getContext('webgl', {
      alpha: true,
      antialias: true,
      premultipliedAlpha: false,
      powerPreference: 'low-power',
    })
    if (!gl) {
      this.options.onUnavailable?.()
      return false
    }
    this.gl = gl
    this.syncSize()
    return true
  }

  private syncSize(): void {
    const gl = this.gl
    if (!gl) return
    const dpr = Math.min(window.devicePixelRatio || 1, this.dprCap)
    const width = Math.max(1, Math.round(this.canvas.clientWidth * dpr))
    const height = Math.max(1, Math.round(this.canvas.clientHeight * dpr))
    if (this.canvas.width !== width) this.canvas.width = width
    if (this.canvas.height !== height) this.canvas.height = height
    gl.viewport(0, 0, width, height)
  }

  private renderStaticFrame(): void {
    const gl = this.gl
    if (!gl) return
    this.syncSize()
    this.options.draw(this.context!, 0)
  }

  private maybeStartLoop(): void {
    if (
      this.destroyed || this.degraded || this.reducedMotion ||
      this.loopRunning ||
      !this.tabVisible || !this.onscreen || !this.gl
    ) return
    this.loopRunning = true
    this.startTime = performance.now()
    this.windowStart = this.startTime
    this.frameCount = 0
    this.rafHandle = requestAnimationFrame(this.frame)
  }

  private stopLoop(): void {
    if (!this.loopRunning) return
    this.loopRunning = false
    cancelAnimationFrame(this.rafHandle)
  }

  private readonly frame = (now: number): void => {
    if (!this.loopRunning) return
    const gl = this.gl
    if (!gl) return

    const time = (now - this.startTime) / 1000
    const ctx = this.context
    if (!ctx) return
    this.options.draw(ctx, time)

    this.frameCount += 1
    if (this.frameCount === FPS_SAMPLE_FRAMES) {
      const elapsed = (now - this.windowStart) / 1000
      const avgFps = FPS_SAMPLE_FRAMES / Math.max(elapsed, 1e-3)
      if (avgFps < FPS_FLOOR && !this.retriedAtDpr1) {
        this.retriedAtDpr1 = true
        this.dprCap = 1
        this.syncSize()
        this.frameCount = 0
        this.windowStart = now
      } else if (avgFps < FPS_FLOOR) {
        this.degrade()
        return
      } else {
        this.frameCount = 0
        this.windowStart = now
      }
    }

    this.rafHandle = requestAnimationFrame(this.frame)
  }

  /** FPS guard gave up: stop on a final static frame and report. */
  private degrade(): void {
    this.degraded = true
    this.stopLoop()
    this.renderStaticFrame()
    this.options.onUnavailable?.()
  }

  private readonly handleContextLost = (event: Event): void => {
    event.preventDefault()
    this.stopLoop()
    this.gl = null
    this.options.onContextLost?.()
  }

  private readonly handleContextRestored = (): void => {
    if (this.destroyed) return
    if (!this.initContext()) return
    this.options.onContextRestored?.()
    if (this.reducedMotion) this.renderStaticFrame()
    else this.maybeStartLoop()
  }

  private readonly handleVisibilityChange = (): void => {
    this.tabVisible = document.visibilityState !== 'hidden'
    if (this.tabVisible) this.maybeStartLoop()
    else this.stopLoop()
  }
}
