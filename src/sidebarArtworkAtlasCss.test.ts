import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

describe('sidebar artwork atlas CSS', () => {
  it('keeps the heavier ambient sigil redraw in a focused CSS layer', () => {
    const css = readFileSync(`${process.cwd()}/src/sidebar-artwork-atlas.css`, 'utf8')

    expect(css).toContain('.sidebar-artwork__atlas-frame')
    expect(css).toContain('.sidebar-artwork__atlas-ridge')
    expect(css).toContain('.sidebar-artwork__atlas-shadow')
    expect(css).toContain('.sidebar-artwork__living-crest')
    expect(css).toContain('.sidebar-artwork__vault-arch')
    expect(css).toContain('.sidebar-artwork__compass')
    expect(css).toContain('.sidebar-artwork__spark-crown')
    expect(css).toContain('.sidebar-artwork__route-bloom')
    expect(css).toContain('.sidebar-artwork__route-beam')
    expect(css).toContain('.sidebar-artwork__route-node')
    expect(css).toContain('stroke-linecap: round')
    expect(css).toContain('color-mix(in srgb')
  })

  it('simplifies the ambient sigil in compact and short-height sidebars', () => {
    const css = readFileSync(`${process.cwd()}/src/sidebar-artwork-atlas.css`, 'utf8')

    expect(css).toContain('.sidebar-artwork--compact .sidebar-artwork__token')
    expect(css).toContain('.sidebar-artwork--compact .sidebar-artwork__signal')
    expect(css).toContain('.sidebar-artwork--compact .sidebar-artwork__spark-crown')
    expect(css).toContain('.sidebar-artwork--compact .sidebar-artwork__node--quiet')
    expect(css).toContain('@media (max-height: 760px)')
    expect(css).toContain('.app-sidebar-panel > .sidebar-artwork .sidebar-artwork__route-bloom')
    expect(css).toContain('display: none')
  })
})
