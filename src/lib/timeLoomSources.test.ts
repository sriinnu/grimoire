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

describe('buildTimeLoomSummary source lanes', () => {
  it('folds iPhone and iPad capture drafts into a mobile lane without leaking details', () => {
    const now = new Date(2026, 4, 23, 12)
    const summary = buildTimeLoomSummary([
      entry({
        title: 'Private iPhone dream',
        isA: 'Dream',
        path: '/vault/dreams/mobile/private-iphone-dream.md',
        properties: {
          created_from: 'mobile-capture',
          egress: 'blocked',
          mobile_device: 'iphone',
          mobile_source: 'voice',
        },
      }),
      entry({
        title: 'Private iPad pencil note',
        isA: 'Note',
        path: '/vault/notes/mobile/private-ipad-pencil-note.md',
        properties: {
          created_from: 'mobile-capture',
          locality: 'local',
          mobile_device: 'ipad',
          mobile_source: 'pencil',
        },
      }),
      entry({ title: 'Normal Note', isA: 'Note' }),
    ], now)
    const payload = JSON.stringify(summary)

    expect(summary.mobileEvents).toBe(2)
    expect(summary.protectedEvents).toBe(2)
    expect(summary.buckets[0].typeCounts).toEqual([
      { label: 'Mobile', count: 2 },
      { label: 'Note', count: 1 },
    ])
    expect(payload).not.toContain('Private iPhone dream')
    expect(payload).not.toContain('private-ipad-pencil-note')
    expect(payload).not.toContain('iphone')
    expect(payload).not.toContain('pencil')
    expect(payload).not.toContain('mobile-capture')
  })

  it('counts scheduled mobile captures as both calendar and mobile metadata', () => {
    const now = new Date(2026, 4, 23, 12)
    const summary = buildTimeLoomSummary([
      entry({
        title: 'Private iPhone calendar capture',
        isA: 'Event',
        path: '/vault/journals/mobile/private-iphone-calendar.md',
        properties: {
          created_from: 'mobile-capture',
          date: '2026-05-23',
          egress: 'blocked',
          mobile_device: 'iphone',
          mobile_source: 'share-extension',
        },
      }),
    ], now)
    const payload = JSON.stringify(summary)

    expect(summary.calendarEvents).toBe(1)
    expect(summary.mobileEvents).toBe(1)
    expect(summary.protectedEvents).toBe(1)
    expect(summary.buckets[0].typeCounts).toEqual([{ label: 'Calendar', count: 1 }])
    expect(payload).not.toContain('Private iPhone calendar capture')
    expect(payload).not.toContain('private-iphone-calendar')
    expect(payload).not.toContain('iphone')
    expect(payload).not.toContain('share-extension')
    expect(payload).not.toContain('mobile-capture')
  })

  it('uses captured_at for unscheduled mobile chronology instead of desktop import time', () => {
    const now = new Date(2026, 4, 23, 12)
    const importedAt = Date.UTC(2026, 4, 23, 11) / 1000
    const summary = buildTimeLoomSummary([
      entry({
        title: 'Private imported phone note',
        isA: 'Journal',
        modifiedAt: importedAt,
        createdAt: importedAt,
        path: '/vault/journals/mobile/private-imported-phone-note.md',
        properties: {
          captured_at: '2026-05-21T21:15:00.000Z',
          created_from: 'mobile-capture',
          egress: 'blocked',
          mobile_device: 'iphone',
          mobile_source: 'quick-capture',
        },
      }),
    ], now)
    const payload = JSON.stringify(summary)

    expect(summary.mobileEvents).toBe(1)
    expect(summary.buckets.map((bucket) => bucket.dateKey)).toEqual(['2026-05-21'])
    expect(summary.activeSpanLabel).toBe('1 mark on May 21')
    expect(payload).not.toContain('Private imported phone note')
    expect(payload).not.toContain('private-imported-phone-note')
    expect(payload).not.toContain('iphone')
    expect(payload).not.toContain('quick-capture')
  })

  it('builds a metadata-only pattern lens without leaking source details', () => {
    const now = new Date(2026, 4, 23, 12)
    const summary = buildTimeLoomSummary([
      entry({
        title: 'Private iPhone dream',
        isA: 'Dream',
        path: '/vault/dreams/private-iphone-dream.md',
        properties: {
          created_from: 'mobile-capture',
          mobile_device: 'iphone',
          mobile_source: 'voice',
        },
      }),
      entry({
        title: 'Private voice memo',
        isA: 'Transcript',
        path: '/vault/private/voice/private-voice.md',
        properties: {
          locality: 'local-only',
          source_audio: '/vault/private/audio/private-voice.webm',
          transcription_provider: 'local_whisper',
        },
      }),
      entry({
        title: 'Public meeting',
        isA: 'Meeting',
        properties: { starts_at: '2026-05-23T11:00:00' },
      }),
      entry({ title: 'Active task', isA: 'Task', status: 'active' }),
    ], now)
    const payload = JSON.stringify(summary)

    expect(summary.patterns).toEqual([
      { label: 'Primary thread', detail: '1 mobile capture / 1 planned mark / 1 voice capture', tone: 'steady' },
      { label: 'Revisit', detail: '1 open marker across 1 day', tone: 'attention' },
      { label: 'Private review', detail: '2 private / 1 mobile / 1 voice', tone: 'private' },
    ])
    expect(payload).not.toContain('Private iPhone dream')
    expect(payload).not.toContain('private-iphone-dream')
    expect(payload).not.toContain('Private voice memo')
    expect(payload).not.toContain('private-voice.webm')
    expect(payload).not.toContain('local_whisper')
    expect(payload).not.toContain('iphone')
  })

  it('places due-next frontmatter on the task date without leaking task text', () => {
    const now = new Date(2026, 4, 23, 12)
    const importedAt = Date.UTC(2026, 4, 23, 11) / 1000
    const summary = buildTimeLoomSummary([
      entry({
        title: 'Secret bill follow-up',
        isA: 'Task',
        status: 'active',
        modifiedAt: importedAt,
        createdAt: importedAt,
        properties: {
          due_date: '2026-05-21',
          project: 'Private money thing',
        },
      }),
      entry({
        title: 'Public todo',
        isA: 'Todo',
        status: 'open',
        modifiedAt: importedAt,
        createdAt: importedAt,
        properties: {
          deadline: '2026-05-22T09:00:00',
        },
      }),
    ], now)
    const payload = JSON.stringify(summary)

    expect(summary.taskEvents).toBe(2)
    expect(summary.totalEvents).toBe(2)
    expect(summary.buckets.map((bucket) => bucket.dateKey)).toEqual(['2026-05-22', '2026-05-21'])
    expect(summary.buckets[0].typeCounts).toEqual([{ label: 'Task', count: 1 }])
    expect(summary.buckets[1].typeCounts).toEqual([{ label: 'Task', count: 1 }])
    expect(summary.patterns).toContainEqual({
      label: 'Revisit',
      detail: '2 due next / 2 open markers across 2 days',
      tone: 'attention',
    })
    expect(payload).not.toContain('Secret bill follow-up')
    expect(payload).not.toContain('Private money thing')
    expect(payload).not.toContain('due_date')
    expect(payload).not.toContain('deadline')
  })

  it('folds vault commits into metadata-only trail counts', () => {
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
    expect(summary.protectedEvents).toBe(1)
    expect(summary.buckets[0].protectedCount).toBe(1)
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
