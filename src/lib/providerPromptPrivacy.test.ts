import { describe, expect, it } from 'vitest'
import type { VaultEntry } from '../types'
import {
  buildProviderPromptDraft,
  extractProviderPromptReferences,
  mergeNoteReferences,
  normalizeProviderPromptText,
  sanitizeProviderPromptText,
} from './providerPromptPrivacy'

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

describe('provider prompt privacy', () => {
  it('redacts protected wikilinks and keeps public references provider-safe', () => {
    const publicPlan = entry('Public Plan', { isA: 'Project' })
    const privateNote = entry('Private Note', { properties: { locality: 'local' } })
    const dream = entry('River Dream', { isA: 'Dream' })

    const draft = buildProviderPromptDraft(
      'Compare [[Public Plan]] with [[Private Note]] and [[River Dream]].',
      [publicPlan, privateNote, dream],
    )

    expect(draft.text).toBe(
      'Compare [[public-plan]] with [local-only note withheld] and [local-only note withheld].',
    )
    expect(draft.references).toEqual([
      { title: 'Public Plan', path: '/vault/public-plan.md', type: 'Project' },
    ])
  })

  it('leaves unresolved wikilinks visible and normalizes whitespace', () => {
    const text = sanitizeProviderPromptText(
      'Ask\u00A0about [[Missing Note]]\nnext\u200B.',
      [],
    )

    expect(text).toBe('Ask about [[Missing Note]] next.')
    expect(normalizeProviderPromptText('a\r\nb')).toBe('a b')
  })

  it('deduplicates prompt references by path', () => {
    const publicPlan = entry('Public Plan', { aliases: ['Plan'] })

    expect(extractProviderPromptReferences(
      'Read [[Public Plan]] then [[Plan]].',
      [publicPlan],
    )).toEqual([{ title: 'Public Plan', path: '/vault/public-plan.md', type: 'Note' }])
  })

  it('merges selected and context references by first safe path occurrence', () => {
    const merged = mergeNoteReferences(
      [{ title: 'A', path: '/a.md', type: 'Note' }],
      [
        { title: 'A newer', path: '/a.md', type: 'Project' },
        { title: 'B', path: '/b.md', type: 'Note' },
      ],
    )

    expect(merged).toEqual([
      { title: 'A', path: '/a.md', type: 'Note' },
      { title: 'B', path: '/b.md', type: 'Note' },
    ])
  })
})
