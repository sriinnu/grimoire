import { fireEvent, render, screen } from '@testing-library/react'
import type { ComponentProps } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { CrystallizeReviewDialog } from './CrystallizeReviewDialog'
import type { CrystallizeProposal } from '../lib/crystallizeProposal'

const proposal: CrystallizeProposal = {
  title: 'Crystallized Memory',
  targetPath: '/tmp/vault/memory/crystallized/memory.md',
  relativePath: 'memory/crystallized/memory.md',
  sourceName: 'AI Chat',
  sourceLabel: 'AI chat',
  sourceLabels: ['AI chat'],
  handoffMetadata: null,
  ledgerContract: {
    contradictedBy: [],
    confidence: 'proposed',
    expiresAt: '2026-08-21',
    locality: 'vault',
    reviewState: 'reviewed',
    sourceCount: 1,
    status: 'proposed',
    version: 1,
  },
  activeNotePatch: null,
  reviewedAt: '2026-05-23T08:00:00.000Z',
  markdown: 'type: Memory\n\nOriginal memory',
  changes: [
    {
      id: 'create-memory',
      kind: 'file',
      label: 'Create Memory note',
      target: 'memory/crystallized/memory.md',
      before: '(missing)',
      after: 'type: Memory',
    },
    {
      id: 'write-frontmatter',
      kind: 'frontmatter',
      label: 'Write ledger frontmatter',
      target: 'memory/crystallized/memory.md',
      before: '(none)',
      after: [
        'confidence: proposed',
        'memory_status: proposed',
        'memory_review_state: reviewed',
        'memory_source_count: 1',
        'expires_at: 2026-08-21',
        'contradicted_by: []',
        'memory_version: 1',
        'reviewed_at: "2026-05-23T08:00:00.000Z"',
        'locality: vault',
      ].join('\n'),
    },
    {
      id: 'link-sources',
      kind: 'backlink',
      label: 'Write source links',
      target: 'memory/crystallized/memory.md',
      before: '(none)',
      after: '- [[AI chat]]',
    },
    {
      id: 'write-ledger-contract',
      kind: 'body',
      label: 'Write ledger contract',
      target: 'memory/crystallized/memory.md',
      before: '(none)',
      after: '- Status: proposed\n- Confidence: proposed\n- Review state: reviewed',
    },
  ],
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
    const packet = screen.getByTestId('crystallize-review-packet')
    expect(packet).toHaveAccessibleName('Crystallize review packet')
    expect(packet).toHaveTextContent('4 hunks')
    expect(packet).toHaveTextContent('1 source')
    expect(packet).toHaveTextContent('9 fields')
    expect(packet).toHaveTextContent('Review by 2026-08-21')
    expect(packet).toHaveTextContent('0 contradictions')
    expect(packet).toHaveTextContent('memory/crystallized')
    const runway = screen.getByTestId('crystallize-runway')
    expect(runway).toHaveAccessibleName('Crystallize source-safe runway')
    expect(runway).toHaveTextContent('Sources')
    expect(runway).toHaveTextContent('Safe labels only.')
    expect(runway).toHaveTextContent('Firewall')
    expect(runway).toHaveTextContent('No Git or cloud needed.')
    expect(runway).toHaveTextContent('Ledger')
    expect(runway).toHaveTextContent('Expiry and contradiction slots.')
    expect(runway).toHaveTextContent('Editable diff')
    expect(runway).toHaveTextContent('Lands as')
    const preview = screen.getByTestId('crystallize-markdown-preview')
    fireEvent.change(preview, { target: { value: 'type: Memory\n\nEdited memory' } })
    const apply = screen.getByTestId('crystallize-apply')

    fireEvent.click(apply)

    expect(onApply).toHaveBeenCalledWith({
      memoryMarkdown: 'type: Memory\n\nEdited memory',
      activeNoteFrontmatterMarkdown: null,
      activeNoteAppendMarkdown: null,
    })
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
    expect(screen.getByTestId('crystallize-runway')).toHaveTextContent('Blocked')
    expect(screen.getByTestId('crystallize-runway')).toHaveTextContent('Held local.')
  })

  it('lets the reviewer edit an active note append hunk before applying', () => {
    const onApply = vi.fn()
    renderDialog({
      onApply,
      proposal: {
        ...proposal,
        activeNotePatch: {
          targetPath: '/tmp/vault/project.md',
          relativePath: 'project.md',
          frontmatterMarkdown: 'last_crystallized_at: "2026-05-23T08:00:00.000Z"\ncrystallized_memories:\n  - "[[Crystallized Memory]]"',
          appendMarkdown: '## Crystallized Follow-up\n\nOriginal append',
        },
        changes: [
          ...proposal.changes,
          {
            id: 'update-active-note-frontmatter',
            kind: 'frontmatter',
            label: 'Update active note metadata',
            target: 'project.md',
            before: '(no Crystallize metadata)',
            after: 'last_crystallized_at: "2026-05-23T08:00:00.000Z"\ncrystallized_memories:\n  - "[[Crystallized Memory]]"',
          },
          {
            id: 'append-active-note',
            kind: 'note',
            label: 'Append active note',
            target: 'project.md',
            before: '(no crystallized follow-up block)',
            after: '## Crystallized Follow-up\n\nOriginal append',
          },
        ],
      },
    })

    expect(screen.getByText('Active note hunks')).toBeInTheDocument()
    expect(screen.getAllByTestId('crystallize-change-kind-frontmatter')).toHaveLength(2)
    expect(screen.getByTestId('crystallize-change-kind-note')).toBeInTheDocument()
    expect(screen.getByTestId('crystallize-review-packet')).toHaveTextContent('6 hunks')
    expect(screen.getByTestId('crystallize-review-packet')).toHaveTextContent('2 active-note hunks will update project.md.')
    const frontmatterPreview = screen.getByTestId('crystallize-active-note-frontmatter-preview')
    fireEvent.change(frontmatterPreview, {
      target: { value: 'last_crystallized_at: "2026-05-24T08:00:00.000Z"\ncrystallized_memories:\n  - "[[Edited Memory]]"' },
    })
    const appendPreview = screen.getByTestId('crystallize-active-note-append-preview')
    fireEvent.change(appendPreview, { target: { value: '## Crystallized Follow-up\n\nEdited append' } })

    fireEvent.click(screen.getByTestId('crystallize-apply'))

    expect(onApply).toHaveBeenCalledWith({
      memoryMarkdown: 'type: Memory\n\nOriginal memory',
      activeNoteFrontmatterMarkdown: 'last_crystallized_at: "2026-05-24T08:00:00.000Z"\ncrystallized_memories:\n  - "[[Edited Memory]]"',
      activeNoteAppendMarkdown: '## Crystallized Follow-up\n\nEdited append',
    })
    expect(screen.getByTestId('crystallize-accept-status')).toHaveTextContent(
      'Writing reviewed Markdown into local memory and the active note.',
    )
  })
})
