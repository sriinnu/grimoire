import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

describe('native shell material CSS', () => {
  const systemThemesCss = readFileSync(`${process.cwd()}/src/system-themes.css`, 'utf8')
  const css = readFileSync(`${process.cwd()}/src/native-shell-material.css`, 'utf8')

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
    expect(css).toContain(':root:not([data-native-shell-material="standard"])[data-native-shell-material] body.macos-overlay-chrome')
    expect(css).toContain(':is(.app-sidebar-panel, .app-sidebar-rail, .sidebar-title-bar)')
    expect(css).toMatch(/:root:not\(\[data-native-shell-material="standard"\]\)\[data-native-shell-material\]\s+body\.macos-overlay-chrome\s+:is\(\.app-sidebar-panel, \.app-sidebar-rail, \.sidebar-title-bar\)/)
    expect(css).not.toContain(':root[data-native-shell-material] body.macos-overlay-chrome :is(.app-sidebar-rail, .sidebar-title-bar)')
    expect(css).not.toMatch(/private|setVibrancy|transparent-titlebar/iu)
  })
})
