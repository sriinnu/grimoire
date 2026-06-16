import { fireEvent, render, screen, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createAiAgentAvailability } from '../lib/aiAgents'
import type { VaultEntry } from '../types'
import { queueAiPrompt, requestOpenAiChat } from '../utils/aiPromptBridge'
import { GraphModal } from './GraphModal'

vi.mock('../utils/aiPromptBridge', () => ({
  queueAiPrompt: vi.fn(),
  requestOpenAiChat: vi.fn(),
}))

function entry(overrides: Partial<VaultEntry>): VaultEntry {
  return {
    aliases: [],
    archived: false,
    belongsTo: [],
    color: null,
    createdAt: null,
    favorite: false,
    favoriteIndex: null,
    fileSize: 0,
    filename: overrides.filename ?? 'note.md',
    hasH1: true,
    icon: null,
    isA: overrides.isA ?? 'Note',
    listPropertiesDisplay: [],
    modifiedAt: null,
    order: null,
    organized: false,
    outgoingLinks: overrides.outgoingLinks ?? [],
    path: `/vault/${overrides.filename ?? 'note.md'}`,
    properties: overrides.properties ?? {},
    relatedTo: [],
    relationships: overrides.relationships ?? {},
    sidebarLabel: null,
    snippet: '',
    sort: null,
    status: null,
    template: null,
    title: overrides.title ?? 'Note',
    view: null,
    visible: null,
    wordCount: 0,
  }
}

