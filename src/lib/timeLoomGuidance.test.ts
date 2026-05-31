import { describe, expect, it } from 'vitest'
import type { DreamForgeSummary } from './dreamForge'
import type { TimeLoomSummary } from './timeLoom'
import { DAILY_THREAD_CRYSTALLIZE_PROMPT, buildTimeLoomGuidance } from './timeLoomGuidance'

const emptyDreamSummary: DreamForgeSummary = {
  privacy: {
    locality: 'local-only',
    bodyAccess: 'forbidden',
    titlePolicy: 'never',
    pathPolicy: 'never',
    signalPolicy: 'local-dashboard-only',
    agentPolicy: 'counts-and-redaction-only',
    exportPolicy: 'explicit-user-action-only',
    badges: ['Local only', 'Metadata only', 'No cloud'],
  },
  dreamCount: 0,
  journalCount: 0,
  protectedCount: 0,
  latestDreamAt: null,
  rhythm: [
    { label: 'Last night', dreamCount: 0, journalCount: 0, protectedCount: 0, tone: 'active' },
    { label: 'This week', dreamCount: 0, journalCount: 0, protectedCount: 0, tone: 'recent' },
    { label: 'Earlier', dreamCount: 0, journalCount: 0, protectedCount: 0, tone: 'deep' },
  ],
  timeline: [],
  recurringPeople: [],
  symbols: [],
  emotionalWeather: [],
}

const summary: TimeLoomSummary = {
  activeSpanLabel: '5 events today',
  buckets: [
    {
      dateKey: '2026-05-27',
      label: 'Today',
      total: 5,
      protectedCount: 3,
      statusCounts: [
        { label: 'Open', count: 1 },
        { label: 'Unmarked', count: 4 },
      ],
      typeCounts: [
        { label: 'Mobile', count: 2 },
        { label: 'Voice', count: 1 },
        { label: 'Dream', count: 1 },
      ],
    },
  ],
  calendarDays: [
    {
      dateKey: '2026-05-27',
      label: 'Today',
      total: 5,
      protectedCount: 3,
      statusCounts: [
        { label: 'Open', count: 1 },
        { label: 'Unmarked', count: 4 },
      ],
      typeCounts: [
        { label: 'Mobile', count: 2 },
        { label: 'Voice', count: 1 },
        { label: 'Dream', count: 1 },
      ],
    },
  ],
  calendarEvents: 0,
  commitEvents: 0,
  graph: {
    links: [],
    nodes: [],
    privacyNote: 'count-only temporal graph; private labels withheld',
  },
  memoryReviewEvents: 0,
  mobileEvents: 2,
  patterns: [],
  protectedEvents: 3,
  taskEvents: 0,
  totalEvents: 5,
  voiceEvents: 1,
}

describe('buildTimeLoomGuidance', () => {
  it('prioritizes private capture review without leaking labels', () => {
    const guidance = buildTimeLoomGuidance(summary, 0, {
      ...emptyDreamSummary,
      dreamCount: 1,
      journalCount: 1,
      protectedCount: 2,
      rhythm: [
        { label: 'Last night', dreamCount: 1, journalCount: 1, protectedCount: 2, tone: 'active' },
        { label: 'This week', dreamCount: 0, journalCount: 0, protectedCount: 0, tone: 'recent' },
        { label: 'Earlier', dreamCount: 0, journalCount: 0, protectedCount: 0, tone: 'deep' },
      ],
    })
    const payload = JSON.stringify(guidance)

    expect(guidance.nextLabel).toBe('Review private captures')
    expect(guidance.nextDetail).toBe('3 held local; name the thread before any sync.')
    expect(guidance.actionKind).toBe('journal')
    expect(guidance.sourceLanes).toContainEqual({
      id: 'private',
      label: 'Held local',
      count: 3,
      detail: 'titles withheld',
      state: 'private',
    })
    expect(payload).not.toContain('/vault')
    expect(payload).not.toContain('Secret')
    expect(payload).not.toContain('private-voice.webm')
  })

  it('opens the dream lane when timeline exists but no dreams are present', () => {
    const guidance = buildTimeLoomGuidance(
      {
        ...summary,
        protectedEvents: 0,
        mobileEvents: 0,
        voiceEvents: 0,
        taskEvents: 0,
        buckets: [{ ...summary.buckets[0], statusCounts: [{ label: 'Unmarked', count: 5 }] }],
      },
      0,
      emptyDreamSummary,
    )

    expect(guidance.nextLabel).toBe('Open the dream lane')
    expect(guidance.actionKind).toBe('dream')
    expect(guidance.actionLabel).toBe('Catch a dream')
  })

  it('routes calm daily threads into a source-safe Crystallize ask prompt', () => {
    const guidance = buildTimeLoomGuidance(
      {
        ...summary,
        protectedEvents: 1,
        mobileEvents: 0,
        voiceEvents: 0,
        taskEvents: 0,
        buckets: [{ ...summary.buckets[0], statusCounts: [{ label: 'Unmarked', count: 5 }] }],
      },
      0,
      {
        ...emptyDreamSummary,
        dreamCount: 1,
        journalCount: 1,
        rhythm: [
          { label: 'Last night', dreamCount: 0, journalCount: 0, protectedCount: 0, tone: 'active' },
          { label: 'This week', dreamCount: 1, journalCount: 1, protectedCount: 1, tone: 'recent' },
          { label: 'Earlier', dreamCount: 0, journalCount: 0, protectedCount: 0, tone: 'deep' },
        ],
      },
    )

    expect(guidance.nextLabel).toBe('Crystallize the day')
    expect(guidance.actionKind).toBe('ask')
    expect(guidance.actionLabel).toBe('Crystallize')
    expect(guidance.promptSeed).toBe(DAILY_THREAD_CRYSTALLIZE_PROMPT)
    expect(guidance.promptSeed).toContain('source-safe')
    expect(guidance.promptSeed).toContain('reviewable before any write')
  })

  it('adds Memory Ledger review pressure as a private count-only lane', () => {
    const guidance = buildTimeLoomGuidance(
      { ...summary, memoryReviewEvents: 2, protectedEvents: 0, mobileEvents: 0, voiceEvents: 0 },
      1,
      { ...emptyDreamSummary, dreamCount: 1, journalCount: 1 },
    )

    expect(guidance.sourceLanes).toContainEqual({
      id: 'memory',
      label: 'Memory',
      count: 2,
      detail: 'review queue',
      state: 'private',
    })
    expect(JSON.stringify(guidance)).not.toContain('/vault')
    expect(JSON.stringify(guidance)).not.toContain('contradicted_by')
  })
})
