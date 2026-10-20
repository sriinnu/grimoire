import { describe, expect, it } from 'vitest'
import type { VaultEntry } from '../types'
import { computeDashboardStats, computeWeeklyReview } from './dashboardModel'

function entry(patch: Partial<VaultEntry> & { title: string; type: string }): VaultEntry {
  return {
    path: patch.path ?? `/vault/${patch.title.toLowerCase().replace(/\s+/g, '-')}.md`,
    filename: patch.filename ?? `${patch.title.toLowerCase().replace(/\s+/g, '-')}.md`,
    title: patch.title,
    isA: patch.type,
    aliases: [],
    belongsTo: [],
    relatedTo: [],
    status: patch.status ?? null,
    archived: patch.archived ?? false,
    modifiedAt: patch.modifiedAt ?? null,
    createdAt: patch.createdAt ?? null,
    fileSize: 0,
    snippet: '',
    wordCount: patch.wordCount ?? 1,
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
    outgoingLinks: patch.outgoingLinks ?? [],
    properties: patch.properties ?? {},
    hasH1: true,
    fileKind: 'markdown',
  }
}

const DAY_SECONDS = 24 * 60 * 60

describe('computeDashboardStats', () => {
  it('counts pages, journals, dreams, and links from active content only', () => {
    const stats = computeDashboardStats([
      entry({ title: 'Reading Note', type: 'Note' }),
      entry({ title: 'Journal Today', type: 'Journal' }),
      entry({
        title: 'Dream Log',
        type: 'Dream',
        outgoingLinks: ['[[Reading Note]]', '[[Journal Today]]'],
      }),
      entry({ title: 'Type', type: 'Type' }),
      entry({ title: 'Archived Note', type: 'Note', archived: true }),
    ])

    // Pages = active content entries that are not journals (dreams included).
    expect(stats.pages).toBe(2)
    expect(stats.journals).toBe(1)
    expect(stats.dreams).toBe(1)
    expect(stats.links).toBe(2)
  })

  it('buckets each series across 14 days by modifiedAt, oldest to newest', () => {
    const now = new Date(2026, 4, 17, 12)
    const nowSeconds = Math.floor(now.getTime() / 1000)
    const stats = computeDashboardStats([
      entry({ title: 'Today note', type: 'Note', modifiedAt: nowSeconds }),
      entry({ title: 'Yesterday journal', type: 'Journal', modifiedAt: nowSeconds - DAY_SECONDS }),
      entry({ title: 'Week old dream', type: 'Dream', modifiedAt: nowSeconds - 7 * DAY_SECONDS }),
    ], now)

    expect(stats.pagesSeries).toHaveLength(14)
    expect(stats.journalsSeries).toHaveLength(14)
    expect(stats.dreamsSeries).toHaveLength(14)
    expect(stats.linksSeries).toHaveLength(14)
    expect(stats.pagesSeries[13]).toBe(1)
    expect(stats.journalsSeries[12]).toBe(1)
    expect(stats.dreamsSeries[6]).toBe(1)
    // The dream also counts as a page — pages are all non-journal content.
    expect(stats.pagesSeries.reduce((sum, value) => sum + value, 0)).toBe(2)
  })

  it('falls back to createdAt when modifiedAt is missing', () => {
    const now = new Date(2026, 4, 17, 12)
    const nowSeconds = Math.floor(now.getTime() / 1000)
    const stats = computeDashboardStats([
      entry({ title: 'Created today', type: 'Note', createdAt: nowSeconds }),
    ], now)

    expect(stats.pages).toBe(1)
    expect(stats.pagesSeries[13]).toBe(1)
  })

  it('counts totals even when timestamps fall outside the sparkline window', () => {
    const now = new Date(2026, 4, 17, 12)
    const nowSeconds = Math.floor(now.getTime() / 1000)
    const stats = computeDashboardStats([
      entry({
        title: 'Old dream',
        type: 'Dream',
        modifiedAt: nowSeconds - 20 * DAY_SECONDS,
        outgoingLinks: ['[[a]]', '[[b]]', '[[c]]'],
      }),
      entry({ title: 'Future note', type: 'Note', modifiedAt: nowSeconds + 3 * DAY_SECONDS }),
    ], now)

    expect(stats.dreams).toBe(1)
    // Pages include dreams — only journals are excluded from the pages lane.
    expect(stats.pages).toBe(2)
    expect(stats.links).toBe(3)
    expect(stats.dreamsSeries.reduce((sum, value) => sum + value, 0)).toBe(0)
    expect(stats.linksSeries.reduce((sum, value) => sum + value, 0)).toBe(0)
  })

  it('weights the links series by outgoing wikilinks recorded per day', () => {
    const now = new Date(2026, 4, 17, 12)
    const nowSeconds = Math.floor(now.getTime() / 1000)
    const stats = computeDashboardStats([
      entry({
        title: 'Hub',
        type: 'Note',
        modifiedAt: nowSeconds,
        outgoingLinks: ['[[A]]', '[[B]]'],
      }),
    ], now)

    expect(stats.pagesSeries[13]).toBe(1)
    expect(stats.linksSeries[13]).toBe(2)
  })

  it('keeps private note labels out of the stats payload', () => {
    const stats = computeDashboardStats([
      entry({
        title: 'Secret River Dream',
        type: 'Dream',
        path: '/vault/dreams/secret-river.md',
        properties: { locality: 'local' },
      }),
      entry({ title: 'Private Plan', type: 'Note', properties: { locality: 'local' } }),
    ])
    const payload = JSON.stringify(stats)

    expect(stats.pages).toBe(2)
    expect(stats.dreams).toBe(1)
    expect(payload).not.toContain('Secret River Dream')
    expect(payload).not.toContain('Private Plan')
    expect(payload).not.toContain('/vault/')
  })
})