describe('GraphModal Agent Council handoff', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('reviews and queues a source-safe Agent Council prompt for the selected graph node', () => {
    const alpha = entry({ filename: 'alpha.md', title: 'Alpha', outgoingLinks: ['Beta'] })
    const beta = entry({ filename: 'beta.md', title: 'Beta', isA: 'Reference', outgoingLinks: ['Delta'] })
    const delta = entry({ filename: 'delta.md', title: 'Delta', isA: 'Reference' })

    const onClose = vi.fn()

    render(<GraphModal open={true} entries={[alpha, beta, delta]} activePath={alpha.path} onOpenNote={vi.fn()} onClose={onClose} />)

    fireEvent.click(screen.getByRole('radio', { name: 'Notebook' }))
    expect(screen.getByRole('button', { name: 'Select Delta' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Select Beta' }))
    const manifest = within(screen.getByTestId('graph-package-manifest'))
    expect(manifest.getByText('Beta')).toBeInTheDocument()
    expect(manifest.getByText('Beta -> Delta')).toBeInTheDocument()
    expect(within(screen.getByTestId('graph-selected-node')).getByText('3 source labels eligible for Council.')).toBeInTheDocument()
    fireEvent.click(within(screen.getByTestId('graph-selected-node')).getByRole('button', { name: 'Ask Council' }))
    expect(screen.getByTestId('graph-council-review-dialog')).toHaveTextContent('Review graph Council handoff')
    fireEvent.click(screen.getByRole('button', { name: 'Open AI with packet' }))

    expect(queueAiPrompt).toHaveBeenCalledWith(
      expect.stringContaining('graph node Beta'),
      expect.arrayContaining([{ path: beta.path, title: 'Beta', type: 'Reference' }, { path: delta.path, title: 'Delta', type: 'Reference' }]),
      expect.objectContaining({ kind: 'graph-council', graph: expect.objectContaining({ visibleEdges: 2, visibleNodes: 3 }) }),
    )
    expect(requestOpenAiChat).toHaveBeenCalledOnce()
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('shows source-safe graph Agent Council lanes before handoff', () => {
    const alpha = entry({ filename: 'alpha.md', title: 'Alpha', outgoingLinks: ['Beta'] })
    const beta = entry({ filename: 'beta.md', title: 'Beta' })

    render(
      <GraphModal
        open={true}
        entries={[alpha, beta]}
        activePath={alpha.path}
        defaultAiAgent="chitragupta"
        defaultAiProvider="google"
        defaultAiModel="gemini-2.5-pro"
        aiAgentsStatus={{
          chitragupta: createAiAgentAvailability('installed'),
          codex: createAiAgentAvailability('installed'),
          claude_code: createAiAgentAvailability('installed'),
        }}
        onOpenNote={vi.fn()}
        onClose={vi.fn()}
      />,
    )

    const council = within(screen.getByTestId('graph-agent-council'))
    const runway = within(screen.getByTestId('graph-agent-runway'))
    const commandCenter = within(screen.getByTestId('graph-agent-command-center'))
    expect(screen.getByRole('button', { name: 'Select Alpha' })).toHaveClass('grimoire-graph-node--source-safe')
    expect(screen.getByTestId('graph-canvas-selected-summary')).toHaveTextContent('Selected Alpha')
    expect(commandCenter.getByText('Ready for review')).toBeInTheDocument()
    expect(commandCenter.getByText(/source labels and 1 links can be reviewed/)).toBeInTheDocument()
    expect(commandCenter.getByTestId('graph-working-memory')).toHaveTextContent('2Nodes')
    expect(commandCenter.getByTestId('graph-working-memory')).toHaveTextContent('1Links')
    expect(runway.getByText('2 notes / 1 link.')).toBeInTheDocument()
    expect(runway.getByText('Codex / Claude Code')).toBeInTheDocument()
    expect(runway.getByText('provider: google · model: gemini-2.5-pro')).toBeInTheDocument()
    expect(council.getByText('Chitragupta')).toBeInTheDocument()
    expect(council.getByText('Claude Code')).toBeInTheDocument()
    expect(council.getAllByText('Source-safe')).toHaveLength(4)
    expect(council.getByText('MCP unverified')).toBeInTheDocument()
    expect(runway.getByText('MCP contract unverified')).toBeInTheDocument()
  })

  it('keeps graph content scroll-contained inside the dialog shell', () => {
    const alpha = entry({ filename: 'alpha.md', title: 'Alpha', outgoingLinks: ['Beta'] })
    const beta = entry({ filename: 'beta.md', title: 'Beta' })

    render(<GraphModal open={true} entries={[alpha, beta]} activePath={alpha.path} onOpenNote={vi.fn()} onClose={vi.fn()} />)

    const dialog = screen.getByTestId('graph-dialog-content')
    expect(dialog.className).toContain('max-h-[calc(100dvh-2rem)]')
    expect(dialog.className).toContain('overflow-hidden')
    expect(screen.getByTestId('graph-right-rail').className).toContain('overflow-y-auto')
    const closeButtons = within(dialog).getAllByRole('button', { name: 'Close' })
    expect(closeButtons.some((button) => button.textContent === 'Close')).toBe(true)
  })

  it('blocks Agent Council handoff for a protected selected graph node', () => {
    const publicNote = entry({ filename: 'public.md', title: 'Public Note', outgoingLinks: ['Secret Dream'] })
    const protectedDream = entry({ filename: 'dream.md', title: 'Secret Dream', isA: 'Dream', properties: { locality: 'local-only' } })

    render(<GraphModal open={true} entries={[publicNote, protectedDream]} activePath={publicNote.path} onOpenNote={vi.fn()} onClose={vi.fn()} />)

    const protectedNode = screen.getByRole('button', { name: 'Select Secret Dream local-only visible here, withheld from agents' })
    fireEvent.click(protectedNode)
    const selected = within(screen.getByTestId('graph-selected-node'))
    const council = within(screen.getByTestId('graph-agent-council'))
    const runway = within(screen.getByTestId('graph-agent-runway'))
    expect(protectedNode).toHaveClass('grimoire-graph-node--local')
    expect(selected.queryByText('Secret Dream')).not.toBeInTheDocument()
    expect(selected.getByRole('button', { name: 'Ask Council' })).toBeDisabled()
    expect(council.getAllByText('Blocked')).toHaveLength(2)
    expect(council.getByText('Private')).toBeInTheDocument()
    expect(runway.getByText('External agents are blocked by the Locality Firewall.')).toBeInTheDocument()
    expect(queueAiPrompt).not.toHaveBeenCalled()
  })

  it('shows protected graph items as held before source-safe Council handoff', () => {
    const publicNote = entry({ filename: 'public.md', title: 'Public Note', outgoingLinks: ['Public Neighbor', 'Secret Dream'] })
    const protectedDream = entry({ filename: 'dream.md', title: 'Secret Dream', isA: 'Dream', properties: { locality: 'local-only' } })
    const neighbor = entry({ filename: 'neighbor.md', title: 'Public Neighbor' })

    render(<GraphModal open={true} entries={[publicNote, neighbor, protectedDream]} activePath={publicNote.path} onOpenNote={vi.fn()} onClose={vi.fn()} />)

    fireEvent.click(screen.getByRole('button', { name: 'Select Public Neighbor' }))
    const handoff = within(screen.getByTestId('graph-agent-handoff'))
    expect(handoff.getByText('Public Neighbor')).toBeInTheDocument()
    expect(handoff.queryByText('Secret Dream')).not.toBeInTheDocument()
    expect(within(screen.getByTestId('graph-selected-node')).getByText('2 source labels eligible for Council, 2 held from agents.')).toBeInTheDocument()
  })

  it('blocks graph Council handoff while the selected agent route is missing', () => {
    const alpha = entry({ filename: 'alpha.md', title: 'Alpha', outgoingLinks: ['Beta'] })
    const beta = entry({ filename: 'beta.md', title: 'Beta' })

    render(
      <GraphModal
        open={true}
        entries={[alpha, beta]}
        activePath={alpha.path}
        defaultAiAgent="chitragupta"
        defaultAiProvider="google"
        aiAgentsStatus={{
          chitragupta: createAiAgentAvailability('missing'),
          codex: createAiAgentAvailability('installed'),
          claude_code: createAiAgentAvailability('installed'),
        }}
        onOpenNote={vi.fn()}
        onClose={vi.fn()}
      />,
    )

    const selected = within(screen.getByTestId('graph-selected-node'))
    expect(selected.getByText('2 source labels ready, but the selected agent route is missing.')).toBeInTheDocument()
    expect(selected.getByText('Install or switch the selected agent route before Council handoff.')).toBeInTheDocument()
    expect(selected.getByRole('button', { name: 'Ask Council' })).toBeDisabled()
    expect(screen.getByTestId('graph-agent-runway')).toHaveTextContent('Agent missing')
    expect(queueAiPrompt).not.toHaveBeenCalled()
    expect(requestOpenAiChat).not.toHaveBeenCalled()
  })

  it('blocks graph Council handoff while the selected agent route is still checking', () => {
    const alpha = entry({ filename: 'alpha.md', title: 'Alpha', outgoingLinks: ['Beta'] })
    const beta = entry({ filename: 'beta.md', title: 'Beta' })

    render(
      <GraphModal
        open={true}
        entries={[alpha, beta]}
        activePath={alpha.path}
        defaultAiAgent="chitragupta"
        aiAgentsStatus={{
          chitragupta: createAiAgentAvailability('checking'),
          codex: createAiAgentAvailability('installed'),
          claude_code: createAiAgentAvailability('installed'),
        }}
        onOpenNote={vi.fn()}
        onClose={vi.fn()}
      />,
    )

    const selected = within(screen.getByTestId('graph-selected-node'))
    expect(selected.getByText('2 source labels ready, but the selected agent route is still checking.')).toBeInTheDocument()
    expect(selected.getByText('Wait for agent route health before Council handoff.')).toBeInTheDocument()
    expect(selected.getByRole('button', { name: 'Ask Council' })).toBeDisabled()
    expect(screen.getByTestId('graph-agent-runway')).toHaveTextContent('Agent checking')
    expect(queueAiPrompt).not.toHaveBeenCalled()
    expect(requestOpenAiChat).not.toHaveBeenCalled()
  })

  it('keeps duplicate-title graph packages distinct through review and queueing', () => {
    const hub = entry({ filename: 'hub.md', title: 'Hub', outgoingLinks: ['projects/index', 'archive/index'] })
    const projectIndex = entry({ filename: 'index.md', title: 'Index' })
    projectIndex.path = '/vault/projects/index.md'
    const archiveIndex = entry({ filename: 'index.md', title: 'Index' })
    archiveIndex.path = '/vault/archive/index.md'

    render(
      <GraphModal
        open={true}
        entries={[hub, projectIndex, archiveIndex]}
        activePath={hub.path}
        onOpenNote={vi.fn()}
        onClose={vi.fn()}
      />,
    )

    fireEvent.click(screen.getByRole('radio', { name: 'Notebook' }))
    fireEvent.click(within(screen.getByTestId('graph-selected-node')).getByRole('button', { name: 'Ask Council' }))
    const review = screen.getByTestId('graph-council-review-dialog')
    expect(review).toHaveTextContent('Hub')
    expect(review).toHaveTextContent('Index - projects/index.md')
    expect(review).toHaveTextContent('Index - archive/index.md')
    const promptPreview = screen.getByTestId('graph-council-review-prompt') as HTMLTextAreaElement
    expect(promptPreview.value).not.toContain('[[Index]]')
    fireEvent.click(screen.getByRole('button', { name: 'Open AI with packet' }))

    expect(queueAiPrompt).toHaveBeenCalledWith(
      expect.stringContaining('graph node Hub'),
      expect.arrayContaining([
        { path: hub.path, title: 'Hub', type: 'Note' },
        { path: projectIndex.path, title: 'Index', type: 'Note' },
        { path: archiveIndex.path, title: 'Index', type: 'Note' },
      ]),
      expect.objectContaining({
        sourceLabels: ['Hub', 'Index - projects/index.md', 'Index - archive/index.md'],
      }),
    )
  })
})
