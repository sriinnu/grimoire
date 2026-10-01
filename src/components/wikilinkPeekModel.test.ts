import { describe, expect, it } from 'vitest'
import type { VaultEntry } from '../types'
import { buildWikilinkPeekModel, peekExcerpt } from './wikilinkPeekModel'

function entry(overrides: Partial<VaultEntry>): VaultEntry {
  return {
    path: '/vault/note.md', filename: 'note.md', title: 'Note', isA: null,
    aliases: [], belongsTo: [], relatedTo: [], status: null, archived: false,
    modifiedAt: null, createdAt: null, fileSize: 0, snippet: '', wordCount: 0,
    relationships: {}, icon: null, color: null, order: null, sidebarLabel: null,
    template: null, sort: null, view: null, visible: null, outgoingLinks: [], properties: {},
    ...overrides,
  } as VaultEntry
}

describe('buildWikilinkPeekModel', () => {
  const entries = [
    entry({ path: '/vault/projects/alpha.md', filename: 'alpha.md', title: 'Project Alpha', isA: 'Project', snippet: 'First line.\nSecond line.' }),
  ]

  it('resolves a target to its title, type and snippet', () => {
    expect(buildWikilinkPeekModel(entries, 'projects/alpha')).toEqual({
      kind: 'note',
      title: 'Project Alpha',
      meta: 'Project',
      excerpt: 'First line. Second line.',
    })
  })

  it('ignores pipe display text when resolving', () => {
    expect(buildWikilinkPeekModel(entries, 'alpha|the alpha')?.kind).toBe('note')
  })

  it('includes a relative edited date when known', () => {
    const now = Math.floor(Date.now() / 1000)
    const model = buildWikilinkPeekModel([entry({ title: 'Fresh', filename: 'fresh.md', path: '/v/fresh.md', modifiedAt: now - 120 })], 'fresh')
    expect(model).toMatchObject({ kind: 'note', meta: 'Edited 2m ago' })
  })

  it('reports missing targets with a humanised title', () => {
    expect(buildWikilinkPeekModel(entries, 'some-new-idea')).toEqual({ kind: 'missing', title: 'Some New Idea' })
  })

  it('returns null for an empty target', () => {
    expect(buildWikilinkPeekModel(entries, '  ')).toBeNull()
  })
})

describe('peekExcerpt', () => {
  it('keeps short snippets intact', () => {
    expect(peekExcerpt('  hello   world ')).toBe('hello world')
  })

  it('trims long snippets on a word boundary', () => {
    const long = Array.from({ length: 80 }, (_, i) => `word${i}`).join(' ')
    const out = peekExcerpt(long)
    expect(out.length).toBeLessThanOrEqual(221)
    expect(out.endsWith('…')).toBe(true)
    expect(out).toMatch(/word\d+…$/)
  })
})
