import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

describe('sidebar appearance CSS', () => {
  const readText = (path: string): string => readFileSync(path, 'utf8').replace(/\r\n?/gu, '\n')
  const brandCss = readText(`${process.cwd()}/src/sidebar-brand.css`)

  it('sets readable sidebar text tokens for dark-sidebar light themes', () => {
    const css = readText(`${process.cwd()}/src/sidebar-appearance.css`)

    expect(css).toContain('[data-theme="dark"] .app-sidebar-panel')
    expect(css).toContain('[data-theme-preset="retro-terminal"] .app-sidebar-panel')
    expect(css).toContain('[data-theme-preset="retro-terminal"] .app-sidebar-panel .text-primary')
    expect(css).toContain('--foreground: var(--sidebar-foreground)')
    expect(css).toContain('[data-theme="dark"] .app-sidebar-panel .text-primary')
    expect(css).toContain('color: var(--sidebar-foreground)')
    expect(css).toContain('--muted-foreground: color-mix(in srgb, var(--sidebar-foreground) 68%, transparent)')
  })

  it('enables the ambient brand sigil for narrative presets', () => {
    const css = readText(`${process.cwd()}/src/sidebar-appearance.css`)

    expect(css).toContain('.sidebar-artwork')
    expect(css).toContain('[data-sidebar-artwork]:not([data-sidebar-artwork="none"]) .app-sidebar-panel .sidebar-artwork')
    expect(css).toContain('[data-sidebar-artwork-preview]:not([data-sidebar-artwork-preview="none"]) .sidebar-artwork')
    expect(css).toContain('[data-sidebar-artwork]:not([data-sidebar-artwork="none"]) .app-sidebar-panel .sidebar-artwork__glyph--sigil')
    expect(css).toContain('[data-sidebar-artwork-preview]:not([data-sidebar-artwork-preview="none"]) .sidebar-artwork__glyph--sigil')
  })

  it('places live sidebar artwork behind navigation while previews stay inline', () => {
    const css = readText(`${process.cwd()}/src/sidebar-appearance.css`)

    expect(css).toContain('.app-sidebar-panel {\n  position: relative;')
    expect(css).toContain('.sidebar-title-bar,\n.app-sidebar-nav')
    expect(css).toContain('position: absolute')
    expect(css).toContain('pointer-events: none')
    expect(css).toContain('contain: layout paint')
    expect(css).toContain('.sidebar-artwork--compact')
    expect(css).toContain('position: relative')
  })

  it('gives top navigation icons theme-aware color chips without recoloring labels', () => {
    const css = readText(`${process.cwd()}/src/sidebar-appearance.css`)

    expect(css).toContain('.sidebar-top-nav__tone')
    expect(css).toContain('.sidebar-rail__tone')
    expect(css).toContain('[data-sidebar-nav-tone="aura"]')
    expect(css).toContain('[data-sidebar-rail-tone="aura"]')
    expect(css).toContain('[data-sidebar-nav-tone="amber"]')
    expect(css).toContain('[data-sidebar-nav-tone="blue"]')
    expect(css).toContain('[data-sidebar-nav-tone="violet"]')
    expect(css).toContain('.sidebar-top-nav__tone .sidebar-nav-glyph')
    expect(css).toContain('.sidebar-top-nav__tone .sidebar-nav-glyph::before')
    expect(css).toContain('.sidebar-top-nav__tone .sidebar-nav-glyph > svg')
    expect(css).toContain('.sidebar-rail__tone .sidebar-rail__glyph')
    expect(css).toContain('.sidebar-rail__tone .sidebar-rail__glyph::before')
    expect(css).toContain('.sidebar-rail__tone .sidebar-rail__glyph > svg')
    expect(brandCss).toContain('.app-sidebar-rail__mark::before')
    expect(css).toContain('--sidebar-nav-tone-hot')
    expect(css).toContain('--sidebar-nav-tone-ink')
    expect(css).toContain('--sidebar-nav-tone-shadow')
    expect(css).toContain('conic-gradient')
    expect(css).toContain('drop-shadow')
    expect(css).toContain('.sidebar-top-nav__tone[data-active="true"]::before')
    expect(css).toContain('.sidebar-top-nav__tone:not([data-active="true"]):hover .sidebar-nav-glyph')
    expect(css).toContain('.sidebar-rail__tone:not([data-active="true"]):hover .sidebar-rail__glyph')
  })

  it('frames dynamic section icons as theme-tonal glyph medallions', () => {
    const css = readText(`${process.cwd()}/src/sidebar-appearance.css`)

    expect(css).toContain('.sidebar-section-glyph')
    expect(css).toContain('--sidebar-section-tone: var(--sidebar-primary)')
    expect(css).toContain('--sidebar-section-ink')
    expect(css).toContain('.sidebar-section-glyph::before')
    expect(css).toContain('.sidebar-section-glyph::after')
    expect(css).toContain('.sidebar-section-glyph[data-active="true"]')
    expect(css).toContain('.sidebar-section-glyph__icon')
  })

  it('treats the sidebar brand as a dedicated wordmark instead of plain UI text', () => {
    const baseCss = readText(`${process.cwd()}/src/theme-base.css`)

    expect(baseCss).toContain('--grimoire-wordmark-font-family')
    expect(baseCss).toContain("'New York', 'Iowan Old Style', Palatino")
    expect(brandCss).toContain('.sidebar-brand-wordmark')
    expect(brandCss).toContain('font-family: var(--grimoire-wordmark-font-family)')
    expect(brandCss).toContain('font-style: italic')
    expect(brandCss).toContain('font-feature-settings: "kern" 1, "liga" 1, "dlig" 1, "swsh" 1')
    expect(brandCss).toContain('.sidebar-brand-wordmark::first-letter')
  })

  it('keeps short-height sidebar artwork compact instead of removing the glyph layer', () => {
    const css = readText(`${process.cwd()}/src/sidebar-appearance.css`)

    expect(css).toContain('@media (max-height: 760px)')
    expect(css).toContain('[data-sidebar-artwork]:not([data-sidebar-artwork="none"]) .app-sidebar-panel > .sidebar-artwork')
    expect(css).toContain('height: 86px')
    expect(css).not.toContain('.app-sidebar-panel > .sidebar-artwork {\n    display: none;')
  })
})
