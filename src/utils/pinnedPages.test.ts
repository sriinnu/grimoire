import { describe, expect, it } from 'vitest'
import { makeEntry } from '../test-utils/noteListTestUtils'
import { selectPinnedEntries } from './pinnedPages'

function page(title: string, favoriteIndex: number | null, overrides: Parameters<typeof makeEntry>[0] = {}) {
  return makeEntry({ path: `/v/${title}.md`, title, favorite: true, favoriteIndex, ...overrides })
}

describe('selectPinnedEntries', () => {
  it('orders favourites by their sidebar index, unindexed last', () => {
    const titles = selectPinnedEntries([
      page('c', null),
      page('b', 2),
      page('a', 0),
      makeEntry({ path: '/v/plain.md', title: 'plain' }),
    ]).map((entry) => entry.title)
    expect(titles).toEqual(['a', 'b', 'c'])
  })

  it('drops archived favourites and caps at six', () => {
    const entries = Array.from({ length: 8 }, (_, index) => page(`p${index}`, index))
    entries[0] = page('p0', 0, { archived: true })
    const titles = selectPinnedEntries(entries).map((entry) => entry.title)
    expect(titles).toEqual(['p1', 'p2', 'p3', 'p4', 'p5', 'p6'])
  })

  it('returns nothing when there are no favourites', () => {
    expect(selectPinnedEntries([makeEntry()])).toEqual([])
  })
})
