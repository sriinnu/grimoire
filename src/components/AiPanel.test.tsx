import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, act, waitFor, within } from '@testing-library/react'
import { AiPanel } from './AiPanel'
import { UNSUPPORTED_INLINE_PASTE_MESSAGE } from './InlineWikilinkInput'
import type { VaultEntry } from '../types'
import { queueAiPrompt } from '../utils/aiPromptBridge'

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
    expect(screen.getByTestId('crystallize-change-list')).toHaveTextContent('Write loop receipt')
    expect(screen.getByTestId('crystallize-change-list')).toHaveTextContent('Write source backlinks')
    expect(screen.getByTestId('crystallize-change-kind-frontmatter')).toBeInTheDocument()
    expect(screen.getByTestId('crystallize-change-kind-backlink')).toBeInTheDocument()
    expect(screen.getAllByTestId('crystallize-change-kind-body')).toHaveLength(3)
    const preview = screen.getByTestId('crystallize-markdown-preview') as HTMLTextAreaElement
    expect(preview.value).toContain('type: Memory')
    expect(preview.value).toContain('memory_status: proposed')
    expect(preview.value).toContain('## Ledger Contract')
    expect(preview.value).toContain('## Crystallize Loop')
    expect(preview.value).toContain('crystallize_receipt: "crys-')
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
    expect(screen.getByText('Open a note to give this conversation context.')).toBeTruthy()
  })

  it('renders contextual empty state when active entry is provided', () => {
    const entry = makeEntry({ title: 'My Note' })
    render(
      <AiPanel onClose={vi.fn()} vaultPath="/tmp/vault" activeEntry={entry} entries={[entry]} />
    )
    expect(screen.getByText('Ask about this note.')).toBeTruthy()
  })

  it('keeps active context to one compact, inspectable line', () => {
    const linked = makeEntry({ path: '/vault/linked.md', title: 'Linked Note' })
    const entry = makeEntry({ title: 'My Note', outgoingLinks: ['Linked Note'] })
    render(
      <AiPanel onClose={vi.fn()} vaultPath="/tmp/vault" activeEntry={entry} entries={[entry, linked]} />,
    )

    expect(screen.getByTestId('ai-intelligence-summary')).toHaveTextContent('Context')
    expect(screen.getByTestId('ai-intelligence-summary')).toHaveTextContent('2 sources')
    expect(screen.getByTestId('ai-context-inspector')).toHaveTextContent('Inspect')
    expect(screen.queryByTestId('ai-panel-brief')).not.toBeInTheDocument()
    expect(screen.queryByTestId('agent-council')).not.toBeInTheDocument()
  })

  it('keeps the context affordance small while a conversation is active', () => {
    const entry = makeEntry({ title: 'My Note' })
    mockMessages = [{
      userMessage: 'hi',
      actions: [],
      response: 'hello',
      id: 'msg-brief-collapse',
    }]
    render(
      <AiPanel onClose={vi.fn()} vaultPath="/tmp/vault" activeEntry={entry} entries={[entry]} />,
    )

    expect(screen.getByTestId('ai-intelligence-summary')).toHaveTextContent('Context')
    expect(screen.queryByTestId('ai-panel-brief')).not.toBeInTheDocument()
  })

  it('marks local-only context without exposing its title in the context affordance', () => {
    const entry = makeEntry({ title: 'Hidden Dream', isA: 'Dream', properties: { local_only: true } })
    render(
      <AiPanel onClose={vi.fn()} vaultPath="/tmp/vault" activeEntry={entry} entries={[entry]} />,
    )

    const summary = screen.getByTestId('ai-intelligence-summary')
    expect(summary).toHaveTextContent('Local-only')
    expect(summary).not.toHaveTextContent('Hidden Dream')
  })

  it('does not show a context affordance when there is no active entry', () => {
    render(<AiPanel onClose={vi.fn()} vaultPath="/tmp/vault" />)
    expect(screen.queryByTestId('ai-intelligence-summary')).toBeNull()
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

  it('keeps protected context out of default Second Brain chrome', () => {
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
    expect(screen.queryByTestId('agent-council')).not.toBeInTheDocument()
    expect(screen.queryByTestId('context-capsule-card')).not.toBeInTheDocument()
    fireEvent.click(screen.getByTestId('ai-context-inspector'))
    expect(screen.getByTestId('context-capsule-dialog')).toHaveTextContent('Protected local context')
    expect(screen.queryByText('Hidden Dream')).toBeNull()
    expect(screen.queryByText(/hidden-dream/i)).toBeNull()
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

  it('keeps dashboard ask packages inspectable after queueing', async () => {
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
    expect(screen.getByTestId('ai-intelligence-summary')).toHaveTextContent('2 sources')
    expect(screen.queryByTestId('agent-council')).not.toBeInTheDocument()
    fireEvent.click(screen.getByTestId('ai-context-inspector'))
    expect(screen.getByTestId('context-manifest-sources')).toHaveTextContent('Grimoire')
    expect(screen.getByTestId('context-manifest-sources')).toHaveTextContent('Grimoire Memory')
    expect(screen.getByTestId('context-capsule-dialog')).not.toHaveTextContent('Agent Council')
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
