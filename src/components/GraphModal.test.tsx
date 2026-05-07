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
  it('does not mount the expensive graph surface while closed', () => {
    render(
      <GraphModal
        open={false}
        entries={[entry({ filename: 'alpha.md', title: 'Alpha' })]}
        activePath={null}
        onOpenNote={vi.fn()}
        onClose={vi.fn()}
      />,
    )

    expect(screen.queryByTestId('graph-svg')).not.toBeInTheDocument()
  })

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

  it('filters visible graph edges by kind', () => {
    const alpha = entry({
      filename: 'alpha.md',
      title: 'Alpha',
      outgoingLinks: ['Gamma'],
      relationships: { relatedTo: ['Beta'] },
    })
    const beta = entry({ filename: 'beta.md', title: 'Beta' })
    const gamma = entry({ filename: 'gamma.md', title: 'Gamma' })

    render(
      <GraphModal
        open={true}
        entries={[alpha, beta, gamma]}
        activePath={alpha.path}
        onOpenNote={vi.fn()}
        onClose={vi.fn()}
      />,
    )

    const svg = screen.getByTestId('graph-svg')

    expect(svg.querySelectorAll('line')).toHaveLength(2)

    fireEvent.click(screen.getByRole('radio', { name: 'Relations' }))

    expect(svg.querySelectorAll('line')).toHaveLength(1)
    expect(screen.getByText('1 relationships')).toBeInTheDocument()
    expect(screen.getByText('1 wikilinks')).toBeInTheDocument()
  })

  it('filters graph edges to incoming backlinks around the active note', () => {
    const alpha = entry({ filename: 'alpha.md', title: 'Alpha' })
    const beta = entry({ filename: 'beta.md', title: 'Beta', outgoingLinks: ['Alpha'] })
    const gamma = entry({ filename: 'gamma.md', title: 'Gamma', outgoingLinks: ['Beta'] })

    render(
      <GraphModal
        open={true}
        entries={[alpha, beta, gamma]}
        activePath={alpha.path}
        onOpenNote={vi.fn()}
        onClose={vi.fn()}
      />,
    )

    const svg = screen.getByTestId('graph-svg')

    fireEvent.click(screen.getByRole('radio', { name: 'Incoming' }))

    expect(svg.querySelectorAll('line')).toHaveLength(1)
  })

  it('toggles graph nodes by type from the legend', () => {
    const alpha = entry({ filename: 'alpha.md', title: 'Alpha', isA: 'Project', outgoingLinks: ['Beta'] })
    const beta = entry({ filename: 'beta.md', title: 'Beta', isA: 'Reference' })

    render(
      <GraphModal
        open={true}
        entries={[alpha, beta]}
        activePath={alpha.path}
        onOpenNote={vi.fn()}
        onClose={vi.fn()}
      />,
    )

    expect(screen.getByRole('button', { name: 'Open Beta' })).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Reference 1' }))

    expect(screen.queryByRole('button', { name: 'Open Beta' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Reference 1' })).toHaveAttribute('aria-pressed', 'false')
  })
})
