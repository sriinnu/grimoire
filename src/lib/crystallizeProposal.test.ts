import { describe, expect, it } from 'vitest'
import type { VaultEntry } from '../types'
import {
  appendCrystallizePatchToContent,
  buildCrystallizeProposal,
  latestCrystallizableMessage,
  latestCrystallizableResponse,
  persistCrystallizedNote,
  summarizeCrystallizeProposal,
} from './crystallizeProposal'
import { buildCrystallizeMockEntry } from './crystallizeMockEntry'

function entry(overrides: Partial<VaultEntry> = {}): VaultEntry {
  return {
    path: '/vault/project/test.md',
    filename: 'test.md',
    title: 'Test Project',
    isA: 'Project',
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
    hasH1: false,
    fileKind: 'markdown',
    ...overrides,
  }
}

describe('crystallizeProposal', () => {
  it('selects the latest assistant response', () => {
    expect(latestCrystallizableResponse([
      { response: 'First' },
      {},
      { response: 'Second' },
    ])).toBe('Second')
  })

  it('selects the latest assistant response with dashboard ask context', () => {
    const contextPackage = {
      kind: 'dashboard-ask' as const,
      prompt: 'what matters?',
      references: [{ path: '/vault/projects/grimoire.md', title: 'Grimoire', type: 'Project' }],
      sourceLabels: ['Grimoire'],
      memoryReferences: [],
      visibleCount: 1,
      withheld: { protectedMemories: 1, protectedNotes: 2 },
    }

    expect(latestCrystallizableMessage([
      { response: 'First' },
      { response: 'Second', contextPackage },
    ])).toEqual({ response: 'Second', contextPackage })
  })

  it('builds a local Memory Markdown artifact from an AI response', () => {
    const proposal = buildCrystallizeProposal({
      response: 'Keep the Memory Ledger source-backed. See [[Related Note]].',
      vaultPath: '/vault',
      activeEntry: entry(),
      now: new Date('2026-05-16T12:00:00.000Z'),
    })

    expect(proposal.relativePath).toMatch(/^memory\/crystallized\/crystallized-test-project-2026-05-16-/)
    expect(proposal.targetPath).toContain('/vault/memory/crystallized/')
    expect(proposal.markdown).toContain('type: Memory')
    expect(proposal.markdown).toContain('source_note: "[[Test Project]]"')
    expect(proposal.sourceLabels).toEqual(['[[Test Project]]'])
    expect(proposal.ledgerContract).toEqual({
      contradictedBy: [],
      confidence: 'proposed',
      expiresAt: '2026-08-14',
      locality: 'vault',
      reviewState: 'reviewed',
      sourceCount: 1,
      status: 'proposed',
      version: 1,
    })
    expect(proposal.markdown).toContain('memory_status: proposed')
    expect(proposal.markdown).toContain('memory_review_state: reviewed')
    expect(proposal.markdown).toContain('memory_source_count: 1')
    expect(proposal.markdown).toContain('expires_at: 2026-08-14')
    expect(proposal.markdown).toContain('contradicted_by: []')
    expect(proposal.markdown).toContain('memory_version: 1')
    expect(proposal.markdown).toContain('reviewed_at: "2026-05-16T12:00:00.000Z"')
    expect(proposal.markdown).toContain('## Source Links')
    expect(proposal.markdown).toContain('- [[Test Project]]')
    expect(proposal.markdown).toContain('- [[Related Note]]')
    expect(proposal.markdown).toContain('## Ledger Contract')
    expect(proposal.markdown).toContain('- Review state: reviewed')
    expect(proposal.markdown).toContain('- Expires on: 2026-08-14')
    expect(proposal.markdown).toContain('- Contradicted by: none')
    expect(proposal.markdown).toContain('Keep the Memory Ledger source-backed.')
    expect(proposal.changes).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: 'create-memory-note', kind: 'file', target: proposal.relativePath }),
      expect.objectContaining({ id: 'write-frontmatter', kind: 'frontmatter', after: expect.stringContaining('memory_version: 1') }),
      expect.objectContaining({ id: 'link-sources', kind: 'backlink', after: expect.stringContaining('- [[Related Note]]') }),
      expect.objectContaining({ id: 'write-ledger-contract', kind: 'body', after: expect.stringContaining('Review state: reviewed') }),
      expect.objectContaining({ id: 'write-memory-body', kind: 'body', after: expect.stringContaining('Keep the Memory Ledger') }),
    ]))
  })

  it('preserves dashboard ask package sources in crystallized memory provenance', () => {
    const proposal = buildCrystallizeProposal({
      response: 'The next useful move is to sharpen the daily loop.',
      vaultPath: '/vault',
      askContextPackage: {
        kind: 'dashboard-ask',
        prompt: 'what needs attention?',
        references: [
          { path: '/vault/projects/grimoire.md', title: 'Grimoire', type: 'Project' },
          { path: '/vault/projects/identity.md', title: 'Identity Pass', type: 'Note' },
        ],
        sourceLabels: ['Grimoire', 'Identity Pass'],
        memoryReferences: [],
        visibleCount: 4,
        withheld: { protectedMemories: 2, protectedNotes: 3 },
      },
      now: new Date('2026-05-16T12:00:00.000Z'),
    })

    expect(proposal.sourceLabel).toBe('[[Grimoire]]')
    expect(proposal.sourceLabels).toEqual(['[[Grimoire]]', '[[Identity Pass]]'])
    expect(proposal.markdown).toContain('source_note: "[[Grimoire]]"')
    expect(proposal.markdown).toContain('source_notes:\n  - "[[Grimoire]]"\n  - "[[Identity Pass]]"')
    expect(proposal.markdown).toContain('- [[Grimoire]]')
    expect(proposal.markdown).toContain('- [[Identity Pass]]')
    expect(proposal.markdown).not.toContain('protected')
    expect(proposal.changes).toEqual(expect.arrayContaining([
      expect.objectContaining({
        id: 'write-frontmatter',
        after: expect.stringContaining('source_notes:'),
      }),
    ]))
  })

  it('builds Agent Council synthesis as reviewed Markdown memory without pretending it is chat output', () => {
    const proposal = buildCrystallizeProposal({
      response: '# Agent Council synthesis\n\n## Handoff Gate\n\n- Review required: yes',
      handoffMetadata: {
        kind: 'agent_council',
        localHold: false,
        mode: 'review-gated',
        privateGatedLaneCount: 2,
        readyLaneCount: 3,
        sourceCount: 4,
        unavailableLaneCount: 1,
      },
      sourceLabels: ['Agent Council', 'Public Plan', 'Conflicts: Old Plan', '3 graph items withheld'],
      sourceName: 'Agent Council',
      titleSubject: 'Agent Council',
      vaultPath: '/vault',
      now: new Date('2026-05-16T12:00:00.000Z'),
    })

    expect(proposal.title).toBe('Crystallized - Agent Council - 2026-05-16')
    expect(proposal.sourceName).toBe('Agent Council')
    expect(proposal.sourceLabel).toBe('Agent Council')
    expect(proposal.sourceLabels).toEqual(['Agent Council', '[[Public Plan]]'])
    expect(proposal.markdown).toContain('source: "Agent Council"')
    expect(proposal.markdown).toContain('source_note: "Agent Council"')
    expect(proposal.markdown).toContain('source_notes:\n  - "Agent Council"\n  - "[[Public Plan]]"')
    expect(proposal.markdown).toContain('handoff: agent_council')
    expect(proposal.markdown).toContain('handoff_mode: "review-gated"')
    expect(proposal.markdown).toContain('handoff_ready_lanes: 3')
    expect(proposal.markdown).toContain('handoff_private_gated_lanes: 2')
    expect(proposal.markdown).toContain('handoff_unavailable_lanes: 1')
    expect(proposal.markdown).toContain('handoff_local_hold: false')
    expect(proposal.markdown).not.toContain('handoff_held_local')
    expect(proposal.markdown).toContain('handoff_source_count: 4')
    expect(proposal.markdown).toContain('- [[Public Plan]]')
    expect(proposal.markdown).not.toContain('Conflicts: Old Plan')
    expect(proposal.markdown).not.toContain('3 graph items withheld')
    expect(proposal.markdown).toContain('# Agent Council synthesis')
    expect(proposal.handoffMetadata).toEqual(expect.objectContaining({ mode: 'review-gated', readyLaneCount: 3 }))
    expect(proposal.markdown).not.toContain('source: AI Chat')
    expect(proposal.activeNotePatch).toBeNull()
  })

  it('blocks policy-only handoff metadata from durable Memory frontmatter', () => {
    expect(() => buildCrystallizeProposal({
      response: 'Policy-only guidance should not become a shared Memory handoff.',
      handoffMetadata: {
        kind: 'agent_council',
        localHold: true,
        mode: 'policy-only',
        privateGatedLaneCount: 0,
        readyLaneCount: 0,
        sourceCount: 0,
        unavailableLaneCount: 0,
      } as never,
      sourceName: 'Agent Council',
      vaultPath: '/vault',
      now: new Date('2026-05-16T12:00:00.000Z'),
    })).toThrow(/review-gated Council packets/)
  })

  it('builds mock entries from edited Markdown frontmatter instead of stale proposal metadata', () => {
    const proposal = buildCrystallizeProposal({
      response: 'Council memory can be edited before apply.',
      handoffMetadata: {
        kind: 'agent_council',
        localHold: false,
        mode: 'review-gated',
        privateGatedLaneCount: 1,
        readyLaneCount: 3,
        sourceCount: 2,
        unavailableLaneCount: 0,
      },
      sourceName: 'Agent Council',
      vaultPath: '/vault',
      now: new Date('2026-05-16T12:00:00.000Z'),
    })
    const editedMarkdown = proposal.markdown.replace(/^handoff.*\n/gm, '')
    const mockEntry = buildCrystallizeMockEntry({ ...proposal, markdown: editedMarkdown })

    expect(mockEntry.properties.handoff).toBeUndefined()
    expect(mockEntry.properties.source).toBe('Agent Council')
    expect(mockEntry.properties.expires_at).toBe('2026-08-14')
    expect(mockEntry.properties.contradicted_by).toEqual([])
    expect(mockEntry.properties.reviewed_at).toBe('2026-05-16T12:00:00.000Z')
  })

  it('filters protected or stale Council source labels at the durable Crystallize boundary', () => {
    const proposal = buildCrystallizeProposal({
      response: 'Only public source labels belong in durable Memory.',
      sourceEntries: [
        entry({ path: '/vault/public-plan.md', filename: 'public-plan.md', title: 'Public Plan' }),
        entry({ path: '/vault/dreams/secret.md', filename: 'secret.md', title: 'Secret Dream', isA: 'Dream' }),
      ],
      sourceLabels: ['Agent Council', 'Public Plan', 'Secret Dream', 'Conflicts: Secret Dream', '2 dashboard items withheld'],
      sourceName: 'Agent Council',
      titleSubject: 'Agent Council',
      vaultPath: '/vault',
      now: new Date('2026-05-16T12:00:00.000Z'),
    })

    expect(proposal.sourceLabels).toEqual(['Agent Council', '[[Public Plan]]'])
    expect(proposal.markdown).toContain('- "[[Public Plan]]"')
    expect(proposal.markdown).not.toContain('Secret Dream')
    expect(proposal.markdown).not.toContain('dashboard items withheld')
  })

  it('adds a task hunk when the response contains checklist items', () => {
    const proposal = buildCrystallizeProposal({
      response: '- [ ] Verify Memory Ledger diffs\n- [x] Keep local-only markers',
      vaultPath: '/vault',
      now: new Date('2026-05-16T12:00:00.000Z'),
    })

    expect(proposal.changes).toEqual(expect.arrayContaining([
      expect.objectContaining({
        id: 'preserve-tasks',
        kind: 'task',
        after: '- [ ] Verify Memory Ledger diffs\n- [x] Keep local-only markers',
      }),
    ]))
  })

  it('adds a reviewable active note append hunk when editor content is available', () => {
    const proposal = buildCrystallizeProposal({
      response: 'Make Crystallize write reviewed diffs, not invisible AI memory.',
      vaultPath: '/vault',
      activeEntry: entry({ path: '/vault/projects/grimoire.md', title: 'Grimoire' }),
      activeNoteContent: '# Grimoire\n\nCurrent plan.',
      now: new Date('2026-05-16T12:00:00.000Z'),
    })

    expect(proposal.activeNotePatch).toEqual(expect.objectContaining({
      targetPath: '/vault/projects/grimoire.md',
      relativePath: 'projects/grimoire.md',
      frontmatterMarkdown: expect.stringContaining('crystallized_memories:'),
      appendMarkdown: expect.stringContaining('## Crystallized Follow-up'),
    }))
    expect(proposal.activeNotePatch?.frontmatterMarkdown).toContain('last_crystallized_at: "2026-05-16T12:00:00.000Z"')
    expect(proposal.activeNotePatch?.frontmatterMarkdown).toContain('  - "[[Crystallized - Grimoire - 2026-05-16]]"')
    expect(proposal.activeNotePatch?.appendMarkdown).toContain('[[Crystallized - Grimoire - 2026-05-16]]')
    expect(proposal.activeNotePatch?.appendMarkdown).toContain('- Source: [[Grimoire]]')
    expect(proposal.changes).toEqual(expect.arrayContaining([
      expect.objectContaining({
        id: 'update-active-note-frontmatter',
        kind: 'frontmatter',
        target: 'projects/grimoire.md',
        after: expect.stringContaining('crystallized_memories:'),
      }),
      expect.objectContaining({
        id: 'append-active-note',
        kind: 'note',
        target: 'projects/grimoire.md',
        after: expect.stringContaining('Make Crystallize write reviewed diffs'),
      }),
    ]))
  })

  it('appends a reviewed active note hunk with stable spacing', () => {
    expect(appendCrystallizePatchToContent('# Note\n\nBody\n\n', '## Crystallized Follow-up\n\nNext')).toBe(
      '# Note\n\nBody\n\n## Crystallized Follow-up\n\nNext\n',
    )
    expect(appendCrystallizePatchToContent('', '## First')).toBe('## First\n')
    expect(appendCrystallizePatchToContent('# Note\n', '  ')).toBe('# Note\n')
  })

  it('deduplicates source backlinks that are also mentioned in the response', () => {
    const proposal = buildCrystallizeProposal({
      response: 'Tie this back to [[Test Project]] and [[Second Note]].',
      vaultPath: '/vault',
      activeEntry: entry(),
      now: new Date('2026-05-16T12:00:00.000Z'),
    })

    expect(proposal.markdown.match(/- \[\[Test Project\]\]/g)).toHaveLength(1)
    expect(proposal.markdown).toContain('- [[Second Note]]')
  })

  it('summarizes the review packet without reading note bodies', () => {
    const proposal = buildCrystallizeProposal({
      response: 'Tie this to [[Second Note]].\n- [ ] Review the accepted memory',
      vaultPath: '/vault',
      activeEntry: entry({ title: 'Source Note' }),
      now: new Date('2026-05-16T12:00:00.000Z'),
    })

    expect(summarizeCrystallizeProposal(proposal)).toEqual({
      contradictionCount: 0,
      expiresAt: '2026-08-14',
      hunkCount: 6,
      ledgerFieldCount: 9,
      sourceCount: 2,
      targetFolder: 'memory/crystallized',
      taskCount: 1,
    })
    expect(summarizeCrystallizeProposal(null)).toBeNull()
  })

  it('persists reviewed memory as a local vault file without a Git path', async () => {
    const proposal = buildCrystallizeProposal({
      response: 'Accepted memory remains plain Markdown.',
      vaultPath: '/vault',
      now: new Date('2026-05-16T12:00:00.000Z'),
    })
    const markdown = proposal.markdown.replace('Accepted memory', 'Human-reviewed memory')

    await persistCrystallizedNote({ ...proposal, markdown })

    const saved = window.__mockContent?.[proposal.targetPath]
    expect(proposal.relativePath).toMatch(/^memory\/crystallized\//)
    expect(proposal.targetPath).toMatch(/^\/vault\/memory\/crystallized\//)
    expect(proposal.targetPath).not.toContain('/.git/')
    expect(saved).toContain('type: Memory')
    expect(saved).toContain('locality: vault')
    expect(saved).toContain('expires_at: 2026-08-14')
    expect(saved).toContain('contradicted_by: []')
    expect(saved).toContain('Human-reviewed memory remains plain Markdown.')
  })
})
