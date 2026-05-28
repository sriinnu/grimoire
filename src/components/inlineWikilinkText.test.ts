import { describe, expect, it } from 'vitest'
import type { VaultEntry } from '../types'
import { extractInlineWikilinkReferences, sanitizeInlineWikilinksForAgent } from './inlineWikilinkText'

function entry(title: string, overrides: Partial<VaultEntry> = {}): VaultEntry {
  const slug = title.toLowerCase().replace(/\s+/g, '-')
  return {
    path: `/vault/${slug}.md`,
    filename: `${slug}.md`,
    title,
    isA: 'Note',
    aliases: [],
    belongsTo: [],
    relatedTo: [],
    status: null,
    archived: false,
    modifiedAt: 1,
    createdAt: 1,
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

describe('extractInlineWikilinkReferences', () => {
  it('withholds local-only notes from agent references', () => {
    const references = extractInlineWikilinkReferences(
      'Compare [[Public Plan]] with [[River Dream]] and [[Private Note]].',
      [
        entry('Public Plan', { isA: 'Project' }),
        entry('River Dream', { isA: 'Dream' }),
        entry('Private Note', { properties: { locality: 'local' } }),
      ],
    )

    expect(references).toEqual([{ title: 'Public Plan', path: '/vault/public-plan.md', type: 'Project' }])
  })

  it('redacts protected wikilink labels from provider-bound prompt text', () => {
    const text = sanitizeInlineWikilinksForAgent(
      'Compare [[Public Plan]] with [[River Dream]] and [[Private Note]].',
      [
        entry('Public Plan', { isA: 'Project' }),
        entry('River Dream', { isA: 'Dream' }),
        entry('Private Note', { properties: { locality: 'local' } }),
      ],
    )

    expect(text).toBe('Compare [[public-plan]] with [local-only note withheld] and [local-only note withheld].')
    expect(text).not.toContain('River Dream')
    expect(text).not.toContain('Private Note')
  })
})
