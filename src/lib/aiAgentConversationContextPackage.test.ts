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

  it('includes recall only after the user explicitly approves that packet', () => {
    buildFormattedMessage(
      { agent: 'codex', ready: true, vaultPath: '/vault' },
      [],
      {
        text: 'turn this into a plan',
        chitraguptaRecall: {
          degraded: true,
          guidance: 'Prefer a local-first rollout.',
          items: [{ answer: 'Ship the relationship map before agent runtime.', primarySource: 'project-memory', score: 0.9, snippet: null }],
          predictions: null,
          recalledCount: 2,
          requestId: 'grimoire:pkg-1',
          warnings: ['Lucy offline'],
        },
      },
    )

    const prompt = formatMessageWithHistoryMock.mock.calls.at(-1)?.[1] as string
    expect(prompt).toContain('## User-approved Chitragupta Recall')
    expect(prompt).toContain('Recall records: 2')
    expect(prompt).toContain('Status: degraded')
    expect(prompt).toContain('Guidance:\nPrefer a local-first rollout.')
    expect(prompt).toContain('Warnings: Lucy offline')
    expect(prompt).toContain('### Reviewed memory excerpts')
    expect(prompt).toContain('[project-memory] Ship the relationship map before agent runtime.')
  })

  it('includes a Context Manifest only after the user-approved attachment is present', () => {
    buildFormattedMessage(
      { agent: 'codex', ready: true, vaultPath: '/vault' },
      [],
      {
        text: 'review this change',
        contextManifest: {
          schemaVersion: 'grimoire.context-manifest.v1',
          id: 'ctx-1',
          requestId: 'request-1',
          createdAt: '2026-07-15T00:00:00Z',
          intent: 'review',
          live: { activeFile: 'src/context.ts', openFiles: [], gitDiffs: [], terminalErrors: [] },
          recalled: [],
          code: [{
            id: 'symbol:src/context.ts:4:1:buildManifest',
            kind: 'symbol',
            uri: 'symbol:///src/context.ts#L4',
            score: 0.9,
            tokenCount: 0,
            selectedBecause: ['user inspected active code file'],
            retrievalChannels: ['tree-sitter'],
            scope: 'vault',
            confidence: 1,
            permission: 'allowed',
          }],
          pinned: [],
          excluded: [{
            id: 'policy-1',
            kind: 'other',
            uri: 'grimoire://locality-firewall/1',
            reason: 'Protected source',
            permission: 'blocked',
          }],
          budget: { maximumTokens: 8000, usedTokens: 0, remainingTokens: 8000, compactedTokens: 0 },
          warnings: { stale: [], contradictions: [], weakEvidence: [], policyBlocks: ['Protected source'] },
          provenance: [{ kind: 'symbol', uri: 'symbol:///src/context.ts#L4' }],
        },
      },
    )

    const prompt = formatMessageWithHistoryMock.mock.calls.at(-1)?.[1] as string
    expect(prompt).toContain('## User-approved Grimoire Context Manifest')
    expect(prompt).toContain('not permission to access excluded or local-only material')
    expect(prompt).toContain('"kind":"symbol"')
    expect(prompt).toContain('"permission":"blocked"')
  })
})
