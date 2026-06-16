import { describe, expect, it } from 'vitest'
import type { VaultEntry } from '../types'
import { buildDashboardSummary } from './dashboardModel'

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
    modifiedAt: patch.modifiedAt ?? 1,
    createdAt: patch.createdAt ?? 1,
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
    outgoingLinks: [],
    properties: patch.properties ?? {},
    hasH1: true,
    fileKind: 'markdown',
  }
}

describe('buildDashboardSummary', () => {
  it('counts open loops, private lanes, memory queue, and recent notes', () => {
    const today = new Date(2026, 4, 17)
    const todaySeconds = Math.floor(today.getTime() / 1000)
    const summary = buildDashboardSummary([
      entry({ title: 'Journal 2026-05-17', type: 'Journal', modifiedAt: todaySeconds }),
      entry({ title: 'Dream 2026-05-17', type: 'Dream', modifiedAt: todaySeconds - 10 }),
      entry({ title: 'Renew license', type: 'Task', status: 'Open', modifiedAt: 20 }),
      entry({ title: 'Old task', type: 'Task', status: 'Done', modifiedAt: 10 }),
      entry({ title: 'Agent memory', type: 'Memory', status: 'Review', modifiedAt: 30 }),
      entry({ title: 'Type', type: 'Type', modifiedAt: 100 }),
    ], today)

    expect(summary.activeNotes).toBe(5)
    expect(summary.hasJournalToday).toBe(true)
    expect(summary.hasDreamToday).toBe(true)
    expect(summary.memoryQueueCount).toBe(1)
    expect(summary.memoryQueueEntries[0].title).toBe('Agent memory')
    expect(summary.openLoopCount).toBe(4)
    expect(summary.openLoopBuckets[0]).toEqual({ label: 'Dream', count: 1 })
    expect(summary.recentEntries[0].title).toBe('Renew license')
    expect(summary.contextSwitchCount).toBe(3)
  })

  it('keeps pending mobile captures in a metadata-only review queue', () => {
    const summary = buildDashboardSummary([
      entry({
        title: 'Mobile journal',
        type: 'Journal',
        modifiedAt: 20,
        path: '/vault/journals/mobile/private-journal.md',
        properties: {
          captured_at: '2026-05-17T10:30:00.000Z',
          created_from: 'mobile-capture',
          mobile_review: 'pending',
        },
      }),
      entry({
        title: 'Reviewed mobile note',
        type: 'Note',
        modifiedAt: 30,
        properties: { created_from: 'mobile-capture', mobile_review: 'reviewed' },
      }),
    ])
    const payload = JSON.stringify(summary.mobileReviewEntries)

    expect(summary.mobileReviewCount).toBe(1)
    expect(summary.mobileReviewEntries[0]).toMatchObject({
      capturedAt: Date.UTC(2026, 4, 17, 10, 30) / 1000,
      lane: 'Journal',
      path: '/vault/journals/mobile/private-journal.md',
      reviewState: 'pending',
    })
    expect(payload).not.toContain('Mobile journal')
  })

  it('uses mobile review outcomes to graduate or block captures without exposing private titles', () => {
    const summary = buildDashboardSummary([
      entry({
        title: 'Accepted phone journal',
        type: 'Journal',
        modifiedAt: 30,
        path: '/vault/journals/mobile/accepted.md',
        properties: {
          created_from: 'mobile-capture',
          mobile_review: 'pending',
          mobile_review_outcome: 'accepted',
        },
      }),
      entry({
        title: 'Blocked phone dream',
        type: 'Dream',
        modifiedAt: 20,
        path: '/vault/dreams/mobile/blocked.md',
        properties: {
          captured_at: '2026-05-17T09:00:00.000Z',
          created_from: 'mobile-capture',
          mobile_review_outcome: 'blocked',
        },
      }),
      entry({
        title: 'Discarded phone note',
        type: 'Note',
        modifiedAt: 10,
        properties: {
          created_from: 'mobile-capture',
          mobile_review_outcome: 'discarded',
        },
      }),
    ])
    const payload = JSON.stringify(summary.mobileReviewEntries)

    expect(summary.mobileReviewCount).toBe(1)
    expect(summary.mobileReviewEntries[0]).toMatchObject({
      lane: 'Dream',
      path: '/vault/dreams/mobile/blocked.md',
      reviewState: 'blocked',
    })
    expect(payload).not.toContain('Blocked phone dream')
    expect(payload).not.toContain('Accepted phone journal')
    expect(payload).not.toContain('Discarded phone note')
  })

  it('counts reviewed Crystallize memory as a closed daily loop, not another review queue item', () => {
    const today = new Date(2026, 4, 17)
    const reviewedAt = '2026-05-17T11:30:00.000Z'
    const summary = buildDashboardSummary([
      entry({
        title: 'Crystallized private answer',
        type: 'Memory',
        modifiedAt: Math.floor(today.getTime() / 1000),
        properties: { crystallized: true, reviewed_at: reviewedAt },
      }),
      entry({
        title: 'Unreviewed memory',
        type: 'Memory',
        status: 'Review',
        properties: { confidence: 'proposed' },
      }),
    ], today)

    expect(summary.crystallizedTodayCount).toBe(1)
    expect(summary.memoryQueueCount).toBe(1)
    expect(summary.memoryQueueEntries[0].title).toBe('Unreviewed memory')
    expect(summary.openLoopBuckets).toEqual([{ label: 'Memory', count: 1 }])
  })

  it('treats legacy mobile captures as pending until review metadata closes them', () => {
    const summary = buildDashboardSummary([
      entry({
        title: 'Legacy mobile note',
        type: 'Note',
        properties: { created_from: 'mobile-capture' },
      }),
      entry({
        title: 'Closed mobile task',
        type: 'Task',
        properties: { created_from: 'mobile-capture' },
        status: 'Done',
      }),
    ])

    expect(summary.mobileReviewCount).toBe(1)
    expect(summary.mobileReviewEntries[0]).toMatchObject({
      capturedAt: null,
      lane: 'Note',
      path: '/vault/legacy-mobile-note.md',
      reviewState: 'pending',
    })
  })

  it('orders mobile review by captured_at instead of desktop modified time', () => {
    const summary = buildDashboardSummary([
      entry({
        title: 'Newer import older capture',
        type: 'Journal',
        modifiedAt: 99,
        path: '/vault/journals/mobile/older.md',
        properties: {
          captured_at: '2026-05-16T08:00:00.000Z',
          created_from: 'mobile-capture',
          mobile_review: 'pending',
        },
      }),
      entry({
        title: 'Older import newer capture',
        type: 'Journal',
        modifiedAt: 1,
        path: '/vault/journals/mobile/newer.md',
        properties: {
          captured_at: '2026-05-17T08:00:00.000Z',
          created_from: 'mobile-capture',
          mobile_review: 'pending',
        },
      }),
    ])

    expect(summary.mobileReviewEntries.map((item) => item.path)).toEqual([
      '/vault/journals/mobile/older.md',
      '/vault/journals/mobile/newer.md',
    ])
  })

  it('coarsens protected custom open-loop labels before Attention Mode sees them', () => {
    const summary = buildDashboardSummary([
      entry({ title: 'Therapy followup', type: 'Therapy', status: 'Open' }),
      entry({
        title: 'Private project',
        type: 'Project',
        status: 'Open',
        properties: { locality: 'local' },
      }),
      entry({
        title: 'Private task',
        type: 'Task',
        status: 'Open',
        properties: { locality: 'local' },
      }),
      entry({ title: 'Journal check', type: 'Journal', status: 'Open' }),
    ])

    expect(summary.openLoopBuckets).toEqual([
      { label: 'Private', count: 2 },
      { label: 'Journal', count: 1 },
      { label: 'Task', count: 1 },
    ])
    expect(JSON.stringify(summary.openLoopBuckets)).not.toContain('Therapy')
    expect(JSON.stringify(summary.openLoopBuckets)).not.toContain('Project')
  })

  it('keeps protected local-only notes out of recent re-entry rows', () => {
    const summary = buildDashboardSummary([
      entry({
        title: 'Secret River Dream',
        type: 'Dream',
        path: '/vault/dreams/secret-river.md',
        modifiedAt: 60,
      }),
      entry({
        title: 'Private Plan',
        type: 'Note',
        modifiedAt: 50,
        properties: { locality: 'local' },
      }),
      entry({ title: 'Public Project', type: 'Project', modifiedAt: 40 }),
    ])
    const payload = JSON.stringify(summary.recentEntries)

    expect(summary.recentEntries.map((recent) => recent.title)).toEqual(['Public Project'])
    expect(summary.recentProtectedCount).toBe(2)
    expect(summary.contextSwitchCount).toBe(2)
    expect(payload).not.toContain('Secret River Dream')
    expect(payload).not.toContain('Private Plan')
    expect(payload).not.toContain('/vault/dreams')
  })

  it('counts protected recent notes when no generic recent rows are safe to show', () => {
    const summary = buildDashboardSummary([
      entry({ title: 'Secret River Dream', type: 'Dream', modifiedAt: 60 }),
      entry({
        title: 'Private Plan',
        type: 'Note',
        modifiedAt: 50,
        properties: { locality: 'local' },
      }),
    ])

    expect(summary.recentEntries).toEqual([])
    expect(summary.recentProtectedCount).toBe(2)
  })

  it('counts recent context switching without exposing folder names', () => {
    const summary = buildDashboardSummary([
      entry({ title: 'Inbox note', type: 'Note', path: '/vault/inbox/note.md', modifiedAt: 60 }),
      entry({ title: 'Project task', type: 'Task', path: '/vault/projects/task.md', modifiedAt: 50 }),
      entry({ title: 'Journal check', type: 'Journal', path: '/vault/journals/check.md', modifiedAt: 40 }),
      entry({ title: 'Project note', type: 'Note', path: '/vault/projects/note.md', modifiedAt: 30 }),
      entry({ title: 'Dream recall', type: 'Dream', path: '/vault/dreams/recall.md', modifiedAt: 20 }),
      entry({ title: 'Dream symbol', type: 'Dream', path: '/vault/dreams/symbol.md', modifiedAt: 10 }),
    ])

    expect(summary.contextSwitchCount).toBe(4)
  })

  it('builds a privacy-safe assistant brief from metadata only', () => {
    const summary = buildDashboardSummary([
      entry({
        title: 'Secret River Dream',
        type: 'Dream',
        path: '/vault/dreams/secret-river.md',
        modifiedAt: 70,
      }),
      entry({
        title: 'Private iPhone Journal',
        type: 'Journal',
        path: '/vault/journals/mobile/private-iphone-journal.md',
        modifiedAt: 60,
        properties: { created_from: 'mobile-capture', mobile_review: 'pending' },
      }),
      entry({
        title: 'Therapy Plan',
        type: 'Therapy',
        status: 'Open',
        modifiedAt: 50,
        properties: { locality: 'local' },
      }),
      entry({
        title: 'Memory Ledger Draft',
        type: 'Memory',
        status: 'Review',
        modifiedAt: 40,
        properties: { confidence: 'proposed' },
      }),
    ], new Date(2026, 4, 17))
    const payload = JSON.stringify(summary.dailyBrief)

    expect(summary.dailyBrief.primaryLabel).toBe('Review memory')
    expect(summary.dailyBrief.supportingItems).toEqual(expect.arrayContaining([
      'Journal open',
      'Dream open',
      '1 memory review',
      '1 mobile review',
      'Pages to revisit',
    ]))
    expect(summary.dailyBrief.privateHeldCount).toBeGreaterThan(0)
    expect(payload).not.toContain('Secret River Dream')
    expect(payload).not.toContain('Private iPhone Journal')
    expect(payload).not.toContain('Therapy')
    expect(payload).not.toContain('/vault/')
  })
})
