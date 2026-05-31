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
    expect(css).toContain('.sidebar-nav-glyph__halo')
    expect(css).toContain('.sidebar-nav-glyph__route')
    expect(css).toContain('.sidebar-nav-glyph__bead')
    expect(css).toContain('.sidebar-rail__signal')
    expect(css).toContain('.sidebar-rail__bead')
    expect(css).toContain('.sidebar-section-glyph__aura')
    expect(css).toContain('.sidebar-section-glyph__route')
    expect(css).toContain('.sidebar-section-glyph__thread')
    expect(css).toContain('.sidebar-section-glyph__bead')
    expect(css).toContain('inset 0 -8px 14px')
    expect(css).toContain('outline: none')
    expect(css).toContain('transform-origin: left center')
    expect(css).toContain('drop-shadow')
  })

  it('keeps glyph micro-motion reduced-motion aware', () => {
    const css = readFileSync(`${process.cwd()}/src/sidebar-glyph-polish.css`, 'utf8')

    expect(css).toContain('prefers-reduced-motion: reduce')
    expect(css).toContain('transition-duration: 0ms')
    expect(css).not.toContain('infinite')
  })

  it('loads the authored refinement layer for left-sidebar glyphs and selected folder rows', () => {
    const css = readFileSync(`${process.cwd()}/src/sidebar-glyph-refinement.css`, 'utf8')

    expect(css).toContain('.folder-glyph:not([data-folder-glyph-motif="folder"])')
    expect(css).toContain('.folder-glyph[data-folder-glyph-motif="knowledge"]')
    expect(css).toContain('.folder-glyph[data-folder-glyph-motif="mind"]')
    expect(css).toContain('.folder-glyph[data-folder-glyph-motif="private"]')
    expect(css).toContain('.folder-glyph[data-folder-glyph-motif="route"]')
    expect(css).toContain('.folder-glyph[data-folder-glyph="star"]')
    expect(css).toContain('.folder-glyph__cel-glint')
    expect(css).toContain('.folder-item-row::before')
    expect(css).toContain('.folder-item-row::after')
    expect(css).toContain('[data-folder-row-motif="knowledge"]::after')
    expect(css).toContain('[data-folder-row-motif="mind"]::after')
    expect(css).toContain('[data-folder-row-motif="private"]::after')
    expect(css).toContain('.folder-item-row[data-selected="true"]')
    expect(css).toContain('background-blend-mode')
    expect(css).toContain('conic-gradient(from 32deg')
    expect(css).toContain('filter: saturate(1.08)')
    expect(css).toContain('transform-origin: left center')
    expect(css).toContain('prefers-reduced-motion: reduce')
  })
})
