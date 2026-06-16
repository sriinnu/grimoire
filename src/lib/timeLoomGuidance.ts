import type { TimeLoomSummary } from './timeLoom'
import type { DreamForgeSummary } from './dreamForge'

export type TimeLoomSourceLaneState = 'active' | 'private' | 'quiet'

export interface TimeLoomSourceLane {
  count: number
  detail: string
  id: 'calendar' | 'commit' | 'dream' | 'journal' | 'memory' | 'mobile' | 'private' | 'voice'
  label: string
  state: TimeLoomSourceLaneState
}

export interface TimeLoomGuidance {
  actionKind: 'ask' | 'dream' | 'journal'
  actionLabel: string
  nextDetail: string
  nextLabel: string
  promptSeed?: string
  sourceLanes: TimeLoomSourceLane[]
}

export const DAILY_THREAD_CRYSTALLIZE_PROMPT = '/ask Prepare a Crystallize-ready Markdown memory proposal from today\'s source-safe thread. Use public references only, keep dreams, journals, private captures, and local-only notes held by the Locality Firewall, and make the next step reviewable before any write.'

/** Builds the dashboard Daily Thread rail from source-safe counts only. */
export function buildTimeLoomGuidance(
  summary: TimeLoomSummary,
  crystallizedTodayCount = 0,
  dreamSummary?: DreamForgeSummary,
): TimeLoomGuidance {
  const openCount = statusCount(summary, 'Open')
  const lastNight = dreamSummary?.rhythm.find((point) => point.label === 'Last night')
  const dreamCount = dreamSummary?.dreamCount ?? 0
  const journalCount = dreamSummary?.journalCount ?? 0
  const sourceLanes: TimeLoomSourceLane[] = [
    sourceLane('dream', 'Dreams', dreamCount, 'private symbols', 'private'),
    sourceLane('journal', 'Journal', journalCount, 'local reflection', journalCount > 0 ? 'private' : 'quiet'),
    sourceLane('memory', 'Memory', summary.memoryReviewEvents, 'review queue', 'private'),
    sourceLane('mobile', 'Mobile', summary.mobileEvents, 'capture inbox'),
    sourceLane('voice', 'Voice', summary.voiceEvents, 'local transcripts'),
    sourceLane('calendar', 'Calendar', summary.calendarEvents, 'scheduled frontmatter'),
    sourceLane('commit', 'Saved points', summary.commitEvents, 'notebook saves'),
    sourceLane('private', 'Held local', summary.protectedEvents, 'titles withheld', 'private'),
  ]

  if (summary.totalEvents === 0) {
    return {
      actionKind: 'journal',
      actionLabel: 'Journal',
      nextDetail: 'Start with one local note, dream, or thought.',
      nextLabel: 'Begin today',
      sourceLanes,
    }
  }

  const lastNightPrivate = (lastNight?.protectedCount ?? 0) > 0
  if (summary.protectedEvents > 0 && (summary.voiceEvents > 0 || summary.mobileEvents > 0 || lastNightPrivate)) {
    return {
      actionKind: 'journal',
      actionLabel: 'Journal',
      nextDetail: `${summary.protectedEvents} held local; name the thread before any sync.`,
      nextLabel: 'Review private captures',
      sourceLanes,
    }
  }

  if (summary.taskEvents > 0 || openCount > 0) {
    const taskText = summary.taskEvents > 0 ? `${summary.taskEvents} due` : null
    const openText = openCount > 0 ? `${openCount} open` : null
    return {
      actionKind: 'journal',
      actionLabel: 'Journal',
      nextDetail: [taskText, openText, 'pick one thread and finish it'].filter(Boolean).join(' / '),
      nextLabel: 'Choose one thread',
      sourceLanes,
    }
  }

  if (dreamCount === 0) {
    return {
      actionKind: 'dream',
      actionLabel: 'Catch a dream',
      nextDetail: 'The dream lane is empty; keep it private from the first line.',
      nextLabel: 'Open the dream lane',
      sourceLanes,
    }
  }

  if (crystallizedTodayCount === 0) {
    return {
      actionKind: 'ask',
      actionLabel: 'Crystallize',
      nextDetail: 'Turn the strongest thread into reviewed Markdown memory.',
      nextLabel: 'Crystallize the day',
      promptSeed: DAILY_THREAD_CRYSTALLIZE_PROMPT,
      sourceLanes,
    }
  }

  return {
    actionKind: 'journal',
    actionLabel: 'Journal',
    nextDetail: 'The thread is settled; capture the next honest signal.',
    nextLabel: 'Keep the thread warm',
    sourceLanes,
  }
}

function sourceLane(
  id: TimeLoomSourceLane['id'],
  label: string,
  count: number,
  detail: string,
  activeState: TimeLoomSourceLaneState = 'active',
): TimeLoomSourceLane {
  return {
    count,
    detail: count > 0 ? detail : 'quiet',
    id,
    label,
    state: count > 0 ? activeState : 'quiet',
  }
}

function statusCount(summary: TimeLoomSummary, label: 'Done' | 'Open' | 'Unmarked'): number {
  return summary.buckets.reduce((total, bucket) => {
    const count = bucket.statusCounts.find((status) => status.label === label)?.count ?? 0
    return total + count
  }, 0)
}
