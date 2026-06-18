import { describe, expect, it } from 'vitest'
import {
  REQUIRED_THEME_TOKEN_KEYS,
  THEME_PRESET_CATALOG,
  type ThemeTokenMap,
  parseThemeDefinitionJson,
  resolveThemeDefinitionPreferredMode,
  resolveThemeDefinitionMode,
  serializeThemeDefinition,
} from './themeRegistry'
import { SUPPORTED_THEME_PRESETS } from './themePresetIds'

type RgbColor = [number, number, number]
type ContrastPair = {
  background: keyof ThemeTokenMap
  foreground: keyof ThemeTokenMap
  threshold: number
}

const CONTRAST_PAIRS = [
  { foreground: 'text.primary', background: 'surface.editor', threshold: 4.5 },
  { foreground: 'text.primary', background: 'surface.panel', threshold: 4.5 },
  { foreground: 'text.secondary', background: 'surface.panel', threshold: 4.5 },
  { foreground: 'text.heading', background: 'surface.editor', threshold: 4.5 },
  { foreground: 'syntax.heading', background: 'surface.editor', threshold: 4.5 },
  { foreground: 'syntax.link', background: 'surface.editor', threshold: 4.5 },
  { foreground: 'sidebar.foreground', background: 'surface.sidebar', threshold: 4.5 },
  { foreground: 'sidebar.primaryForeground', background: 'sidebar.primary', threshold: 4.5 },
] as const satisfies readonly ContrastPair[]

