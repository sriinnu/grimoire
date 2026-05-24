import { describe, expect, it } from 'vitest'
import type { DashboardSummary } from '../utils/dashboardModel'
import { buildAttentionModeSuggestion } from './attentionMode'

function summary(overrides: Partial<DashboardSummary> = {}): DashboardSummary {
  return {
    activeNotes: 3,
    dreamCount: 1,
    hasDreamToday: true,
    hasJournalToday: true,
    journalCount: 1,
    memoryQueueEntries: [],
    memoryQueueCount: 0,
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
})
