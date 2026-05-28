export type MobileCaptureReviewOutcome = 'accepted' | 'blocked' | 'discarded' | 'merged' | 'moved'

export type MobileReviewFrontmatterValue = string | number | boolean | string[] | null

export interface MobileCaptureReviewUpdate {
  key: string
  value: MobileReviewFrontmatterValue
}

const REVIEW_COMPLETE_CONTEXT = 'review_complete_local_policy_applies'

/** Builds the Markdown frontmatter updates for a reviewed mobile capture. */
export function buildMobileCaptureReviewUpdates(
  outcome: MobileCaptureReviewOutcome,
  reviewedAt: Date = new Date(),
): MobileCaptureReviewUpdate[] {
  const reviewedAtIso = reviewedAt.toISOString()
  const baseUpdates: MobileCaptureReviewUpdate[] = [
    { key: 'mobile_review', value: outcome === 'blocked' ? 'blocked' : 'reviewed' },
    { key: 'mobile_review_outcome', value: outcome },
    { key: 'mobile_reviewed_at', value: reviewedAtIso },
    { key: 'review_required', value: outcome === 'blocked' },
  ]

  if (outcome === 'blocked') {
    return [
      ...baseUpdates,
      { key: 'agent_context', value: 'blocked_until_review' },
      { key: 'export_context', value: 'blocked_until_review' },
      { key: 'sync_context', value: 'local_until_review' },
    ]
  }

  if (outcome === 'discarded') {
    return [
      ...baseUpdates,
      { key: 'agent_context', value: 'blocked_discarded' },
      { key: 'export_context', value: 'blocked_discarded' },
      { key: 'sync_context', value: 'local_discarded' },
    ]
  }

  return [
    ...baseUpdates,
    { key: 'agent_context', value: REVIEW_COMPLETE_CONTEXT },
    { key: 'export_context', value: REVIEW_COMPLETE_CONTEXT },
    { key: 'sync_context', value: REVIEW_COMPLETE_CONTEXT },
  ]
}

/** Human-facing label for a mobile review outcome. */
export function mobileCaptureReviewOutcomeLabel(outcome: MobileCaptureReviewOutcome): string {
  if (outcome === 'accepted') return 'Accept'
  if (outcome === 'blocked') return 'Block'
  if (outcome === 'discarded') return 'Discard'
  if (outcome === 'merged') return 'Merge'
  return 'Move'
}
