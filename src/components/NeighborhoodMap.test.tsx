import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { VaultEntry } from '../types'
import { makeEntry } from '../test-utils/noteListTestUtils'
import { buildNoteNeighborhood } from '../utils/noteNeighborhood'
import { NeighborhoodMap } from './NeighborhoodMap'

function note(title: string, overrides: Partial<VaultEntry> = {}): VaultEntry {
  return makeEntry({
    path: `/vault/${title}.md`,
    filename: `${title}.md`,
    title,
    ...overrides,
  })
}

function renderMap(entries: VaultEntry[], activePath: string, onNavigate = vi.fn()) {
  const neighborhood = buildNoteNeighborhood(entries, activePath)
  render(<NeighborhoodMap neighborhood={neighborhood} entries={entries} onNavigate={onNavigate} />)
  return onNavigate
}

describe('NeighborhoodMap', () => {
  it('renders nothing for an unconnected note', () => {
    const entries = [note('Lone')]
    renderMap(entries, '/vault/Lone.md')
    expect(screen.queryByTestId('neighborhood-map')).not.toBeInTheDocument()
  })

  it('shows incoming and outgoing links in their own columns', () => {
    const entries = [
      note('Center', { outgoingLinks: ['Target'] }),
      note('Target'),
      note('Fan', { outgoingLinks: ['Center'] }),
    ]

    renderMap(entries, '/vault/Center.md')

    expect(screen.getByTestId('neighborhood-incoming')).toHaveTextContent('Fan')
    expect(screen.getByTestId('neighborhood-outgoing')).toHaveTextContent('Target')
  })

  it('navigates by note title when a link is clicked', () => {
    const entries = [note('Center', { outgoingLinks: ['Target'] }), note('Target')]

    const onNavigate = renderMap(entries, '/vault/Center.md')
    fireEvent.click(screen.getByRole('button', { name: /Target/u }))

    expect(onNavigate).toHaveBeenCalledWith('Target')
  })

  it('marks mutual and private neighbors', () => {
    const entries = [
      note('Center', { outgoingLinks: ['Pal', 'Secret'] }),
      note('Pal', { outgoingLinks: ['Center'] }),
      note('Secret', { isA: 'Dream' }),
    ]

    renderMap(entries, '/vault/Center.md')

    expect(screen.getByLabelText('Links both ways')).toBeInTheDocument()
    expect(screen.getByLabelText('Private/local')).toBeInTheDocument()
  })

  it('shows the relationship label under frontmatter-linked pages', () => {
    const entries = [
      note('Center', { relationships: { 'belongs to': ['[[Project]]'] } }),
      note('Project'),
    ]

    renderMap(entries, '/vault/Center.md')

    expect(screen.getByTestId('neighborhood-link')).toHaveAttribute('data-kind', 'relationship')
    expect(screen.getByText('belongs to')).toBeInTheDocument()
  })
})
