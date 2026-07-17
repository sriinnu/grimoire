import { describe, expect, it } from 'vitest'
import type { VaultEntry } from '../types'
import { makeEntry } from '../test-utils/noteListTestUtils'
import { buildNoteNeighborhood, NEIGHBORHOOD_SIDE_LIMIT } from './noteNeighborhood'

function note(title: string, overrides: Partial<VaultEntry> = {}): VaultEntry {
  return makeEntry({
    path: `/vault/${title}.md`,
    filename: `${title}.md`,
    title,
    ...overrides,
  })
}

describe('buildNoteNeighborhood', () => {
  it('returns an empty neighborhood without an active path', () => {
    const neighborhood = buildNoteNeighborhood([note('Alpha')], null)
    expect(neighborhood.total).toBe(0)
    expect(neighborhood.incoming).toEqual([])
    expect(neighborhood.outgoing).toEqual([])
  })

  it('splits resolved links by direction around the active note', () => {
    const entries = [
      note('Center', { outgoingLinks: ['Target'] }),
      note('Target'),
      note('Fan', { outgoingLinks: ['Center'] }),
    ]

    const neighborhood = buildNoteNeighborhood(entries, '/vault/Center.md')

    expect(neighborhood.outgoing.map((link) => link.title)).toEqual(['Target'])
    expect(neighborhood.incoming.map((link) => link.title)).toEqual(['Fan'])
    expect(neighborhood.total).toBe(2)
  })

  it('collapses mutual links into the outgoing column', () => {
    const entries = [
      note('Center', { outgoingLinks: ['Pal'] }),
      note('Pal', { outgoingLinks: ['Center'] }),
    ]

    const neighborhood = buildNoteNeighborhood(entries, '/vault/Center.md')

    expect(neighborhood.incoming).toEqual([])
    expect(neighborhood.outgoing).toHaveLength(1)
    expect(neighborhood.outgoing[0]).toMatchObject({ title: 'Pal', mutual: true })
  })

  it('prefers the frontmatter relationship over a duplicate wikilink', () => {
    const entries = [
      note('Center', {
        outgoingLinks: ['Project'],
        relationships: { 'belongs to': ['[[Project]]'] },
      }),
      note('Project'),
    ]

    const neighborhood = buildNoteNeighborhood(entries, '/vault/Center.md')

    expect(neighborhood.outgoing).toHaveLength(1)
    expect(neighborhood.outgoing[0]).toMatchObject({ kind: 'relationship', label: 'belongs to' })
  })

  it('caps each side and reports the overflow', () => {
    const spokes = Array.from({ length: NEIGHBORHOOD_SIDE_LIMIT + 3 }, (_, index) => note(`Spoke ${index}`))
    const entries = [
      note('Center', { outgoingLinks: spokes.map((spoke) => spoke.title) }),
      ...spokes,
    ]

    const neighborhood = buildNoteNeighborhood(entries, '/vault/Center.md')

    expect(neighborhood.outgoing).toHaveLength(NEIGHBORHOOD_SIDE_LIMIT)
    expect(neighborhood.outgoingOverflow).toBe(3)
    expect(neighborhood.total).toBe(NEIGHBORHOOD_SIDE_LIMIT + 3)
  })

  it('ignores unresolved links and never links a note to itself', () => {
    const entries = [note('Center', { outgoingLinks: ['Center', 'Ghost'] })]

    const neighborhood = buildNoteNeighborhood(entries, '/vault/Center.md')

    expect(neighborhood.total).toBe(0)
  })
})
