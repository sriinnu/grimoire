import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

describe('sidebar appearance CSS', () => {
  it('sets readable sidebar text tokens for retro light and dark themes', () => {
    const css = readFileSync(`${process.cwd()}/src/sidebar-appearance.css`, 'utf8')

    expect(css).toContain('[data-theme="dark"] .app-sidebar-panel')
    expect(css).toContain('[data-theme-preset="retro"][data-theme="light"] .app-sidebar-panel')
    expect(css).toContain('--sidebar-foreground: #F6EAC5')
    expect(css).toContain('[data-theme="dark"] .app-sidebar-panel .text-primary')
    expect(css).toContain('color: var(--sidebar-foreground)')
    expect(css).toContain('--muted-foreground: color-mix(in srgb, var(--sidebar-foreground) 68%, transparent)')
  })

  it('enables screenshot-inspired sidebar artwork for narrative presets', () => {
    const css = readFileSync(`${process.cwd()}/src/sidebar-appearance.css`, 'utf8')

    expect(css).toContain('.sidebar-artwork')
    expect(css).toContain('.sidebar-rosy')
    expect(css).toContain('[data-theme-preset="manuscript"] .app-sidebar-panel .sidebar-artwork')
    expect(css).toContain('[data-theme-preview="light"][data-sidebar-preset-preview="folio"] .sidebar-artwork__image--light')
  })

  it('places live sidebar artwork behind navigation while previews stay inline', () => {
    const css = readFileSync(`${process.cwd()}/src/sidebar-appearance.css`, 'utf8')

    expect(css).toContain('.app-sidebar-panel {\n  position: relative;')
    expect(css).toContain('.sidebar-title-bar,\n.app-sidebar-nav')
    expect(css).toContain('position: absolute')
    expect(css).toContain('pointer-events: none')
    expect(css).toContain('.sidebar-artwork--compact')
    expect(css).toContain('position: relative')
  })
})
