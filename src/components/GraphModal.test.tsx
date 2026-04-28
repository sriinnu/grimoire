import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { VaultEntry } from '../types'
import { GraphModal } from './GraphModal'

function entry(overrides: Partial<VaultEntry>): VaultEntry {
  return {
    path: `/vault/${overrides.filename ?? 'note.md'}`,
    filename: overrides.filename ?? 'note.md',
    title: overrides.title ?? 'Note',
    isA: overrides.isA ?? 'Note',
    aliases: [],
    belongsTo: [],
    relatedTo: [],
    status: null,
    archived: false,
    modifiedAt: null,
    createdAt: null,
    fileSize: 0,
    snippet: '',
    wordCount: 0,
    relationships: overrides.relationships ?? {},
    icon: null,
    color: null,
    order: null,
    sidebarLabel: null,
    template: null,
    sort: null,
    view: null,
    visible: null,
    organized: false,
    favorite: false,
    favoriteIndex: null,
    listPropertiesDisplay: [],
    outgoingLinks: overrides.outgoingLinks ?? [],
    properties: {},
    hasH1: true,
  }
}

describe('GraphModal', () => {
  it('renders graph nodes and opens a note when clicked', () => {
    const alpha = entry({ filename: 'alpha.md', title: 'Alpha', outgoingLinks: ['Beta'] })
    const beta = entry({ filename: 'beta.md', title: 'Beta' })
    const onOpenNote = vi.fn()

    render(
      <GraphModal
        open={true}
        entries={[alpha, beta]}
        activePath={alpha.path}
        onOpenNote={onOpenNote}
        onClose={vi.fn()}
      />,
    )

    expect(screen.getByTestId('graph-svg')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Open Beta' }))

    expect(onOpenNote).toHaveBeenCalledWith(beta)
  })

  it('filters graph nodes by query', () => {
    render(
      <GraphModal
        open={true}
        entries={[
          entry({ filename: 'alpha.md', title: 'Alpha', outgoingLinks: ['Beta'] }),
          entry({ filename: 'beta.md', title: 'Beta' }),
          entry({ filename: 'gamma.md', title: 'Gamma' }),
        ]}
        activePath={null}
        onOpenNote={vi.fn()}
        onClose={vi.fn()}
      />,
    )

    fireEvent.change(screen.getByTestId('graph-filter'), { target: { value: 'alpha' } })

    expect(screen.getByRole('button', { name: 'Open Alpha' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Open Beta' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Open Gamma' })).not.toBeInTheDocument()
  })
})
