import { describe, expect, it } from 'vitest'
import type { VaultEntry } from '../types'
import { buildTimeLoomSummary } from './timeLoom'

function entry(overrides: Partial<VaultEntry> = {}): VaultEntry {
  return {
    path: '/vault/notes/note.md',
    filename: 'note.md',
    title: 'Note',
    isA: 'Note',
    aliases: [],
    belongsTo: [],
    relatedTo: [],
    status: null,
    archived: false,
    modifiedAt: Date.UTC(2026, 4, 23, 10) / 1000,
    createdAt: Date.UTC(2026, 4, 23, 9) / 1000,
    fileSize: 0,
    snippet: '',
    wordCount: 10,
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

describe('buildTimeLoomSummary', () => {
  it('groups recent Markdown activity by local day and type without titles', () => {
    const now = new Date(2026, 4, 23, 12)
    const yesterday = Date.UTC(2026, 4, 22, 20) / 1000
    const summary = buildTimeLoomSummary([
      entry({ title: 'River Dream', isA: 'Dream', path: '/vault/dreams/river.md' }),
      entry({ title: 'Daily Checkin', isA: 'Journal', path: '/vault/journal/checkin.md' }),
      entry({ title: 'Open Task', isA: 'Task', status: 'active' }),
      entry({ title: 'Meeting Thread', isA: 'Meeting', modifiedAt: yesterday, createdAt: yesterday }),
    ], now)

    expect(summary.totalEvents).toBe(4)
    expect(summary.protectedEvents).toBe(2)
    expect(summary.voiceEvents).toBe(0)
    expect(summary.mobileEvents).toBe(0)
    expect(summary.memoryReviewEvents).toBe(0)
    expect(summary.taskEvents).toBe(0)
    expect(summary.activeSpanLabel).toBe('4 marks across 2 days')
    expect(summary.buckets.map((bucket) => bucket.label)).toEqual(['Today', 'Yesterday'])
    expect(summary.buckets[0]).toMatchObject({
      total: 3,
      protectedCount: 2,
    })
    expect(summary.buckets[0].statusCounts).toEqual([
      { label: 'Open', count: 1 },
      { label: 'Unmarked', count: 2 },
    ])
    expect(summary.buckets[0].typeCounts).toEqual([
      { label: 'Dream', count: 1 },
      { label: 'Journal', count: 1 },
      { label: 'Task', count: 1 },
    ])
    expect(summary.graph.nodes).toContainEqual({
      count: 2,
      id: 'lane:held-local',
      label: 'Held local',
      privacy: 'held-local',
      tone: 'private',
    })
    expect(summary.graph.links).toContainEqual(expect.objectContaining({
      from: 'day:2026-05-23',
      label: '2 held',
      privacy: 'held-local',
      to: 'lane:held-local',
    }))
    expect(summary.graph.privacyNote).toBe('count-only trail graph; private labels withheld')
    expect(JSON.stringify(summary)).not.toContain('River Dream')
    expect(JSON.stringify(summary)).not.toContain('/vault/dreams/river.md')
  })

  it('keeps full calendar days while limiting notebook trail buckets', () => {
    const now = new Date(2026, 4, 23, 12)
    const localNoon = (day: number) => new Date(2026, 4, day, 12).getTime() / 1000
    const summary = buildTimeLoomSummary([
      entry({ isA: 'Dream', modifiedAt: localNoon(23), createdAt: localNoon(23) }),
      entry({ isA: 'Journal', modifiedAt: localNoon(23), createdAt: localNoon(23) }),
      entry({ isA: 'Task', modifiedAt: localNoon(23), createdAt: localNoon(23) }),
      entry({ isA: 'Note', modifiedAt: localNoon(23), createdAt: localNoon(23) }),
      ...[22, 21, 20, 19, 18].map((day) => entry({
        isA: 'Journal',
        modifiedAt: localNoon(day),
        createdAt: localNoon(day),
      })),
    ], now)

    expect(summary.buckets).toHaveLength(5)
    expect(summary.calendarDays).toHaveLength(6)
    expect(summary.buckets[0].typeCounts).toEqual([
      { label: 'Dream', count: 1 },
      { label: 'Journal', count: 1 },
      { label: 'Task', count: 1 },
    ])
    expect(summary.calendarDays[0].typeCounts).toEqual([
      { label: 'Dream', count: 1 },
      { label: 'Journal', count: 1 },
      { label: 'Task', count: 1 },
      { label: 'Note', count: 1 },
    ])
  })

  it('uses locality markers for private counts without leaking protected labels', () => {
    const now = new Date(2026, 4, 23, 12)
    const summary = buildTimeLoomSummary([
      entry({ title: 'Hidden Therapy', isA: 'Private' }),
      entry({ title: 'Path Secret', isA: 'Note', path: '/vault/private/path-secret.md' }),
      entry({ title: 'Frontmatter Secret', properties: { locality: 'local-only' } }),
    ], now)
    const payload = JSON.stringify(summary)

    expect(summary.protectedEvents).toBe(3)
    expect(summary.buckets[0].protectedCount).toBe(3)
    expect(payload).not.toContain('Hidden Therapy')
    expect(payload).not.toContain('Path Secret')
    expect(payload).not.toContain('/vault/private')
    expect(payload).not.toContain('local-only')
  })

  it('coarsens protected custom type labels before rendering counts', () => {
    const now = new Date(2026, 4, 23, 12)
    const summary = buildTimeLoomSummary([
      entry({ title: 'Therapy Note', isA: 'Therapy' }),
      entry({ title: 'Health Note', isA: 'Health' }),
      entry({ title: 'Custody Note', isA: 'Custody Strategy', properties: { locality: 'local' } }),
      entry({ title: 'Dream Note', isA: 'Dream', path: '/vault/dreams/one.md' }),
      entry({ title: 'Public Custom', isA: 'Workshop' }),
    ], now)
    const payload = JSON.stringify(summary)

    expect(summary.protectedEvents).toBe(4)
    expect(summary.buckets[0].typeCounts).toEqual([
      { label: 'Private', count: 3 },
      { label: 'Dream', count: 1 },
      { label: 'Workshop', count: 1 },
    ])
    expect(payload).not.toContain('Therapy')
    expect(payload).not.toContain('Health')
    expect(payload).not.toContain('Custody Strategy')
  })

  it('ignores archived, type, non-Markdown, and undated entries while coarsening statuses', () => {
    const now = new Date(2026, 4, 23, 12)
    const summary = buildTimeLoomSummary([
      entry({ title: 'Archived', archived: true }),
      entry({ title: 'Closed', status: 'sensitive done text' }),
      entry({ title: 'Done', status: 'done' }),
      entry({ title: 'Type', isA: 'Type' }),
      entry({ title: 'Image', fileKind: 'binary' }),
      entry({ title: 'Undated', modifiedAt: null, createdAt: null }),
      entry({ title: 'Kept', isA: 'Note' }),
    ], now)

    expect(summary.totalEvents).toBe(3)
    expect(summary.buckets).toHaveLength(1)
    expect(summary.buckets[0].statusCounts).toEqual([
      { label: 'Open', count: 1 },
      { label: 'Done', count: 1 },
      { label: 'Unmarked', count: 1 },
    ])
    expect(summary.buckets[0].typeCounts).toEqual([{ label: 'Note', count: 3 }])
    expect(JSON.stringify(summary)).not.toContain('sensitive done text')
  })

  it('coarsens transcript and cleaned transcript notes into a private voice lane', () => {
    const now = new Date(2026, 4, 23, 12)
    const summary = buildTimeLoomSummary([
      entry({
        title: 'Transcript - therapy voice memo',
        isA: 'Transcript',
        path: '/vault/Private/transcript-therapy.md',
        properties: {
          locality: 'local',
          source_audio: '/vault/Private/attachments/recordings/therapy.webm',
          transcription_provider: 'local_whisper',
        },
      }),
      entry({
        title: 'Clean Note - therapy voice memo',
        isA: 'Note',
        path: '/vault/memory/clean-therapy.md',
        properties: {
          locality: 'local',
          source_audio: '/vault/Private/attachments/recordings/therapy.webm',
          transcription_provider: 'local_whisper',
        },
      }),
      entry({ title: 'Normal Note', isA: 'Note' }),
    ], now)
    const payload = JSON.stringify(summary)

    expect(summary.voiceEvents).toBe(2)
    expect(summary.protectedEvents).toBe(2)
    expect(summary.buckets[0].typeCounts).toEqual([
      { label: 'Voice', count: 2 },
      { label: 'Note', count: 1 },
    ])
    expect(payload).not.toContain('therapy voice memo')
    expect(payload).not.toContain('therapy.webm')
    expect(payload).not.toContain('local_whisper')
  })

  it('counts Memory Ledger review pressure without leaking memory labels or references', () => {
    const now = new Date(2026, 4, 23, 12)
    const summary = buildTimeLoomSummary([
      entry({
        title: 'Sensitive Council Memory',
        isA: 'Memory',
        path: '/vault/memory/crystallized/sensitive-council-memory.md',
        properties: {
          locality: 'local',
          contradicted_by: ['[[Private/Oil Signal]]'],
          expires_at: '2026-05-28',
          reviewed_at: '2026-05-10',
        },
      }),
      entry({
        title: 'Stable Memory',
        isA: 'Memory',
        path: '/vault/memory/crystallized/stable-memory.md',
        properties: {
          crystallized: true,
          expires_at: '2026-09-01',
          reviewed_at: '2026-05-23',
        },
      }),
    ], now)
    const payload = JSON.stringify(summary)

    expect(summary.memoryReviewEvents).toBe(1)
    expect(summary.protectedEvents).toBe(2)
    expect(summary.buckets[0].typeCounts).toEqual([
      { label: 'Memory review', count: 1 },
      { label: 'Memory', count: 1 },
    ])
    expect(summary.patterns).toContainEqual({
      label: 'Private review',
      detail: '2 private / 1 memory review',
      tone: 'private',
    })
    expect(payload).not.toContain('Sensitive Council Memory')
    expect(payload).not.toContain('Stable Memory')
    expect(payload).not.toContain('sensitive-council-memory')
    expect(payload).not.toContain('stable-memory')
    expect(payload).not.toContain('Private/Oil Signal')
    expect(payload).not.toContain('"locality"')
    expect(payload).not.toContain('local-only')
  })

})
