import { render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { makeEntry } from '../test-utils/noteListTestUtils'
import { LocalityFirewallSettingsCard } from './LocalityFirewallSettingsCard'

describe('LocalityFirewallSettingsCard', () => {
  it('shows protected categories without rendering private note titles', () => {
    render(
      <LocalityFirewallSettingsCard
        entries={[
          makeEntry({ title: 'Public Plan', isA: 'Note' }),
          makeEntry({ title: 'Dream Thread', isA: 'Dream' }),
          makeEntry({ title: 'Private Memory', isA: 'Memory' }),
          makeEntry({ title: 'Blocked Export', properties: { egress: 'blocked' } }),
          makeEntry({ title: 'Private Folder', path: '/vault/Private/folder-note.md' }),
        ]}
      />,
    )

    const firewall = within(screen.getByTestId('locality-firewall-card'))
    expect(firewall.getByText('Dream note')).toBeInTheDocument()
    expect(firewall.getByText('Memory note')).toBeInTheDocument()
    expect(firewall.getByText('Frontmatter-protected note')).toBeInTheDocument()
    expect(firewall.queryByText('Dream Thread')).not.toBeInTheDocument()
    expect(firewall.queryByText('Private Memory')).not.toBeInTheDocument()
    expect(firewall.queryByText('Blocked Export')).not.toBeInTheDocument()
  })
})
