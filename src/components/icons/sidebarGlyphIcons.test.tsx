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
  it.each(SIDEBAR_GLYPHS)('renders the %s glyph with themed color channels', (name, Icon) => {
    render(<Icon color="#234567" data-testid="sidebar-glyph" size={30} weight="duotone" />)

    const svg = screen.getByTestId('sidebar-glyph')
    expect(svg).toHaveAttribute('aria-hidden', 'true')
    expect(svg).toHaveAttribute('data-sidebar-glyph', name)
    expect(svg).toHaveAttribute('height', '30')
    expect(svg).toHaveAttribute('stroke-width', '1.85')
    expect(svg.style.getPropertyValue('--sidebar-glyph-primary')).toBe('#234567')
    expect(svg.style.getPropertyValue('--sidebar-glyph-aura')).toContain('var(--accent-blue')
    expect(svg.style.getPropertyValue('--sidebar-glyph-aura')).not.toContain('accent-teal')
    expect(svg.style.getPropertyValue('--sidebar-glyph-bright')).toContain('var(--sidebar-foreground')
    expect(svg.style.getPropertyValue('--sidebar-glyph-route')).toContain('var(--accent-blue')
    expect(svg.style.getPropertyValue('--sidebar-glyph-bright')).toContain('92%')
    expect(svg.style.getPropertyValue('--sidebar-glyph-fill')).toContain('currentColor 26%')
    expect(svg.style.getPropertyValue('--sidebar-glyph-soft')).toContain('currentColor 18%')
    expect(svg.style.getPropertyValue('--sidebar-glyph-shadow')).toContain('currentColor 30%')
    expect(svg.querySelector('[stroke="var(--sidebar-glyph-aura)"], [fill="var(--sidebar-glyph-aura)"]')).not.toBeNull()
    expect(svg.querySelector('[stroke="var(--sidebar-glyph-route)"], [fill="var(--sidebar-glyph-route)"]')).not.toBeNull()
  })
})
