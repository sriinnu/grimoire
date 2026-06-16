import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { SidebarRail } from './SidebarRail'

describe('SidebarRail', () => {
  it('keeps collapsed navigation glyphs theme-tonal and stateful', () => {
    render(
      <SidebarRail
        selection={{ kind: 'filter', filter: 'all' }}
        onSelect={vi.fn()}
        onExpand={vi.fn()}
        showInbox
        inboxCount={7}
        activeCount={12}
        noteCount={8}
        journalCount={2}
        dreamCount={1}
        archivedCount={2}
      />,
    )

    expect(screen.getByTestId('sidebar-rail-notebook')).toHaveAttribute('data-sidebar-rail-tone', 'aura')
    expect(screen.getByTestId('sidebar-rail-inbox')).toHaveAttribute('data-sidebar-rail-tone', 'amber')
    expect(screen.getByTestId('sidebar-rail-pages')).toHaveAttribute('data-sidebar-rail-tone', 'blue')
    expect(screen.getByTestId('sidebar-rail-pages')).toHaveAttribute('data-active', 'true')
    expect(screen.queryByTestId('sidebar-rail-notes')).not.toBeInTheDocument()
    expect(screen.getByTestId('sidebar-rail-journal')).toHaveAttribute('data-sidebar-rail-tone', 'aura')
    expect(screen.getByTestId('sidebar-rail-dreams')).toHaveAttribute('data-sidebar-rail-tone', 'violet')
    expect(screen.getByTestId('sidebar-rail-archive')).toHaveAttribute('data-sidebar-rail-tone', 'violet')
    expect(screen.queryByTestId('sidebar-rail-count')).not.toBeInTheDocument()
    expect(document.querySelector('[data-sidebar-glyph="notebook"]')).not.toBeNull()
    expect(document.querySelector('[data-sidebar-glyph="inbox"]')).not.toBeNull()
    expect(document.querySelector('[data-sidebar-glyph="notes"]')).not.toBeNull()
    expect(document.querySelector('[data-sidebar-glyph="journal"]')).not.toBeNull()
    expect(document.querySelector('[data-sidebar-glyph="dream"]')).not.toBeNull()
    expect(document.querySelector('[data-sidebar-glyph="archive"]')).not.toBeNull()
    expect(document.querySelector('[data-sidebar-glyph="expand-sidebar"]')).not.toBeNull()
    expect(document.querySelectorAll('.sidebar-rail__glyph')).toHaveLength(7)
    expect(document.querySelector('[data-sidebar-glyph="notes"]')).toHaveAttribute('height', '22')
    expect(document.querySelectorAll('.sidebar-rail__signal')).toHaveLength(0)
    expect(document.querySelectorAll('.sidebar-rail__bead')).toHaveLength(0)
  })

  it('opens search from the collapsed left rail', () => {
    const onOpenSearch = vi.fn()
    render(
      <SidebarRail
        selection={{ kind: 'dashboard' }}
        onSelect={vi.fn()}
        showInbox
        inboxCount={0}
        activeCount={0}
        noteCount={0}
        journalCount={0}
        dreamCount={0}
        archivedCount={0}
        onOpenSearch={onOpenSearch}
      />,
    )

    fireEvent.click(screen.getByTestId('sidebar-rail-search'))
    expect(onOpenSearch).toHaveBeenCalledOnce()
  })

  it('opens the knowledge graph from the collapsed left rail', () => {
    const onOpenGraph = vi.fn()
    render(
      <SidebarRail
        selection={{ kind: 'dashboard' }}
        onSelect={vi.fn()}
        showInbox
        inboxCount={0}
        activeCount={0}
        noteCount={0}
        journalCount={0}
        dreamCount={0}
        archivedCount={0}
        onOpenGraph={onOpenGraph}
      />,
    )

    expect(screen.getByTestId('sidebar-rail-graph')).toHaveAttribute('data-sidebar-rail-tone', 'blue')
    expect(document.querySelector('[data-sidebar-glyph="graph"]')).not.toBeNull()
    fireEvent.click(screen.getByTestId('sidebar-rail-graph'))
    expect(onOpenGraph).toHaveBeenCalledOnce()
  })
})
