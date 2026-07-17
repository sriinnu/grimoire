import { fireEvent, render, screen, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { VaultEntry } from '../types'
import { GraphModal } from './GraphModal'

function entry(overrides: Partial<VaultEntry>): VaultEntry {
  return {
    path: `/vault/${overrides.filename ?? 'note.md'}`,
    filename: overrides.filename ?? 'note.md',
    title: overrides.title ?? 'Note',
    isA: overrides.isA ?? 'Note',
    aliases: [], belongsTo: [], relatedTo: [], status: null, archived: false,
    modifiedAt: null, createdAt: null, fileSize: 0, snippet: '', wordCount: 0,
    relationships: overrides.relationships ?? {}, icon: null, color: null, order: null,
    sidebarLabel: null, template: null, sort: null, view: null, visible: null,
    organized: false, favorite: false, favoriteIndex: null, listPropertiesDisplay: [],
    outgoingLinks: overrides.outgoingLinks ?? [], properties: overrides.properties ?? {}, hasH1: true,
  }
}

describe('GraphModal', () => {
  it('does not mount the relationship map while closed', () => {
    render(<GraphModal open={false} entries={[entry({ filename: 'alpha.md', title: 'Alpha' })]} activePath={null} onOpenNote={vi.fn()} onClose={vi.fn()} />)
    expect(screen.queryByTestId('graph-svg')).not.toBeInTheDocument()
  })

  it('explains explicit outgoing relationships and opens the related document', () => {
    const alpha = entry({ filename: 'alpha.md', title: 'Alpha', relationships: { related_to: ['Beta'] }, outgoingLinks: ['Gamma'] })
    const beta = entry({ filename: 'beta.md', title: 'Beta', isA: 'Decision' })
    const gamma = entry({ filename: 'gamma.md', title: 'Gamma', isA: 'Reference' })
    const onOpenNote = vi.fn()
    render(<GraphModal open entries={[alpha, beta, gamma]} activePath={alpha.path} onOpenNote={onOpenNote} onClose={vi.fn()} />)

    expect(screen.getByRole('heading', { name: 'Document relationships' })).toBeInTheDocument()
    expect(screen.getByTestId('graph-dialog-summary')).toHaveTextContent('Focused neighborhood')
    const inspector = within(screen.getByTestId('graph-relationship-inspector'))
    expect(inspector.getByText('Alpha')).toBeInTheDocument()
    expect(inspector.getByText('Links from this page')).toBeInTheDocument()
    expect(inspector.getByText('related_to · Decision')).toBeInTheDocument()
    expect(inspector.getByText('Wikilink · Reference')).toBeInTheDocument()
    expect(screen.queryByTestId('graph-agent-command-center')).not.toBeInTheDocument()
    expect(screen.queryByTestId('graph-agent-handoff')).not.toBeInTheDocument()

    fireEvent.click(inspector.getByRole('button', { name: /Beta/ }))
    expect(onOpenNote).toHaveBeenCalledWith(beta)
  })

  it('shows backlinks separately from outgoing links', () => {
    const alpha = entry({ filename: 'alpha.md', title: 'Alpha' })
    const beta = entry({ filename: 'beta.md', title: 'Beta', outgoingLinks: ['Alpha'] })
    render(<GraphModal open entries={[alpha, beta]} activePath={alpha.path} onOpenNote={vi.fn()} onClose={vi.fn()} />)

    const inspector = within(screen.getByTestId('graph-relationship-inspector'))
    expect(inspector.getByText('Mentioned by')).toBeInTheDocument()
    expect(inspector.getByText('Beta')).toBeInTheDocument()
    expect(inspector.getByText('Wikilink · Note')).toBeInTheDocument()
  })

  it('claims no focus when nothing is selected and no note is active', () => {
    const alpha = entry({ filename: 'alpha.md', title: 'Alpha', outgoingLinks: ['Beta'] })
    const beta = entry({ filename: 'beta.md', title: 'Beta' })
    render(<GraphModal open entries={[alpha, beta]} activePath={null} onOpenNote={vi.fn()} onClose={vi.fn()} />)

    // No phantom fallback to an arbitrary first node — the inspector stays honest.
    expect(within(screen.getByTestId('graph-relationship-inspector'))
      .getByText('Select a page to inspect its links and backlinks.')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Select Alpha' }))
    const inspector = within(screen.getByTestId('graph-relationship-inspector'))
    expect(inspector.getByText('Links from this page')).toBeInTheDocument()
    expect(inspector.queryByText('Select a page to inspect its links and backlinks.')).not.toBeInTheDocument()
  })

  it('keeps a filtered whole-vault overview available as a secondary mode', () => {
    const alpha = entry({ filename: 'alpha.md', title: 'Alpha', outgoingLinks: ['Beta'] })
    const beta = entry({ filename: 'beta.md', title: 'Beta' })
    const gamma = entry({ filename: 'gamma.md', title: 'Gamma' })
    render(<GraphModal open entries={[alpha, beta, gamma]} activePath={alpha.path} onOpenNote={vi.fn()} onClose={vi.fn()} />)

    fireEvent.click(screen.getByRole('radio', { name: 'Notebook' }))
    fireEvent.change(screen.getByTestId('graph-filter'), { target: { value: 'alpha' } })
    expect(screen.getByTestId('graph-dialog-summary')).toHaveTextContent('Vault overview')
    expect(screen.getByRole('button', { name: 'Select Alpha' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Select Beta' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Select Gamma' })).not.toBeInTheDocument()
  })
})
