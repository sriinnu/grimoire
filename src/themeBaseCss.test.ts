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

function rgbChannelSpread(hex: string): number {
  const channels = hexToRgb(hex)
  return Math.max(...channels) - Math.min(...channels)
}

describe('base theme CSS', () => {
  const css = readText(`${process.cwd()}/src/theme-base.css`)
  const darkBody = getRuleBody(css, ':root.dark,\n[data-theme="dark"]')

  it('keeps the dark fallback shell graphite instead of sepia or green', () => {
    for (const token of ['--surface-app', '--surface-sidebar', '--surface-panel', '--surface-editor'] as const) {
      expect(rgbChannelSpread(getDeclaration(darkBody, token)), token).toBeLessThanOrEqual(8)
    }

    expect(getDeclaration(darkBody, '--surface-app')).toBe('#101113')
    expect(getDeclaration(darkBody, '--surface-sidebar')).toBe('#0d0e10')
    expect(getDeclaration(darkBody, '--surface-panel')).toBe('#151719')
    expect(getDeclaration(darkBody, '--surface-editor')).toBe('#121416')
    expect(css).not.toContain('--surface-sidebar: #191814')
  })

  it('uses blue-steel as the fallback dark action tone', () => {
    for (const token of ['--accent-blue', '--accent-blue-hover', '--syntax-link'] as const) {
      const hue = hueDegrees(getDeclaration(darkBody, token))
      expect(hue < 95 || hue > 185, token).toBe(true)
    }

    expect(getDeclaration(darkBody, '--accent-blue')).toBe('#86aee8')
    expect(getDeclaration(darkBody, '--syntax-link')).toBe('#a9c6f4')
  })
})
