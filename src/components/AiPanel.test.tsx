import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, act, waitFor, within } from '@testing-library/react'
import { AiPanel } from './AiPanel'
import { UNSUPPORTED_INLINE_PASTE_MESSAGE } from './InlineWikilinkInput'
import type { VaultEntry } from '../types'
import { queueAiPrompt } from '../utils/aiPromptBridge'
import { createAiAgentAvailability } from '../lib/aiAgents'

// Mock the hooks and utils to isolate component tests
let mockMessages: ReturnType<typeof import('../hooks/useCliAiAgent').useCliAiAgent>['messages'] = []
let mockStatus: ReturnType<typeof import('../hooks/useCliAiAgent').useCliAiAgent>['status'] = 'idle'
const mockSendMessage = vi.fn()
const mockClearConversation = vi.fn()

vi.mock('../hooks/useCliAiAgent', () => ({
  useCliAiAgent: () => ({
    messages: mockMessages,
    status: mockStatus,
    sendMessage: mockSendMessage,
    clearConversation: mockClearConversation,
  }),
}))

vi.mock('../utils/ai-chat', () => ({
  nextMessageId: () => `msg-${Date.now()}`,
}))

const makeEntry = (overrides: Partial<VaultEntry> = {}): VaultEntry => ({
  path: '/vault/note/test.md',
  filename: 'test.md',
  title: 'Test Note',
  isA: 'Note',
  aliases: [],
  belongsTo: [],
  relatedTo: [],
  status: null,
  owner: null,
  cadence: null,
  archived: false,
  modifiedAt: 1700000000,
  createdAt: 1700000000,
  fileSize: 100,
  snippet: '',
  wordCount: 0,
  relationships: {},
  icon: null,
  color: null,
  order: null,
  outgoingLinks: [],
  sidebarLabel: null,
  template: null,
  sort: null,
  view: null,
  visible: null,
  organized: false,
  favorite: false,
  favoriteIndex: null,
  listPropertiesDisplay: [],
  properties: {},
  hasH1: false,
  fileKind: 'markdown',
  ...overrides,
})

const openIntelligenceDetails = () => {
  fireEvent.click(screen.getByTestId('ai-intelligence-toggle'))
}

