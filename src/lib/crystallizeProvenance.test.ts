import { describe, expect, it } from 'vitest'
import type { VaultEntry } from '../types'
import { buildCrystallizeProposal } from './crystallizeProposal'

function entry(overrides: Partial<VaultEntry> = {}): VaultEntry {
  return {
    aliases: [],
    archived: false,
    belongsTo: [],
    color: null,
    createdAt: null,
    favorite: false,
    favoriteIndex: null,
    fileKind: 'markdown',
    fileSize: 0,
    filename: 'dream.md',
    hasH1: false,
    icon: null,
    isA: 'Dream',
    listPropertiesDisplay: [],
    modifiedAt: null,
    order: null,
    organized: false,
    outgoingLinks: [],
    path: '/vault/dreams/dream.md',
    properties: {},
    relatedTo: [],
    relationships: {},
    sidebarLabel: null,
    snippet: '',
    sort: null,
    status: null,
    template: null,
    title: 'Secret River Dream',
    view: null,
    visible: null,
    wordCount: 0,
    ...overrides,
  }
}

describe('crystallize provenance', () => {
  it('redacts protected active-note titles before durable Memory provenance is built', () => {
    const proposal = buildCrystallizeProposal({
      activeEntry: entry(),
      response: 'Keep dream analysis local and reviewable.',
      vaultPath: '/vault',
      now: new Date('2026-05-23T08:00:00.000Z'),
    })

    expect(proposal.sourceLabels).toEqual(['Dream source withheld'])
    expect(proposal.markdown).toContain('source_note: "Dream source withheld"')
    expect(proposal.markdown).toContain('- Dream source withheld')
    expect(proposal.markdown).not.toContain('Secret River Dream')
    expect(proposal.markdown).not.toContain('dreams/dream.md')
  })
})
