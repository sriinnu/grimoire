import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import {
  ArchiveGlyphIcon,
  DashboardGlyphIcon,
  DreamGlyphIcon,
  InboxGlyphIcon,
  JournalGlyphIcon,
  NotesGlyphIcon,
  SidebarExpandGlyphIcon,
} from './sidebarGlyphIcons'

const SIDEBAR_GLYPHS = [
  ['archive', ArchiveGlyphIcon],
  ['dashboard', DashboardGlyphIcon],
  ['dream', DreamGlyphIcon],
  ['expand-sidebar', SidebarExpandGlyphIcon],
  ['inbox', InboxGlyphIcon],
  ['journal', JournalGlyphIcon],
  ['notes', NotesGlyphIcon],
] as const

describe('sidebar glyph icons', () => {
  it.each(SIDEBAR_GLYPHS)('renders the %s glyph with themed color channels', (name, Icon) => {
    render(<Icon color="#234567" data-testid="sidebar-glyph" size={30} weight="duotone" />)

    const svg = screen.getByTestId('sidebar-glyph')
    expect(svg).toHaveAttribute('aria-hidden', 'true')
    expect(svg).toHaveAttribute('data-sidebar-glyph', name)
    expect(svg).toHaveAttribute('height', '30')
    expect(svg).toHaveAttribute('stroke-width', '1.95')
    expect(svg.style.getPropertyValue('--sidebar-glyph-primary')).toBe('#234567')
    expect(svg.style.getPropertyValue('--sidebar-glyph-bright')).toContain('var(--sidebar-primary-foreground')
    expect(svg.style.getPropertyValue('--sidebar-glyph-route')).toContain('var(--accent-blue')
    expect(svg.style.getPropertyValue('--sidebar-glyph-shadow')).toContain('currentColor 20%')
    expect(svg.querySelector('[stroke="var(--sidebar-glyph-aura)"], [fill="var(--sidebar-glyph-aura)"]')).not.toBeNull()
    expect(svg.querySelector('[stroke="var(--sidebar-glyph-route)"], [fill="var(--sidebar-glyph-route)"]')).not.toBeNull()
  })
})
