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
    render(<ContextCapsuleCard preview={preview()} />)

    const card = screen.getByTestId('context-capsule-card')
    expect(within(card).getByText('Context Capsule')).toBeInTheDocument()
    expect(within(card).getByText('Preview')).toBeInTheDocument()
    expect(within(card).getByText('Grimoire')).toBeInTheDocument()
    expect(within(card).getByText('Local-only notes withheld')).toBeInTheDocument()
    expect(within(card).getByText('3 graph notes')).toBeInTheDocument()
    expect(within(card).getByText('2 graph edges')).toBeInTheDocument()
  })

  it('opens the inspectable package preview when requested', () => {
    const onReviewPackage = vi.fn()
    render(<ContextCapsuleCard preview={preview()} onReviewPackage={onReviewPackage} />)

    fireEvent.click(screen.getByTestId('context-capsule-review'))

    expect(onReviewPackage).toHaveBeenCalledOnce()
  })

  it('shows protected exclusions without rendering protected note names', () => {
    render(
      <ContextCapsuleCard
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
    expect(within(card).getByText('Protected active note')).toBeInTheDocument()
    expect(within(card).queryByText('River Dream')).toBeNull()
  })
})
