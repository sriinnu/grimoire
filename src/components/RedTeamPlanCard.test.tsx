import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { RedTeamPlanReview } from '../lib/redTeamPlan'
import { RedTeamPlanCard } from './RedTeamPlanCard'

const review: RedTeamPlanReview = {
  state: 'ready',
  verdict: 'Promising, but one sharp risk needs work before execution.',
  protectedContext: true,
  protectedReason: 'Path is under private',
  counts: { words: 32, headings: 1, openTasks: 2, completedTasks: 1 },
  signals: [
    {
      dimension: 'privacy',
      label: 'Privacy',
      severity: 'risk',
      finding: 'Egress is mentioned without a visible locality rule.',
      nextAction: 'Add what can leave, what is withheld, and who approves it.',
    },
  ],
}

describe('RedTeamPlanCard', () => {
  it('renders a local red-team summary without protected labels', () => {
    render(<RedTeamPlanCard review={review} />)

    const card = screen.getByTestId('red-team-plan-card')
    expect(card).toHaveTextContent('Red-Team My Plan')
    expect(card).toHaveTextContent('Local-only')
    expect(card).toHaveTextContent('2 open')
    expect(card).toHaveTextContent('1 risks')
    expect(card).toHaveTextContent('Privacy')
    expect(card).not.toHaveTextContent('Path is under private')
  })

  it('opens the reviewable Markdown patch plan when available', () => {
    const onReviewPlan = vi.fn()
    render(<RedTeamPlanCard review={review} onReviewPlan={onReviewPlan} />)

    fireEvent.click(screen.getByTestId('red-team-review-plan'))

    expect(onReviewPlan).toHaveBeenCalledOnce()
  })
})
