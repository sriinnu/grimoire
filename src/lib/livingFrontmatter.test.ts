import { describe, expect, it } from 'vitest'
import type { VaultEntry } from '../types'
import { buildLivingFrontmatterHints, buildLivingFrontmatterReviewPlan } from './livingFrontmatter'

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
        source: 'built-in-rule',
        suggestedValue: 'Active',
      }),
    ])
  })

  it('adds safe suggested values for durable memory metadata', () => {
    const hints = buildLivingFrontmatterHints({
      entry: entry({ isA: 'Memory' }),
      entries: [],
      frontmatter: { type: 'Memory', source_note: '[[Research]]' },
      now: new Date('2026-05-24T12:00:00.000Z'),
    })

    expect(hints).toEqual(expect.arrayContaining([
      expect.objectContaining({ field: 'confidence', suggestedValue: 'proposed' }),
      expect.objectContaining({ field: 'last_seen', suggestedValue: '2026-05-24' }),
      expect.objectContaining({ field: 'locality', suggestedValue: 'local-only' }),
      expect.objectContaining({ field: 'memory_version', suggestedValue: 1 }),
    ]))
  })

  it('uses Markdown Type required fields as local schema hints', () => {
    const hints = buildLivingFrontmatterHints({
      entry: entry({
        isA: 'Research',
        properties: { status: 'Active' },
      }),
      entries: [
        entry({
          path: '/vault/type/research.md',
          filename: 'research.md',
          title: 'Research',
          isA: 'Type',
          properties: { required_fields: ['status', 'source_note', 'confidence'] },
        }),
      ],
      frontmatter: { type: 'Research', status: 'Active' },
      now: new Date('2026-05-24T12:00:00.000Z'),
    })

    expect(hints).toEqual(expect.arrayContaining([
      expect.objectContaining({
        field: 'source_note',
        kind: 'type-schema',
        label: 'Add source note',
        severity: 'warn',
        source: 'type-note',
      }),
      expect.objectContaining({
        field: 'confidence',
        kind: 'type-schema',
        suggestedValue: 'proposed',
      }),
    ]))
    expect(hints.find(hint => hint.field === 'status')).toBeUndefined()
  })

  it('uses Type list display fields as lightweight optional frontmatter hints', () => {
    const hints = buildLivingFrontmatterHints({
      entry: entry({ isA: 'Book' }),
      entries: [
        entry({
          path: '/vault/type/book.md',
          filename: 'book.md',
          title: 'Book',
          isA: 'Type',
          listPropertiesDisplay: ['author', 'status'],
        }),
      ],
      frontmatter: { type: 'Book', author: 'Ursula Le Guin' },
    })

    expect(hints).toContainEqual(expect.objectContaining({
      field: 'status',
      kind: 'type-schema',
      label: 'Add status',
      severity: 'info',
      suggestedValue: 'Active',
    }))
    expect(hints.find(hint => hint.field === 'author')).toBeUndefined()
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
      source: 'built-in-rule',
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
      source: 'vault-neighborhood',
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
      source: 'body-wikilinks',
      suggestedValue: ['[[Agent Council]]'],
    }))
  })

  it('builds a count-only review plan before Markdown frontmatter writes', () => {
    const hints = buildLivingFrontmatterHints({
      entry: entry({ aliases: ['Agent Council'], outgoingLinks: ['Agent Council'] }),
      entries: [
        entry(),
        entry({
          path: '/vault/product/agent-council.md',
          filename: 'agent-council.md',
          title: 'Agent Council',
          isA: 'Note',
        }),
      ],
      frontmatter: { type: 'Project' },
    })

    expect(buildLivingFrontmatterReviewPlan(hints)).toEqual({
      applicableCount: 2,
      fieldCount: 2,
      readOnlyCount: 2,
      sourceLabels: ['Built-in rules', 'Vault neighbors', 'Wikilinks'],
      storagePolicy: 'markdown-on-disk',
      writePolicy: 'frontmatter-only',
    })
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