describe('computeWeeklyReview', () => {
  const at = (date: Date): number => Math.floor(date.getTime() / 1000)
  /** Thursday 2026-10-15 → week Mon Oct 12 – Sun Oct 18, prev week Oct 5–11. */
  const now = new Date(2026, 9, 15, 12)

  it('counts created and touched entries inside the Monday–Sunday week window', () => {
    const review = computeWeeklyReview([
      entry({ title: 'Monday note', type: 'Note', createdAt: at(new Date(2026, 9, 13, 9)) }),
      entry({ title: 'Sunday note', type: 'Note', createdAt: at(new Date(2026, 9, 11, 9)) }),
      entry({ title: 'Next week note', type: 'Note', createdAt: at(new Date(2026, 9, 19, 9)) }),
      entry({
        title: 'Touched note',
        type: 'Note',
        createdAt: at(new Date(2026, 8, 1)),
        modifiedAt: at(new Date(2026, 9, 14, 8)),
      }),
    ], now)

    expect(review.weekStartKey).toBe('2026-10-12')
    expect(review.weekEndKey).toBe('2026-10-18')
    expect(review.entriesCreatedThisWeek).toBe(1)
    // Entries created this week also count as touched (modifiedAt ?? createdAt).
    expect(review.entriesModifiedThisWeek).toBe(2)
  })

  it('builds a Monday–Sunday day strip with per-day counts and today flagged', () => {
    const review = computeWeeklyReview([
      entry({ title: 'Monday note', type: 'Note', createdAt: at(new Date(2026, 9, 13, 9)) }),
      entry({
        title: 'Wednesday touch',
        type: 'Note',
        createdAt: at(new Date(2026, 8, 1)),
        modifiedAt: at(new Date(2026, 9, 14, 8)),
      }),
    ], now)

    expect(review.days).toHaveLength(7)
    expect(review.days.map((day) => day.dateKey)).toEqual([
      '2026-10-12',
      '2026-10-13',
      '2026-10-14',
      '2026-10-15',
      '2026-10-16',
      '2026-10-17',
      '2026-10-18',
    ])
    expect(review.days[0].count).toBe(0)
    expect(review.days[1].count).toBe(1)
    expect(review.days[2].count).toBe(1)
    expect(review.days.filter((day) => day.count === 0)).toHaveLength(5)
    expect(review.days[3].isToday).toBe(true)
    expect(review.days.filter((day) => day.isToday)).toHaveLength(1)
  })

  it('counts distinct journal days and sums words for entries created this week', () => {
    const review = computeWeeklyReview([
      entry({ title: 'Monday journal', type: 'Journal', createdAt: at(new Date(2026, 9, 13, 8)) }),
      entry({
        title: 'Older journal touched wednesday',
        type: 'Journal',
        createdAt: at(new Date(2026, 8, 30)),
        modifiedAt: at(new Date(2026, 9, 14, 21)),
      }),
      entry({
        title: 'Second wednesday journal',
        type: 'Journal',
        createdAt: at(new Date(2026, 9, 14, 7)),
        modifiedAt: at(new Date(2026, 9, 14, 7)),
      }),
      entry({ title: 'Wordy note', type: 'Note', createdAt: at(new Date(2026, 9, 13, 10)), wordCount: 40 }),
      entry({ title: 'Wordy task', type: 'Task', createdAt: at(new Date(2026, 9, 13, 11)), wordCount: 25 }),
      entry({ title: 'Last week words', type: 'Note', createdAt: at(new Date(2026, 9, 6)), wordCount: 30 }),
    ], now)

    expect(review.journalDaysActive).toBe(2)
    expect(review.wordCountDelta).toBe(67)
  })

  it('measures the streak ending today, falling back to yesterday', () => {
    const threeDayStreak = computeWeeklyReview([
      entry({ title: 'Today note', type: 'Note', createdAt: at(new Date(2026, 9, 15, 9)) }),
      entry({ title: 'Yesterday note', type: 'Note', createdAt: at(new Date(2026, 9, 14, 9)) }),
      entry({ title: 'Tuesday note', type: 'Note', createdAt: at(new Date(2026, 9, 13, 9)) }),
      entry({ title: 'Last monday note', type: 'Note', createdAt: at(new Date(2026, 9, 12, 9)) }),
    ], now)
    expect(threeDayStreak.streakDays).toBe(4)

    const cappedStreak = computeWeeklyReview([
      entry({ title: 'Today note', type: 'Note', createdAt: at(new Date(2026, 9, 15, 9)) }),
      entry({ title: 'Yesterday note', type: 'Note', createdAt: at(new Date(2026, 9, 14, 9)) }),
      entry({ title: 'Tuesday note', type: 'Note', createdAt: at(new Date(2026, 9, 13, 9)) }),
    ], now)
    expect(cappedStreak.streakDays).toBe(3)

    const yesterdayStreak = computeWeeklyReview([
      entry({ title: 'Yesterday note', type: 'Note', createdAt: at(new Date(2026, 9, 14, 9)) }),
    ], now)
    expect(yesterdayStreak.streakDays).toBe(1)

    const brokenStreak = computeWeeklyReview([
      entry({ title: 'Tuesday note', type: 'Note', createdAt: at(new Date(2026, 9, 13, 9)) }),
    ], now)
    expect(brokenStreak.streakDays).toBe(0)

    const empty = computeWeeklyReview([], now)
    expect(empty.streakDays).toBe(0)
  })

  it('builds the top-3 type mix sorted by count, then name', () => {
    const review = computeWeeklyReview([
      entry({ title: 'N1', type: 'Note', createdAt: at(new Date(2026, 9, 13)) }),
      entry({ title: 'N2', type: 'Note', createdAt: at(new Date(2026, 9, 13)) }),
      entry({ title: 'N3', type: 'Note', createdAt: at(new Date(2026, 9, 14)) }),
      entry({ title: 'D1', type: 'Dream', createdAt: at(new Date(2026, 9, 13)) }),
      entry({ title: 'D2', type: 'Dream', createdAt: at(new Date(2026, 9, 14)) }),
      entry({ title: 'J1', type: 'Journal', createdAt: at(new Date(2026, 9, 14)) }),
      entry({ title: 'J2', type: 'Journal', createdAt: at(new Date(2026, 9, 15)) }),
      entry({ title: 'T1', type: 'Task', createdAt: at(new Date(2026, 9, 15)) }),
    ], now)

    expect(review.typeMix).toEqual([
      { type: 'Note', count: 3 },
      { type: 'Dream', count: 2 },
      { type: 'Journal', count: 2 },
    ])
  })

  it('computes last-week counts for deltas', () => {
    const review = computeWeeklyReview([
      entry({ title: 'Prev monday note', type: 'Note', createdAt: at(new Date(2026, 9, 6, 9)), wordCount: 12 }),
      entry({
        title: 'Prev friday touch',
        type: 'Note',
        createdAt: at(new Date(2026, 8, 20)),
        modifiedAt: at(new Date(2026, 9, 9, 9)),
      }),
      entry({ title: 'Prev week journal', type: 'Journal', createdAt: at(new Date(2026, 9, 8, 9)) }),
      entry({ title: 'This week note', type: 'Note', createdAt: at(new Date(2026, 9, 13, 9)) }),
    ], now)

    expect(review.lastWeek).toEqual({
      entriesCreated: 2,
      entriesModified: 3,
      journalDaysActive: 1,
      wordCountDelta: 13,
    })
    expect(review.entriesCreatedThisWeek).toBe(1)
  })

  it('keeps private note labels out of the weekly payload', () => {
    const review = computeWeeklyReview([
      entry({
        title: 'Secret River Dream',
        type: 'Dream',
        path: '/vault/dreams/secret-river.md',
        createdAt: at(new Date(2026, 9, 13)),
        properties: { locality: 'local' },
      }),
    ], now)
    const payload = JSON.stringify(review)

    expect(review.entriesCreatedThisWeek).toBe(1)
    expect(review.typeMix).toEqual([{ type: 'Dream', count: 1 }])
    expect(payload).not.toContain('Secret River Dream')
    expect(payload).not.toContain('/vault/')
  })
})
