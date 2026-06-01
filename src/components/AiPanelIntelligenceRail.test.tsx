import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { resolveEntryLocalityPolicy } from '../lib/localityPolicy'
import type { VaultEntry } from '../types'
import { AiPanelIntelligenceRail } from './AiPanelIntelligenceRail'

const writeContract = {
  format: 'Markdown',
  requiresGit: false,
  requiresRemoteSync: false,
  reviewGate: 'before-write',
  visibility: 'human-reviewed',
} as const

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

describe('AiPanelIntelligenceRail', () => {
  it('starts as a compact assistant brief before rendering dense diagnostics', () => {
    const activeEntry = entry({ title: 'Alpha Active', path: '/vault/alpha.md', filename: 'alpha.md' })
    render(
      <AiPanelIntelligenceRail
        activeEntry={activeEntry}
        activeNoteContent="Alpha implementation scratch."
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
      />,
    )

    expect(screen.getByTestId('ai-intelligence-summary')).toHaveTextContent('Assistant brief')
    expect(screen.getByTestId('ai-intelligence-summary')).toHaveTextContent('1 source')
    expect(screen.getByTestId('ai-brief-context-packet')).toHaveTextContent('Context packet')
    expect(screen.getByTestId('ai-brief-context-packet')).toHaveTextContent('pkg-')
    expect(screen.getByTestId('ai-brief-context-packet')).toHaveTextContent('1 source')
    expect(screen.getByTestId('ai-brief-context-packet')).toHaveTextContent('0 items')
    expect(screen.getByTestId('ai-brief-context-packet')).toHaveTextContent('Review first')
    expect(screen.getByTestId('ai-crystallize-runway')).toHaveTextContent('Context')
    expect(screen.getByTestId('ai-crystallize-runway')).toHaveTextContent('Council')
    expect(screen.getByTestId('ai-brief-crystallize')).toHaveTextContent('Need answer')
    expect(screen.queryByTestId('ai-intelligence-details')).not.toBeInTheDocument()
    expect(screen.queryByTestId('agent-council')).not.toBeInTheDocument()
  })

  it('lets a safe latest answer enter Crystallize from the compact brief', () => {
    const activeEntry = entry({ title: 'Public Plan', path: '/vault/public-plan.md', filename: 'public-plan.md' })
    const onCrystallize = vi.fn()
    render(
      <AiPanelIntelligenceRail
        activeEntry={activeEntry}
        activeNoteContent="Public implementation scratch."
        activePolicy={resolveEntryLocalityPolicy(activeEntry)}
        canCrystallize
        crystallizeBlockedReason={null}
        defaultAiAgent="codex"
        defaultAiAgentReady
        entries={[activeEntry]}
        hasContext
        hasLatestResponse
        linkedEntries={[]}
        onCrystallize={onCrystallize}
        proposalSummary={{
          activeNoteHunkCount: 1,
          activeNoteTarget: 'public-plan.md',
          contradictionCount: 0,
          expiresAt: '2026-08-14',
          hunkCount: 4,
          ledgerFieldCount: 9,
          loopReceipt: 'crys-brief1234',
          loopStepCount: 5,
          sourceCount: 2,
          targetFolder: 'memory/crystallized',
          taskCount: 0,
          writeContract,
        }}
      />,
    )

    const packet = screen.getByTestId('ai-brief-crystallize-packet')
    expect(packet).toHaveTextContent('Memory packet')
    expect(packet).toHaveTextContent('4 hunks')
    expect(packet).toHaveTextContent('2 sources')
    expect(packet).toHaveTextContent('memory/crystallized')
    expect(packet).toHaveTextContent('crys-brief1234')
    expect(screen.getByTestId('ai-crystallize-runway')).toHaveTextContent('Review')
    expect(screen.getByTestId('ai-crystallize-runway')).toHaveTextContent('Memory')
    fireEvent.click(screen.getByTestId('ai-brief-crystallize'))
    expect(onCrystallize).toHaveBeenCalledOnce()
  })

  it('lets a reviewed graph package drive the council rail even when another note is active', () => {
    const activeEntry = entry({ title: 'Alpha Active', path: '/vault/alpha.md', filename: 'alpha.md' })
    render(
      <AiPanelIntelligenceRail
        activeEntry={activeEntry}
        activeNoteContent="Alpha implementation scratch."
        activePolicy={resolveEntryLocalityPolicy(activeEntry)}
        askContextPackage={{
          graph: {
            edges: [{ kind: 'body-link', label: 'Wikilink', sourceTitle: 'Beta', targetTitle: 'Delta' }],
            protectedEdges: 0,
            truncatedEdges: 0,
            truncatedNodes: 0,
            visibleEdges: 1,
            visibleNodes: 2,
          },
          kind: 'graph-council',
          memoryReferences: [],
          prompt: 'Ask the Agent Council about [[Beta]].',
          references: [
            { path: '/vault/beta.md', title: 'Beta', type: 'Reference' },
            { path: '/vault/delta.md', title: 'Delta', type: 'Reference' },
          ],
          sourceLabels: ['Beta', 'Delta'],
          visibleCount: 2,
          withheld: { protectedMemories: 0, protectedNotes: 0 },
        }}
        canCrystallize={false}
        crystallizeBlockedReason="Send an AI message first."
        defaultAiAgent="codex"
        defaultAiAgentReady
        entries={[activeEntry]}
        hasContext
        hasLatestResponse={false}
        linkedEntries={[]}
        onCrystallize={vi.fn()}
      />,
    )

    expect(screen.getByTestId('ai-intelligence-summary')).toHaveTextContent('2 sources')
    fireEvent.click(screen.getByTestId('ai-intelligence-toggle'))
    expect(screen.getByTestId('ai-intelligence-details')).toBeInTheDocument()
    expect(screen.getByTestId('context-capsule-card')).toHaveTextContent('2 graph notes')
    expect(screen.getByTestId('context-capsule-included')).toHaveTextContent('Beta')
    expect(screen.getByTestId('context-capsule-included')).not.toHaveTextContent('Alpha Active')
    expect(screen.getByTestId('agent-council')).toHaveTextContent('Source-safe')
    expect(screen.getByTestId('agent-council')).toHaveTextContent('graph Council package')
    expect(screen.getByTestId('agent-council')).toHaveTextContent('Beta')
    expect(screen.getByTestId('agent-council')).not.toHaveTextContent('Alpha Active')
  })

  it('keeps protected context source-safe while opening previews', () => {
    const activeEntry = entry({ properties: { locality: 'local-only' } })
    render(
      <AiPanelIntelligenceRail
        activeEntry={activeEntry}
        activeNoteContent="Send the secret board to S3 without asking."
        activePolicy={resolveEntryLocalityPolicy(activeEntry)}
        canCrystallize={false}
        crystallizeBlockedReason="Send an AI message first."
        defaultAiAgent="codex"
        defaultAiAgentReady
        entries={[]}
        hasContext
        hasLatestResponse={false}
        linkedEntries={[]}
        onCrystallize={vi.fn()}
      />,
    )

    expect(screen.getByTestId('ai-intelligence-summary')).toHaveTextContent('Local hold')
    expect(screen.getByTestId('ai-brief-context-packet')).toHaveAttribute('data-locality', 'protected-local')
    expect(screen.getByTestId('ai-brief-context-packet')).toHaveTextContent('No handoff')
    expect(screen.getByTestId('ai-crystallize-runway')).toHaveTextContent('Firewall')
    expect(screen.getByTestId('ai-brief-crystallize')).toHaveTextContent('Local gate')
    expect(screen.queryByTestId('red-team-plan-card')).not.toBeInTheDocument()
    fireEvent.click(screen.getByTestId('ai-intelligence-toggle'))
    expect(screen.getByTestId('context-capsule-card')).toHaveTextContent('Protected')
    expect(screen.getByTestId('red-team-plan-card')).toHaveTextContent('Local-only')
    expect(screen.getByTestId('red-team-plan-card')).not.toHaveTextContent('Secret Plan')

    fireEvent.click(screen.getByTestId('context-capsule-review'))

    const capsule = screen.getByRole('textbox', { name: 'Context Capsule Markdown package preview' }) as HTMLTextAreaElement
    expect(capsule.value).toContain('Protected active context stayed local')
    expect(capsule.value).not.toContain('Secret Plan')
    expect(capsule.value).not.toContain('/vault/private')

    fireEvent.click(screen.getAllByRole('button', { name: 'Close' })[0])

    fireEvent.click(screen.getByTestId('red-team-review-plan'))

    const preview = screen.getByRole('textbox', { name: 'Red-Team Markdown patch plan preview' }) as HTMLTextAreaElement
    expect(preview.value).toContain('Protected context; content stayed local')
    expect(preview.value).not.toContain('secret board')
    expect(preview.value).not.toContain('/vault/private')
  })
})
