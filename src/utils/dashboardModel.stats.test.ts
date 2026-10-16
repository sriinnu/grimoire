import { describe, expect, it } from 'vitest'
import type { VaultEntry } from '../types'
import { computeDashboardStats } from './dashboardModel'

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
    wordCount: 1,
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
