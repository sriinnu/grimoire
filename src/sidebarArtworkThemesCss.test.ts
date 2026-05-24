import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

describe('sidebar artwork theme CSS', () => {
  it('styles the ambient sidebar glyph layer for live sidebars and previews', () => {
    const css = readFileSync(`${process.cwd()}/src/sidebar-artwork-themes.css`, 'utf8')

    expect(css).toContain('.app-sidebar-panel > .sidebar-artwork')
    expect(css).toContain('[data-sidebar-preset-preview] .sidebar-artwork')
    expect(css).toContain('.app-sidebar-panel .sidebar-artwork__glyph')
    expect(css).toContain('[data-sidebar-preset-preview] .sidebar-artwork__glyph')
    expect(css).toContain('@media (max-height: 760px)')
  })

  it('keeps glyph ink theme-aware through CSS variables and blend modes', () => {
    const css = readFileSync(`${process.cwd()}/src/sidebar-artwork-themes.css`, 'utf8')

    expect(css).toContain('--art-ink')
    expect(css).toContain('--art-fill')
    expect(css).toContain('--art-page')
    expect(css).toContain('.sidebar-artwork__orbit')
    expect(css).toContain('.sidebar-artwork__memory-line')
    expect(css).toContain('.sidebar-artwork__root')
    expect(css).toContain('[data-theme="dark"] .app-sidebar-panel .sidebar-artwork__glyph')
    expect(css).toContain('[data-theme-preview="dark"] .sidebar-artwork__glyph')
    expect(css).toContain('opacity: var(--sidebar-artwork-opacity')
  })

  it('keeps the live artwork as an ambient brand mark instead of a framed scene', () => {
    const css = readFileSync(`${process.cwd()}/src/sidebar-artwork-themes.css`, 'utf8')

    expect(css).toContain('mask-image: linear-gradient')
    expect(css).toContain('mix-blend-mode: multiply')
    expect(css).toContain('mix-blend-mode: screen')
    expect(css).toContain('border: 0')
    expect(css).toContain('.sidebar-artwork__page')
    expect(css).not.toContain('.sidebar-artwork__vine')
    expect(css).not.toContain('.sidebar-artwork__leaf')
    expect(css).not.toContain('box-shadow: inset')
  })
})
