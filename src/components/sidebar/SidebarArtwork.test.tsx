import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { SidebarArtwork } from './SidebarArtwork'

describe('SidebarArtwork', () => {
  it('renders both light and dark line-art variants for theme CSS to select', () => {
    render(<SidebarArtwork />)

    expect(screen.getByTestId('sidebar-artwork')).toBeInTheDocument()
    expect(document.querySelector('.sidebar-artwork__image--dark')).toBeInTheDocument()
    expect(document.querySelector('.sidebar-artwork__image--light')).toBeInTheDocument()
    expect(document.querySelector('.sidebar-rosy')).not.toBeInTheDocument()
  })

  it('uses a compact test id for appearance previews', () => {
    render(<SidebarArtwork compact />)

    expect(screen.getByTestId('settings-sidebar-artwork-preview')).toBeInTheDocument()
  })
})
