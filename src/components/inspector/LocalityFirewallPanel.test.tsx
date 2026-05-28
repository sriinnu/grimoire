import { render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { makeEntry } from '../../test-utils/noteListTestUtils'
import { LocalityFirewallPanel } from './LocalityFirewallPanel'

describe('LocalityFirewallPanel', () => {
  it('shows protected note egress lanes without exposing paths', () => {
    render(
      <LocalityFirewallPanel
        entry={makeEntry({
          path: '/vault/journal/daily.md',
          title: 'Daily Journal',
          isA: 'Journal',
        })}
      />,
    )

    const panel = screen.getByTestId('note-locality-firewall')
    expect(panel).toHaveAttribute('data-locality', 'local-only')
    expect(panel).toHaveTextContent('Protected local')
    expect(panel).toHaveTextContent('Journal notes are protected by default')
    expect(panel).toHaveTextContent('No title, path, body, or frontmatter leaves')
    expect(panel).not.toHaveTextContent('/vault/journal')

    expect(within(panel).getByText('Agents')).toBeInTheDocument()
    expect(within(panel).getByText('Blocked')).toBeInTheDocument()
    expect(within(panel).getByText('Export/sync')).toBeInTheDocument()
    expect(within(panel).getByText('Withheld')).toBeInTheDocument()
    expect(within(panel).getByText('Git/cloud')).toBeInTheDocument()
    expect(within(panel).getByText('Not staged')).toBeInTheDocument()
    expect(panel.querySelector('[data-egress-state="blocked"]')).not.toBeNull()
    expect(panel.querySelector('[data-egress-state="withheld"]')).not.toBeNull()
    expect(panel.querySelector('[data-egress-state="not-staged"]')).not.toBeNull()
  })

  it('shows source-safe lanes for normal vault-context notes', () => {
    render(
      <LocalityFirewallPanel
        entry={makeEntry({
          path: '/vault/projects/roadmap.md',
          title: 'Roadmap',
          isA: 'Project',
        })}
      />,
    )

    const panel = screen.getByTestId('note-locality-firewall')
    expect(panel).toHaveAttribute('data-locality', 'source-safe')
    expect(panel).toHaveTextContent('Vault context')
    expect(panel).toHaveTextContent('No local-only marker')
    expect(panel).toHaveTextContent('source-safe packets')
    expect(within(panel).getByText('Review packet')).toBeInTheDocument()
    expect(within(panel).getByText('Preview first')).toBeInTheDocument()
    expect(within(panel).getByText('Vault setting')).toBeInTheDocument()
    expect(panel.querySelector('[data-egress-state="review"]')).not.toBeNull()
    expect(panel.querySelector('[data-egress-state="preview"]')).not.toBeNull()
    expect(panel.querySelector('[data-egress-state="vault-setting"]')).not.toBeNull()
  })
})
