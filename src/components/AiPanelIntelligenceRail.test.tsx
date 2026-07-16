import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import type React from 'react'
import { describe, expect, it, vi } from 'vitest'
import { resolveEntryLocalityPolicy } from '../lib/localityPolicy'
import type { VaultEntry } from '../types'
import { AiPanelIntelligenceRail } from './AiPanelIntelligenceRail'

function entry(overrides: Partial<VaultEntry> = {}): VaultEntry {
  return {
    path: '/vault/secret-plan.md', filename: 'secret-plan.md', title: 'Secret Plan', isA: 'Plan',
    aliases: [], belongsTo: [], relatedTo: [], status: null, archived: false,
    modifiedAt: 1700000000, createdAt: 1700000000, fileSize: 0, snippet: '', wordCount: 0,
    relationships: {}, icon: null, color: null, order: null, sidebarLabel: null, template: null,
    sort: null, view: null, visible: null, organized: false, favorite: false, favoriteIndex: null,
    listPropertiesDisplay: [], outgoingLinks: [], properties: {}, hasH1: true, fileKind: 'markdown',
    ...overrides,
  }
}

function renderRail(activeEntry: VaultEntry, overrides: Partial<React.ComponentProps<typeof AiPanelIntelligenceRail>> = {}) {
  return render(
    <AiPanelIntelligenceRail
      activeEntry={activeEntry}
      activePolicy={resolveEntryLocalityPolicy(activeEntry)}
      canCrystallize={false}
      crystallizeBlockedReason="Send an AI message first."
      defaultAiAgent="codex"
      defaultAiAgentReady
      entries={[activeEntry]}
      hasContext
      hasLatestResponse={false}
      linkedEntries={[]}
      onCrystallize={vi.fn()}
      proposalSummary={null}
      {...overrides}
    />,
  )
}

describe('AiPanelIntelligenceRail', () => {
  it('keeps the idle chat rail to an inspectable context line', () => {
    const activeEntry = entry({ title: 'Alpha Active', path: '/vault/alpha.md', filename: 'alpha.md' })
    renderRail(activeEntry)

    const summary = screen.getByTestId('ai-intelligence-summary')
    expect(summary).toHaveTextContent('Context')
    expect(summary).toHaveTextContent('1 source')
    expect(summary).toHaveTextContent('Inspect')
    expect(screen.queryByTestId('agent-council')).not.toBeInTheDocument()
    expect(screen.queryByTestId('context-capsule-card')).not.toBeInTheDocument()

    fireEvent.click(screen.getByTestId('ai-context-inspector'))
    expect(screen.getByTestId('context-capsule-dialog')).toHaveTextContent('Context Inspector')
    expect(screen.getByTestId('context-manifest-json')).toHaveTextContent('alpha.md')
  })

  it('puts a graph ask package in the inspector instead of rendering a Council dashboard', () => {
    const activeEntry = entry({ title: 'Alpha Active', path: '/vault/alpha.md', filename: 'alpha.md' })
    renderRail(activeEntry, {
      askContextPackage: {
        graph: { edges: [], protectedEdges: 0, truncatedEdges: 0, truncatedNodes: 0, visibleEdges: 0, visibleNodes: 2 },
        kind: 'graph-council', memoryReferences: [], prompt: 'Ask about [[Beta]].',
        references: [{ path: '/vault/beta.md', title: 'Beta', type: 'Reference' }],
        sourceLabels: ['Beta'], visibleCount: 1, withheld: { protectedMemories: 0, protectedNotes: 0 },
      },
    })

    expect(screen.getByTestId('ai-intelligence-summary')).toHaveTextContent('1 source')
    fireEvent.click(screen.getByTestId('ai-context-inspector'))
    expect(screen.getByTestId('context-manifest-sources')).toHaveTextContent('Beta')
    expect(screen.getByTestId('context-capsule-dialog')).not.toHaveTextContent('Alpha Active')
    expect(screen.queryByTestId('agent-council')).not.toBeInTheDocument()
  })

  it('reports the graph neighborhood the send path actually attaches', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText } })
    const activeEntry = entry({ title: 'Alpha Active', path: '/vault/alpha.md', filename: 'alpha.md', outgoingLinks: ['Beta'] })
    const beta = entry({ title: 'Beta', path: '/vault/beta.md', filename: 'beta.md' })
    renderRail(activeEntry, { entries: [activeEntry, beta] })

    fireEvent.click(screen.getByTestId('ai-context-inspector'))
    fireEvent.click(screen.getByRole('button', { name: 'Copy Markdown' }))
    await waitFor(() => expect(writeText).toHaveBeenCalledOnce())
    const markdown = writeText.mock.calls[0][0] as string
    expect(markdown).toContain('Source-safe graph notes: 2')
    expect(markdown).toContain('Source-safe graph edges: 1')
    Reflect.deleteProperty(navigator, 'clipboard')
  })

  it('keeps a protected note local even inside the inspector', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText } })
    const activeEntry = entry({ properties: { locality: 'local-only' } })
    renderRail(activeEntry)

    expect(screen.getByTestId('ai-intelligence-summary')).toHaveTextContent('Local-only')
    fireEvent.click(screen.getByTestId('ai-context-inspector'))
    fireEvent.click(screen.getByRole('button', { name: 'Copy Markdown' }))
    await waitFor(() => expect(writeText).toHaveBeenCalledOnce())
    const markdown = writeText.mock.calls[0][0] as string
    expect(markdown).toContain('Protected active context stayed local')
    expect(markdown).not.toContain('Secret Plan')
    expect(markdown).not.toContain('/vault/secret-plan.md')
    Reflect.deleteProperty(navigator, 'clipboard')
  })
})
