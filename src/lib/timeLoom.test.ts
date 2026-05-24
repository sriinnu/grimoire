import { describe, expect, it } from 'vitest'
import type { PulseCommit, VaultEntry } from '../types'
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

function commit(overrides: Partial<PulseCommit> = {}): PulseCommit {
  return {
    hash: 'abc123-secret-hash',
    shortHash: 'abc123s',
    message: 'Write very private commit message',
    date: Date.UTC(2026, 4, 23, 11) / 1000,
    githubUrl: 'https://github.com/private/repo/commit/abc123-secret-hash',
    files: [
      { path: 'dreams/secret-river.md', status: 'modified', title: 'secret river' },
    ],
    added: 0,
    modified: 1,
    deleted: 0,
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
    expect(summary.activeSpanLabel).toBe('4 events across 2 active days')
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
    expect(JSON.stringify(summary)).not.toContain('River Dream')
    expect(JSON.stringify(summary)).not.toContain('/vault/dreams/river.md')
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

  it('folds vault commits into metadata-only timeline counts', () => {
    const now = new Date(2026, 4, 23, 12)
    const summary = buildTimeLoomSummary([
      entry({ title: 'Public Note', isA: 'Note' }),
    ], now, {
      commits: [
        commit(),
        commit({ date: 0, message: 'Invalid commit should be ignored' }),
      ],
    })
    const payload = JSON.stringify(summary)

    expect(summary.totalEvents).toBe(2)
    expect(summary.commitEvents).toBe(1)
    expect(summary.protectedEvents).toBe(0)
    expect(summary.buckets[0].typeCounts).toEqual([
      { label: 'Commit', count: 1 },
      { label: 'Note', count: 1 },
    ])
    expect(summary.buckets[0].statusCounts).toEqual([
      { label: 'Done', count: 1 },
      { label: 'Unmarked', count: 1 },
    ])
    expect(payload).not.toContain('Write very private commit message')
    expect(payload).not.toContain('abc123-secret-hash')
    expect(payload).not.toContain('dreams/secret-river.md')
    expect(payload).not.toContain('secret river')
    expect(payload).not.toContain('Invalid commit should be ignored')
  })

  it('uses scheduled frontmatter dates for calendar entries without leaking details', () => {
    const now = new Date(2026, 4, 23, 12)
    const yesterday = Date.UTC(2026, 4, 22, 20) / 1000
    const summary = buildTimeLoomSummary([
      entry({
        title: 'Private Clinic Appointment',
        isA: 'Event',
        path: '/vault/private/calendar/private-clinic.md',
        modifiedAt: yesterday,
        createdAt: yesterday,
        properties: {
          date: '2026-05-23',
          locality: 'local-only',
          location: 'Secret clinic',
          attendees: ['Hidden Person'],
        },
      }),
      entry({
        title: 'Dated Journal',
        isA: 'Journal',
        properties: { date: '2026-05-23' },
      }),
    ], now)
    const payload = JSON.stringify(summary)

    expect(summary.totalEvents).toBe(2)
    expect(summary.calendarEvents).toBe(1)
    expect(summary.protectedEvents).toBe(2)
    expect(summary.buckets.map((bucket) => bucket.label)).toEqual(['Today'])
    expect(summary.buckets[0].typeCounts).toEqual([
      { label: 'Calendar', count: 1 },
      { label: 'Journal', count: 1 },
    ])
    expect(payload).not.toContain('Private Clinic Appointment')
    expect(payload).not.toContain('/vault/private/calendar/private-clinic.md')
    expect(payload).not.toContain('Secret clinic')
    expect(payload).not.toContain('Hidden Person')
    expect(payload).not.toContain('local-only')
  })
})
