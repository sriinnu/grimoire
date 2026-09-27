import { describe, expect, it } from 'vitest'
import { makeEntry } from '../../test-utils/noteListTestUtils'
import { buildConnections, countConnections, filterConnections } from './connectionsModel'

const self = makeEntry({
  path: '/vault/project/grimoire.md',
  filename: 'grimoire.md',
  title: 'Grimoire',
  isA: 'Project',
  outgoingLinks: ['Agent Council', 'Nowhere Page'],
})
const council = makeEntry({ path: '/vault/topic/agent-council.md', filename: 'agent-council.md', title: 'Agent Council', isA: 'Topic' })
const newsletter = makeEntry({ path: '/vault/responsibility/grow-newsletter.md', filename: 'grow-newsletter.md', title: 'Grow Newsletter', isA: 'Responsibility' })
const referrer = makeEntry({ path: '/vault/note/referrer.md', filename: 'referrer.md', title: 'Referrer', isA: 'Note', outgoingLinks: ['Grimoire'] })
const entries = [self, council, newsletter, referrer]

describe('buildConnections', () => {
  it('merges typed relationships, body links, referenced-by and backlinks into one deduped list', () => {
    const rows = buildConnections({
      entry: self,
      entries,
      frontmatter: { belongs_to: ['[[responsibility/grow-newsletter]]'], related_to: '[[Agent Council]]' },
      referencedBy: [{ entry: council, viaKey: 'related_to' }],
      backlinks: [{ entry: referrer, context: null }],
    })

    const byTitle = Object.fromEntries(rows.map((row) => [row.title, row]))
    expect(Object.keys(byTitle).sort()).toEqual(['Agent Council', 'Grow Newsletter', 'Nowhere Page', 'Referrer'])
    // Linked out in frontmatter and in the body, and it links back: one row, both ways.
    expect(byTitle['Agent Council'].direction).toBe('both')
    expect(byTitle['Agent Council'].labels).toContain('Related to')
    expect(byTitle['Grow Newsletter'].direction).toBe('out')
    expect(byTitle['Grow Newsletter'].labels).toEqual(['Belongs to'])
    expect(byTitle['Referrer'].direction).toBe('in')
    expect(byTitle['Referrer'].labels).toEqual([])
  })

  it('keeps links to pages that do not exist yet, after the real ones', () => {
    const rows = buildConnections({ entry: self, entries, frontmatter: null, referencedBy: [], backlinks: [] })
    expect(rows.map((row) => row.title)).toEqual(['Agent Council', 'Nowhere Page'])
    expect(rows[1].entry).toBeNull()
    expect(rows[1].target).toBe('Nowhere Page')
  })

  it('never lists the page itself', () => {
    const rows = buildConnections({
      entry: { ...self, outgoingLinks: ['Grimoire'] },
      entries,
      frontmatter: { notes: ['[[Grimoire]]'] },
      referencedBy: [],
      backlinks: [],
    })
    expect(rows).toEqual([])
  })
})

describe('filterConnections / countConnections', () => {
  const rows = buildConnections({
    entry: self,
    entries,
    frontmatter: { belongs_to: ['[[responsibility/grow-newsletter]]'] },
    referencedBy: [{ entry: council, viaKey: 'related_to' }],
    backlinks: [{ entry: referrer, context: null }],
  })

  it('shows both-way rows under either direction', () => {
    expect(filterConnections(rows, 'out').map((row) => row.title)).toEqual(['Agent Council', 'Grow Newsletter', 'Nowhere Page'])
    expect(filterConnections(rows, 'in').map((row) => row.title)).toEqual(['Agent Council', 'Referrer'])
    expect(filterConnections(rows, 'all')).toBe(rows)
  })

  it('counts per direction with both-way rows in each', () => {
    expect(countConnections(rows)).toEqual({ all: 4, out: 3, in: 2 })
  })
})
