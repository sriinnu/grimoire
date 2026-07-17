import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import {
  ArchiveGlyphIcon,
  DreamGlyphIcon,
  GraphGlyphIcon,
  InboxGlyphIcon,
  JournalGlyphIcon,
  NotebookGlyphIcon,
  NotesGlyphIcon,
  SidebarExpandGlyphIcon,
} from './sidebarGlyphIcons'

const SIDEBAR_GLYPHS = [
  ['archive', ArchiveGlyphIcon],
  ['dream', DreamGlyphIcon],
  ['expand-sidebar', SidebarExpandGlyphIcon],
  ['graph', GraphGlyphIcon],
  ['inbox', InboxGlyphIcon],
  ['journal', JournalGlyphIcon],
  ['notebook', NotebookGlyphIcon],
  ['notes', NotesGlyphIcon],
] as const

describe('sidebar glyph icons', () => {
  it.each(SIDEBAR_GLYPHS)('renders the familiar %s symbol at the requested size', (name, Icon) => {
    render(<Icon color="#234567" data-testid="sidebar-glyph" size={30} weight="duotone" />)

    const svg = screen.getByTestId('sidebar-glyph')
    expect(svg).toHaveAttribute('aria-hidden', 'true')
    expect(svg).toHaveAttribute('data-sidebar-glyph', name)
    expect(svg).toHaveAttribute('height', '30')
    expect(svg).toHaveAttribute('width', '30')
    expect(svg.querySelector('path')).not.toBeNull()
  })

  it('uses a regular, legible icon by default', () => {
    render(<NotebookGlyphIcon data-testid="sidebar-glyph" />)
    expect(screen.getByTestId('sidebar-glyph').querySelector('path')).not.toBeNull()
  })
})
