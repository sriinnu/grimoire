import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

describe('native shell material CSS', () => {
  const systemThemesCss = readFileSync(`${process.cwd()}/src/system-themes.css`, 'utf8')
  const css = readFileSync(`${process.cwd()}/src/native-shell-material.css`, 'utf8')

  function getRuleBody(selector: string): string {
    const ruleStart = css.indexOf(`${selector} {`)
    expect(ruleStart).toBeGreaterThanOrEqual(0)
    const bodyStart = css.indexOf('{', ruleStart)
    const bodyEnd = css.indexOf('}', bodyStart)
    return css.slice(bodyStart + 1, bodyEnd)
  }

  it('loads after theme surface coherence and before accessibility overrides', () => {
    const surfaceIndex = systemThemesCss.indexOf("@import './theme-surface-coherence.css';")
    const materialIndex = systemThemesCss.indexOf("@import './native-shell-material.css';")
    const accessibilityIndex = systemThemesCss.indexOf("@import './theme-accessibility.css';")
    expect(surfaceIndex).toBeGreaterThanOrEqual(0)
    expect(materialIndex).toBeGreaterThanOrEqual(0)
    expect(accessibilityIndex).toBeGreaterThanOrEqual(0)
    expect(surfaceIndex).toBeLessThan(materialIndex)
    expect(materialIndex).toBeLessThan(accessibilityIndex)
  })

  it('offers conservative, unified, and glass-preview shell materials without private transparency', () => {
    expect(css).toContain(':root[data-native-shell-material="standard"]')
    expect(css).toContain(':root[data-native-shell-material="unified"]')
    expect(css).toContain(':root[data-native-shell-material="glass-preview"]')
    expect(css).toContain('--grimoire-native-titlebar-material')
    expect(css).toContain('--grimoire-native-sidebar-material')
    expect(css).toContain('body.macos-overlay-chrome .app-shell::before')
    expect(css).toContain('body.windows-chrome .app-shell::before')
    expect(css).toContain(':root:not([data-native-shell-material="standard"])[data-native-shell-material] body.macos-overlay-chrome')
    expect(css).toContain(':root:not([data-native-shell-material="standard"])[data-native-shell-material] body.windows-chrome')
    expect(css).toContain(':is(.app-sidebar-panel, .app-sidebar-rail, .sidebar-title-bar)')
    expect(css).toMatch(/:root:not\(\[data-native-shell-material="standard"\]\)\[data-native-shell-material\]\s+body\.macos-overlay-chrome\s+:is\(\.app-sidebar-panel, \.app-sidebar-rail, \.sidebar-title-bar\)/)
    expect(css).toMatch(/:root:not\(\[data-native-shell-material="standard"\]\)\[data-native-shell-material\]\s+body\.windows-chrome\s+:is\(\.app-sidebar-panel, \.app-sidebar-rail, \.sidebar-title-bar\)/)
    expect(css).not.toContain(':root[data-native-shell-material] body.macos-overlay-chrome :is(.app-sidebar-rail, .sidebar-title-bar)')
    expect(css).not.toMatch(/private|setVibrancy|transparent-titlebar/iu)
  })

  it('keeps dark native chrome navy instead of washing the shell with the accent color', () => {
    expect(css).toContain(':root[data-theme="dark"][data-native-shell-material="unified"]')
    expect(css).toContain(':root[data-theme="dark"][data-native-shell-material="glass-preview"]')
    expect(css).toContain('--grimoire-native-shell-sheen: color-mix(in srgb, var(--text-secondary) 7%, transparent)')
    expect(css).not.toContain('var(--sidebar-primary) 18%')
    expect(css).not.toContain('var(--sidebar-primary) 28%')
  })

  it('keeps light content titlebars separate from navy sidebar material', () => {
    const unified = getRuleBody(':root[data-native-shell-material="unified"]')
    const glassPreview = getRuleBody(':root[data-native-shell-material="glass-preview"]')
    const darkOverride = getRuleBody(':root[data-theme="dark"][data-native-shell-material="unified"],\n:root[data-theme="dark"][data-native-shell-material="glass-preview"]')

    expect(unified).toContain('--grimoire-native-titlebar-material')
    expect(unified).toContain('var(--surface-panel)')
    expect(unified).toContain('var(--surface-app)')
    expect(unified.match(/--grimoire-native-titlebar-material:[\s\S]*?;/u)?.[0]).not.toContain('var(--surface-sidebar)')

    expect(glassPreview).toContain('--grimoire-native-titlebar-material')
    expect(glassPreview).toContain('var(--surface-panel)')
    expect(glassPreview).toContain('var(--surface-app)')
    expect(glassPreview.match(/--grimoire-native-titlebar-material:[\s\S]*?;/u)?.[0]).not.toContain('var(--surface-sidebar)')

    expect(darkOverride.match(/--grimoire-native-titlebar-material:[\s\S]*?;/u)?.[0]).toContain('#10161d')
  })
})
