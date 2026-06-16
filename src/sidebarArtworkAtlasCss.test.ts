import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

describe('sidebar artwork atlas CSS', () => {
  it('keeps the quiet notebook-thread redraw in a focused CSS layer', () => {
    const css = readFileSync(`${process.cwd()}/src/sidebar-artwork-atlas.css`, 'utf8')

    expect(css).toContain('.sidebar-artwork__page-shadow')
    expect(css).toContain('.sidebar-artwork__page-thread--primary')
    expect(css).toContain('.sidebar-artwork__page-thread--secondary')
    expect(css).toContain('.sidebar-artwork__memory-line')
    expect(css).toContain('.sidebar-artwork__context-loop')
    expect(css).toContain('.sidebar-artwork__local-dot')
    expect(css).toContain('stroke-linecap: round')
    expect(css).toContain('color-mix(in srgb')
    expect(css).not.toContain('.sidebar-artwork__atlas-frame')
    expect(css).not.toContain('.sidebar-artwork__vault-arch')
    expect(css).not.toContain('.sidebar-artwork__compass')
    expect(css).not.toContain('.sidebar-artwork__orbit')
    expect(css).not.toContain('.sidebar-artwork__spark-crown')
    expect(css).not.toContain('.sidebar-artwork__route-bloom')
    expect(css).not.toContain('.sidebar-artwork__route-beam')
    expect(css).not.toContain('.sidebar-artwork__route-node')
  })

  it('simplifies the notebook mark in compact and short-height previews', () => {
    const css = readFileSync(`${process.cwd()}/src/sidebar-artwork-atlas.css`, 'utf8')

    expect(css).toContain('.sidebar-artwork--compact .sidebar-artwork__note-rule')
    expect(css).toContain('.sidebar-artwork--compact .sidebar-artwork__page-thread--secondary')
    expect(css).toContain('.sidebar-artwork--compact .sidebar-artwork__memory-line')
    expect(css).toContain('@media (max-height: 760px)')
    expect(css).toContain('[data-sidebar-preset-preview] .sidebar-artwork .sidebar-artwork__note-rule')
    expect(css).not.toContain('.app-sidebar-panel > .sidebar-artwork')
    expect(css).toContain('display: none')
    expect(css).not.toContain('.sidebar-artwork--compact .sidebar-artwork__token')
    expect(css).not.toContain('.sidebar-artwork--compact .sidebar-artwork__signal')
  })
})
