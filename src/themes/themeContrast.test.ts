import { describe, expect, it } from 'vitest'
import { readablePrimaryForeground } from './themeContrast'
import { THEME_PRESET_CATALOG } from './themeRegistry'

type RgbColor = [number, number, number]

function parseHexColor(value: string): RgbColor {
  return [0, 2, 4].map((index) => Number.parseInt(value.slice(index + 1, index + 3), 16) / 255) as RgbColor
}

function relativeLuminance(color: RgbColor): number {
  return color
    .map((channel) => (channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4))
    .reduce((sum, channel, index) => sum + channel * [0.2126, 0.7152, 0.0722][index], 0)
}

function contrastRatio(foreground: string, background: string): number {
  const fg = relativeLuminance(parseHexColor(foreground))
  const bg = relativeLuminance(parseHexColor(background))
  const lighter = Math.max(fg, bg)
  const darker = Math.min(fg, bg)
  return (lighter + 0.05) / (darker + 0.05)
}

describe('theme contrast helpers', () => {
  it('keeps filled primary controls above contrast floors for built-in presets', () => {
    for (const preset of THEME_PRESET_CATALOG) {
      for (const modeName of ['light', 'dark'] as const) {
        const mode = preset.modes[modeName]
        if (!mode) continue
        const foreground = readablePrimaryForeground(mode.tokens['accent.primary'])

        expect(
          contrastRatio(foreground, mode.tokens['accent.primary']),
          `${preset.id}.${modeName} primary foreground`,
        ).toBeGreaterThanOrEqual(4.5)
      }
    }
  })

  it('keeps dashboard badge and selected chip role colors readable at small sizes', () => {
    const dashboardPairs = [
      ['local badge', '#285E54', '#EAF3F0'],
      ['private badge', '#284F73', '#EDF4FA'],
      ['pending badge', '#6F4D1B', '#FFF1D6'],
      ['selected chip', '#24597F', '#E6EEF7'],
    ] as const

    for (const [label, foreground, background] of dashboardPairs) {
      expect(contrastRatio(foreground, background), label).toBeGreaterThanOrEqual(4.5)
    }
  })
})
