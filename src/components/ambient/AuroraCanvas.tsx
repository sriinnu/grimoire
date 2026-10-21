/**
 * Dashboard hero backdrop — a raw-WebGL1 fullscreen-triangle fbm aurora.
 * Two drifting color fields (amber + sea-glass teal) with a faint iris third,
 * vignetted to transparent edges, alpha-capped, dithered against banding.
 * Renders nothing when WebGL is unavailable or motion is reduced (the hero
 * keeps its static CSS gradient).
 */
import { useEffect, useMemo, useRef, useState } from 'react'
import {
  AmbientRenderer,
  hexToVec3,
  isWebGLAvailable,
  prefersReducedMotion,
  type AmbientDrawContext,
} from './webgl'

export interface AuroraCanvasProps {
  palette: 'light' | 'dark'
  className?: string
}

const VERTEX_SRC = `
attribute vec2 a_pos;
void main() {
  gl_Position = vec4(a_pos, 0.0, 1.0);
}
`

const FRAGMENT_SRC = `
precision mediump float;
uniform vec2 u_res;
uniform float u_time;
uniform vec3 u_cA;
uniform vec3 u_cB;
uniform vec3 u_cC;
uniform float u_intensity;
uniform float u_gain;

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
    mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x),
    u.y
  );
}

float fbm(vec2 p) {
  float value = 0.0;
  float amplitude = 0.5;
  for (int i = 0; i < 3; i++) {
    value += amplitude * noise(p);
    p *= 2.03;
    amplitude *= 0.5;
  }
  return value;
}

void main() {
  vec2 uv = gl_FragCoord.xy / u_res;
  vec2 p = uv;
  p.x *= u_res.x / u_res.y;

  float t = u_time * 0.05;
  vec2 warp = vec2(fbm(p * 1.6 + t), fbm(p * 1.6 - t));

  float nA = fbm(p * 2.2 + warp * 0.9 + vec2(t * 0.7, -t * 0.4));
  float nB = fbm(p * 2.6 - warp * 0.8 + vec2(-t * 0.5, t * 0.6));
  float nC = fbm(p * 1.8 + warp * 0.5 + vec2(t * 0.3, t * 0.3));

  vec3 col = (u_cA * nA * 0.55 + u_cB * nB * 0.6 + u_cC * nC * 0.35) * u_gain;
  float alpha = (nA * 0.45 + nB * 0.4 + nC * 0.3) * u_intensity;

  float dist = distance(uv, vec2(0.5, 0.45));
  alpha *= smoothstep(1.0, 0.35, dist);
  alpha = min(alpha, 0.5);

  // Dither to prevent banding on wide soft gradients.
  alpha += (hash(gl_FragCoord.xy) - 0.5) * (1.5 / 255.0);
  gl_FragColor = vec4(col, clamp(alpha, 0.0, 0.5));
}
`

/** Same hues both modes; dark runs hotter per the vision's nocturne aurora. */
const PALETTES = {
  light: { cA: '#E8A23A', cB: '#0E7C78', cC: '#7667D8', intensity: 0.1, gain: 0.85 },
  dark: { cA: '#E8A23A', cB: '#57C4BD', cC: '#A99AF0', intensity: 0.22, gain: 0.8 },
} as const

interface AuroraResources {
  program: WebGLProgram
  buffer: WebGLBuffer
  uniforms: {
    res: WebGLUniformLocation | null
    time: WebGLUniformLocation | null
    cA: WebGLUniformLocation | null
    cB: WebGLUniformLocation | null
    cC: WebGLUniformLocation | null
    intensity: WebGLUniformLocation | null
    gain: WebGLUniformLocation | null
  }
}

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

function createResources(gl: WebGLRenderingContext): AuroraResources {
  const program = gl.createProgram()
  if (!program) throw new Error('createProgram returned null')
  gl.attachShader(program, compileShader(gl, gl.VERTEX_SHADER, VERTEX_SRC))
  gl.attachShader(program, compileShader(gl, gl.FRAGMENT_SHADER, FRAGMENT_SRC))
  gl.linkProgram(program)
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    throw new Error(`program link failed: ${gl.getProgramInfoLog(program) ?? 'unknown'}`)
  }
  const buffer = gl.createBuffer()
  if (!buffer) throw new Error('createBuffer returned null')
  return {
    program,
    buffer,
    uniforms: {
      res: gl.getUniformLocation(program, 'u_res'),
      time: gl.getUniformLocation(program, 'u_time'),
      cA: gl.getUniformLocation(program, 'u_cA'),
      cB: gl.getUniformLocation(program, 'u_cB'),
      cC: gl.getUniformLocation(program, 'u_cC'),
      intensity: gl.getUniformLocation(program, 'u_intensity'),
      gain: gl.getUniformLocation(program, 'u_gain'),
    },
  }
}

export function AuroraCanvas({ palette, className }: AuroraCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [failed, setFailed] = useState(false)

  const colors = useMemo(() => {
    const preset = PALETTES[palette]
    return {
      cA: hexToVec3(preset.cA),
      cB: hexToVec3(preset.cB),
      cC: hexToVec3(preset.cC),
      intensity: preset.intensity,
      gain: preset.gain,
    }
  }, [palette])

  const resourcesRef = useRef<AuroraResources | null>(null)
  const colorsRef = useRef(colors)
  colorsRef.current = colors

  const available = useMemo(() => isWebGLAvailable() && !prefersReducedMotion(), [])

  useEffect(() => {
    if (!available) return
    const canvas = canvasRef.current
    if (!canvas) return

    const reportUnavailable = () => setFailed(true)

    try {
      const gl = canvas.getContext('webgl', {
        alpha: true,
        antialias: false,
        premultipliedAlpha: false,
        powerPreference: 'low-power',
      })
      if (!gl) throw new Error('webgl unavailable')
      resourcesRef.current = createResources(gl)
    } catch {
      reportUnavailable()
      return
    }

    const draw = (ctx: AmbientDrawContext, t: number): void => {
      const gl = ctx.gl
      const res = resourcesRef.current
      if (!res) return
      const preset = colorsRef.current
      gl.clearColor(0, 0, 0, 0)
      gl.clear(gl.COLOR_BUFFER_BIT)
      gl.enable(gl.BLEND)
      gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA)
      gl.useProgram(res.program)
      gl.uniform2f(res.uniforms.res, ctx.width, ctx.height)
      gl.uniform1f(res.uniforms.time, t)
      gl.uniform3f(res.uniforms.cA, preset.cA[0], preset.cA[1], preset.cA[2])
      gl.uniform3f(res.uniforms.cB, preset.cB[0], preset.cB[1], preset.cB[2])
      gl.uniform3f(res.uniforms.cC, preset.cC[0], preset.cC[1], preset.cC[2])
      gl.uniform1f(res.uniforms.intensity, preset.intensity)
      gl.uniform1f(res.uniforms.gain, preset.gain)
      gl.bindBuffer(gl.ARRAY_BUFFER, res.buffer)
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW)
      const pos = gl.getAttribLocation(res.program, 'a_pos')
      gl.enableVertexAttribArray(pos)
      gl.vertexAttribPointer(pos, 2, gl.FLOAT, false, 0, 0)
      gl.drawArrays(gl.TRIANGLES, 0, 3)
    }

    let renderer: AmbientRenderer
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

    return () => {
      renderer.destroy()
      resourcesRef.current = null
    }
  }, [available])

  if (!available || failed) return null

  return (
    <canvas
      ref={canvasRef}
      className={className}
      aria-hidden="true"
    />
  )
}
