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
    expect(document.querySelector('[data-sidebar-glyph="notebook"]')).not.toBeNull()
    expect(document.querySelector('[data-sidebar-glyph="inbox"]')).not.toBeNull()
    expect(document.querySelector('[data-sidebar-glyph="notes"]')).not.toBeNull()
    expect(document.querySelector('[data-sidebar-glyph="journal"]')).not.toBeNull()
    expect(document.querySelector('[data-sidebar-glyph="dream"]')).not.toBeNull()
    expect(document.querySelector('[data-sidebar-glyph="archive"]')).not.toBeNull()
    expect(document.querySelectorAll('.sidebar-nav-glyph')).toHaveLength(6)
    expect(document.querySelector('[data-sidebar-glyph="notebook"]')).toHaveAttribute('height', '20')
    expect(document.querySelectorAll('.sidebar-nav-glyph__halo')).toHaveLength(0)
    expect(document.querySelectorAll('.sidebar-nav-glyph__route')).toHaveLength(0)
    expect(document.querySelectorAll('.sidebar-nav-glyph__bead')).toHaveLength(0)
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

    const notebook = screen.getByRole('button', { name: /notebook/i })
    const pages = screen.getByRole('button', { name: /pages/i })
    expect(notebook).toHaveAttribute('type', 'button')
    expect(pages).toHaveAttribute('aria-current', 'page')

    fireEvent.click(screen.getByRole('button', { name: /archive/i }))
    expect(onSelect).toHaveBeenCalledWith({ kind: 'filter', filter: 'archived' })

    fireEvent.click(screen.getByRole('button', { name: /journal/i }))
    expect(onSelect).toHaveBeenCalledWith({ kind: 'sectionGroup', type: 'Journal' })

    fireEvent.click(screen.getByRole('button', { name: /dreams/i }))
    expect(onSelect).toHaveBeenCalledWith({ kind: 'sectionGroup', type: 'Dream' })
  })

  it('opens the knowledge graph from the primary nav when wired', () => {
    const onOpenGraph = vi.fn()
    render(
      <SidebarTopNav
        selection={{ kind: 'filter', filter: 'all' }}
        onSelect={vi.fn()}
        onOpenGraph={onOpenGraph}
        showInbox
        inboxCount={3}
        activeCount={12}
        noteCount={8}
        journalCount={2}
        dreamCount={1}
        archivedCount={1}
      />,
    )

    expect(document.querySelector('[data-sidebar-glyph="graph"]')).not.toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Graph' }))
    expect(onOpenGraph).toHaveBeenCalledOnce()
  })

  it('keeps the primary nav free of count pressure', () => {
    render(
      <SidebarTopNav
        selection={{ kind: 'filter', filter: 'all' }}
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

    expect(screen.getByRole('button', { name: /inbox/i }).textContent).toBe('Inbox')
    expect(screen.getByRole('button', { name: /pages/i }).textContent).toBe('Pages')
    expect(screen.getByRole('button', { name: /journal/i }).textContent).toBe('Journal')
    expect(screen.getByRole('button', { name: /dreams/i }).textContent).toBe('Dreams')
    expect(screen.getByRole('button', { name: /archive/i }).textContent).toBe('Archive')
    expect(screen.queryByText('3')).not.toBeInTheDocument()
  })
})
