import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

describe('sidebar appearance CSS', () => {
  const readText = (path: string): string => readFileSync(path, 'utf8').replace(/\r\n?/gu, '\n')
  const brandCss = readText(`${process.cwd()}/src/sidebar-brand.css`)

  it('sets readable sidebar text tokens for dark-sidebar light themes', () => {
    const css = readText(`${process.cwd()}/src/sidebar-appearance.css`)

    expect(css).toContain('[data-theme="dark"] .app-sidebar-panel')
    expect(css).toContain('[data-theme-preset="code-notebook"] .app-sidebar-panel')
    expect(css).toContain('[data-theme-preset="code-notebook"] .app-sidebar-panel .text-primary')
    expect(css).toContain('--foreground: var(--sidebar-foreground)')
    expect(css).toContain('[data-theme="dark"] .app-sidebar-panel .text-primary')
    expect(css).toContain('color: var(--sidebar-foreground)')
    expect(css).toContain('--muted-foreground: color-mix(in srgb, var(--sidebar-foreground) 68%, transparent)')
  })

  it('keeps the ambient notebook mark preview-only', () => {
    const css = readText(`${process.cwd()}/src/sidebar-appearance.css`)

    expect(css).toContain('.sidebar-artwork')
    expect(css).toContain('[data-sidebar-artwork-preview]:not([data-sidebar-artwork-preview="none"]) .sidebar-artwork')
    expect(css).toContain('[data-sidebar-artwork-preview]:not([data-sidebar-artwork-preview="none"]) .sidebar-artwork__glyph--notebook-mark')
    expect(css).not.toContain('[data-sidebar-artwork]:not([data-sidebar-artwork="none"]) .app-sidebar-panel .sidebar-artwork')
    expect(css).not.toContain('[data-sidebar-artwork]:not([data-sidebar-artwork="none"]) .app-sidebar-panel .sidebar-artwork__glyph--notebook-mark')
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

  it('gives top navigation icons restrained theme-aware utility marks without recoloring labels', () => {
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
    expect(brandCss).toContain('.sidebar-brand-notebook-mark')
    expect(brandCss).toContain('.sidebar-brand-notebook-mark__page')
    expect(brandCss).not.toContain('.sidebar-brand-mark > img')
    expect(css).toContain('--sidebar-nav-quiet-ink')
    expect(css).toContain('--sidebar-nav-quiet-ink: color-mix(in srgb, var(--sidebar-foreground) 100%, var(--sidebar-nav-tone))')
    expect(css).toContain('--sidebar-nav-paper')
    expect(css).toContain('--sidebar-nav-paper-line')
    expect(css).toContain('border: 1px solid transparent')
    expect(css).toContain('background: transparent')
    expect(css).toContain('background: var(--sidebar-nav-paper)')
    expect(css).toContain('--sidebar-nav-tone-ink')
    expect(css).toContain('.sidebar-top-nav__tone > :is(button, div)')
    expect(css).toContain('.sidebar-top-nav__tone[data-active="true"] > :is(button, div)')
    expect(css).toContain('height: 28px')
    expect(css).not.toContain('--sidebar-nav-tone-hot')
    expect(css).not.toContain('--sidebar-nav-tone-shadow')
    expect(css).not.toContain('conic-gradient')
    expect(css).not.toContain('drop-shadow')
    expect(css).toContain('.sidebar-top-nav__tone[data-active="true"]::before')
    expect(css).toContain('.sidebar-top-nav__tone:not([data-active="true"]):hover .sidebar-nav-glyph')
    expect(css).toContain('.sidebar-rail__tone:not([data-active="true"]):hover .sidebar-rail__glyph')
  })

  it('frames dynamic section icons as quiet theme-tonal glyphs', () => {
    const css = readText(`${process.cwd()}/src/sidebar-appearance.css`)

    expect(css).toContain('.sidebar-section-glyph')
    expect(css).toContain('--sidebar-section-tone: var(--sidebar-primary)')
    expect(css).toContain('--sidebar-section-ink')
    expect(css).toContain('--sidebar-section-ink: color-mix(in srgb, var(--sidebar-foreground) 100%, var(--sidebar-section-tone)')
    expect(css).toContain('.sidebar-section-glyph::before')
    expect(css).toContain('.sidebar-section-glyph::after')
    expect(css).toContain('.sidebar-section-glyph[data-active="true"]')
    expect(css).toContain('.sidebar-section-glyph__icon')
    expect(css).toContain('background: transparent')
    expect(css).toContain('background: color-mix(in srgb, var(--sidebar-section-tone) 12%, transparent)')
    expect(css).toContain('height: 26px')
  })

  it('keeps sidebar group actions tucked away until the header is active', () => {
    const css = readText(`${process.cwd()}/src/sidebar-appearance.css`)

    expect(css).toContain('.sidebar-group-header__actions')
    expect(css).toContain('opacity: 0')
    expect(css).toContain('pointer-events: none')
    expect(css).toContain('.sidebar-group-header:hover .sidebar-group-header__actions')
    expect(css).toContain('.sidebar-group-header:focus-within .sidebar-group-header__actions')
    expect(css).toContain('.sidebar-group-header[data-actions-open="true"] .sidebar-group-header__actions')
    expect(css).toContain('pointer-events: auto')
  })

  it('treats the sidebar brand as a restrained handwritten wordmark', () => {
    const baseCss = readText(`${process.cwd()}/src/theme-base.css`)

    expect(baseCss).toContain('--grimoire-wordmark-font-family')
    expect(brandCss).toContain('.sidebar-brand-wordmark')
    expect(brandCss).toContain('font-family: var(--grimoire-wordmark-font-family)')
    expect(brandCss).not.toContain('font-family: "Noteworthy"')
    expect(brandCss).toContain('.sidebar-brand-wordmark__text')
    expect(brandCss).toContain('.sidebar-brand-wordmark__letter')
    expect(brandCss).toContain('data-letter-index="0"')
    expect(brandCss).toContain('--wordmark-rotate')
    expect(brandCss).not.toContain('.sidebar-brand-wordmark::after')
    expect(brandCss).not.toContain('"swsh"')
    expect(brandCss).not.toContain('.sidebar-brand-wordmark::first-letter')
  })

  it('does not reserve live sidebar space for decorative artwork', () => {
    const css = readText(`${process.cwd()}/src/sidebar-appearance.css`)

    expect(css).not.toContain('[data-sidebar-artwork]:not([data-sidebar-artwork="none"]) .app-sidebar-panel > .sidebar-artwork')
    expect(css).not.toContain('height: 86px')
  })

  it('lets native theme material own the live sidebar shell', () => {
    const css = readText(`${process.cwd()}/src/sidebar-appearance.css`)

    expect(css).toContain('[data-theme-preset] :is(.app-sidebar-panel, .app-sidebar-rail)')
    expect(css).toContain('background: var(--grimoire-native-sidebar-material)')
    expect(css).toContain('color-mix(in srgb, var(--sidebar-foreground) 5%, transparent)')
  })
})
