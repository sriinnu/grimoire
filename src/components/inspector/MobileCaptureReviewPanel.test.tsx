import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { VaultEntry } from '../../types'
import { MobileCaptureReviewPanel } from './MobileCaptureReviewPanel'

function entry(patch: Partial<VaultEntry> = {}): VaultEntry {
  return {
    path: patch.path ?? '/vault/journals/mobile/private-capture.md',
    filename: patch.filename ?? 'private-capture.md',
    title: patch.title ?? 'Private Therapy Capture',
    isA: patch.isA ?? 'Journal',
    aliases: [],
    belongsTo: [],
    relatedTo: [],
    status: patch.status ?? 'Review',
    archived: false,
    modifiedAt: 1,
    createdAt: 1,
    fileSize: 0,
    snippet: patch.snippet ?? 'private source body',
    wordCount: 1,
    relationships: {},
    icon: null,
    color: null,
    order: null,
    sidebarLabel: null,
    template: null,
    sort: null,
    view: null,
    visible: null,
    organized: false,
    favorite: false,
    favoriteIndex: null,
    listPropertiesDisplay: [],
    outgoingLinks: [],
    properties: {
      captured_at: '2026-05-25T10:30:00.000Z',
      created_from: 'mobile-capture',
      attachment_count: 2,
      mobile_review: 'pending',
      ...patch.properties,
    },
    hasH1: true,
    fileKind: 'markdown',
  }
}

describe('MobileCaptureReviewPanel', () => {
  it('renders a privacy-safe owner action gate for pending mobile captures', () => {
    render(<MobileCaptureReviewPanel entry={entry()} />)

    const panel = screen.getByTestId('mobile-capture-review-panel')
    expect(within(panel).getByRole('heading', { name: 'Mobile Review' })).toBeInTheDocument()
    expect(within(panel).getByText('Journal')).toBeInTheDocument()
    expect(within(panel).getByText('2')).toBeInTheDocument()
    expect(panel).not.toHaveTextContent('Private Therapy Capture')
    expect(panel).not.toHaveTextContent('/vault/journals/mobile/private-capture.md')
    expect(panel).not.toHaveTextContent('private source body')
  })

  it('writes accepted review metadata through frontmatter callbacks only', async () => {
    const onUpdateReviewProperty = vi.fn().mockResolvedValue(undefined)
    render(
      <MobileCaptureReviewPanel
        entry={entry()}
        reviewedAt={() => new Date('2026-05-27T06:45:00.000Z')}
        onUpdateReviewProperty={onUpdateReviewProperty}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: /Accept/i }))

    await waitFor(() => expect(onUpdateReviewProperty).toHaveBeenCalledTimes(7))
    expect(onUpdateReviewProperty.mock.calls).toEqual([
      ['mobile_review', 'reviewed'],
      ['mobile_review_outcome', 'accepted'],
      ['mobile_reviewed_at', '2026-05-27T06:45:00.000Z'],
      ['review_required', false],
      ['agent_context', 'review_complete_local_policy_applies'],
      ['export_context', 'review_complete_local_policy_applies'],
      ['sync_context', 'review_complete_local_policy_applies'],
    ])
  })

  it('keeps blocked captures visible as blocked review actions', () => {
    render(<MobileCaptureReviewPanel entry={entry({ properties: { mobile_review_outcome: 'blocked' } })} />)

    const panel = screen.getByTestId('mobile-capture-review-panel')
    expect(panel).toHaveAttribute('data-mobile-review-state', 'blocked')
    expect(within(panel).getByText('blocked')).toBeInTheDocument()
  })

  it('hides once review metadata is closed', () => {
    render(<MobileCaptureReviewPanel entry={entry({ properties: { mobile_review_outcome: 'accepted' } })} />)

    expect(screen.queryByTestId('mobile-capture-review-panel')).not.toBeInTheDocument()
  })
})
