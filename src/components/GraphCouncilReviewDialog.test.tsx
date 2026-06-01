import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { GraphCouncilReviewDialog, type GraphCouncilReviewDraft } from './GraphCouncilReviewDialog'

const draft: GraphCouncilReviewDraft = {
  contextPackage: {
    graph: {
      edges: [{ kind: 'wikilink', label: 'Spelllink', sourceTitle: 'Alpha', targetTitle: 'Beta' }],
      protectedEdges: 1,
      truncatedEdges: 0,
      truncatedNodes: 1,
      visibleEdges: 1,
      visibleNodes: 2,
    },
    kind: 'graph-council',
    memoryReferences: [],
    prompt: 'Ask the Agent Council about [[Beta]].',
    references: [{ path: '/vault/beta.md', title: 'Beta', type: 'Reference' }],
    sourceLabels: ['Alpha', 'Beta'],
    visibleCount: 2,
    withheld: { protectedMemories: 0, protectedNotes: 1 },
  },
  prompt: {
    references: [{ path: '/vault/beta.md', title: 'Beta', type: 'Reference' }],
    text: 'Ask the Agent Council about [[Beta]].',
  },
}

describe('GraphCouncilReviewDialog', () => {
  it('shows an inspectable source-safe graph packet before confirming handoff', () => {
    const onConfirm = vi.fn()

    render(
      <GraphCouncilReviewDialog
        draft={draft}
        open={true}
        onCancel={vi.fn()}
        onConfirm={onConfirm}
      />,
    )

    expect(screen.getByTestId('graph-council-review-dialog')).toHaveTextContent('No note bodies')
    expect(screen.getByTestId('graph-council-review-dialog')).toHaveTextContent('2 held local')
    expect(screen.getByTestId('agent-preflight-gate')).toHaveTextContent('Allowed context')
    expect(screen.getByTestId('agent-preflight-gate')).toHaveTextContent('Held local')
    expect(screen.getByTestId('graph-council-review-sources')).toHaveTextContent('Alpha')
    expect(screen.getByTestId('graph-council-review-sources')).toHaveTextContent('Beta')
    expect(screen.getByTestId('graph-council-review-prompt')).toHaveValue('Ask the Agent Council about [[Beta]].')

    fireEvent.click(screen.getByRole('button', { name: 'Open AI with packet' }))

    expect(onConfirm).toHaveBeenCalledWith(draft)
  })
})
