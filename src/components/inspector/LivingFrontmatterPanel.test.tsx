import { render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { makeEntry } from '../../test-utils/noteListTestUtils'
import { LivingFrontmatterPanel } from './LivingFrontmatterPanel'

describe('LivingFrontmatterPanel', () => {
  it('renders read-only hints for missing schema, duplicates, and link promotion', () => {
    const entry = makeEntry({
      path: '/vault/project/grimoire.md',
      filename: 'grimoire.md',
      title: 'Grimoire',
      isA: 'Project',
      outgoingLinks: ['Agent Council'],
    })

    render(
      <LivingFrontmatterPanel
        entry={entry}
        entries={[
          entry,
          makeEntry({
            path: '/vault/archive/grimoire-copy.md',
            filename: 'grimoire-copy.md',
            title: 'Grimoire Copy',
          }),
        ]}
        frontmatter={{ type: 'Project' }}
      />,
    )

    const panel = screen.getByTestId('living-frontmatter-panel')
    expect(within(panel).getByRole('heading', { name: 'Living Frontmatter' })).toBeInTheDocument()
    expect(within(panel).getByText('Read-only')).toBeInTheDocument()
    expect(within(panel).getByText('Add status')).toBeInTheDocument()
    expect(within(panel).getByText('Possible duplicate')).toBeInTheDocument()
    expect(within(panel).getByText('Promote links')).toBeInTheDocument()
  })

  it('stays quiet when frontmatter already has enough structure', () => {
    const entry = makeEntry({
      title: 'Structured Project',
      isA: 'Project',
      relationships: { related_to: ['[[Agent Council]]'] },
      outgoingLinks: ['Agent Council'],
    })

    const { container } = render(
      <LivingFrontmatterPanel
        entry={entry}
        entries={[entry]}
        frontmatter={{
          type: 'Project',
          status: 'Active',
          owner: 'Sriinnu',
          related_to: ['[[Agent Council]]'],
        }}
      />,
    )

    expect(container).toBeEmptyDOMElement()
  })
})
