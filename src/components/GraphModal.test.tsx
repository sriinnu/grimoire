import { fireEvent, render, screen, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
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
    properties: overrides.properties ?? {},
    hasH1: true,
  }
}

describe('GraphModal', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })
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

  it('selects graph nodes and opens the selected note from the detail panel', () => {
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
    expect(screen.getByTestId('graph-dialog-content')).toHaveClass('max-h-[calc(100dvh-2rem)]', 'overflow-hidden')
    expect(screen.getByTestId('graph-right-rail')).toHaveClass('min-h-0', 'overflow-y-auto')
    expect(screen.getByTestId('graph-canvas')).toHaveClass('grimoire-constellation-focus')
    expect(screen.getByRole('button', { name: 'Select Alpha' })).toHaveClass('grimoire-graph-node--active')

    fireEvent.click(screen.getByRole('radio', { name: 'Vault' }))
    fireEvent.click(screen.getByRole('button', { name: 'Select Beta' }))
    const selected = within(screen.getByTestId('graph-selected-node'))
    expect(selected.getByText('Beta')).toBeInTheDocument()
    fireEvent.click(selected.getByRole('button', { name: 'Open' }))

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

    expect(screen.getByRole('button', { name: 'Select Alpha' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Select Beta' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Select Gamma' })).not.toBeInTheDocument()
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

    expect(svg.querySelectorAll('line.grimoire-graph-edge')).toHaveLength(2)

    fireEvent.click(screen.getByRole('radio', { name: 'Relations' }))

    expect(svg.querySelectorAll('line.grimoire-graph-edge')).toHaveLength(1)
    expect(screen.getByText('1 relationships')).toBeInTheDocument()
    expect(screen.getByText('1 Spelllinks')).toBeInTheDocument()
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

    expect(svg.querySelectorAll('line.grimoire-graph-edge')).toHaveLength(1)
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

    expect(screen.getByRole('button', { name: 'Select Beta' })).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Reference 1' }))

    expect(screen.queryByRole('button', { name: 'Select Beta' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Reference 1' })).toHaveAttribute('aria-pressed', 'false')
  })

  it('keeps agent handoff scoped to the graph filters the user can see', () => {
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

    expect(within(screen.getByTestId('graph-agent-handoff')).getByText(/2 notes and 1 links/)).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Reference 1' }))

    expect(within(screen.getByTestId('graph-agent-handoff')).getByText(/1 notes and 0 links/)).toBeInTheDocument()
  })

  it('shows graph connectors and opens one from the insight panel', () => {
    const alpha = entry({ filename: 'alpha.md', title: 'Alpha', outgoingLinks: ['Beta', 'Gamma'] })
    const beta = entry({ filename: 'beta.md', title: 'Beta', outgoingLinks: ['Gamma'] })
    const gamma = entry({ filename: 'gamma.md', title: 'Gamma' })
    const onOpenNote = vi.fn()

    render(
      <GraphModal
        open={true}
        entries={[alpha, beta, gamma]}
        activePath={alpha.path}
        onOpenNote={onOpenNote}
        onClose={vi.fn()}
      />,
    )

    const panel = within(screen.getByTestId('graph-insight-panel'))

    expect(panel.getByText('Alpha')).toBeInTheDocument()
    fireEvent.click(panel.getByRole('button', { name: /Beta/ }))

    expect(onOpenNote).toHaveBeenCalledWith(beta)
  })

  it('redacts protected connector labels inside the graph insight handoff area', () => {
    const publicNote = entry({ filename: 'public.md', title: 'Public Note', outgoingLinks: ['Secret Dream'] })
    const protectedDream = entry({
      filename: 'dream.md',
      title: 'Secret Dream',
      isA: 'Dream',
      properties: { locality: 'local-only' },
    })

    render(
      <GraphModal
        open={true}
        entries={[publicNote, protectedDream]}
        activePath={publicNote.path}
        onOpenNote={vi.fn()}
        onClose={vi.fn()}
      />,
    )

    const insight = within(screen.getByTestId('graph-insight-panel'))

    expect(insight.getByText('Protected local note')).toBeInTheDocument()
    expect(insight.queryByText('Secret Dream')).not.toBeInTheDocument()
  })

  it('shows source-safe agent handoff counts without leaking a protected active title', () => {
    const protectedDream = entry({
      filename: 'dream.md',
      title: 'Secret Dream',
      isA: 'Dream',
      outgoingLinks: ['Public Note'],
      properties: { locality: 'local-only' },
    })
    const publicNote = entry({ filename: 'public.md', title: 'Public Note' })

    render(
      <GraphModal
        open={true}
        entries={[protectedDream, publicNote]}
        activePath={protectedDream.path}
        onOpenNote={vi.fn()}
        onClose={vi.fn()}
      />,
    )

    const handoff = within(screen.getByTestId('graph-agent-handoff'))

    expect(handoff.getByText('Blocked')).toBeInTheDocument()
    expect(handoff.getByText(/held by Locality Firewall/)).toBeInTheDocument()
    expect(handoff.queryByText('Secret Dream')).not.toBeInTheDocument()
  })
})
