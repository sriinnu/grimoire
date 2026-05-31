import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { SidebarTopNav } from './SidebarTopNav'

describe('SidebarTopNav', () => {
  it('renders Grimoire-native glyphs for primary navigation', () => {
    render(
      <SidebarTopNav
        selection={{ kind: 'dashboard' }}
        onSelect={vi.fn()}
        showInbox
        inboxCount={3}
        activeCount={12}
        noteCount={8}
        journalCount={2}
        dreamCount={1}
        archivedCount={1}
      />,
    )

    expect(screen.getByTestId('sidebar-top-nav')).toBeInTheDocument()
    expect(document.querySelector('[data-sidebar-glyph="dashboard"]')).not.toBeNull()
    expect(document.querySelector('[data-sidebar-glyph="inbox"]')).not.toBeNull()
    expect(document.querySelector('[data-sidebar-glyph="notes"]')).not.toBeNull()
    expect(document.querySelector('[data-sidebar-glyph="journal"]')).not.toBeNull()
    expect(document.querySelector('[data-sidebar-glyph="dream"]')).not.toBeNull()
    expect(document.querySelector('[data-sidebar-glyph="archive"]')).not.toBeNull()
    expect(document.querySelectorAll('.sidebar-nav-glyph')).toHaveLength(7)
    expect(document.querySelectorAll('.sidebar-nav-glyph__halo')).toHaveLength(7)
    expect(document.querySelectorAll('.sidebar-nav-glyph__route')).toHaveLength(7)
    expect(document.querySelectorAll('.sidebar-nav-glyph__bead')).toHaveLength(14)
  })

  it('uses accessible native buttons with current-page state', () => {
    const onSelect = vi.fn()
    render(
      <SidebarTopNav
        selection={{ kind: 'filter', filter: 'all' }}
        onSelect={onSelect}
        showInbox
        inboxCount={3}
        activeCount={12}
        noteCount={8}
        journalCount={2}
        dreamCount={1}
        archivedCount={1}
      />,
    )

    const dashboard = screen.getByRole('button', { name: /dashboard/i })
    const allNotes = screen.getByRole('button', { name: /all notes/i })
    expect(dashboard).toHaveAttribute('type', 'button')
    expect(allNotes).toHaveAttribute('aria-current', 'page')

    fireEvent.click(screen.getByRole('button', { name: /archive/i }))
    expect(onSelect).toHaveBeenCalledWith({ kind: 'filter', filter: 'archived' })

    fireEvent.click(screen.getByRole('button', { name: /journal/i }))
    expect(onSelect).toHaveBeenCalledWith({ kind: 'sectionGroup', type: 'Journal' })

    fireEvent.click(screen.getByRole('button', { name: /dreams/i }))
    expect(onSelect).toHaveBeenCalledWith({ kind: 'sectionGroup', type: 'Dream' })
  })
})