describe('AiPanel', () => {
  beforeEach(() => {
    mockMessages = []
    mockStatus = 'idle'
    mockSendMessage.mockReset()
    mockClearConversation.mockReset()
  })

  it('renders panel with AI Chat header', () => {
    render(<AiPanel onClose={vi.fn()} vaultPath="/tmp/vault" />)
    expect(screen.getByText('AI Chat')).toBeTruthy()
  })

  it('renders data-testid ai-panel', () => {
    render(<AiPanel onClose={vi.fn()} vaultPath="/tmp/vault" />)
    expect(screen.getByTestId('ai-panel')).toBeTruthy()
  })

  it('calls onClose when close button is clicked', () => {
    const onClose = vi.fn()
    render(<AiPanel onClose={onClose} vaultPath="/tmp/vault" />)
    const panel = screen.getByTestId('ai-panel')
    const buttons = panel.querySelectorAll('button')
    const closeBtn = Array.from(buttons).find(b => b.title?.includes('Close'))
    expect(closeBtn).toBeTruthy()
    fireEvent.click(closeBtn!)
    expect(onClose).toHaveBeenCalled()
  })

  it('starts a new AI chat when the header action is clicked', () => {
    render(<AiPanel onClose={vi.fn()} vaultPath="/tmp/vault" />)
    fireEvent.click(screen.getByTitle('New AI chat'))
    expect(mockClearConversation).toHaveBeenCalledOnce()
  })

  it('disables crystallize until there is an assistant response', () => {
    render(<AiPanel onClose={vi.fn()} vaultPath="/tmp/vault" />)
    expect(screen.getByTestId('ai-crystallize')).toBeDisabled()
  })

  it('reviews and creates a crystallized memory note from the latest AI response', async () => {
    const activeEntry = makeEntry({ title: 'Memory Ledger Plan' })
    mockMessages = [{
      userMessage: 'What should we remember?',
      actions: [],
      response: 'Memory should stay source-backed and local-first.',
      id: 'msg-crystallize',
    }]
    const onFileCreated = vi.fn()
    const onVaultChanged = vi.fn()
    const onOpenNote = vi.fn()

    render(
      <AiPanel
        onClose={vi.fn()}
        vaultPath="/tmp/vault"
        activeEntry={activeEntry}
        entries={[activeEntry]}
        onFileCreated={onFileCreated}
        onVaultChanged={onVaultChanged}
        onOpenNote={onOpenNote}
      />,
    )

    fireEvent.click(screen.getByTestId('ai-crystallize'))
    expect(screen.getByTestId('crystallize-review-dialog')).toBeInTheDocument()
    expect(screen.getByTestId('crystallize-change-list')).toHaveTextContent('Create Memory note')
    expect(screen.getByTestId('crystallize-change-list')).toHaveTextContent('Write ledger frontmatter')
    expect(screen.getByTestId('crystallize-change-list')).toHaveTextContent('Write ledger contract')
    expect(screen.getByTestId('crystallize-change-list')).toHaveTextContent('Write source backlinks')
    expect(screen.getByTestId('crystallize-change-kind-frontmatter')).toBeInTheDocument()
    expect(screen.getByTestId('crystallize-change-kind-backlink')).toBeInTheDocument()
    expect(screen.getAllByTestId('crystallize-change-kind-body')).toHaveLength(2)
    const preview = screen.getByTestId('crystallize-markdown-preview') as HTMLTextAreaElement
    expect(preview.value).toContain('type: Memory')
    expect(preview.value).toContain('memory_status: proposed')
    expect(preview.value).toContain('## Ledger Contract')
    expect(preview.value).toContain('memory_version: 1')
    expect(preview.value).toContain('## Source Links')
    expect(preview.value).toContain('Memory should stay source-backed')
    fireEvent.change(preview, {
      target: { value: preview.value.replace('Memory should stay source-backed', 'Human edited memory should stay source-backed') },
    })

    fireEvent.click(screen.getByTestId('crystallize-apply'))

    await waitFor(() => expect(onVaultChanged).toHaveBeenCalledOnce())
    expect(onFileCreated).toHaveBeenCalledWith(expect.stringMatching(/^memory\/crystallized\//))
    expect(onOpenNote).toHaveBeenCalledWith(expect.stringMatching(/^memory\/crystallized\//))
    expect(Object.values(window.__mockContent ?? {}).some((content) => (
      content.includes('Human edited memory should stay source-backed')
    ))).toBe(true)
  })

  it('shows dashboard ask package source labels in the Crystallize review dialog', () => {
    const askPackage = {
      kind: 'dashboard-ask' as const,
      prompt: 'what needs attention?',
      references: [{ path: '/vault/projects/grimoire.md', title: 'Grimoire', type: 'Project' }],
      sourceLabels: ['Grimoire', 'Identity Pass'],
      memoryReferences: [],
      visibleCount: 2,
      withheld: { protectedMemories: 1, protectedNotes: 2 },
    }
    mockMessages = [{
      userMessage: 'what needs attention?',
      references: askPackage.references,
      contextPackage: askPackage,
      actions: [],
      response: 'Sharpen the daily workflow into one memorable loop.',
      id: 'msg-dashboard-ask-crystallize',
    }]

    render(<AiPanel onClose={vi.fn()} vaultPath="/tmp/vault" entries={[]} />)

    fireEvent.click(screen.getByTestId('ai-crystallize'))

    const preview = screen.getByTestId('crystallize-markdown-preview') as HTMLTextAreaElement
    expect(preview.value).toContain('source_note: "[[Grimoire]]"')
    expect(preview.value).toContain('- [[Grimoire]]')
    expect(preview.value).toContain('- [[Identity Pass]]')
    expect(preview.value).not.toContain('protected')
    expect(preview.value).not.toContain('withheld')
  })

  it('renders empty state without context', () => {
    render(<AiPanel onClose={vi.fn()} vaultPath="/tmp/vault" />)
    expect(screen.getByText('Open a note, then ask the AI about it')).toBeTruthy()
  })

  it('renders contextual empty state when active entry is provided', () => {
    const entry = makeEntry({ title: 'My Note' })
    render(
      <AiPanel onClose={vi.fn()} vaultPath="/tmp/vault" activeEntry={entry} entries={[entry]} />
    )
    expect(screen.getByText('Ask about this note and its linked context')).toBeTruthy()
  })

  it('shows context bar with active entry title', () => {
    const entry = makeEntry({ title: 'My Note' })
    render(
      <AiPanel onClose={vi.fn()} vaultPath="/tmp/vault" activeEntry={entry} entries={[entry]} />
    )
    expect(screen.getByTestId('context-bar')).toBeTruthy()
    expect(within(screen.getByTestId('context-bar')).getByText('My Note')).toBeTruthy()
  })

  it('redacts the context bar title for local-only notes', () => {
    const entry = makeEntry({ title: 'Hidden Dream', isA: 'Dream', properties: { local_only: true } })
    render(
      <AiPanel onClose={vi.fn()} vaultPath="/tmp/vault" activeEntry={entry} entries={[entry]} />
    )

    expect(screen.getByTestId('context-bar')).toHaveTextContent('Local-only note')
    expect(screen.queryByText('Hidden Dream')).toBeNull()
    expect(within(screen.getByTestId('context-bar')).getByText('Protected')).toBeTruthy()
  })

  it('does not surface a crystallize review packet for local-only active context', () => {
    const entry = makeEntry({ title: 'Hidden Dream', isA: 'Dream', properties: { local_only: true } })
    mockMessages = [{
      userMessage: 'remember this',
      actions: [],
      response: 'This response should not become durable memory from protected context.',
      id: 'msg-local-only-crystallize',
    }]

    render(
      <AiPanel onClose={vi.fn()} vaultPath="/tmp/vault" activeEntry={entry} entries={[entry]} />,
    )

    expect(screen.getByTestId('ai-crystallize')).toBeDisabled()
    openIntelligenceDetails()
    expect(screen.getByTestId('crystallize-loop-card')).toHaveTextContent('Protected context stays local')
    expect(screen.getByTestId('crystallize-loop-card')).not.toHaveTextContent('Review packet')
    expect(screen.queryByText('Hidden Dream')).toBeNull()
    expect(screen.queryByText(/hidden-dream/i)).toBeNull()
  })

  it('shows an Agent Council with private lanes and protected-context permissions', () => {
    const entry = makeEntry({ title: 'Hidden Dream', isA: 'Dream', properties: { local_only: true } })
    render(
      <AiPanel
        onClose={vi.fn()}
        vaultPath="/tmp/vault"
        activeEntry={entry}
        defaultAiAgent="chitragupta"
        defaultAiAgentReady
        aiAgentsStatus={{
          claude_code: createAiAgentAvailability('installed', '1.0.0'),
          codex: createAiAgentAvailability('missing'),
          chitragupta: createAiAgentAvailability('installed', '0.9.0'),
        }}
      />,
    )

    openIntelligenceDetails()
    const council = screen.getByTestId('agent-council')
    expect(council).toHaveTextContent('Agent Council')
    expect(council).toHaveTextContent('Protected context')
    expect(council).toHaveTextContent('Claude Code')
    expect(council).toHaveTextContent('Codex')
    expect(council).toHaveTextContent('Chitragupta')
    expect(council).toHaveTextContent('Woosh')
    expect(council).toHaveTextContent('Tring CLI')
    expect(council).toHaveTextContent('Active local-only note withheld')
  })

  it('turns a source-safe Agent Council synthesis into a reviewed Memory proposal', async () => {
    const entry = makeEntry({ title: 'Public Plan' })
    const onFileCreated = vi.fn()
    const onVaultChanged = vi.fn()

    render(
      <AiPanel
        onClose={vi.fn()}
        vaultPath="/tmp/vault"
        activeEntry={entry}
        entries={[entry]}
        aiAgentsStatus={{
          claude_code: createAiAgentAvailability('installed', '1.0.0'),
          codex: createAiAgentAvailability('installed', '0.2.0'),
          chitragupta: createAiAgentAvailability('installed', '0.9.0'),
        }}
        onFileCreated={onFileCreated}
        onVaultChanged={onVaultChanged}
      />,
    )

    openIntelligenceDetails()
    fireEvent.click(screen.getByTestId('agent-council-review-synthesis'))
    fireEvent.click(screen.getByTestId('agent-council-crystallize-synthesis'))

    const preview = screen.getByTestId('crystallize-markdown-preview') as HTMLTextAreaElement
    expect(preview.value).toContain('source: "Agent Council"')
    expect(preview.value).toContain('source_note: "Agent Council"')
    expect(preview.value).toContain('source_notes:')
    expect(preview.value).toContain('handoff: agent_council')
    expect(preview.value).toContain('handoff_mode: "review-gated"')
    expect(preview.value).toContain('handoff_ready_lanes:')
    expect(preview.value).toContain('handoff_local_hold: false')
    expect(preview.value).not.toContain('handoff_held_local')
    expect(preview.value).toContain('handoff_source_count:')
    expect(preview.value).toContain('- "[[Public Plan]]"')
    expect(preview.value).toContain('# Agent Council synthesis')
    expect(preview.value).toContain('## Handoff Gate')
    expect(preview.value).toContain('- Held local: no')
    expect(preview.value).not.toContain('source: AI Chat')

    fireEvent.click(screen.getByTestId('crystallize-apply'))

    await waitFor(() => expect(onVaultChanged).toHaveBeenCalledOnce())
    expect(onFileCreated).toHaveBeenCalledWith(expect.stringMatching(/^memory\/crystallized\//))
    expect(Object.values(window.__mockContent ?? {}).some((content) => (
      content.includes('# Agent Council synthesis') &&
      content.includes('source: "Agent Council"') &&
      content.includes('handoff: agent_council')
    ))).toBe(true)
  })

  it('shows linked count in context bar when entry has outgoing links', () => {
    const linked = makeEntry({ path: '/vault/linked.md', title: 'Linked Note' })
    const entry = makeEntry({ title: 'My Note', outgoingLinks: ['Linked Note'] })
    render(
      <AiPanel
        onClose={vi.fn()} vaultPath="/tmp/vault"
        activeEntry={entry} entries={[entry, linked]}
             />
    )
    expect(screen.getByText('+ 1 linked')).toBeTruthy()
  })

  it('does not show context bar when no active entry', () => {
    render(<AiPanel onClose={vi.fn()} vaultPath="/tmp/vault" />)
    expect(screen.queryByTestId('context-bar')).toBeNull()
  })

  it('renders input field enabled', () => {
    render(<AiPanel onClose={vi.fn()} vaultPath="/tmp/vault" />)
    const input = screen.getByTestId('agent-input')
    expect(input).toBeTruthy()
    expect(input.tagName).toBe('TEXTAREA')
    expect(input).not.toBeDisabled()
  })

  it('has send button disabled when input is empty', () => {
    render(<AiPanel onClose={vi.fn()} vaultPath="/tmp/vault" />)
    const sendBtn = screen.getByTestId('agent-send')
    expect((sendBtn as HTMLButtonElement).disabled).toBe(true)
  })

  it('allows composing and sending a follow-up while the agent is active', () => {
    mockStatus = 'thinking'
    render(<AiPanel onClose={vi.fn()} vaultPath="/tmp/vault" />)

    const input = screen.getByTestId('agent-input')
    fireEvent.change(input, { target: { value: 'one more thing' } })
    fireEvent.click(screen.getByTestId('agent-send'))

    expect(input).not.toBeDisabled()
    expect(mockSendMessage).toHaveBeenCalledWith('one more thing', [])
  })

  it('shows contextual placeholder when active entry exists', () => {
    const entry = makeEntry({ title: 'My Note' })
    render(
      <AiPanel onClose={vi.fn()} vaultPath="/tmp/vault" activeEntry={entry} entries={[entry]} />
    )
    const input = screen.getByTestId('agent-input')
    expect(input).toHaveAttribute('placeholder', 'Ask about this note...')
  })

  it('shows generic placeholder when no active entry', () => {
    render(<AiPanel onClose={vi.fn()} vaultPath="/tmp/vault" />)
    const input = screen.getByTestId('agent-input')
    expect(input).toHaveAttribute('placeholder', 'Ask the AI agent...')
  })

  it('auto-focuses input on mount', async () => {
    vi.useFakeTimers()
    render(<AiPanel onClose={vi.fn()} vaultPath="/tmp/vault" />)
    await act(() => { vi.advanceTimersByTime(1) })
    const input = screen.getByTestId('agent-input')
    expect(document.activeElement).toBe(input)
    vi.useRealTimers()
  })

  it('focuses the panel shell when reopening with existing messages', async () => {
    vi.useFakeTimers()
    mockMessages = [{
      userMessage: 'Remember this',
      actions: [],
      response: 'Still here.',
      id: 'msg-3',
    }]
    render(<AiPanel onClose={vi.fn()} vaultPath="/tmp/vault" />)
    await act(() => { vi.advanceTimersByTime(1) })
    expect(document.activeElement).toBe(screen.getByTestId('ai-panel'))
    vi.useRealTimers()
  })

  it('calls onClose when Escape is pressed while panel has focus', async () => {
    vi.useFakeTimers()
    const onClose = vi.fn()
    render(<AiPanel onClose={onClose} vaultPath="/tmp/vault" />)
    await act(() => { vi.advanceTimersByTime(1) })
    // Input is focused inside the panel, so Escape should trigger onClose
    fireEvent.keyDown(document.activeElement!, { key: 'Escape' })
    expect(onClose).toHaveBeenCalledOnce()
    vi.useRealTimers()
  })

  it('calls onClose when Escape is pressed on panel element', () => {
    const onClose = vi.fn()
    render(<AiPanel onClose={onClose} vaultPath="/tmp/vault" />)
    const panel = screen.getByTestId('ai-panel')
    panel.focus()
    fireEvent.keyDown(panel, { key: 'Escape' })
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('clicking a wikilink in AI response calls onOpenNote with the target', async () => {
    mockMessages = [{
      userMessage: 'Tell me about notes',
      actions: [],
      response: 'Check out [[Build Grimoire App]] for details.',
      id: 'msg-1',
    }]
    const onOpenNote = vi.fn()
    const { container } = render(
      <AiPanel onClose={vi.fn()} vaultPath="/tmp/vault" onOpenNote={onOpenNote} />,
    )
    await waitFor(() => expect(container.querySelector('.chat-wikilink')).toBeTruthy())
    const wikilink = container.querySelector('.chat-wikilink')
    expect(wikilink).toBeTruthy()
    expect(wikilink!.textContent).toBe('Build Grimoire App')
    fireEvent.click(wikilink!)
    expect(onOpenNote).toHaveBeenCalledWith('Build Grimoire App')
  })

  it('renders wikilinks with special characters and clicking works', async () => {
    mockMessages = [{
      userMessage: 'Tell me about meetings',
      actions: [],
      response: 'See [[Meeting — 2024/01/15]] and [[Pasta Carbonara]].',
      id: 'msg-2',
    }]
    const onOpenNote = vi.fn()
    const { container } = render(
      <AiPanel onClose={vi.fn()} vaultPath="/tmp/vault" onOpenNote={onOpenNote} />,
    )
    await waitFor(() => expect(container.querySelectorAll('.chat-wikilink')).toHaveLength(2))
    const wikilinks = container.querySelectorAll('.chat-wikilink')
    expect(wikilinks).toHaveLength(2)
    fireEvent.click(wikilinks[0])
    expect(onOpenNote).toHaveBeenCalledWith('Meeting — 2024/01/15')
    fireEvent.click(wikilinks[1])
    expect(onOpenNote).toHaveBeenCalledWith('Pasta Carbonara')
  })

  it('auto-sends a queued prompt from the command palette bridge', async () => {
    render(<AiPanel onClose={vi.fn()} vaultPath="/tmp/vault" entries={[makeEntry({ path: '/vault/alpha.md', filename: 'alpha.md', title: 'Alpha', isA: 'Project' })]} />)

    await act(async () => {
      queueAiPrompt('summarize [[alpha]]', [
        { title: 'Alpha', path: '/vault/alpha.md', type: 'Project' },
      ])
    })

    expect(mockClearConversation).toHaveBeenCalledOnce()
    expect(mockSendMessage).toHaveBeenCalledWith('summarize [[alpha]]', [
      { title: 'Alpha', path: '/vault/alpha.md', type: 'Project' },
    ])
    expect(screen.getByTestId('agent-send')).toBeDisabled()
  })

  it('keeps dashboard ask packages visible in Council and Context Capsule after queueing', async () => {
    const askPackage = {
      kind: 'dashboard-ask' as const,
      prompt: 'what needs attention?',
      references: [{ path: '/vault/projects/grimoire.md', title: 'Grimoire', type: 'Project' }],
      sourceLabels: ['Grimoire', 'Grimoire Memory'],
      memoryReferences: [{
        confidence: 'medium',
        contradictionLabels: ['Old Plan'],
        lastSeen: '2026-05-24',
        path: '/vault/memory/grimoire.md',
        sourceLabels: ['[[Grimoire]]'],
        title: 'Grimoire Memory',
      }],
      visibleCount: 5,
      withheld: { protectedMemories: 1, protectedNotes: 2 },
    }

    render(<AiPanel onClose={vi.fn()} vaultPath="/tmp/vault" entries={[]} />)

    await act(async () => {
      queueAiPrompt('what needs attention?', askPackage.references, askPackage)
    })

    expect(mockSendMessage).toHaveBeenCalledWith('what needs attention?', askPackage.references, askPackage)
    openIntelligenceDetails()
    expect(screen.getByTestId('context-capsule-card')).toHaveTextContent('Context Capsule')
    expect(screen.getByTestId('context-capsule-card')).toHaveTextContent('2')
    expect(screen.getByTestId('agent-council')).toHaveTextContent('Grimoire')
    expect(screen.getByTestId('agent-council')).toHaveTextContent('Grimoire Memory')
    expect(screen.getByTestId('agent-council')).toHaveTextContent('Conflicts: Old Plan')
    expect(screen.getByTestId('agent-council')).toHaveTextContent('dashboard ask package')
  })

  it('surfaces an unsupported image paste notice without locking the composer', () => {
    const onUnsupportedAiPaste = vi.fn()
    const entry = makeEntry({ title: 'My Note' })

    render(
      <AiPanel
        onClose={vi.fn()}
        vaultPath="/tmp/vault"
        activeEntry={entry}
        entries={[entry]}
        onUnsupportedAiPaste={onUnsupportedAiPaste}
      />,
    )

    fireEvent.paste(screen.getByTestId('agent-input'), {
      clipboardData: {
        getData: vi.fn(() => ''),
        files: [new File(['image'], 'paste.png', { type: 'image/png' })],
        items: [{ kind: 'file', type: 'image/png' }],
      },
    })

    expect(onUnsupportedAiPaste).toHaveBeenCalledWith(UNSUPPORTED_INLINE_PASTE_MESSAGE)
    expect(screen.getByTestId('agent-input').textContent).not.toContain('paste.png')
  })
})
