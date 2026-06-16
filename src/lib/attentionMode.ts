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
      detail: `${summary.memoryQueueCount} memory ready for review.`,
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
        : `${summary.mobileReviewCount} mobile capture${summary.mobileReviewCount === 1 ? '' : 's'} ready for review.`,
      openEntryPath: mobileEntry?.path ?? null,
      title: blockedReview ? 'Unblock mobile' : 'Review mobile',
    }
  }

  if (summary.openLoopCount >= OPEN_LOOP_DRIFT_THRESHOLD) {
    return {
      actionLabel: 'Carry forward',
      captureKind: 'task',
      detail: 'Choose one unfinished page; write what it needs next.',
      openEntryPath: null,
      title: 'Carry one page',
    }
  }

  if (summary.contextSwitchCount >= CONTEXT_SWITCH_DRIFT_THRESHOLD) {
    return {
      actionLabel: 'Name focus',
      captureKind: 'task',
      detail: `${summary.contextSwitchCount} recent context switches. Return to one page before adding more.`,
      openEntryPath: null,
      title: 'Choose one page',
    }
  }

  if (summary.activeNotes >= ACTIVE_NOTE_DRIFT_THRESHOLD) {
    return {
      actionLabel: 'Name focus',
      captureKind: 'task',
      detail: `${summary.activeNotes} active pages. Choose one page to carry forward.`,
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
      actionLabel: 'Page',
      captureKind: 'note',
      detail: `${summary.crystallizedTodayCount} reviewed Markdown memor${summary.crystallizedTodayCount === 1 ? 'y' : 'ies'} landed today.`,
      openEntryPath: null,
      title: 'Memory landed',
    }
  }

  const recentEntry = summary.recentEntries[0]
  if (recentEntry) {
    return {
      actionLabel: 'Crystallize',
      captureKind: 'ask',
      detail: 'Turn the latest page into reviewed Markdown memory.',
      openEntryPath: null,
      promptSeed: '/ask Crystallize the latest page into reviewed Markdown memory.',
      title: 'Crystallize',
    }
  }

  return {
    actionLabel: 'Page',
    captureKind: 'note',
    detail: 'Capture freely.',
    openEntryPath: null,
    title: 'Notebook quiet',
  }
}
