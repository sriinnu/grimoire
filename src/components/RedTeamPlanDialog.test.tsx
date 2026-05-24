import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { RedTeamPatchPlan } from '../lib/redTeamPatchPlan'
import { RedTeamPlanDialog } from './RedTeamPlanDialog'

const plan: RedTeamPatchPlan = {
  title: 'Red-Team Patch Plan',
  protectedContext: true,
  checks: [
    'Re-check Locality Firewall before any agent, export, or sync handoff.',
    'Add the exact tests, build, or manual QA evidence before marking done.',
  ],
  markdown: [
    '# Red-Team Patch Plan',
    '',
    'Privacy: Protected context; content stayed local. No title, path, excerpt, or raw note text is included.',
    '',
    '## Findings',
    '- [ ] Product: Add one user-facing outcome and one done condition.',
  ].join('\n'),
}

describe('RedTeamPlanDialog', () => {
  it('shows a read-only local Markdown patch plan and closes on request', () => {
    const onClose = vi.fn()
    render(<RedTeamPlanDialog open plan={plan} onClose={onClose} />)

    expect(screen.getByTestId('red-team-plan-dialog')).toHaveTextContent('Review only')
    expect(screen.getByTestId('red-team-plan-dialog')).toHaveTextContent('No write')
    expect(screen.getByTestId('red-team-plan-dialog')).toHaveTextContent('Protected local context')
    const preview = screen.getByRole('textbox', { name: 'Red-Team Markdown patch plan preview' })
    expect(preview).toHaveValue(plan.markdown)
    expect(preview).toHaveAttribute('readonly')
    expect(screen.getByTestId('red-team-plan-checks')).toHaveTextContent('Locality Firewall')

    fireEvent.click(screen.getByRole('button', { name: 'Close' }))

    expect(onClose).toHaveBeenCalledOnce()
  })
})
