import { fireEvent, render, screen, within } from '@testing-library/react'
import type { ComponentProps } from 'react'
import { describe, expect, it, vi } from 'vitest'
import type { VaultEntry } from '../../types'
import { VaultDashboard } from './VaultDashboard'

function entry(title: string, type = 'Note', overrides: Partial<VaultEntry> = {}): VaultEntry {
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
    ...overrides,
  }
}

function renderDashboard(overrides: Partial<ComponentProps<typeof VaultDashboard>> = {}) {
  const onOpenNote = vi.fn()
  const yesterday = Math.floor(Date.now() / 1000) - 24 * 60 * 60
  const memory = entry('Private Memory Ledger', 'Memory', {
    path: '/vault/memory/private-ledger.md',
    properties: { locality: 'local', egress: 'blocked' },
    status: 'Review',
  })
  render(
    <VaultDashboard
      conflictCount={0}
      entries={[
        entry('Reference Note', 'Note'),
        entry('Secret River Dream', 'Dream', {
          path: '/vault/dreams/secret-river.md',
          createdAt: yesterday,
          modifiedAt: yesterday,
        }),
        memory,
      ]}
      isGitVault={false}
      modifiedCount={0}
      onCapture={vi.fn()}
      onOpenCreateVault={vi.fn()}
      onOpenNote={onOpenNote}
      syncStatus="idle"
      vaultPath="/vault"
      {...overrides}
    />,
  )
  return { memory, onOpenNote }
}

describe('VaultDashboard daily flow', () => {
  it('wires the daily loop without exposing private labels in the rail', () => {
    const { memory, onOpenNote } = renderDashboard()
    const flow = screen.getByTestId('dashboard-daily-flow')
    const input = screen.getByTestId('dashboard-capture-input')

    expect(flow).toHaveTextContent('Capture, reflect, organize, crystallize.')
    expect(flow).toHaveTextContent('Dream open')
    expect(flow).toHaveTextContent('1 memory reviews')
    expect(flow).not.toHaveTextContent('Secret River Dream')
    expect(flow).not.toHaveTextContent('Private Memory Ledger')

    fireEvent.click(within(flow).getByRole('button', { name: /Reflect/ }))
    expect(input).toHaveValue('/journal ')

    fireEvent.change(input, { target: { value: '' } })
    fireEvent.click(within(flow).getByRole('button', { name: /Crystallize/ }))
    expect(input).toHaveValue('/ask ')
    expect(screen.getByTestId('dashboard-ask-context-preview')).toBeInTheDocument()

    fireEvent.click(within(flow).getByRole('button', { name: /Organize/ }))
    expect(onOpenNote).toHaveBeenCalledWith(expect.objectContaining({ path: memory.path }))
  })
})
