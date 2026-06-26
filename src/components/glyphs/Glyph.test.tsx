import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { Glyph } from './Glyph'
import { GLYPH_MARKUP } from './glyphData'

describe('Glyph', () => {
  it('ships the full Grimoire glyph pack', () => {
    // The generated registry should carry the whole pack, keyed by gm_-stripped name.
    expect(Object.keys(GLYPH_MARKUP).length).toBeGreaterThanOrEqual(167)
    for (const name of ['home', 'graph', 'chitragupta', 'sparkle', 'shield'] as const) {
      expect(GLYPH_MARKUP[name]).toBeTruthy()
    }
  })

  it('renders a tintable 64-grid svg at the requested size', () => {
    const { container } = render(<Glyph name="graph" size={22} />)
    const svg = container.querySelector('svg')!
    expect(svg).toHaveAttribute('viewBox', '0 0 64 64')
    expect(svg).toHaveAttribute('width', '22')
    expect(svg).toHaveAttribute('height', '22')
    // Tints with the current text colour rather than a baked ink.
    expect(svg.innerHTML).toContain('currentColor')
    expect(svg.innerHTML).not.toContain('#0B1F2A')
  })

  it('is decorative by default and labelled when given a label', () => {
    const { container, rerender } = render(<Glyph name="home" />)
    expect(container.querySelector('svg')).toHaveAttribute('aria-hidden', 'true')

    rerender(<Glyph name="home" label="Home" />)
    const svg = container.querySelector('svg')!
    expect(svg).toHaveAttribute('role', 'img')
    expect(svg).toHaveAttribute('aria-label', 'Home')
    expect(svg).not.toHaveAttribute('aria-hidden')
  })
})
