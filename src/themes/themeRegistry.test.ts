import { describe, expect, it } from 'vitest'
import {
  REQUIRED_THEME_TOKEN_KEYS,
  THEME_PRESET_CATALOG,
  type ThemeTokenMap,
  parseThemeDefinitionJson,
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

describe('theme registry', () => {
  it('loads plug-in preset metadata in the supported preset order', () => {
    expect(THEME_PRESET_CATALOG.map((preset) => preset.id)).toEqual([
      ...SUPPORTED_THEME_PRESETS,
    ])
  })

  it('ships only Grimoire-native themes in the settings catalog', () => {
    const presetIds = THEME_PRESET_CATALOG.map((preset) => preset.id)

    expect(presetIds).toContain('retro-terminal')
    expect(presetIds).not.toContain('classic')
    expect(presetIds).not.toContain('aether')
    expect(presetIds).not.toContain('ion')
    expect(presetIds).not.toContain('moss')
  })

  it('keeps every JSON preset self-contained for hot reload previews', () => {
    for (const preset of THEME_PRESET_CATALOG) {
      expect(preset.label.trim()).not.toBe('')
      expect(preset.description.trim()).not.toBe('')
      expect(preset.swatches).toHaveLength(3)
      expect(preset.schemaVersion).toBe(1)
      expect(preset.editor.maxWidth).toBeGreaterThanOrEqual(760)
      expect(['plain', 'notebook', 'terminal']).toContain(preset.editor.codeBlockStyle)
      expect(preset.sidebar.artwork).toBe('grimoire-sigil')
      expect(preset.metadataStrip.visibleFields.length).toBeGreaterThan(0)
      for (const role of ['ui', 'editor', 'mono', 'display', 'label'] as const) {
        expect(preset.typography[role], `${preset.id} ${role} typography`).toBeTruthy()
      }
      expect(['compact', 'comfortable', 'spacious']).toContain(preset.density.scale)
      expect(['calm', 'standard', 'expressive']).toContain(preset.motion.profile)
      expect(['constellation', 'ledger', 'terminal']).toContain(preset.visuals.graphStyle)
      expect(['paper', 'blueprint', 'terminal']).toContain(preset.visuals.canvasStyle)
      expect(preset.modes.light || preset.modes.dark).toBeDefined()

      for (const mode of [preset.modes.light, preset.modes.dark]) {
        if (!mode) continue
        for (const token of REQUIRED_THEME_TOKEN_KEYS) {
          expect(mode.tokens[token].trim()).not.toBe('')
        }
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

    const parsed = parseThemeDefinitionJson(JSON.stringify(legacy))

    expect(parsed.ok).toBe(true)
    if (parsed.ok) {
      expect(parsed.definition.modes.dark!.tokens['accent.red']).toBe('var(--accent-orange)')
      expect(parsed.definition.modes.dark!.tokens['accent.greenSoft']).toContain('var(--accent-green)')
      expect(parsed.definition.modes.dark!.tokens['text.faint']).toContain('var(--text-secondary)')
      expect(parsed.definition.editor.codeBlockStyle).toBe('notebook')
      expect(parsed.definition.density.scale).toBe('comfortable')
      expect(parsed.definition.motion.profile).toBe('standard')
      expect(parsed.definition.visuals.graphStyle).toBe('constellation')
      expect(parsed.definition.visuals.canvasStyle).toBe('paper')
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
      expect(resolveThemeDefinitionMode(parsed.definition, 'light')).toBe('dark')
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
})
