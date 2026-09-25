import { describe, expect, it } from 'vitest'
import { makeEntry } from '../test-utils/noteListTestUtils'
import { findTodayJournal, todayJournalTitle } from './todayJournal'

const now = new Date(2026, 8, 25, 9, 0)

describe("today's journal", () => {
  it('names today the way journal capture does', () => {
    expect(todayJournalTitle(now)).toBe('Journal 2026-09-25')
  })

  it('finds bare and seeded titles, preferring the most recently touched', () => {
    const bare = makeEntry({ path: '/v/a.md', title: 'Journal 2026-09-25', isA: 'Journal', modifiedAt: 10 })
    const seeded = makeEntry({ path: '/v/b.md', title: 'Journal 2026-09-25 - morning pages', isA: 'Journal', modifiedAt: 20 })
    expect(findTodayJournal([bare, seeded], now)).toBe(seeded)
    expect(findTodayJournal([bare], now)).toBe(bare)
  })

  it('ignores other days, other types and archived pages', () => {
    const entries = [
      makeEntry({ path: '/v/y.md', title: 'Journal 2026-09-24', isA: 'Journal' }),
      makeEntry({ path: '/v/n.md', title: 'Journal 2026-09-25', isA: 'Note' }),
      makeEntry({ path: '/v/x.md', title: 'Journal 2026-09-25', isA: 'Journal', archived: true }),
    ]
    expect(findTodayJournal(entries, now)).toBeNull()
  })
})
