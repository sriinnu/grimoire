import type { SyncStatus } from '../types'
import type { CaptureKind } from '../utils/dashboardCapture'
import type { DashboardSummary } from '../utils/dashboardModel'

/** One dashboard recommendation derived only from local vault metadata. */
export interface AttentionModeSuggestion {
  actionLabel: string | null
  captureKind: CaptureKind | null
  detail: string
  openEntryPath: string | null
  title: string
}

interface AttentionModeInput {
  conflictCount: number
  modifiedCount: number
  summary: DashboardSummary
  syncStatus: SyncStatus
}

const OPEN_LOOP_DRIFT_THRESHOLD = 8
const MODIFIED_DRIFT_THRESHOLD = 5

/** Picks one quiet local next action for the current dashboard state. */
export function buildAttentionModeSuggestion({
  conflictCount,
  modifiedCount,
  summary,
  syncStatus,
}: AttentionModeInput): AttentionModeSuggestion {
  if (conflictCount > 0 || syncStatus === 'conflict') {
    return {
      actionLabel: null,
      captureKind: null,
      detail: `${conflictCount || 1} conflict${conflictCount === 1 ? '' : 's'} before sync.`,
      openEntryPath: null,
      title: 'Fix conflict',
    }
  }

  if (summary.memoryQueueCount > 0) {
    const memoryEntry = summary.memoryQueueEntries[0]
    return {
      actionLabel: memoryEntry ? 'Review' : null,
      captureKind: null,
      detail: `${summary.memoryQueueCount} memory waiting.`,
      openEntryPath: memoryEntry?.path ?? null,
      title: 'Review memory',
    }
  }

  if (summary.openLoopCount >= OPEN_LOOP_DRIFT_THRESHOLD) {
    return {
      actionLabel: 'Task',
      captureKind: 'task',
      detail: `${summary.openLoopCount} open, led by ${topBucketReason(summary)}.`,
      openEntryPath: null,
      title: 'Close thread',
    }
  }

  if (!summary.hasJournalToday) {
    return {
      actionLabel: 'Journal',
      captureKind: 'journal',
      detail: 'No journal today.',
      openEntryPath: null,
      title: 'Journal',
    }
  }

  if (summary.dreamCount > 0 && !summary.hasDreamToday) {
    return {
      actionLabel: 'Dream',
      captureKind: 'dream',
      detail: 'Dream lane quiet.',
      openEntryPath: null,
      title: 'Dream',
    }
  }

  if (modifiedCount >= MODIFIED_DRIFT_THRESHOLD) {
    return {
      actionLabel: 'Capture reason',
      captureKind: 'memory',
      detail: `${modifiedCount} local changes. Name what should stay local before syncing.`,
      openEntryPath: null,
      title: 'Defer sync',
    }
  }

  const recentEntry = summary.recentEntries[0]
  return {
    actionLabel: recentEntry ? 'Open' : 'Note',
    captureKind: recentEntry ? null : 'note',
    detail: recentEntry ? 'Continue the most recent thread.' : 'Board quiet.',
    openEntryPath: recentEntry?.path ?? null,
    title: recentEntry ? 'Open thread' : 'Board light',
  }
}

function topBucketReason(summary: DashboardSummary): string {
  const bucket = summary.openLoopBuckets[0]
  return bucket ? `${bucket.count} ${bucket.label}` : 'mixed work'
}
