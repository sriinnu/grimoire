import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
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

function todayIso(now = new Date()): string {
  return [now.getFullYear(), String(now.getMonth() + 1).padStart(2, '0'), String(now.getDate()).padStart(2, '0')].join('-')
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

    expect(screen.getByRole('heading', { level: 1, name: 'Dreams' })).toBeInTheDocument()
    const hero = screen.getByTestId('dashboard-hero')
    expect(within(hero).getByRole('heading', { level: 1, name: 'Dreams' })).toBeInTheDocument()
    expect(hero).toHaveTextContent('One living notebook. Capture, connect, and remember — private by default.')
    expect(within(hero).getByTestId('dashboard-hero-privacy')).toHaveTextContent('Local & Private')
    expect(within(hero).getByTestId('dashboard-capture-input')).toBeInTheDocument()
    const statRow = screen.getByTestId('dashboard-stat-row')
    expect(within(statRow).getByTestId('dashboard-stat-pages')).toHaveTextContent('Pages')
    expect(within(statRow).getByTestId('dashboard-stat-journals')).toHaveTextContent('Journals')
    expect(within(statRow).getByTestId('dashboard-stat-dreams')).toHaveTextContent('Dreams')
    expect(within(statRow).getByTestId('dashboard-stat-memory')).toHaveTextContent('Memory')
    const calendar = screen.getByTestId('dashboard-calendar')
    expect(within(calendar).getByTestId('dashboard-calendar-month')).toBeInTheDocument()
    expect(within(calendar).getAllByRole('gridcell')).toHaveLength(42)
    const health = screen.getByTestId('dashboard-vault-health')
    expect(health).toHaveTextContent('Everything backed up')
    expect(screen.queryByText('Personal Sync')).not.toBeInTheDocument()
    expect(screen.queryByLabelText('Vault locality')).not.toBeInTheDocument()
    expect(screen.queryByText('Plain Markdown')).not.toBeInTheDocument()
    const fallback = screen.getByTestId('dashboard-insights-fallback')
    expect(fallback).toHaveAttribute('data-locality', 'local-only')
    expect(fallback).toHaveTextContent('Egress blocked')

    fireEvent.click(screen.getByTestId('dashboard-capture-kind-ask'))
    fireEvent.change(screen.getByTestId('dashboard-capture-input'), { target: { value: '/ask summarize today' } })
    fireEvent.click(screen.getByTestId('dashboard-capture-submit'))

    await waitFor(() => expect(onCapture).toHaveBeenCalledWith('/ask summarize today', 'ask', expect.any(Date), null))
  })

  it('normalizes fixture vault names into notebook titles on the dashboard', () => {
    render(
      <VaultDashboard
        activeVault={{ label: 'demo-vault-v2', path: '/vault', storageProvider: 'local', syncProvider: 'none' }}
        conflictCount={0}
        entries={[]}
        isGitVault
        modifiedCount={0}
        onCapture={vi.fn()}
        onOpenCreateVault={vi.fn()}
        onOpenNote={vi.fn()}
        syncStatus="idle"
        vaultPath="/vault"
      />,
    )

    expect(screen.getByRole('heading', { level: 1, name: 'Today in Grimoire' })).toBeInTheDocument()
    expect(screen.queryByText('Demo Vault V2')).not.toBeInTheDocument()
  })

  it('keeps the dashboard hero focused on creating a page, not another notebook', () => {
    const onOpenCreateVault = vi.fn()
    render(
      <VaultDashboard
        conflictCount={0}
        entries={[]}
        isGitVault={false}
        modifiedCount={0}
        onCapture={vi.fn()}
        onOpenCreateVault={onOpenCreateVault}
        onOpenNote={vi.fn()}
        syncStatus="idle"
        vaultPath="/vault"
      />,
    )

    expect(screen.queryByRole('button', { name: 'New Notebook' })).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'New Page' }))
    expect(screen.getByTestId('dashboard-capture-input')).toHaveValue('/note ')
    expect(onOpenCreateVault).not.toHaveBeenCalled()
  })

  it('passes day-before-yesterday date intent into local journal capture', async () => {
    const onCapture = vi.fn().mockResolvedValue({ status: 'created', captureKind: 'journal', entry: entry('Journal') })
    const expectedDate = new Date()
    expectedDate.setDate(expectedDate.getDate() - 2)

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
    fireEvent.click(screen.getByTestId('dashboard-capture-date-2'))
    fireEvent.change(screen.getByTestId('dashboard-capture-input'), { target: { value: 'what I felt then' } })
    fireEvent.click(screen.getByTestId('dashboard-capture-submit'))

    await waitFor(() => expect(onCapture).toHaveBeenCalled())
    expect(onCapture.mock.calls[0][0]).toBe('what I felt then')
    expect(onCapture.mock.calls[0][1]).toBe('journal')
    expect(todayIso(onCapture.mock.calls[0][2])).toBe(todayIso(expectedDate))
    expect(onCapture.mock.calls[0][3]).toBe('daily')
  })

  it('adds lightweight Markdown from the quick capture toolbar', async () => {
    render(
      <VaultDashboard
        conflictCount={0}
        entries={[]}
        isGitVault={false}
        modifiedCount={0}
        onCapture={vi.fn()}
        onOpenCreateVault={vi.fn()}
        onOpenNote={vi.fn()}
        syncStatus="idle"
        vaultPath="/vault"
      />,
    )

    const input = screen.getByTestId('dashboard-capture-input') as HTMLTextAreaElement
    fireEvent.change(input, { target: { value: 'capture this' } })
    input.setSelectionRange(0, 7)

    fireEvent.click(screen.getByTestId('dashboard-markdown-bold'))

    await waitFor(() => expect(input).toHaveValue('**capture** this'))
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

    fireEvent.click(screen.getAllByRole('button', { name: 'Catch a dream' })[0])
    expect(screen.getByTestId('dashboard-capture-input')).toHaveValue('/dream ')

    fireEvent.click(screen.getByText('A recent note'))
    expect(onOpenNote).toHaveBeenCalledWith(expect.objectContaining({ title: 'A recent note' }))
  })

  it('shows Dream Review as a local-only private pattern surface', async () => {
    const dream = {
      ...entry('River Door', 'Dream'),
      properties: { symbols: ['river', 'door'], emotional_weather: 'awe' },
      relationships: { people: ['[[Guide]]'] },
    }

    render(
      <VaultDashboard
        conflictCount={0}
        entries={[dream, entry('Daily Checkin', 'Journal')]}
        isGitVault={false}
        modifiedCount={0}
        onCapture={vi.fn()}
        onOpenCreateVault={vi.fn()}
        onOpenNote={vi.fn()}
        syncStatus="idle"
        vaultPath="/vault"
      />,
    )

    const panel = await screen.findByTestId('dream-forge-panel')
    for (const [name, value] of [['data-locality', 'local-only'], ['data-private-surface', 'dream-forge']]) expect(panel).toHaveAttribute(name, value)
    const contract = within(panel).getByTestId('dream-forge-privacy-contract')
    expect(contract).toHaveAccessibleName('Dream Review private lens contract')
    for (const text of ['Records', '2', '1 dream / 1 journal', 'Held local', 'Signals']) expect(contract).toHaveTextContent(text)
    expect(contract).not.toHaveTextContent(/River Door|\/vault\//)
    for (const text of ['Dream Review', 'Local only', '2 protected', 'Egress blocked', '4 signal labels held']) expect(panel).toHaveTextContent(text)
    expect(within(panel).getByTestId('dream-forge-private-map')).toBeInTheDocument()
    expect(within(panel).getByTestId('dream-forge-privacy-gate')).toHaveTextContent('Bodies held')
    const rhythm = within(panel).getByTestId('dream-forge-rhythm')
    expect(rhythm).toHaveTextContent('Last night')
    expect(rhythm).toHaveTextContent('1 dream / 1 journal / 2 held')
    for (const text of ['Latest dream captured', 'river', 'awe', 'Guide']) expect(panel).toHaveTextContent(text)
    expect(panel).not.toHaveTextContent('Latest dream: River Door')
    expect(rhythm).not.toHaveTextContent('River Door')

    fireEvent.click(screen.getByTestId('dream-forge-capture'))
    expect(screen.getByTestId('dashboard-capture-input')).toHaveValue('/dream ')
  })

  it('shows Return as a quiet local next action', () => {
    render(
      <VaultDashboard
        conflictCount={0}
        entries={[entry('Loose task', 'Task')]}
        isGitVault={false}
        modifiedCount={0}
        onCapture={vi.fn()}
        onOpenCreateVault={vi.fn()}
        onOpenNote={vi.fn()}
        syncStatus="idle"
        vaultPath="/vault"
      />,
    )

    const panel = screen.getByText('Return').closest('.vault-dashboard__panel') as HTMLElement
    expect(panel).toHaveTextContent('Return')
    expect(panel).toHaveTextContent('Journal')
    expect(panel).toHaveTextContent('No journal today')

    fireEvent.click(within(panel).getByRole('button', { name: 'Journal' }))
    expect(screen.getByTestId('dashboard-capture-input')).toHaveValue('/journal ')
  })

  it('opens memory review items from Return instead of adding more capture', () => {
    const onOpenNote = vi.fn()
    const memory = entry('Agent memory', 'Memory', { status: 'Review' })

    render(
      <VaultDashboard
        conflictCount={0}
        entries={[memory, entry('Journal today', 'Journal')]}
        isGitVault={false}
        modifiedCount={0}
        onCapture={vi.fn()}
        onOpenCreateVault={vi.fn()}
        onOpenNote={onOpenNote}
        syncStatus="idle"
        vaultPath="/vault"
      />,
    )

    const panel = screen.getByText('Return').closest('.vault-dashboard__panel') as HTMLElement
    expect(panel).toHaveTextContent('Review memory')
    fireEvent.click(within(panel).getByRole('button', { name: 'Review' }))
    expect(onOpenNote).toHaveBeenCalledWith(expect.objectContaining({ title: 'Agent memory' }))
  })

  it('captures a local defer-sync reason from Return', () => {
    const today = todayIso()

    render(
      <VaultDashboard
        conflictCount={0}
        entries={[entry(`Journal ${today}`, 'Journal')]}
        isGitVault={true}
        modifiedCount={6}
        onCapture={vi.fn()}
        onOpenCreateVault={vi.fn()}
        onOpenNote={vi.fn()}
        syncStatus="idle"
        vaultPath="/vault"
      />,
    )

    const panel = screen.getByText('Return').closest('.vault-dashboard__panel') as HTMLElement
    expect(panel).toHaveTextContent('Defer sync')
    fireEvent.click(within(panel).getByRole('button', { name: 'Capture reason' }))
    expect(screen.getByTestId('dashboard-capture-input')).toHaveValue('/memory ')
  })

  it('previews dashboard ask context without protected note labels', async () => {
    render(
      <VaultDashboard
        conflictCount={0}
        entries={[
          entry('Public Project', 'Project'),
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

    expect(screen.queryByTestId('dashboard-ask-context-preview')).not.toBeInTheDocument()
    fireEvent.click(screen.getByTestId('dashboard-capture-kind-ask'))

    const preview = await screen.findByTestId('dashboard-ask-context-preview', undefined, { timeout: 5000 })
    expect(preview).toHaveTextContent('Shared context')
    expect(preview).toHaveTextContent('1 public note')
    expect(preview).toHaveTextContent('Public Project')
    expect(preview).toHaveTextContent('2 protected notes withheld')
    expect(preview).not.toHaveTextContent('Secret River Dream')
    expect(preview).not.toHaveTextContent('Private Plan')
    expect(preview).not.toHaveTextContent('/vault/dreams')
  })
})
