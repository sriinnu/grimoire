import { fireEvent, render, screen, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { buildLivingFrontmatterHints } from '../../lib/livingFrontmatter'
import { makeEntry } from '../../test-utils/noteListTestUtils'
import { LivingFrontmatterPanel } from './LivingFrontmatterPanel'
import { partitionLivingFrontmatterHints } from './livingFrontmatterRows'

const grimoire = makeEntry({
  path: '/vault/project/grimoire.md',
  filename: 'grimoire.md',
  title: 'Grimoire',
  isA: 'Project',
  outgoingLinks: ['Agent Council'],
})
const copy = makeEntry({ path: '/vault/archive/grimoire-copy.md', filename: 'grimoire-copy.md', title: 'Grimoire Copy' })

describe('partitionLivingFrontmatterHints', () => {
  it('anchors field hints under their field and keeps page-level hints loose', () => {
    const hints = buildLivingFrontmatterHints({ entry: grimoire, entries: [grimoire, copy], frontmatter: { type: 'Project' } })
    const { byField, loose } = partitionLivingFrontmatterHints(hints)
    expect(Object.keys(byField)).toContain('status')
    expect(loose.map((hint) => hint.kind)).toContain('duplicate-concept')
    expect(loose.every((hint) => !hint.field)).toBe(true)
  })
})

describe('LivingFrontmatterPanel', () => {
  it('renders page-level hints as quiet lines', () => {
    const hints = buildLivingFrontmatterHints({ entry: grimoire, entries: [grimoire, copy], frontmatter: { type: 'Project' } })
    render(<LivingFrontmatterPanel hints={partitionLivingFrontmatterHints(hints).loose} />)

    const panel = screen.getByTestId('living-frontmatter-panel')
    expect(within(panel).getByText('Possible duplicate')).toBeInTheDocument()
    expect(within(panel).queryByRole('button', { name: 'Apply' })).toBeNull()
  })

  it('renders nothing without hints', () => {
    const { container } = render(<LivingFrontmatterPanel hints={[]} />)
    expect(container).toBeEmptyDOMElement()
  })

  it('applies a safe suggestion through the frontmatter callback', () => {
    const onApplySuggestion = vi.fn()
    render(
      <LivingFrontmatterPanel
        hints={[{ id: 'promote', kind: 'relationship-hint', label: 'Promote links', detail: 'Body links could be typed.', severity: 'info', source: 'body-wikilinks', field: 'related_to', suggestedValue: ['[[Agent Council]]'] }]}
        onApplySuggestion={onApplySuggestion}
      />,
    )
    fireEvent.click(screen.getByRole('button', { name: 'Apply' }))
    expect(onApplySuggestion).toHaveBeenCalledWith('related_to', ['[[Agent Council]]'])
  })
})
