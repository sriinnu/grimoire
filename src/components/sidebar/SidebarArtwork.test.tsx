import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { SidebarArtwork } from './SidebarArtwork'

describe('SidebarArtwork', () => {
  it('renders a single quiet Grimoire vault-atlas sigil for theme CSS to tint', () => {
    render(<SidebarArtwork />)

    expect(screen.getByTestId('sidebar-artwork')).toBeInTheDocument()
    expect(document.querySelector('[data-sidebar-glyph="grimoire-sigil"]')).toBeInTheDocument()
    expect(document.querySelectorAll('[data-sidebar-glyph]')).toHaveLength(1)
    expect(document.querySelector('.sidebar-artwork__glyph--sigil')).toBeInTheDocument()
    expect(document.querySelector('.sidebar-artwork__glyph--vault-atlas')).toBeInTheDocument()
    expect(document.querySelector('.sidebar-artwork__gate')).toBeInTheDocument()
    expect(document.querySelector('.sidebar-artwork__page')).toBeInTheDocument()
    expect(document.querySelector('.sidebar-artwork__page--right')).toBeInTheDocument()
    expect(document.querySelector('.sidebar-artwork__aurora')).toBeInTheDocument()
    expect(document.querySelector('.sidebar-artwork__core-glow')).toBeInTheDocument()
    expect(document.querySelector('.sidebar-artwork__local-dot')).toBeInTheDocument()
    expect(document.querySelector('.sidebar-artwork__orbit')).toBeInTheDocument()
    expect(document.querySelector('.sidebar-artwork__route')).toBeInTheDocument()
    expect(document.querySelector('.sidebar-artwork__constellation')).toBeInTheDocument()
    expect(document.querySelector('.sidebar-artwork__keeper')).toBeInTheDocument()
    expect(document.querySelector('.sidebar-artwork__memory-line')).toBeInTheDocument()
    expect(document.querySelectorAll('.sidebar-artwork__node')).toHaveLength(7)
    expect(document.querySelector('.sidebar-artwork__vine')).not.toBeInTheDocument()
    expect(document.querySelector('.sidebar-artwork__leaf')).not.toBeInTheDocument()
  })

  it('keeps decorative glyphs textless so narrow sidebars cannot jumble copy', () => {
    render(<SidebarArtwork />)

    expect(screen.queryByText('Vault map')).not.toBeInTheDocument()
    expect(screen.queryByText('Local notes')).not.toBeInTheDocument()
    expect(screen.queryByText(/Grimoire Agent|Observing|Ready/i)).not.toBeInTheDocument()
  })

  it('uses a compact test id for appearance previews', () => {
    render(<SidebarArtwork compact />)

    expect(screen.getByTestId('settings-sidebar-artwork-preview')).toBeInTheDocument()
  })
})
