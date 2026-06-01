import { describe, expect, it } from 'vitest'
import type { DashboardSummary } from '../utils/dashboardModel'
import { buildAttentionModeSuggestion } from './attentionMode'

function summary(overrides: Partial<DashboardSummary> = {}): DashboardSummary {
  return {
    activeNotes: 3,
    contextSwitchCount: 0,
    crystallizedTodayCount: 0,
    dreamCount: 1,
    hasDreamToday: true,
    hasJournalToday: true,
    journalCount: 1,
    memoryQueueEntries: [],
    memoryQueueCount: 0,
    mobileReviewEntries: [],
    mobileReviewCount: 0,
    openLoopBuckets: [{ label: 'Task', count: 2 }],
    openLoopCount: 2,
    recentEntries: [],
    ...overrides,
  }
}

describe('buildAttentionModeSuggestion', () => {
  it('prioritizes conflicts before softer drift', () => {
    const suggestion = buildAttentionModeSuggestion({
      conflictCount: 2,
      modifiedCount: 12,
      summary: summary({ hasJournalToday: false, memoryQueueCount: 1 }),
      syncStatus: 'conflict',
    })

    expect(suggestion.title).toBe('Fix conflict')
    expect(suggestion.captureKind).toBeNull()
    expect(suggestion.actionLabel).toBeNull()
  })

  it('turns many open loops into one task capture', () => {
    const suggestion = buildAttentionModeSuggestion({
      conflictCount: 0,
      modifiedCount: 0,
      summary: summary({ openLoopBuckets: [{ label: 'Project', count: 9 }], openLoopCount: 9 }),
      syncStatus: 'idle',
    })

    expect(suggestion.title).toBe('Close thread')
    expect(suggestion.captureKind).toBe('task')
    expect(suggestion.actionLabel).toBe('Task')
    expect(suggestion.detail).toContain('9 Project')
  })

  it('turns too many active notes into one focus capture', () => {
    const suggestion = buildAttentionModeSuggestion({
      conflictCount: 0,
      modifiedCount: 0,
      summary: summary({ activeNotes: 7 }),
      syncStatus: 'idle',
    })

    expect(suggestion.title).toBe('Choose focus')
    expect(suggestion.captureKind).toBe('task')
    expect(suggestion.actionLabel).toBe('Name focus')
    expect(suggestion.detail).toContain('7 active notes')
  })

  it('turns repeated context switching into one quiet focus capture', () => {
    const suggestion = buildAttentionModeSuggestion({
      conflictCount: 0,
      modifiedCount: 0,
      summary: summary({ contextSwitchCount: 4 }),
      syncStatus: 'idle',
    })

    expect(suggestion.title).toBe('Settle thread')
    expect(suggestion.captureKind).toBe('task')
    expect(suggestion.actionLabel).toBe('Name focus')
    expect(suggestion.detail).toBe('4 recent context switches. Pick one lane before adding more.')
  })

  it('keeps unresolved open loops ahead of context-switch drift', () => {
    const suggestion = buildAttentionModeSuggestion({
      conflictCount: 0,
      modifiedCount: 0,
      summary: summary({
        contextSwitchCount: 5,
        openLoopBuckets: [{ label: 'Task', count: 9 }],
        openLoopCount: 9,
      }),
      syncStatus: 'idle',
    })

    expect(suggestion.title).toBe('Close thread')
    expect(suggestion.detail).toContain('9 Task')
  })

  it('keeps memory review ahead of active-note drift', () => {
    const suggestion = buildAttentionModeSuggestion({
      conflictCount: 0,
      modifiedCount: 0,
      summary: summary({
        activeNotes: 9,
        memoryQueueCount: 1,
        memoryQueueEntries: [{ path: '/vault/memory/review.md' } as DashboardSummary['memoryQueueEntries'][number]],
      }),
      syncStatus: 'idle',
    })

    expect(suggestion.title).toBe('Review memory')
    expect(suggestion.openEntryPath).toBe('/vault/memory/review.md')
  })

  it('opens pending mobile capture review before open-loop cleanup', () => {
    const suggestion = buildAttentionModeSuggestion({
      conflictCount: 0,
      modifiedCount: 0,
      summary: summary({
        mobileReviewCount: 2,
        mobileReviewEntries: [{ path: '/vault/journals/mobile/check-in.md' } as DashboardSummary['mobileReviewEntries'][number]],
        openLoopBuckets: [{ label: 'Task', count: 9 }],
        openLoopCount: 9,
      }),
      syncStatus: 'idle',
    })

    expect(suggestion.title).toBe('Review mobile')
    expect(suggestion.captureKind).toBeNull()
    expect(suggestion.openEntryPath).toBe('/vault/journals/mobile/check-in.md')
    expect(suggestion.detail).toBe('2 mobile captures waiting.')
  })

  it('names blocked mobile capture review without exposing capture metadata', () => {
    const suggestion = buildAttentionModeSuggestion({
      conflictCount: 0,
      modifiedCount: 0,
      summary: summary({
        mobileReviewCount: 1,
        mobileReviewEntries: [{
          path: '/vault/dreams/mobile/private.md',
          reviewState: 'blocked',
        } as DashboardSummary['mobileReviewEntries'][number]],
      }),
      syncStatus: 'idle',
    })

    expect(suggestion.title).toBe('Unblock mobile')
    expect(suggestion.detail).toBe('1 mobile capture blocked until review.')
    expect(suggestion.openEntryPath).toBe('/vault/dreams/mobile/private.md')
    expect(JSON.stringify(suggestion)).not.toContain('Dream')
    expect(JSON.stringify(suggestion)).not.toContain('iphone')
  })

  it('keeps durable memory review ahead of mobile capture review', () => {
    const suggestion = buildAttentionModeSuggestion({
      conflictCount: 0,
      modifiedCount: 0,
      summary: summary({
        memoryQueueCount: 1,
        memoryQueueEntries: [{ path: '/vault/memory/review.md' } as DashboardSummary['memoryQueueEntries'][number]],
        mobileReviewCount: 1,
        mobileReviewEntries: [{ path: '/vault/journals/mobile/check-in.md' } as DashboardSummary['mobileReviewEntries'][number]],
      }),
      syncStatus: 'idle',
    })

    expect(suggestion.title).toBe('Review memory')
    expect(suggestion.openEntryPath).toBe('/vault/memory/review.md')
  })

  it('suggests journaling when the board is not blocked and the day has no journal', () => {
    const suggestion = buildAttentionModeSuggestion({
      conflictCount: 0,
      modifiedCount: 1,
      summary: summary({ hasJournalToday: false }),
      syncStatus: 'idle',
    })

    expect(suggestion.title).toBe('Journal')
    expect(suggestion.captureKind).toBe('journal')
    expect(suggestion.actionLabel).toBe('Journal')
  })

  it('opens the oldest memory review lane before asking for new capture', () => {
    const suggestion = buildAttentionModeSuggestion({
      conflictCount: 0,
      modifiedCount: 0,
      summary: summary({
        memoryQueueCount: 1,
        memoryQueueEntries: [{ path: '/vault/memory/review.md' } as DashboardSummary['memoryQueueEntries'][number]],
      }),
      syncStatus: 'idle',
    })

    expect(suggestion.title).toBe('Review memory')
    expect(suggestion.captureKind).toBeNull()
    expect(suggestion.openEntryPath).toBe('/vault/memory/review.md')
    expect(suggestion.actionLabel).toBe('Review')
  })

  it('captures a local reason before deferring a noisy sync state', () => {
    const suggestion = buildAttentionModeSuggestion({
      conflictCount: 0,
      modifiedCount: 7,
      summary: summary(),
      syncStatus: 'idle',
    })

    expect(suggestion.title).toBe('Defer sync')
    expect(suggestion.captureKind).toBe('memory')
    expect(suggestion.actionLabel).toBe('Capture reason')
  })

  it('turns a calm recent thread toward Crystallize review', () => {
    const suggestion = buildAttentionModeSuggestion({
      conflictCount: 0,
      modifiedCount: 0,
      summary: summary({
        recentEntries: [{ path: '/vault/latest.md' } as DashboardSummary['recentEntries'][number]],
      }),
      syncStatus: 'idle',
    })

    expect(suggestion.title).toBe('Crystallize')
    expect(suggestion.captureKind).toBe('ask')
    expect(suggestion.actionLabel).toBe('Crystallize')
    expect(suggestion.promptSeed).toBe('/ask Crystallize the latest thread into reviewed Markdown memory.')
  })

  it('does not keep asking for Crystallize after reviewed memory landed today', () => {
    const suggestion = buildAttentionModeSuggestion({
      conflictCount: 0,
      modifiedCount: 0,
      summary: summary({
        crystallizedTodayCount: 1,
        recentEntries: [{ path: '/vault/latest.md' } as DashboardSummary['recentEntries'][number]],
      }),
      syncStatus: 'idle',
    })

    expect(suggestion.title).toBe('Loop closed')
    expect(suggestion.captureKind).toBe('note')
    expect(suggestion.actionLabel).toBe('Note')
    expect(suggestion.detail).toBe('1 reviewed Markdown memory landed today.')
  })
})
