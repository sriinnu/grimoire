import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { SidebarArtwork } from './SidebarArtwork'

describe('SidebarArtwork', () => {
  it('renders a single quiet Grimoire notebook mark for theme CSS to tint', () => {
    render(<SidebarArtwork />)

    expect(screen.getByTestId('sidebar-artwork')).toBeInTheDocument()
    expect(document.querySelector('[data-sidebar-glyph="notebook-mark"]')).toBeInTheDocument()
    expect(document.querySelectorAll('[data-sidebar-glyph]')).toHaveLength(1)
    expect(document.querySelector('.sidebar-artwork__glyph--notebook-mark')).toBeInTheDocument()
    expect(document.querySelector('.sidebar-artwork__glyph--notebook-thread')).toBeInTheDocument()
    expect(document.querySelector('.sidebar-artwork__page-shadow')).toBeInTheDocument()
    expect(document.querySelector('.sidebar-artwork__page')).toBeInTheDocument()
    expect(document.querySelector('.sidebar-artwork__page--right')).toBeInTheDocument()
    expect(document.querySelector('.sidebar-artwork__spine')).toBeInTheDocument()
    expect(document.querySelector('.sidebar-artwork__page-thread--primary')).toBeInTheDocument()
    expect(document.querySelector('.sidebar-artwork__page-thread--secondary')).toBeInTheDocument()
    expect(document.querySelector('.sidebar-artwork__note-rule--left')).toBeInTheDocument()
    expect(document.querySelector('.sidebar-artwork__note-rule--right')).toBeInTheDocument()
    expect(document.querySelector('.sidebar-artwork__local-dot')).toBeInTheDocument()
    expect(document.querySelector('.sidebar-artwork__context-loop')).toBeInTheDocument()
    expect(document.querySelectorAll('.sidebar-artwork__thought-node')).toHaveLength(3)
    expect(document.querySelector('.sidebar-artwork__memory-line')).toBeInTheDocument()
    expect(document.querySelector('[data-sidebar-art-channel]')).not.toBeInTheDocument()
    expect(document.querySelector('[data-sidebar-art-mark]')).not.toBeInTheDocument()
    expect(document.querySelector('.sidebar-artwork__constellation')).not.toBeInTheDocument()
    expect(document.querySelector('.sidebar-artwork__node')).not.toBeInTheDocument()
    expect(document.querySelector('.sidebar-artwork__pouch-overlay')).not.toBeInTheDocument()
    expect(document.querySelector('.sidebar-artwork__route')).not.toBeInTheDocument()
    expect(document.querySelector('.sidebar-artwork__route-bloom')).not.toBeInTheDocument()
    expect(document.querySelector('.sidebar-artwork__signal')).not.toBeInTheDocument()
    expect(document.querySelector('.sidebar-artwork__spark')).not.toBeInTheDocument()
    expect(document.querySelector('.sidebar-artwork__spark-crown')).not.toBeInTheDocument()
    expect(document.querySelector('.sidebar-artwork__token')).not.toBeInTheDocument()
    expect(document.querySelector('.sidebar-artwork__ribbon--veda')).not.toBeInTheDocument()
    expect(document.querySelector('.sidebar-artwork__palm-leaf--veda')).not.toBeInTheDocument()
    expect(document.querySelector('.sidebar-artwork__purana-scroll')).not.toBeInTheDocument()
    expect(document.querySelector('.sidebar-artwork__rishi-aura')).not.toBeInTheDocument()
    expect(document.querySelector('.sidebar-artwork__rishi-head')).not.toBeInTheDocument()
    expect(document.querySelector('.sidebar-artwork__rishi-seat')).not.toBeInTheDocument()
    expect(document.querySelector('.sidebar-artwork__keeper')).not.toBeInTheDocument()
    expect(document.querySelector('.sidebar-artwork__vine')).not.toBeInTheDocument()
    expect(document.querySelector('.sidebar-artwork__leaf')).not.toBeInTheDocument()
    expect(document.querySelector('.sidebar-artwork__atlas-frame')).not.toBeInTheDocument()
    expect(document.querySelector('.sidebar-artwork__gate')).not.toBeInTheDocument()
    expect(document.querySelector('.sidebar-artwork__vault-arch')).not.toBeInTheDocument()
    expect(document.querySelector('.sidebar-artwork__compass')).not.toBeInTheDocument()
    expect(document.querySelector('.sidebar-artwork__orbit')).not.toBeInTheDocument()
    expect(document.querySelector('.sidebar-artwork__core-glow')).not.toBeInTheDocument()
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
