import { describe, expect, it } from 'vitest'
import type { VaultEntry } from '../types'
import {
  buildCrystallizeProposal,
  latestCrystallizableMessage,
  latestCrystallizableResponse,
  persistCrystallizedNote,
  summarizeCrystallizeProposal,
} from './crystallizeProposal'

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
    expect(proposal.markdown).toContain('memory_version: 1')
    expect(proposal.markdown).toContain('reviewed_at: "2026-05-16T12:00:00.000Z"')
    expect(proposal.markdown).toContain('## Source Links')
    expect(proposal.markdown).toContain('- [[Test Project]]')
    expect(proposal.markdown).toContain('- [[Related Note]]')
    expect(proposal.markdown).toContain('Keep the Memory Ledger source-backed.')
    expect(proposal.changes).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: 'create-memory-note', kind: 'file', target: proposal.relativePath }),
      expect.objectContaining({ id: 'write-frontmatter', kind: 'frontmatter', after: expect.stringContaining('memory_version: 1') }),
      expect.objectContaining({ id: 'link-sources', kind: 'backlink', after: expect.stringContaining('- [[Related Note]]') }),
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
      hunkCount: 5,
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
    expect(saved).toContain('Human-reviewed memory remains plain Markdown.')
  })
})
