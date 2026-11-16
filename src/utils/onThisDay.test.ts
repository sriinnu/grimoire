import { describe, expect, it } from 'vitest'
import { makeEntry } from '../test-utils/noteListTestUtils'
import { entryLocalDay, isAnniversary, selectOnThisDay } from './onThisDay'

/** Seconds since epoch for a local wall-clock time. */
function localSeconds(year: number, month: number, day: number, hour = 12): number {
  return Math.floor(new Date(year, month - 1, day, hour).getTime() / 1000)
}

function note(title: string, created: number | null, overrides: Parameters<typeof makeEntry>[0] = {}) {
  return makeEntry({ path: `/v/${title}.md`, filename: `${title}.md`, title, isA: 'Note', createdAt: created, ...overrides })
}

const now = new Date(2026, 8, 26, 9, 30)

describe('selectOnThisDay', () => {
  it('finds pages from this day in earlier years, nearest year first', () => {
    const items = selectOnThisDay([
      note('three', localSeconds(2023, 9, 26)),
      note('one', localSeconds(2025, 9, 26)),
      note('today', localSeconds(2026, 9, 26)),
      note('other day', localSeconds(2025, 9, 25)),
    ], now)
    expect(items.map((item) => [item.entry.title, item.label])).toEqual([
      ['one', '1 year ago'],
      ['three', '3 years ago'],
    ])
  })

  it('compares local calendar days, not UTC days', () => {
    // 23:30 and 00:30 local sit on different UTC dates in most timezones.
    const late = note('late', localSeconds(2025, 9, 26, 23) + 30 * 60)
    const early = note('early', localSeconds(2025, 9, 26, 0) + 30 * 60)
    const dayBefore = note('before', localSeconds(2025, 9, 25, 23) + 30 * 60)
    const titles = selectOnThisDay([late, early, dayBefore], now).map((item) => item.entry.title)
    expect(titles.sort()).toEqual(['early', 'late'])
  })

  it('uses a journal title date over the file date', () => {
    const journal = note('Journal 2024-09-26 - rain', localSeconds(2026, 9, 1), { isA: 'Journal' })
    expect(selectOnThisDay([journal], now).map((item) => item.label)).toEqual(['2 years ago'])
  })

  it('falls back to a title date when createdAt is missing', () => {
    expect(entryLocalDay(note('Journal 2025-09-26', null))).toEqual({ year: 2025, month: 9, day: 26 })
    expect(entryLocalDay(note('Untitled', null))).toBeNull()
    expect(entryLocalDay(note('Journal 2025-02-30', null, { isA: 'Journal' }))).toBeNull()
  })

  it('caps the list at three', () => {
    const entries = [2025, 2024, 2023, 2022, 2021].map((year) => note(`y${year}`, localSeconds(year, 9, 26)))
    expect(selectOnThisDay(entries, now)).toHaveLength(3)
  })

  it('falls back to a week or a month ago only when earlier years are empty', () => {
    const week = note('week', localSeconds(2026, 9, 19))
    const month = note('month', localSeconds(2026, 8, 26))
    expect(selectOnThisDay([month, week], now).map((item) => item.label)).toEqual(['A week ago', 'A month ago'])
    const year = note('year', localSeconds(2025, 9, 26))
    expect(selectOnThisDay([month, week, year], now).map((item) => item.entry.title)).toEqual(['year'])
  })

  it('crosses month and year boundaries for the fallbacks', () => {
    const jan3 = new Date(2026, 0, 3, 8)
    const items = selectOnThisDay([
      note('week', localSeconds(2025, 12, 27)),
      note('month', localSeconds(2025, 12, 3)),
    ], jan3)
    expect(items.map((item) => item.label)).toEqual(['A week ago', 'A month ago'])
    // Mar 31 has no Feb 31: a month ago clamps to the end of February.
    expect(selectOnThisDay([note('feb', localSeconds(2026, 2, 28))], new Date(2026, 2, 31, 8))[0]?.label).toBe('A month ago')
  })

  it('skips archived, non-markdown and type pages', () => {
    const created = localSeconds(2025, 9, 26)
    expect(selectOnThisDay([
      note('archived', created, { archived: true }),
      note('image', created, { fileKind: 'binary' }),
      note('Type', created, { isA: 'Type' }),
    ], now)).toEqual([])
  })

  it('returns nothing for an empty vault', () => {
    expect(selectOnThisDay([], now)).toEqual([])
  })

  it('adds a counts-only reason: age bucket plus backlink count', () => {
    const target = note('hub page', localSeconds(2025, 9, 26))
    const linker = note('linker', localSeconds(2026, 9, 20), { outgoingLinks: ['hub page'] })
    const [item] = selectOnThisDay([target, linker], now)

    expect(item.reason).toBe('last touched over a year ago · 1 backlink')
  })

  it('buckets the touched age at 7/30/90/180 days and a year', () => {
    const aged = (daysAgo: number) => {
      const touched = new Date(2026, 8, 26, 9)
      touched.setDate(touched.getDate() - daysAgo)
      return note('anniversary', localSeconds(2025, 9, 26), { modifiedAt: Math.floor(touched.getTime() / 1000) })
    }
    expect(selectOnThisDay([aged(5)], now)[0].reason).toContain('last touched this week')
    expect(selectOnThisDay([aged(20)], now)[0].reason).toContain('last touched this month')
    expect(selectOnThisDay([aged(90)], now)[0].reason).toContain('last touched 90 days ago')
    expect(selectOnThisDay([aged(150)], now)[0].reason).toContain('last touched 180 days ago')
    expect(selectOnThisDay([aged(400)], now)[0].reason).toContain('last touched over a year ago')
  })

  it('counts multiple distinct backlinking pages and keeps titles out of the reason', () => {
    const target = note('hub page', localSeconds(2025, 9, 26))
    const linkers = [
      note('linker a', localSeconds(2026, 9, 20), { outgoingLinks: ['hub page'] }),
      note('linker b', localSeconds(2026, 9, 21), { outgoingLinks: ['hub page'] }),
    ]
    const [item] = selectOnThisDay([target, ...linkers], now)

    expect(item.reason).toContain('2 backlinks')
    expect(item.reason).not.toContain('hub page')
    expect(item.reason).not.toContain('linker')
  })

  it('still surfaces a reason when the entry has no touch timestamp', () => {
    const untimed = note('Journal 2024-09-26', null, { isA: 'Journal' })
    expect(selectOnThisDay([untimed], now)[0].reason).toBe('0 backlinks')
  })
})

describe('leap days', () => {
  const leapDay = { year: 2024, month: 2, day: 29 }

  it('shows Feb 29 on Feb 28 in non-leap years', () => {
    expect(isAnniversary(leapDay, { year: 2025, month: 2, day: 28 })).toBe(true)
    expect(isAnniversary(leapDay, { year: 2025, month: 3, day: 1 })).toBe(false)
    const items = selectOnThisDay([note('leap', localSeconds(2024, 2, 29))], new Date(2025, 1, 28, 9))
    expect(items.map((item) => item.label)).toEqual(['1 year ago'])
  })

  it('keeps Feb 29 on Feb 29 in leap years', () => {
    expect(isAnniversary(leapDay, { year: 2028, month: 2, day: 28 })).toBe(false)
    expect(isAnniversary(leapDay, { year: 2028, month: 2, day: 29 })).toBe(true)
  })
})
