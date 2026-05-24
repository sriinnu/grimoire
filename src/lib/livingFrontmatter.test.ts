import { describe, expect, it } from 'vitest'
import type { VaultEntry } from '../types'
import { buildLivingFrontmatterHints } from './livingFrontmatter'

function entry(overrides: Partial<VaultEntry> = {}): VaultEntry {
  return {
    path: '/vault/project/grimoire.md',
    filename: 'grimoire.md',
    title: 'Grimoire',
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
    hasH1: true,
    fileKind: 'markdown',
    ...overrides,
  }
}

describe('buildLivingFrontmatterHints', () => {
  it('suggests missing schema fields using case-insensitive frontmatter keys', () => {
    const hints = buildLivingFrontmatterHints({
      entry: entry({ properties: { Owner: 'Sriinnu' } }),
      entries: [],
      frontmatter: { type: 'Project', Owner: 'Sriinnu' },
    })

    expect(hints).toEqual([
      expect.objectContaining({
        field: 'status',
        kind: 'missing-field',
        label: 'Add status',
      }),
    ])
  })

  it('flags active notes that have gone stale', () => {
    const hints = buildLivingFrontmatterHints({
      entry: entry({ modifiedAt: Date.UTC(2026, 0, 1) / 1000 }),
      entries: [],
      frontmatter: { type: 'Project', status: 'Active', owner: 'Sriinnu' },
      now: new Date('2026-05-23T00:00:00.000Z'),
    })

    expect(hints).toContainEqual(expect.objectContaining({
      id: 'stale-active-status',
      detail: 'Still marked Active, but untouched for 142 days.',
      severity: 'warn',
    }))
  })

  it('detects duplicate concepts from titles and aliases', () => {
    const hints = buildLivingFrontmatterHints({
      entry: entry({ aliases: ['Agent Council'] }),
      entries: [
        entry(),
        entry({
          path: '/vault/product/agent-council.md',
          filename: 'agent-council.md',
          title: 'Agent Council',
          isA: 'Note',
        }),
      ],
      frontmatter: { type: 'Project', status: 'Active', owner: 'Sriinnu' },
    })

    expect(hints).toContainEqual(expect.objectContaining({
      id: 'duplicate-concept',
      detail: 'Looks close to Agent Council.',
    }))
  })

  it('suggests promoting body wikilinks when no relationship field exists', () => {
    const hints = buildLivingFrontmatterHints({
      entry: entry({ outgoingLinks: ['Agent Council'] }),
      entries: [],
      frontmatter: { type: 'Project', status: 'Active', owner: 'Sriinnu' },
    })

    expect(hints).toContainEqual(expect.objectContaining({
      id: 'promote-wikilinks',
      field: 'related_to',
      kind: 'relationship-hint',
    }))
  })

  it('does not suggest a relationship when frontmatter already holds wikilink edges', () => {
    const hints = buildLivingFrontmatterHints({
      entry: entry({ outgoingLinks: ['Agent Council'] }),
      entries: [],
      frontmatter: {
        type: 'Project',
        status: 'Active',
        owner: 'Sriinnu',
        related_to: ['[[Agent Council]]'],
      },
    })

    expect(hints.find(hint => hint.kind === 'relationship-hint')).toBeUndefined()
  })
})
