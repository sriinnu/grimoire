import { beforeEach, describe, expect, it, vi } from 'vitest'

const {
  buildAgentSystemPromptMock,
  formatMessageWithHistoryMock,
  nextMessageIdMock,
  trimHistoryMock,
} = vi.hoisted(() => ({
  buildAgentSystemPromptMock: vi.fn(() => 'SYSTEM'),
  formatMessageWithHistoryMock: vi.fn((_history: unknown, prompt: string) => `formatted:${prompt}`),
  nextMessageIdMock: vi.fn(),
  trimHistoryMock: vi.fn((history: unknown) => history),
}))

vi.mock('../utils/ai-agent', () => ({
  buildAgentSystemPrompt: buildAgentSystemPromptMock,
}))

vi.mock('../utils/ai-chat', () => ({
  MAX_HISTORY_TOKENS: 100_000,
  formatMessageWithHistory: formatMessageWithHistoryMock,
  nextMessageId: nextMessageIdMock,
  trimHistory: trimHistoryMock,
}))

import { buildFormattedMessage } from './aiAgentConversation'

describe('aiAgentConversation context packages', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    buildAgentSystemPromptMock.mockReturnValue('SYSTEM')
    formatMessageWithHistoryMock.mockImplementation((_history: unknown, prompt: string) => `formatted:${prompt}`)
    trimHistoryMock.mockImplementation((history: unknown) => history)
  })

  it('adds dashboard ask packages without exact protected counts', () => {
    buildFormattedMessage(
      { agent: 'codex', ready: true, vaultPath: '/vault' },
      [],
      {
        text: 'what needs attention?',
        references: [{ path: '/vault/projects/grimoire.md', title: 'Grimoire', type: 'Project' }],
        contextPackage: {
          kind: 'dashboard-ask',
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
          intent: {
            kind: 'crystallize-memory',
            label: 'Daily Thread Crystallize',
            origin: 'daily-thread',
            reviewMode: 'review-before-write',
            sourcePolicy: 'public-references-only',
            target: 'markdown-memory',
          },
          visibleCount: 4,
          withheld: { protectedMemories: 1, protectedNotes: 2 },
        },
      },
    )

    const prompt = formatMessageWithHistoryMock.mock.calls.at(-1)?.[1] as string
    expect(prompt).toContain('## Grimoire Ask Context Package')
    expect(prompt).toContain('Visible public notes: 1 of 4')
    expect(prompt).toContain('Locality Firewall: private/local-only lanes are never included in this package.')
    expect(prompt).toContain('Intent: Daily Thread Crystallize')
    expect(prompt).toContain('Review target: markdown-memory')
    expect(prompt).toContain('Review mode: review-before-write')
    expect(prompt).toContain('Source policy: public-references-only; protected lanes stay policy-only.')
    expect(prompt).not.toContain('2 protected notes')
    expect(prompt).not.toContain('1 protected memories')
    expect(prompt).toContain('Source labels: [[Grimoire]], [[Grimoire Memory]]')
    expect(prompt).toContain('- [[Grimoire Memory]] (path: /vault/memory/grimoire.md, confidence: medium, conflicts: 1 recorded conflict)')
    expect(prompt).not.toContain('Old Plan')
    expect(prompt).toContain('## Selected Grimoire References')
  })

  it('adds graph Council packages without exact protected graph counts', () => {
    buildFormattedMessage(
      { agent: 'codex', ready: true, vaultPath: '/vault' },
      [],
      {
        text: 'ask graph council',
        references: [{ path: '/vault/beta.md', title: 'Beta', type: 'Reference' }],
        contextPackage: {
          kind: 'graph-council',
          prompt: 'ask graph council',
          references: [{ path: '/vault/beta.md', title: 'Beta', type: 'Reference' }],
          sourceLabels: ['Beta'],
          memoryReferences: [],
          visibleCount: 2,
          withheld: { protectedMemories: 0, protectedNotes: 1 },
          graph: {
            edges: [{
              kind: 'body-link',
              label: 'Wikilink',
              sourceTitle: 'Beta',
              targetTitle: 'Gamma',
            }],
            protectedEdges: 2,
            truncatedEdges: 0,
            truncatedNodes: 1,
            visibleEdges: 3,
            visibleNodes: 2,
          },
        },
      },
    )

    const prompt = formatMessageWithHistoryMock.mock.calls.at(-1)?.[1] as string
    expect(prompt).toContain('## Grimoire Graph Council Package')
    expect(prompt).toContain('Visible public graph notes: 1 of 2')
    expect(prompt).toContain('Visible graph links: 3')
    expect(prompt).toContain('Locality Firewall: protected graph lanes are never included in this package.')
    expect(prompt).not.toContain('1 protected graph notes')
    expect(prompt).not.toContain('2 protected graph links')
    expect(prompt).toContain('Trimmed: 1 graph items')
    expect(prompt).toContain('### Source-Safe Graph Edges')
    expect(prompt).toContain('- [[Beta]] -> [[Gamma]] (Wikilink, body-link)')
    expect(prompt).not.toContain('Dashboard ask package')
  })
})
