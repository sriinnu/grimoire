import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

describe('sidebar glyph polish CSS', () => {
  it('adds one shared polish layer for sidebar nav, rail, section, and folder glyphs', () => {
    const css = readFileSync(`${process.cwd()}/src/sidebar-glyph-polish.css`, 'utf8')

    expect(css).toContain('.sidebar-top-nav__tone .sidebar-nav-glyph')
    expect(css).toContain('.sidebar-rail__tone .sidebar-rail__glyph')
    expect(css).toContain('.sidebar-section-glyph')
    expect(css).toContain('.folder-glyph')
    expect(css).toContain('.sidebar-nav-glyph--emoji > span')
    expect(css).not.toContain('.sidebar-nav-glyph__halo')
    expect(css).not.toContain('.sidebar-nav-glyph__route')
    expect(css).not.toContain('.sidebar-nav-glyph__bead')
    expect(css).not.toContain('.sidebar-rail__signal')
    expect(css).not.toContain('.sidebar-rail__bead')
    expect(css).not.toContain('.sidebar-section-glyph__aura')
    expect(css).not.toContain('.sidebar-section-glyph__route')
    expect(css).not.toContain('.sidebar-section-glyph__thread')
    expect(css).not.toContain('.sidebar-section-glyph__bead')
    expect(css).toContain('outline: none')
    expect(css).not.toContain('0 1px 2px')
    expect(css).not.toContain('drop-shadow')
    expect(css).toContain('currentColor 6%')
    expect(css).toContain('opacity: 0.32')
    expect(css).not.toContain('radial-gradient(circle')
    expect(css).not.toContain('0 0 8px')
  })

  it('keeps glyph micro-motion reduced-motion aware', () => {
    const css = readFileSync(`${process.cwd()}/src/sidebar-glyph-polish.css`, 'utf8')

    expect(css).toContain('prefers-reduced-motion: reduce')
    expect(css).toContain('transition-duration: 0ms')
    expect(css).not.toContain('infinite')
  })

  it('loads the authored refinement layer for left-sidebar glyphs and selected folder rows', () => {
    const css = readFileSync(`${process.cwd()}/src/sidebar-glyph-refinement.css`, 'utf8')

    expect(css).toContain('.folder-glyph')
    expect(css).toContain('.folder-item-row::before')
    expect(css).toContain('.folder-item-row::after')
    expect(css).toContain('.folder-item-row[data-selected="true"]')
    expect(css).toContain('background-blend-mode')
    expect(css).toContain('--sidebar-glyph-line: color-mix(in srgb, var(--sidebar-foreground) 30%, transparent)')
    expect(css).toContain('--sidebar-glyph-surface: color-mix(in srgb, var(--sidebar-foreground) 10%, transparent)')
    expect(css).toContain('filter: none')
    expect(css).not.toContain('data-folder-glyph-motif')
    expect(css).not.toContain('data-folder-row-motif')
    expect(css).not.toContain('.folder-glyph__route')
    expect(css).not.toContain('.folder-glyph__thread')
    expect(css).not.toContain('.folder-glyph__bead')
    expect(css).not.toContain('.folder-glyph__spark')
    expect(css).not.toContain('.folder-glyph__constellation')
    expect(css).not.toContain('.folder-glyph__cel-glint')
    expect(css).not.toContain('conic-gradient')
    expect(css).not.toContain('filter: saturate')
    expect(css).not.toContain('transform-origin: left center')
    expect(css).toContain('prefers-reduced-motion: reduce')
  })
})
