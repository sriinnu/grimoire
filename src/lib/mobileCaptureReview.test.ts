import { describe, expect, it } from 'vitest'
import {
  buildMobileCaptureReviewUpdates,
  mobileCaptureReviewOutcomeLabel,
  type MobileCaptureReviewOutcome,
} from './mobileCaptureReview'

const reviewedAt = new Date('2026-05-27T06:45:00.000Z')

describe('mobile capture review updates', () => {
  it('marks accepted captures as reviewed without changing locality ownership', () => {
    expect(buildMobileCaptureReviewUpdates('accepted', reviewedAt)).toEqual([
      { key: 'mobile_review', value: 'reviewed' },
      { key: 'mobile_review_outcome', value: 'accepted' },
      { key: 'mobile_reviewed_at', value: '2026-05-27T06:45:00.000Z' },
      { key: 'review_required', value: false },
      { key: 'agent_context', value: 'review_complete_local_policy_applies' },
      { key: 'export_context', value: 'review_complete_local_policy_applies' },
      { key: 'sync_context', value: 'review_complete_local_policy_applies' },
    ])
  })

  it('keeps blocked captures in the local review gate', () => {
    expect(buildMobileCaptureReviewUpdates('blocked', reviewedAt)).toEqual(expect.arrayContaining([
      { key: 'mobile_review', value: 'blocked' },
      { key: 'mobile_review_outcome', value: 'blocked' },
      { key: 'review_required', value: true },
      { key: 'agent_context', value: 'blocked_until_review' },
      { key: 'export_context', value: 'blocked_until_review' },
      { key: 'sync_context', value: 'local_until_review' },
    ]))
  })

  it('keeps discarded captures blocked from agent/export context', () => {
    expect(buildMobileCaptureReviewUpdates('discarded', reviewedAt)).toEqual(expect.arrayContaining([
      { key: 'mobile_review', value: 'reviewed' },
      { key: 'mobile_review_outcome', value: 'discarded' },
      { key: 'review_required', value: false },
      { key: 'agent_context', value: 'blocked_discarded' },
      { key: 'export_context', value: 'blocked_discarded' },
      { key: 'sync_context', value: 'local_discarded' },
    ]))
  })

  it('uses action labels that fit compact inspector buttons', () => {
    const outcomes: MobileCaptureReviewOutcome[] = ['accepted', 'merged', 'moved', 'blocked', 'discarded']
    expect(outcomes.map((outcome) => mobileCaptureReviewOutcomeLabel(outcome))).toEqual([
      'Accept',
      'Merge',
      'Move',
      'Block',
      'Discard',
    ])
  })
})
