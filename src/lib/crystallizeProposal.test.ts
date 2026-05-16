import { describe, expect, it } from 'vitest'
import type { VaultEntry } from '../types'
import {
  buildCrystallizeProposal,
  latestCrystallizableResponse,
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

  it('builds a local Memory Markdown artifact from an AI response', () => {
    const proposal = buildCrystallizeProposal({
      response: 'Keep the Memory Ledger source-backed.',
      vaultPath: '/vault',
      activeEntry: entry(),
      now: new Date('2026-05-16T12:00:00.000Z'),
    })

    expect(proposal.relativePath).toMatch(/^memory\/crystallized\/crystallized-test-project-2026-05-16-/)
    expect(proposal.targetPath).toContain('/vault/memory/crystallized/')
    expect(proposal.markdown).toContain('type: Memory')
    expect(proposal.markdown).toContain('source_note: "[[Test Project]]"')
    expect(proposal.markdown).toContain('Keep the Memory Ledger source-backed.')
  })
})
