import { fireEvent, render, screen, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
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
    const manifest = within(panel).getByTestId('living-frontmatter-review-manifest')
    expect(within(panel).getByRole('heading', { name: 'Living Frontmatter' })).toBeInTheDocument()
    expect(within(panel).getByText('Read-only')).toBeInTheDocument()
    expect(manifest).toHaveAccessibleName('Living Frontmatter review manifest')
    expect(within(manifest).getByText('Writes')).toBeInTheDocument()
    expect(within(manifest).getByText('2 fields')).toBeInTheDocument()
    expect(within(manifest).getByText('Markdown YAML')).toBeInTheDocument()
    expect(within(manifest).getByText('Built-in rules / Vault neighbors / Wikilinks')).toBeInTheDocument()
    expect(within(panel).getByText('Add status')).toBeInTheDocument()
    expect(within(panel).getByText('Possible duplicate')).toBeInTheDocument()
    expect(within(panel).getByText('Promote links')).toBeInTheDocument()
    expect(within(panel).getAllByText('Source: built-in rule / Write: review only')).toHaveLength(2)
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

  it('applies safe suggestions through the Markdown frontmatter callback', () => {
    const onApplySuggestion = vi.fn()
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
        entries={[entry]}
        frontmatter={{ type: 'Project', owner: 'Sriinnu' }}
        onApplySuggestion={onApplySuggestion}
      />,
    )

    const panel = screen.getByTestId('living-frontmatter-panel')
    expect(within(panel).getByText('Markdown-owned')).toBeInTheDocument()
    expect(within(panel).getByText('Source: built-in rule / Write: frontmatter only')).toBeInTheDocument()
    expect(within(panel).getByText('Suggested: Active')).toBeInTheDocument()
    fireEvent.click(within(panel).getAllByRole('button', { name: 'Apply' })[0])
    expect(onApplySuggestion).toHaveBeenCalledWith('status', 'Active')
  })

  it('shows Type-owned schema hints from Markdown Type definitions', () => {
    const onApplySuggestion = vi.fn()
    const entry = makeEntry({
      path: '/vault/books/left-hand.md',
      filename: 'left-hand.md',
      title: 'Left Hand',
      isA: 'Book',
    })

    render(
      <LivingFrontmatterPanel
        entry={entry}
        entries={[
          entry,
          makeEntry({
            path: '/vault/type/book.md',
            filename: 'book.md',
            title: 'Book',
            isA: 'Type',
            listPropertiesDisplay: ['status'],
          }),
        ]}
        frontmatter={{ type: 'Book' }}
        onApplySuggestion={onApplySuggestion}
      />,
    )

    const panel = screen.getByTestId('living-frontmatter-panel')
    expect(within(panel).getByText('Type')).toBeInTheDocument()
    expect(within(panel).getByText('Source: Markdown Type note / Write: frontmatter only')).toBeInTheDocument()
    expect(within(panel).getByText('Book type asks for status in readable Markdown frontmatter.')).toBeInTheDocument()
    fireEvent.click(within(panel).getByRole('button', { name: 'Apply' }))
    expect(onApplySuggestion).toHaveBeenCalledWith('status', 'Active')
  })
})
