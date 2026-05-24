import { fireEvent, render, screen } from '@testing-library/react'
import type { ComponentProps } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { CrystallizeReviewDialog } from './CrystallizeReviewDialog'
import type { CrystallizeProposal } from '../lib/crystallizeProposal'

const proposal: CrystallizeProposal = {
  title: 'Crystallized Memory',
  targetPath: '/tmp/vault/memory/crystallized/memory.md',
  relativePath: 'memory/crystallized/memory.md',
  sourceLabel: 'AI chat',
  reviewedAt: '2026-05-23T08:00:00.000Z',
  markdown: 'type: Memory\n\nOriginal memory',
  changes: [{
    id: 'create-memory',
    kind: 'file',
    label: 'Create Memory note',
    target: 'memory/crystallized/memory.md',
    before: '(missing)',
    after: 'type: Memory',
  }],
}

function renderDialog(overrides: Partial<ComponentProps<typeof CrystallizeReviewDialog>> = {}) {
  return render(
    <CrystallizeReviewDialog
      open
      proposal={proposal}
      onApply={vi.fn()}
      onClose={vi.fn()}
      {...overrides}
    />,
  )
}

describe('CrystallizeReviewDialog', () => {
  it('shows a local accept consequence and locks repeat apply immediately', () => {
    const onApply = vi.fn()
    renderDialog({ onApply })

    expect(screen.getByText('Local Markdown')).toBeInTheDocument()
    expect(screen.getByText('No Git required')).toBeInTheDocument()
    expect(screen.getByText('Review before write')).toBeInTheDocument()
    const preview = screen.getByTestId('crystallize-markdown-preview')
    fireEvent.change(preview, { target: { value: 'type: Memory\n\nEdited memory' } })
    const apply = screen.getByTestId('crystallize-apply')

    fireEvent.click(apply)

    expect(onApply).toHaveBeenCalledWith('type: Memory\n\nEdited memory')
    expect(screen.getByTestId('crystallize-accept-status')).toHaveTextContent(
      'Writing reviewed Markdown into local memory.',
    )
    expect(apply).toBeDisabled()

    fireEvent.click(apply)
    expect(onApply).toHaveBeenCalledOnce()
  })

  it('resets the accept consequence when an error arrives or the dialog reopens', () => {
    const { rerender } = renderDialog()
    fireEvent.click(screen.getByTestId('crystallize-apply'))
    expect(screen.getByTestId('crystallize-accept-status')).toBeInTheDocument()

    rerender(
      <CrystallizeReviewDialog
        open
        proposal={proposal}
        error="Could not write memory"
        onApply={vi.fn()}
        onClose={vi.fn()}
      />,
    )
    expect(screen.queryByTestId('crystallize-accept-status')).not.toBeInTheDocument()

    rerender(
      <CrystallizeReviewDialog
        open={false}
        proposal={proposal}
        onApply={vi.fn()}
        onClose={vi.fn()}
      />,
    )
    rerender(
      <CrystallizeReviewDialog
        open
        proposal={proposal}
        onApply={vi.fn()}
        onClose={vi.fn()}
      />,
    )
    expect(screen.queryByTestId('crystallize-accept-status')).not.toBeInTheDocument()
  })

  it('does not show accept UI for blocked proposals', () => {
    renderDialog({ blockedReason: 'Local-only context is protected.' })

    expect(screen.getByTestId('crystallize-apply')).toBeDisabled()
    expect(screen.queryByTestId('crystallize-accept-status')).not.toBeInTheDocument()
    expect(screen.getByText('Local-only context is protected.')).toBeInTheDocument()
  })
})