function parseHexColor(value: string): RgbColor | null {
  if (!/^#[0-9a-f]{6}$/iu.test(value)) return null
  return [0, 2, 4].map((index) => Number.parseInt(value.slice(index + 1, index + 3), 16) / 255) as RgbColor
}

function relativeLuminance(color: RgbColor): number {
  return color
    .map((channel) => (channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4))
    .reduce((sum, channel, index) => sum + channel * [0.2126, 0.7152, 0.0722][index], 0)
}

function contrastRatio(foreground: string, background: string): number | null {
  const fg = parseHexColor(foreground)
  const bg = parseHexColor(background)
  if (!fg || !bg) return null
  const lighter = Math.max(relativeLuminance(fg), relativeLuminance(bg))
  const darker = Math.min(relativeLuminance(fg), relativeLuminance(bg))
  return (lighter + 0.05) / (darker + 0.05)
}

function hueDegrees(color: RgbColor): number {
  const [red, green, blue] = color
  const max = Math.max(red, green, blue)
  const min = Math.min(red, green, blue)
  const delta = max - min

  if (delta === 0) return 0
  if (max === red) return ((green - blue) / delta + (green < blue ? 6 : 0)) * 60
  if (max === green) return ((blue - red) / delta + 2) * 60
  return ((red - green) / delta + 4) * 60
}

function expectNotGreenishAccent(value: string, label: string): void {
  const color = parseHexColor(value)
  expect(color, label).not.toBeNull()
  const hue = hueDegrees(color!)

  expect(hue < 95 || hue > 185, label).toBe(true)
}

function expectWarmDarkSurface(value: string, label: string): void {
  const color = parseHexColor(value)
  expect(color, label).not.toBeNull()
  const [red, green, blue] = color!.map((channel) => Math.round(channel * 255))

  // Warm candlelit parchment surfaces lean amber: red is the dominant channel
  // and blue never out-warms it. A blue-leaning value would be the old graphite.
  expect(
    red >= green && green >= blue,
    `${label} should lean warm amber, not cool graphite; rgb(${red}, ${green}, ${blue})`,
  ).toBe(true)
}

describe('theme registry', () => {
  it('loads plug-in preset metadata in the supported preset order', () => {
    expect(THEME_PRESET_CATALOG.map((preset) => preset.id)).toEqual([
      ...SUPPORTED_THEME_PRESETS,
    ])
  })

  it('ships only the single warm-paper theme in the settings catalog', () => {
    const presetIds = THEME_PRESET_CATALOG.map((preset) => preset.id)

    expect(presetIds).toEqual(['morning-notebook'])
    expect(presetIds).toContain('morning-notebook')
    // The multi-preset era is gone: none of the retired presets survive.
    expect(presetIds).not.toContain('constellation')
    expect(presetIds).not.toContain('daylight-notebook')
    expect(presetIds).not.toContain('living-archive')
    expect(presetIds).not.toContain('nocturne')
    expect(presetIds).not.toContain('code-notebook')
  })

  it('keeps every JSON preset self-contained for hot reload previews', () => {
    for (const preset of THEME_PRESET_CATALOG) {
      expect(preset.label.trim()).not.toBe('')
      expect(preset.description.trim()).not.toBe('')
      expect(preset.swatches).toHaveLength(3)
      expect(preset.schemaVersion).toBe(1)
      expect(preset.editor.maxWidth).toBeGreaterThanOrEqual(760)
      expect(['plain', 'notebook', 'terminal']).toContain(preset.editor.codeBlockStyle)
      expect(preset.sidebar.artwork).toBe('notebook-mark')
      expect(preset.metadataStrip.visibleFields.length).toBeGreaterThan(0)
      for (const role of ['ui', 'editor', 'mono', 'display', 'label'] as const) {
        expect(preset.typography[role], `${preset.id} ${role} typography`).toBeTruthy()
      }
      expect(['compact', 'comfortable', 'spacious']).toContain(preset.density.scale)
      expect(['calm', 'standard', 'expressive']).toContain(preset.motion.profile)
      expect(['constellation', 'ledger', 'terminal']).toContain(preset.visuals.graphStyle)
      expect(['paper', 'blueprint', 'terminal']).toContain(preset.visuals.canvasStyle)
      expect(preset.modes.light || preset.modes.dark).toBeDefined()
      expect(['light', 'dark']).toContain(preset.preferredMode)
      expect(preset.modes[preset.preferredMode], `${preset.id} preferred mode`).toBeDefined()

      for (const mode of [preset.modes.light, preset.modes.dark]) {
        if (!mode) continue
        for (const token of REQUIRED_THEME_TOKEN_KEYS) {
          expect(mode.tokens[token].trim()).not.toBe('')
        }
      }
    }
  })

  it('ships complete UX theme profiles instead of recolored copies', () => {
    const signatures = new Set<string>()

    for (const preset of THEME_PRESET_CATALOG) {
      signatures.add([
        preset.editor.headingStyle,
        preset.editor.codeBlockStyle,
        preset.metadataStrip.style,
        preset.density.scale,
        preset.motion.profile,
        preset.visuals.graphStyle,
        preset.visuals.canvasStyle,
      ].join('|'))
    }

    expect(signatures.size).toBe(THEME_PRESET_CATALOG.length)
  })

  it('uses each preset preferred mode as part of the UX theme contract', () => {
    const preferredModes = Object.fromEntries(
      THEME_PRESET_CATALOG.map((preset) => [preset.id, resolveThemeDefinitionPreferredMode(preset)]),
    )

    expect(preferredModes).toEqual({
      'morning-notebook': 'light',
    })
  })

  it('keeps dark visible theme accents out of the green teal hue band', () => {
    for (const preset of THEME_PRESET_CATALOG) {
      const dark = preset.modes.dark
      if (!dark) continue

      for (const token of ['accent.primary', 'sidebar.primary', 'syntax.link'] as const) {
        expectNotGreenishAccent(dark.tokens[token], `${preset.id}.dark.${token}`)
      }
    }
  })

  it('keeps dark theme surfaces warm candlelit amber instead of cool graphite', () => {
    const surfaceTokens = [
      'surface.app',
      'surface.sidebar',
      'surface.panel',
      'surface.card',
      'surface.popover',
      'surface.input',
      'surface.editor',
      'state.hover',
      'state.hoverSubtle',
      'state.selected',
    ] as const

    for (const preset of THEME_PRESET_CATALOG) {
      const dark = preset.modes.dark
      if (!dark) continue

      for (const token of surfaceTokens) {
        expectWarmDarkSurface(dark.tokens[token], `${preset.id}.dark.${token}`)
      }
    }
  })

  it('derives full semantic accent and text tokens for older theme JSON', () => {
    const legacy = JSON.parse(serializeThemeDefinition(THEME_PRESET_CATALOG[0])) as typeof THEME_PRESET_CATALOG[number]
    delete legacy.modes.dark!.tokens['accent.red']
    delete legacy.modes.dark!.tokens['accent.greenSoft']
    delete legacy.modes.dark!.tokens['text.faint']
    delete (legacy.editor as Partial<typeof legacy.editor>).codeBlockStyle
    delete (legacy as Partial<typeof legacy>).density
    delete (legacy as Partial<typeof legacy>).motion
    delete (legacy as Partial<typeof legacy>).visuals
    delete (legacy as Partial<typeof legacy>).preferredMode

    const parsed = parseThemeDefinitionJson(JSON.stringify(legacy))

    expect(parsed.ok).toBe(true)
    if (parsed.ok) {
      expect(parsed.definition.modes.dark!.tokens['accent.red']).toBe('var(--accent-orange)')
      expect(parsed.definition.modes.dark!.tokens['accent.green']).toBe('var(--accent-blue)')
      expect(parsed.definition.modes.dark!.tokens['accent.greenSoft']).toContain('var(--accent-green)')
      expect(parsed.definition.modes.dark!.tokens['text.faint']).toContain('var(--text-secondary)')
      expect(parsed.definition.editor.codeBlockStyle).toBe('notebook')
      expect(parsed.definition.density.scale).toBe('comfortable')
      expect(parsed.definition.motion.profile).toBe('standard')
      expect(parsed.definition.visuals.graphStyle).toBe('constellation')
      expect(parsed.definition.visuals.canvasStyle).toBe('paper')
      // Warm Paper keeps both modes, so the research-family fallback prefers light.
      expect(parsed.definition.preferredMode).toBe('light')
    }
  })

  it('keeps built-in readable surfaces above contrast floors', () => {
    for (const preset of THEME_PRESET_CATALOG) {
      for (const modeName of ['light', 'dark'] as const) {
        const mode = preset.modes[modeName]
        if (!mode) continue

        for (const pair of CONTRAST_PAIRS) {
          const ratio = contrastRatio(mode.tokens[pair.foreground], mode.tokens[pair.background])
          expect(ratio, `${preset.id}.${modeName}: ${pair.foreground} on ${pair.background}`).not.toBeNull()
          expect(ratio!).toBeGreaterThanOrEqual(pair.threshold)
        }
      }
    }
  })

  it('imports and exports validated theme JSON for plug-and-play settings', () => {
    const exported = serializeThemeDefinition(THEME_PRESET_CATALOG[0])
    const parsed = parseThemeDefinitionJson(exported)

    expect(parsed.ok).toBe(true)
    if (parsed.ok) {
      expect(parsed.definition.id).toBe(THEME_PRESET_CATALOG[0].id)
      // Warm Paper carries both modes, so a requested mode resolves to itself.
      expect(resolveThemeDefinitionMode(parsed.definition, 'light')).toBe('light')
      expect(resolveThemeDefinitionMode(parsed.definition, 'dark')).toBe('dark')
    }
  })

  it('imports local theme typography roles for header body label and mono stacks', () => {
    const themed = JSON.parse(serializeThemeDefinition(THEME_PRESET_CATALOG[0])) as typeof THEME_PRESET_CATALOG[number]
    themed.typography = {
      display: "'Grimoire Display Test', serif",
      editor: "'Grimoire Body Test', system-ui, sans-serif",
      label: "'Grimoire Label Test', sans-serif",
      mono: "'Grimoire Mono Test', ui-monospace, monospace",
    }

    const parsed = parseThemeDefinitionJson(JSON.stringify(themed))

    expect(parsed.ok).toBe(true)
    if (parsed.ok) {
      expect(parsed.definition.typography.display).toContain('Grimoire Display Test')
      expect(parsed.definition.typography.editor).toContain('Grimoire Body Test')
      expect(parsed.definition.typography.label).toContain('Grimoire Label Test')
      expect(parsed.definition.typography.mono).toContain('Grimoire Mono Test')
    }
  })

  it('imports local theme density and motion as full-system controls', () => {
    const themed = JSON.parse(serializeThemeDefinition(THEME_PRESET_CATALOG[0])) as typeof THEME_PRESET_CATALOG[number]
    themed.editor.codeBlockStyle = 'terminal'
    themed.density = { scale: 'spacious' }
    themed.motion = { profile: 'calm' }
    themed.visuals = { graphStyle: 'terminal', canvasStyle: 'blueprint' }

    const parsed = parseThemeDefinitionJson(JSON.stringify(themed))

    expect(parsed.ok).toBe(true)
    if (parsed.ok) {
      expect(parsed.definition.editor.codeBlockStyle).toBe('terminal')
      expect(parsed.definition.density.scale).toBe('spacious')
      expect(parsed.definition.motion.profile).toBe('calm')
      expect(parsed.definition.visuals.graphStyle).toBe('terminal')
      expect(parsed.definition.visuals.canvasStyle).toBe('blueprint')
    }
  })

  it('fails closed when imported theme JSON contains unsafe CSS values', () => {
    const unsafe = JSON.parse(serializeThemeDefinition(THEME_PRESET_CATALOG[0])) as typeof THEME_PRESET_CATALOG[number]
    unsafe.id = 'unsafe.theme'
    unsafe.modes.dark!.tokens['surface.app'] = 'url(https://example.com/track.png)'

    const parsed = parseThemeDefinitionJson(JSON.stringify(unsafe))

    expect(parsed.ok).toBe(false)
    if (!parsed.ok) {
      expect(parsed.errors.join('\n')).toContain('surface.app')
    }
  })

  it('fails closed when imported theme typography contains unsafe CSS values', () => {
    const unsafe = JSON.parse(serializeThemeDefinition(THEME_PRESET_CATALOG[0])) as typeof THEME_PRESET_CATALOG[number]
    unsafe.typography = { editor: 'url(https://example.com/font.woff2)' }

    const parsed = parseThemeDefinitionJson(JSON.stringify(unsafe))

    expect(parsed.ok).toBe(false)
    if (!parsed.ok) {
      expect(parsed.errors.join('\n')).toContain('typography.editor')
    }
  })

  it('fails closed when imported theme density or motion is unsupported', () => {
    const unsafe = JSON.parse(serializeThemeDefinition(THEME_PRESET_CATALOG[0])) as typeof THEME_PRESET_CATALOG[number]
    unsafe.editor.codeBlockStyle = 'cardboard' as typeof unsafe.editor.codeBlockStyle
    unsafe.density = { scale: 'tiny' as typeof unsafe.density.scale }
    unsafe.motion = { profile: 'explosive' as typeof unsafe.motion.profile }
    unsafe.visuals = {
      graphStyle: 'neon-web' as typeof unsafe.visuals.graphStyle,
      canvasStyle: 'glass-grid' as typeof unsafe.visuals.canvasStyle,
    }

    const parsed = parseThemeDefinitionJson(JSON.stringify(unsafe))

    expect(parsed.ok).toBe(false)
    if (!parsed.ok) {
      expect(parsed.errors.join('\n')).toContain('editor.codeBlockStyle')
      expect(parsed.errors.join('\n')).toContain('density.scale')
      expect(parsed.errors.join('\n')).toContain('motion.profile')
      expect(parsed.errors.join('\n')).toContain('visuals.graphStyle')
      expect(parsed.errors.join('\n')).toContain('visuals.canvasStyle')
    }
  })

  it('fails closed when imported theme preferred mode is impossible', () => {
    const unsafe = JSON.parse(serializeThemeDefinition(THEME_PRESET_CATALOG[0])) as typeof THEME_PRESET_CATALOG[number]
    // Strip the light mode but keep pointing the preferred mode at it: impossible.
    delete unsafe.modes.light
    unsafe.preferredMode = 'light'

    const parsed = parseThemeDefinitionJson(JSON.stringify(unsafe))

    expect(parsed.ok).toBe(false)
    if (!parsed.ok) {
      expect(parsed.errors.join('\n')).toContain('theme.preferredMode "light"')
    }
  })
})
