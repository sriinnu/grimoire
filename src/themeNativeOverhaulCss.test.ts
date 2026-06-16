import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { resolveThemePresetDefinition } from './themes/themeRegistry'
import { SUPPORTED_THEME_PRESETS } from './themes/themePresetIds'

function readText(path: string): string {
  return readFileSync(path, 'utf8').replace(/\r\n?/gu, '\n')
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

function getRuleBody(source: string, selector: string): string {
  const ruleStart = source.indexOf(`${selector} {`)
  expect(ruleStart).toBeGreaterThanOrEqual(0)
  const bodyStart = source.indexOf('{', ruleStart)
  const bodyEnd = source.indexOf('}', bodyStart)
  return source.slice(bodyStart + 1, bodyEnd)
}

describe('native theme overhaul CSS', () => {
  const systemThemesCss = readText(`${process.cwd()}/src/system-themes.css`)
  const css = readText(`${process.cwd()}/src/theme-native-overhaul.css`)
  const mediaCss = readText(`${process.cwd()}/src/theme-native-media.css`)
  const nativeUxCss = `${css}\n${mediaCss}`
  const editorCanvasCss = readText(`${process.cwd()}/src/theme-editor-canvas.css`)

  it('loads after native material and before accessibility overrides', () => {
    expect(systemThemesCss.indexOf("@import './native-shell-material.css';")).toBeLessThan(
      systemThemesCss.indexOf("@import './theme-native-overhaul.css';"),
    )
    expect(systemThemesCss.indexOf("@import './theme-native-overhaul.css';")).toBeLessThan(
      systemThemesCss.indexOf("@import './theme-native-media.css';"),
    )
    expect(systemThemesCss.indexOf("@import './theme-native-media.css';")).toBeLessThan(
      systemThemesCss.indexOf("@import './theme-accessibility.css';"),
    )
  })

  it('defines the native shell as complete UX surfaces, not only color tokens', () => {
    for (const selector of [
      '.app-shell',
      '.app__dashboard',
      '.editor',
      '.app-sidebar-panel',
      '[data-testid="sidebar-search-input"]',
      '.sidebar-nav-glyph__icon',
      '.sidebar-top-nav__tone[data-active="true"]',
      '.grimoire-context-menu-surface',
      '[data-testid="graph-agent-handoff"]',
      '.vault-image-preview-shell',
      '[data-testid="vault-image-stage"]',
      '.vault-image-preview-caption__chip',
      '.inspector-header__brand-icon',
      '.inspector-header__title',
      '[data-testid="create-vault-action-footer"]',
      '[data-testid="create-vault-submit"]',
      '.second-brain-panel__ask',
    ]) {
      expect(nativeUxCss).toContain(selector)
    }

    expect(css).toContain('--grimoire-native-frame-material')
    expect(css).toContain('--grimoire-native-sidebar-material')
    expect(css).toContain('--grimoire-native-editor-material')
    expect(css).toContain('--grimoire-native-menu-shadow')
    expect(getRuleBody(css, ':where([data-theme-preset]) .grimoire-context-menu-surface')).toContain(
      'backdrop-filter: none !important',
    )
    expect(getRuleBody(css, ':where([data-theme-preset]) :is(.editor, .editor-scroll-area)')).toContain(
      'var(--grimoire-native-editor-material)',
    )
    expect(getRuleBody(editorCanvasCss, ':is([data-theme-preset]) :is(.editor, .editor-scroll-area)')).toContain(
      'var(--grimoire-native-editor-material, var(--grimoire-editor-material))',
    )
    expect(getRuleBody(css, ':where([data-theme-preset]) [data-testid="sidebar-search-input"]')).toContain(
      'var(--sidebar-foreground)',
    )
    expect(getRuleBody(css, ':where([data-theme-preset]) :is(.sidebar-top-nav__tone .sidebar-nav-glyph, .sidebar-rail__tone .sidebar-rail__glyph, .sidebar-section-glyph)')).toContain(
      'background: transparent',
    )
    expect(getRuleBody(css, ':where([data-theme-preset]) :is(.sidebar-top-nav__tone .sidebar-nav-glyph__icon, .sidebar-rail__tone .sidebar-rail__glyph > svg, .sidebar-section-glyph__icon)')).toContain(
      'opacity: 1',
    )
    expect(getRuleBody(css, ':where([data-theme-preset]) .inspector-panel .constellation-insights')).toContain(
      'var(--text-primary)',
    )
    expect(getRuleBody(css, ':where([data-theme-preset]) .inspector-header__brand-icon')).toContain(
      'var(--primary)',
    )
    expect(getRuleBody(css, ':where([data-theme-preset]) .inspector-header__title')).toContain(
      'var(--text-heading)',
    )
  })

  it('gives every built-in preset its own complete native UX material profile', () => {
    const requiredMaterialTokens = [
      '--grimoire-native-frame-material',
      '--grimoire-native-sidebar-material',
      '--grimoire-native-toolbar-material',
      '--grimoire-native-card-material',
      '--grimoire-native-card-shadow',
      '--grimoire-native-editor-material',
      '--grimoire-native-menu-shadow',
      '--grimoire-native-image-stage-material',
    ]
    const frameBodies = new Set<string>()

    for (const preset of SUPPORTED_THEME_PRESETS) {
      const body = getRuleBody(css, `:root[data-theme-preset="${preset}"]:not([data-native-shell-material="standard"])[data-native-shell-material]`)
      for (const token of requiredMaterialTokens) {
        expect(body, `${preset} should define ${token}`).toContain(token)
      }
      frameBodies.add(body.match(/--grimoire-native-frame-material:[\s\S]*?;/u)?.[0] ?? '')
    }

    expect(frameBodies.size).toBe(SUPPORTED_THEME_PRESETS.length)
    expect(getRuleBody(mediaCss, ':where([data-theme-preset]) [data-testid="vault-image-stage"]')).toContain(
      'var(--grimoire-native-image-stage-material)',
    )
    expect(getRuleBody(mediaCss, ':where([data-theme-preset]) [data-testid="vault-image-preview"]')).toContain(
      'var(--shadow-elevated, black)',
    )
    expect(getRuleBody(mediaCss, ':where([data-theme-preset]) .vault-image-preview-caption__chip')).toContain(
      'var(--surface-card)',
    )
  })

  it('keeps Nocturne dark graphite with blue-steel accents instead of green or navy wash', () => {
    const nocturne = resolveThemePresetDefinition('nocturne')
    const dark = nocturne.modes.dark?.tokens
    expect(dark).toBeDefined()

    expect(dark!['surface.app']).toBe('#101113')
    expect(dark!['surface.sidebar']).toBe('#0d0e10')
    expect(dark!['surface.panel']).toBe('#151719')
    expect(dark!['accent.primary']).toBe('#86aee8')
    expect(systemThemesCss).toContain('--primary: #86aee8')

    for (const token of ['accent.primary', 'sidebar.primary', 'syntax.link'] as const) {
      const hue = hueDegrees(dark![token])
      expect(hue < 95 || hue > 185, token).toBe(true)
    }

    for (const token of ['surface.app', 'surface.sidebar', 'surface.panel', 'surface.editor'] as const) {
      expect(rgbChannelSpread(dark![token]), `${token} should stay neutral graphite`).toBeLessThanOrEqual(8)
    }
  })
})
