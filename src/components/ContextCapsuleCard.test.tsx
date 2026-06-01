import { fireEvent, render, screen, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { ContextCapsulePreview } from '../lib/contextCapsule'
import { ContextCapsuleCard } from './ContextCapsuleCard'

function preview(overrides: Partial<ContextCapsulePreview> = {}): ContextCapsulePreview {
  return {
    state: 'ready',
    title: 'Grimoire capsule',
    includedNotes: [{
      kind: 'active',
      path: '/vault/grimoire.md',
      title: 'Grimoire',
      type: 'Project',
    }],
    exclusions: [],
    rules: [
      'Markdown and frontmatter only',
      'Local-only notes withheld',
      'Preview before handoff',
    ],
    counts: {
      linkedNotes: 1,
      noteListItems: 2,
      openTabs: 1,
      selectedNotes: 1,
      exclusions: 0,
    },
    projectMap: {
      graphEdges: 2,
      graphNodes: 3,
      graphOmitted: 0,
      relationshipEdges: 3,
    },
    ...overrides,
  }
}

describe('ContextCapsuleCard', () => {
  it('renders included note counts and safety rules', () => {
    render(<ContextCapsuleCard preview={preview()} reviewReceipt="pkg-1234abcd" />)

    const card = screen.getByTestId('context-capsule-card')
    expect(within(card).getByText('Context Capsule')).toBeInTheDocument()
    expect(screen.getByTestId('context-capsule-receipt')).toHaveTextContent('pkg-1234abcd')
    expect(within(card).getByText('Preview')).toBeInTheDocument()
    expect(within(card).getByText('Grimoire')).toBeInTheDocument()
    expect(within(card).getByText('Local-only notes withheld')).toBeInTheDocument()
    expect(within(card).getByText('3 graph notes')).toBeInTheDocument()
    expect(within(card).getByText('2 graph edges')).toBeInTheDocument()
    expect(screen.getByTestId('context-capsule-route')).toHaveTextContent('Package route')
    expect(screen.getByTestId('context-capsule-route')).toHaveTextContent('Review first')
    expect(screen.getByTestId('context-capsule-route')).toHaveTextContent('1 source.')
    expect(screen.getByTestId('context-capsule-route')).toHaveTextContent('3 nodes / 2 edges.')
    expect(screen.getByTestId('context-capsule-route')).toHaveTextContent('Markdown preview.')
    expect(screen.getByTestId('context-capsule-egress')).toHaveTextContent('Agents')
    expect(screen.getByTestId('context-capsule-egress')).toHaveTextContent('Review packet')
    expect(screen.getByTestId('context-capsule-egress')).toHaveTextContent('Export/sync')
    expect(screen.getByTestId('context-capsule-egress')).toHaveTextContent('Preview first')
    expect(screen.getByTestId('context-capsule-egress')).toHaveTextContent('Git/cloud')
    expect(screen.getByTestId('context-capsule-egress')).toHaveTextContent('Vault setting')
  })

  it('opens the inspectable package preview when requested', () => {
    const onReviewPackage = vi.fn()
    render(<ContextCapsuleCard preview={preview()} onReviewPackage={onReviewPackage} />)

    fireEvent.click(screen.getByTestId('context-capsule-review'))

    expect(onReviewPackage).toHaveBeenCalledOnce()
  })

  it('shows the actual withheld item total instead of exclusion category count', () => {
    render(
      <ContextCapsuleCard
        preview={preview({
          exclusions: [
            { label: 'Dashboard local-only notes', reason: '2 withheld' },
            { label: 'Dashboard local-only memory records', reason: '1 withheld' },
          ],
          counts: {
            linkedNotes: 1,
            noteListItems: 2,
            openTabs: 1,
            selectedNotes: 1,
            exclusions: 2,
          },
        })}
      />,
    )

    expect(screen.getByTestId('context-capsule-stat-held')).toHaveTextContent('3')
    expect(screen.getByTestId('context-capsule-route')).toHaveTextContent('3 held local.')
  })

  it('shows typed Crystallize handoff intent before package review', () => {
    render(<ContextCapsuleCard preview={preview({ handoffIntent: 'Daily Thread Crystallize' })} />)

    const intent = screen.getByTestId('context-capsule-intent')
    expect(intent).toHaveTextContent('Daily Thread Crystallize')
    expect(intent).toHaveTextContent('review-before-write Markdown memory')
  })

  it('shows the selected agent route on the capsule before handoff', () => {
    render(
      <ContextCapsuleCard
        defaultAiAgent="chitragupta"
        defaultAiProvider="google"
        defaultAiModel="gemini-2.5-pro"
        preview={preview()}
      />,
    )

    const route = within(screen.getByTestId('context-capsule-card')).getByTestId('agent-route-disclosure')
    expect(route).toHaveTextContent('Chitra')
    expect(route).toHaveTextContent('provider: google')
    expect(route).toHaveTextContent('model: gemini-2.5-pro')
    expect(route).toHaveTextContent('Source-safe packet')
  })

  it('shows protected exclusions without rendering protected note names', () => {
    render(
      <ContextCapsuleCard
        defaultAiAgent="chitragupta"
        preview={preview({
          state: 'protected',
          title: 'Protected capsule',
          includedNotes: [],
          exclusions: [{ label: 'Protected active note', reason: 'Local-only' }],
          counts: {
            linkedNotes: 0,
            noteListItems: 0,
            openTabs: 0,
            selectedNotes: 0,
            exclusions: 1,
          },
        })}
      />,
    )

    const card = screen.getByTestId('context-capsule-card')
    expect(within(card).getByText('Protected')).toBeInTheDocument()
    expect(screen.getByTestId('context-capsule-route')).toHaveAttribute('data-locality', 'protected-local')
    expect(screen.getByTestId('context-capsule-route')).toHaveTextContent('No handoff')
    expect(screen.getByTestId('context-capsule-route')).toHaveTextContent('Active note held.')
    expect(screen.getByTestId('context-capsule-route')).toHaveTextContent('1 held local.')
    expect(screen.getByTestId('context-capsule-route')).toHaveTextContent('Handoff blocked.')
    expect(screen.getByTestId('context-capsule-egress')).toHaveTextContent('Blocked')
    expect(screen.getByTestId('context-capsule-egress')).toHaveTextContent('Withheld')
    expect(screen.getByTestId('context-capsule-egress')).toHaveTextContent('Not staged')
    expect(screen.getByTestId('context-capsule-egress')).toHaveAttribute('data-testid', 'context-capsule-egress')
    expect(screen.getByTestId('context-capsule-egress').querySelector('[data-egress-state="blocked"]')).not.toBeNull()
    expect(within(card).getByTestId('agent-route-disclosure')).toHaveTextContent('No note payload')
    expect(within(card).getByText('Protected active note')).toBeInTheDocument()
    expect(within(card).queryByText('River Dream')).toBeNull()
  })
})
