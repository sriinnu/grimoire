import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

describe('sidebar artwork theme CSS', () => {
  it('keeps sidebar artwork visible for all presets and short windows', () => {
    const css = readFileSync(`${process.cwd()}/src/sidebar-artwork-themes.css`, 'utf8')

    expect(css).toContain('.app-sidebar-panel > .sidebar-artwork')
    expect(css).toContain('[data-theme-preset="classic"] .app-sidebar-panel > .sidebar-artwork')
    expect(css).toContain('[data-theme-preset="ion"] .app-sidebar-panel > .sidebar-artwork')
    expect(css).toContain('[data-theme-preset="moss"] .app-sidebar-panel > .sidebar-artwork')
    expect(css).toContain('[data-theme-preset="lumen"] .app-sidebar-panel > .sidebar-artwork')
    expect(css).toContain('@media (max-height: 760px)')
    expect(css).toContain('display: block')
  })

  it('selects light and dark artwork variants through theme attributes', () => {
    const css = readFileSync(`${process.cwd()}/src/sidebar-artwork-themes.css`, 'utf8')

    expect(css).toContain('.app-sidebar-panel .sidebar-artwork__image--light')
    expect(css).toContain('[data-theme="dark"] .app-sidebar-panel .sidebar-artwork__image--dark')
    expect(css).toContain('[data-theme-preview="dark"] .sidebar-artwork__image--dark')
  })

  it('keeps the live artwork as an ambient sidebar layer instead of a framed card', () => {
    const css = readFileSync(`${process.cwd()}/src/sidebar-artwork-themes.css`, 'utf8')

    expect(css).toContain('mask-image: linear-gradient')
    expect(css).toContain('mix-blend-mode: soft-light')
    expect(css).toContain('border: 0')
    expect(css).not.toContain('box-shadow: inset')
  })
})
