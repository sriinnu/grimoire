import type { ReactElement } from 'react'
import { render as rtlRender, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { TooltipProvider } from '@/components/ui/tooltip'
import { makeEntry } from '../test-utils/noteListTestUtils'
import { Inspector } from './Inspector'

function render(ui: ReactElement) {
  return rtlRender(ui, { wrapper: TooltipProvider })
}

describe('Inspector Living Frontmatter integration', () => {
  it('shows Living Frontmatter hints inside About, under their fields, ahead of Connections', () => {
    const entry = makeEntry({
      path: '/vault/project/grimoire.md',
      filename: 'grimoire.md',
      title: 'Grimoire',
      isA: 'Project',
      outgoingLinks: ['Agent Council'],
    })

    render(
      <Inspector
        collapsed={false}
        onToggle={() => {}}
        entry={entry}
        content={`---
type: Project
---

# Grimoire

Links to [[Agent Council]].
`}
        entries={[entry, makeEntry({ path: '/vault/archive/grimoire-copy.md', filename: 'grimoire-copy.md', title: 'Grimoire Copy' })]}
        gitHistory={[]}
        onNavigate={() => {}}
      />,
    )

    const about = screen.getByTestId('inspector-section-about')
    const connections = screen.getByTestId('inspector-section-connections')
    const statusHint = within(about).getAllByTestId('living-frontmatter-hint').find((hint) => hint.getAttribute('data-field') === 'status')!
    expect(statusHint).toHaveTextContent('Add status')
    // Field hints sit in the properties grid; page-level notes follow, all inside About and ahead of Connections.
    const loose = within(about).getByTestId('living-frontmatter-panel')
    expect(within(loose).getByText('Possible duplicate')).toBeInTheDocument()
    expect(statusHint.compareDocumentPosition(loose) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(loose.compareDocumentPosition(connections) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })
})
