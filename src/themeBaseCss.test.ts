import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

function readText(path: string): string {
  return readFileSync(path, 'utf8').replace(/\r\n?/gu, '\n')
}

function getRuleBody(source: string, selector: string): string {
  const ruleStart = source.indexOf(`${selector} {`)
  expect(ruleStart).toBeGreaterThanOrEqual(0)
  const bodyStart = source.indexOf('{', ruleStart)
  const bodyEnd = source.indexOf('}', bodyStart)
  return source.slice(bodyStart + 1, bodyEnd)
}

function getDeclaration(body: string, name: string): string {
  const declaration = body
    .split('\n')
    .map((line) => line.trim())
    .find((line) => line.startsWith(`${name}:`))
  expect(declaration).toBeDefined()
  return declaration!.slice(name.length + 1).replace(';', '').trim()
}

function hexToRgb(hex: string): [number, number, number] {
  const value = Number.parseInt(hex.slice(1), 16)
  return [value >> 16, (value >> 8) & 255, value & 255]
}

function hueDegrees(hex: string): number {
  const [red, green, blue] = hexToRgb(hex).map((channel) => channel / 255)
  const max = Math.max(red, green, blue)
  const min = Math.min(red, green, blue)
  const delta = max - min
  if (delta === 0) return 0
  if (max === red) return ((green - blue) / delta + (green < blue ? 6 : 0)) * 60
  if (max === green) return ((blue - red) / delta + 2) * 60
  return ((red - green) / delta + 4) * 60
}

describe('base theme CSS', () => {
  const css = readText(`${process.cwd()}/src/theme-base.css`)
  const darkBody = getRuleBody(css, ':root.dark,\n[data-theme="dark"]')

  it('keeps the dark fallback shell warm candlelit instead of cold graphite', () => {
    // Warm Paper is the only identity, so even the base fallback must read warm:
    // red leads blue on every shell surface (candlelit, not blue-grey graphite).
    for (const token of ['--surface-app', '--surface-sidebar', '--surface-panel', '--surface-editor'] as const) {
      const [red, , blue] = hexToRgb(getDeclaration(darkBody, token))
      expect(red, token).toBeGreaterThan(blue)
    }

    expect(getDeclaration(darkBody, '--surface-app')).toBe('#16130d')
    expect(getDeclaration(darkBody, '--surface-sidebar')).toBe('#120f09')
    expect(getDeclaration(darkBody, '--surface-panel')).toBe('#1d1810')
    expect(getDeclaration(darkBody, '--surface-editor')).toBe('#17130c')
    // The old cold-graphite fallback must not survive anywhere.
    expect(css).not.toContain('#101113')
  })

  it('uses antique brass as the fallback dark action tone', () => {
    for (const token of ['--accent-blue', '--accent-blue-hover', '--syntax-link'] as const) {
      const hue = hueDegrees(getDeclaration(darkBody, token))
      expect(hue >= 20 && hue <= 70, token).toBe(true)
    }

    expect(getDeclaration(darkBody, '--accent-blue')).toBe('#d6ab62')
    expect(getDeclaration(darkBody, '--syntax-link')).toBe('#d6ab62')
  })
})
