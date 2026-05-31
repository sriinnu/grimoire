import { render, screen } from '@testing-library/react'
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

    expect(screen.getByTestId('sidebar-rail-dashboard')).toHaveAttribute('data-sidebar-rail-tone', 'aura')
    expect(screen.getByTestId('sidebar-rail-inbox')).toHaveAttribute('data-sidebar-rail-tone', 'amber')
    expect(screen.getByTestId('sidebar-rail-all-notes')).toHaveAttribute('data-sidebar-rail-tone', 'blue')
    expect(screen.getByTestId('sidebar-rail-all-notes')).toHaveAttribute('data-active', 'true')
    expect(screen.getByTestId('sidebar-rail-notes')).toHaveAttribute('data-sidebar-rail-tone', 'blue')
    expect(screen.getByTestId('sidebar-rail-journal')).toHaveAttribute('data-sidebar-rail-tone', 'aura')
    expect(screen.getByTestId('sidebar-rail-dreams')).toHaveAttribute('data-sidebar-rail-tone', 'violet')
    expect(screen.getByTestId('sidebar-rail-archive')).toHaveAttribute('data-sidebar-rail-tone', 'violet')
    expect(screen.getAllByTestId('sidebar-rail-count')).toHaveLength(6)
    expect(document.querySelector('[data-sidebar-glyph="dashboard"]')).not.toBeNull()
    expect(document.querySelector('[data-sidebar-glyph="inbox"]')).not.toBeNull()
    expect(document.querySelector('[data-sidebar-glyph="notes"]')).not.toBeNull()
    expect(document.querySelector('[data-sidebar-glyph="journal"]')).not.toBeNull()
    expect(document.querySelector('[data-sidebar-glyph="dream"]')).not.toBeNull()
    expect(document.querySelector('[data-sidebar-glyph="archive"]')).not.toBeNull()
    expect(document.querySelector('[data-sidebar-glyph="expand-sidebar"]')).not.toBeNull()
    expect(document.querySelectorAll('.sidebar-rail__signal')).toHaveLength(8)
    expect(document.querySelectorAll('.sidebar-rail__bead')).toHaveLength(16)
  })
})
