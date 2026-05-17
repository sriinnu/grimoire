import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { VaultEntry } from '../../types'
import { VaultDashboard } from './VaultDashboard'

function entry(title: string, type = 'Note'): VaultEntry {
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
  }
}

describe('VaultDashboard', () => {
  it('shows the local-first assistant board and submits captures', async () => {
    const onCapture = vi.fn().mockResolvedValue({ status: 'ask', prompt: 'summarize today' })

    render(
      <VaultDashboard
        activeVault={{ label: 'Dreams', path: '/vault', storageProvider: 'icloud-drive', syncProvider: 'none' }}
        conflictCount={0}
        entries={[entry('Dream 2026-05-17', 'Dream')]}
        isGitVault={false}
        modifiedCount={0}
        onCapture={onCapture}
        onOpenCreateVault={vi.fn()}
        onOpenNote={vi.fn()}
        syncStatus="idle"
        vaultPath="/vault"
      />,
    )

    expect(screen.getByText('Sriinnu, here is the board.')).toBeInTheDocument()
    expect(screen.getByText('Personal Sync')).toBeInTheDocument()
    expect(screen.getByText('Cloud Blocked')).toBeInTheDocument()

    fireEvent.click(screen.getByTestId('dashboard-capture-kind-ask'))
    fireEvent.change(screen.getByTestId('dashboard-capture-input'), { target: { value: '/ask summarize today' } })
    fireEvent.click(screen.getByTestId('dashboard-capture-submit'))

    await waitFor(() => expect(onCapture).toHaveBeenCalledWith('/ask summarize today', 'ask'))
  })

  it('prefills private lane prompts and opens recent notes', () => {
    const onOpenNote = vi.fn()
    render(
      <VaultDashboard
        conflictCount={0}
        entries={[entry('A recent note')]}
        isGitVault={true}
        modifiedCount={2}
        onCapture={vi.fn()}
        onOpenCreateVault={vi.fn()}
        onOpenNote={onOpenNote}
        syncStatus="idle"
        vaultPath="/vault"
      />,
    )

    fireEvent.click(screen.getByText('Catch a dream'))
    expect(screen.getByTestId('dashboard-capture-input')).toHaveValue('/dream ')

    fireEvent.click(screen.getByText('A recent note'))
    expect(onOpenNote).toHaveBeenCalledWith(expect.objectContaining({ title: 'A recent note' }))
  })
})
