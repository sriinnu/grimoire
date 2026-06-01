import type { SyncStatus } from '../types'
import type { CaptureKind } from '../utils/dashboardCapture'
import type { DashboardSummary } from '../utils/dashboardModel'

/** One dashboard recommendation derived only from local vault metadata. */
export interface AttentionModeSuggestion {
  actionLabel: string | null
  captureKind: CaptureKind | null
  detail: string
  openEntryPath: string | null
  promptSeed?: string
  title: string
}

interface AttentionModeInput {
  conflictCount: number
  modifiedCount: number
  summary: DashboardSummary
  syncStatus: SyncStatus
}

const OPEN_LOOP_DRIFT_THRESHOLD = 8
const ACTIVE_NOTE_DRIFT_THRESHOLD = 6
const CONTEXT_SWITCH_DRIFT_THRESHOLD = 4
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

  if (summary.mobileReviewCount > 0) {
    const mobileEntry = summary.mobileReviewEntries[0]
    const blockedReview = mobileEntry?.reviewState === 'blocked'
    return {
      actionLabel: mobileEntry ? 'Review' : null,
      captureKind: null,
      detail: blockedReview
        ? `${summary.mobileReviewCount} mobile capture${summary.mobileReviewCount === 1 ? '' : 's'} blocked until review.`
        : `${summary.mobileReviewCount} mobile capture${summary.mobileReviewCount === 1 ? '' : 's'} waiting.`,
      openEntryPath: mobileEntry?.path ?? null,
      title: blockedReview ? 'Unblock mobile' : 'Review mobile',
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

  if (summary.contextSwitchCount >= CONTEXT_SWITCH_DRIFT_THRESHOLD) {
    return {
      actionLabel: 'Name focus',
      captureKind: 'task',
      detail: `${summary.contextSwitchCount} recent context switches. Pick one lane before adding more.`,
      openEntryPath: null,
      title: 'Settle thread',
    }
  }

  if (summary.activeNotes >= ACTIVE_NOTE_DRIFT_THRESHOLD) {
    return {
      actionLabel: 'Name focus',
      captureKind: 'task',
      detail: `${summary.activeNotes} active notes. Choose one thread to carry forward.`,
      openEntryPath: null,
      title: 'Choose focus',
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

  if (summary.crystallizedTodayCount > 0) {
    return {
      actionLabel: 'Note',
      captureKind: 'note',
      detail: `${summary.crystallizedTodayCount} reviewed Markdown memor${summary.crystallizedTodayCount === 1 ? 'y' : 'ies'} landed today.`,
      openEntryPath: null,
      title: 'Loop closed',
    }
  }

  const recentEntry = summary.recentEntries[0]
  if (recentEntry) {
    return {
      actionLabel: 'Crystallize',
      captureKind: 'ask',
      detail: 'Turn the latest thread into reviewed Markdown memory.',
      openEntryPath: null,
      promptSeed: '/ask Crystallize the latest thread into reviewed Markdown memory.',
      title: 'Crystallize',
    }
  }

  return {
    actionLabel: 'Note',
    captureKind: 'note',
    detail: 'Board quiet.',
    openEntryPath: null,
    title: 'Board light',
  }
}

function topBucketReason(summary: DashboardSummary): string {
  const bucket = summary.openLoopBuckets[0]
  return bucket ? `${bucket.count} ${bucket.label}` : 'mixed work'
}
