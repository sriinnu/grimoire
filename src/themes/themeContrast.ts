type RgbColor = [number, number, number]

const DARK_FOREGROUND = '#061217'
const LIGHT_FOREGROUND = '#ffffff'

function parseHexColor(value: string): RgbColor | null {
  if (!/^#[0-9a-f]{6}$/iu.test(value)) return null
  return [0, 2, 4].map((index) => Number.parseInt(value.slice(index + 1, index + 3), 16) / 255) as RgbColor
}

function relativeLuminance(color: RgbColor): number {
  return color
    .map((channel) => (channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4))
    .reduce((sum, channel, index) => sum + channel * [0.2126, 0.7152, 0.0722][index], 0)
}

function contrastRatio(foreground: RgbColor, background: RgbColor): number {
  const fg = relativeLuminance(foreground)
  const bg = relativeLuminance(background)
  const lighter = Math.max(fg, bg)
  const darker = Math.min(fg, bg)
  return (lighter + 0.05) / (darker + 0.05)
}

/** Picks black-or-white ink for filled primary controls against a hex theme color. */
export function readablePrimaryForeground(primaryColor: string, fallback = LIGHT_FOREGROUND): string {
  const background = parseHexColor(primaryColor)
  if (!background) return fallback

  const darkRatio = contrastRatio(parseHexColor(DARK_FOREGROUND)!, background)
  const lightRatio = contrastRatio(parseHexColor(LIGHT_FOREGROUND)!, background)

  return darkRatio >= lightRatio ? DARK_FOREGROUND : LIGHT_FOREGROUND
}
