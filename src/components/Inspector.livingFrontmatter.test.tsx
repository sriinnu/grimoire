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
  it('shows read-only frontmatter hints between properties and relationships', () => {
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
        entries={[entry]}
        gitHistory={[]}
        onNavigate={() => {}}
      />,
    )

    const panel = screen.getByTestId('living-frontmatter-panel')
    const separator = screen.getByTestId('inspector-properties-relationships-separator')
    expect(panel.compareDocumentPosition(separator) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(within(panel).getByText('Read-only')).toBeInTheDocument()
    expect(within(panel).getByText('Add status')).toBeInTheDocument()
    expect(within(panel).getByText('Promote links')).toBeInTheDocument()
  })
})
