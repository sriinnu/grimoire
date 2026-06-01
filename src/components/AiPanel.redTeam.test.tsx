import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi, beforeEach } from 'vitest'
import type { VaultEntry } from '../types'
import { AiPanel } from './AiPanel'

let mockMessages: ReturnType<typeof import('../hooks/useCliAiAgent').useCliAiAgent>['messages'] = []
let mockStatus: ReturnType<typeof import('../hooks/useCliAiAgent').useCliAiAgent>['status'] = 'idle'

vi.mock('../hooks/useCliAiAgent', () => ({
  useCliAiAgent: () => ({
    messages: mockMessages,
    status: mockStatus,
    sendMessage: vi.fn(),
    clearConversation: vi.fn(),
  }),
}))

vi.mock('../utils/ai-chat', () => ({
  nextMessageId: () => 'msg-red-team',
}))

function entry(overrides: Partial<VaultEntry> = {}): VaultEntry {
  return {
    path: '/vault/private/secret-plan.md',
    filename: 'secret-plan.md',
    title: 'Secret Plan',
    isA: 'Plan',
    aliases: [],
    belongsTo: [],
    relatedTo: [],
    status: null,
    archived: false,
    modifiedAt: 1700000000,
    createdAt: 1700000000,
    fileSize: 0,
    snippet: '',
    wordCount: 0,
    relationships: {},
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
    outgoingLinks: [],
    properties: {},
    hasH1: true,
    fileKind: 'markdown',
    ...overrides,
  }
}

describe('AiPanel red-team card', () => {
  beforeEach(() => {
    mockMessages = []
    mockStatus = 'idle'
  })

  it('renders local red-team critique without leaking protected title, path, or raw content', () => {
    render(
      <AiPanel
        onClose={vi.fn()}
        vaultPath="/vault"
        activeEntry={entry({ properties: { locality: 'local-only' } })}
        activeNoteContent="Send the secret board to S3 without asking."
        entries={[]}
      />,
    )

    fireEvent.click(screen.getByTestId('ai-intelligence-toggle'))
    const card = screen.getByTestId('red-team-plan-card')
    expect(card).toHaveTextContent('Red-Team My Plan')
    expect(card).toHaveTextContent('Local-only')
    expect(card).toHaveTextContent('Privacy')
    expect(card).toHaveTextContent('Evidence')
    expect(card).not.toHaveTextContent('Secret Plan')
    expect(card).not.toHaveTextContent('/vault/private')
    expect(card).not.toHaveTextContent('secret board')
  })

  it('opens a source-safe Markdown patch-plan preview for protected notes', () => {
    render(
      <AiPanel
        onClose={vi.fn()}
        vaultPath="/vault"
        activeEntry={entry({ properties: { locality: 'local-only' } })}
        activeNoteContent="Send the secret board to S3 without asking."
        entries={[]}
      />,
    )

    fireEvent.click(screen.getByTestId('ai-intelligence-toggle'))
    fireEvent.click(screen.getByTestId('red-team-review-plan'))

    const dialog = screen.getByTestId('red-team-plan-dialog')
    const preview = screen.getByTestId('red-team-plan-markdown') as HTMLTextAreaElement
    expect(dialog).toHaveTextContent('Protected local context')
    expect(preview.value).toContain('# Red-Team Patch Plan')
    expect(preview.value).toContain('Protected context; content stayed local')
    expect(preview.value).toContain('Add one user-facing outcome')
    expect(preview.value).not.toContain('Secret Plan')
    expect(preview.value).not.toContain('/vault/private')
    expect(preview.value).not.toContain('secret board')
  })
})
