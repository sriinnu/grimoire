import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { VaultEntry } from '../../types'
import { VaultDashboard } from './VaultDashboard'

function entry(title: string, type = 'Note', overrides: Partial<VaultEntry> = {}): VaultEntry {
  return {
    path: `/vault/${title.toLowerCase().replace(/\s+/g, '-')}.md`,
    filename: `${title.toLowerCase().replace(/\s+/g, '-')}.md`,
    title,
    isA: type,
    aliases: [],
    belongsTo: [],
    relatedTo: [],
    status: null,
    archived: false,
    modifiedAt: Math.floor(Date.now() / 1000),
    createdAt: Math.floor(Date.now() / 1000),
    fileSize: 0,
    snippet: '',
    wordCount: 5,
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
    properties: {},
    hasH1: true,
    fileKind: 'markdown',
    ...overrides,
  }
}

describe('VaultDashboard privacy boundaries', () => {
  it('keeps protected local-only note labels out of recent re-entry rows', () => {
    render(
      <VaultDashboard
        conflictCount={0}
        entries={[
          entry('Secret River Dream', 'Dream', { path: '/vault/dreams/secret-river.md' }),
          entry('Private Plan', 'Note', { properties: { locality: 'local' } }),
          entry('Public Project', 'Project'),
        ]}
        isGitVault={false}
        modifiedCount={0}
        onCapture={vi.fn()}
        onOpenCreateVault={vi.fn()}
        onOpenNote={vi.fn()}
        syncStatus="idle"
        vaultPath="/vault"
      />,
    )

    const recentPanel = screen.getByText('Recent Pages').closest('.vault-dashboard__panel') as HTMLElement
    expect(recentPanel).toHaveTextContent('Public Project')
    expect(recentPanel).not.toHaveTextContent('Secret River Dream')
    expect(recentPanel).not.toHaveTextContent('Private Plan')
    expect(recentPanel).not.toHaveTextContent('/vault/dreams')
  })

  it('explains held protected recents instead of showing a first-note prompt', () => {
    render(
      <VaultDashboard
        conflictCount={0}
        entries={[
          entry('Secret River Dream', 'Dream', { path: '/vault/dreams/secret-river.md' }),
          entry('Private Plan', 'Note', { properties: { locality: 'local' } }),
        ]}
        isGitVault={false}
        modifiedCount={0}
        onCapture={vi.fn()}
        onOpenCreateVault={vi.fn()}
        onOpenNote={vi.fn()}
        syncStatus="idle"
        vaultPath="/vault"
      />,
    )

    const recentPanel = screen.getByText('Recent Pages').closest('.vault-dashboard__panel') as HTMLElement
    expect(recentPanel).toHaveTextContent('2 protected recent notes held in private lanes.')
    expect(recentPanel).not.toHaveTextContent('Create the first note.')
    expect(recentPanel).not.toHaveTextContent('Secret River Dream')
    expect(recentPanel).not.toHaveTextContent('Private Plan')
  })
})
