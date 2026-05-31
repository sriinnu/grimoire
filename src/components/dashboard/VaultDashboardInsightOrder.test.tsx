import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { VaultEntry } from '../../types'
import { VaultDashboard } from './VaultDashboard'

function entry(title: string, type = 'Note'): VaultEntry {
  const slug = title.toLowerCase().replace(/\s+/g, '-')
  return {
    path: `/vault/${slug}.md`,
    filename: `${slug}.md`,
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
  }
}

describe('VaultDashboard insight order', () => {
  it('puts the date-oriented Time Loom directly after quick capture and before summary panels', async () => {
    render(
      <VaultDashboard
        conflictCount={0}
        entries={[entry('Daily Journal', 'Journal'), entry('River Dream', 'Dream')]}
        isGitVault={false}
        modifiedCount={0}
        onCapture={vi.fn()}
        onOpenCreateVault={vi.fn()}
        onOpenNote={vi.fn()}
        syncStatus="idle"
        vaultPath="/vault"
      />,
    )

    const quickCapture = screen.getByText('Quick Capture').closest('.vault-dashboard__panel') as HTMLElement
    const timeLoom = await screen.findByTestId('time-loom-panel')
    const dailyThread = await screen.findByTestId('daily-thread-rail')
    const openLoops = screen.getByText('Open Loops').closest('.vault-dashboard__panel') as HTMLElement

    expect(timeLoom).toHaveClass('vault-dashboard__time-loom')
    expect(quickCapture.compareDocumentPosition(timeLoom) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(timeLoom.compareDocumentPosition(dailyThread) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(timeLoom.compareDocumentPosition(openLoops) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })
})
