import { fireEvent, render, screen, waitFor } from '@testing-library/react'
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

describe('VaultDashboard template selection', () => {
  it('lets journal and dream captures choose a reusable template', async () => {
    const onCapture = vi.fn().mockResolvedValue({ status: 'created', captureKind: 'journal', entry: entry('Journal') })

    render(
      <VaultDashboard
        conflictCount={0}
        entries={[]}
        isGitVault={false}
        modifiedCount={0}
        onCapture={onCapture}
        onOpenCreateVault={vi.fn()}
        onOpenNote={vi.fn()}
        syncStatus="idle"
        vaultPath="/vault"
      />,
    )

    fireEvent.click(screen.getByTestId('dashboard-capture-kind-journal'))
    fireEvent.click(screen.getByTestId('dashboard-template-evening'))
    fireEvent.change(screen.getByTestId('dashboard-capture-input'), { target: { value: 'release the day' } })
    fireEvent.click(screen.getByTestId('dashboard-capture-submit'))

    await waitFor(() => expect(onCapture).toHaveBeenCalled())
    expect(onCapture.mock.calls[0][0]).toBe('release the day')
    expect(onCapture.mock.calls[0][1]).toBe('journal')
    expect(onCapture.mock.calls[0][3]).toBe('evening')

    fireEvent.click(screen.getByTestId('dashboard-capture-kind-dream'))
    expect(screen.getByTestId('dashboard-template-lucid')).toBeInTheDocument()
  })

  it('submits blank journal and dream template captures for the selected date', async () => {
    const onCapture = vi.fn().mockResolvedValue({ status: 'created', captureKind: 'dream', entry: entry('Dream', 'Dream') })

    render(
      <VaultDashboard
        conflictCount={0}
        entries={[]}
        isGitVault={false}
        modifiedCount={0}
        onCapture={onCapture}
        onOpenCreateVault={vi.fn()}
        onOpenNote={vi.fn()}
        syncStatus="idle"
        vaultPath="/vault"
      />,
    )

    fireEvent.click(screen.getByTestId('dashboard-capture-kind-dream'))
    fireEvent.click(screen.getByTestId('dashboard-template-symbol'))
    fireEvent.click(screen.getByTestId('dashboard-capture-date-2'))
    fireEvent.click(screen.getByTestId('dashboard-capture-submit'))

    await waitFor(() => expect(onCapture).toHaveBeenCalled())
    expect(onCapture.mock.calls[0][0]).toBe('')
    expect(onCapture.mock.calls[0][1]).toBe('dream')
    expect(onCapture.mock.calls[0][3]).toBe('symbol')
    expect(onCapture.mock.calls[0][2]).toBeInstanceOf(Date)
  })
})
