import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { PulseCommit, VaultEntry } from '../../types'
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

function commit(overrides: Partial<PulseCommit> = {}): PulseCommit {
  return {
    hash: 'private-commit-hash',
    shortHash: 'prv1234',
    message: 'Journal sync with private details',
    date: Math.floor(Date.now() / 1000),
    githubUrl: null,
    files: [{ path: 'journal/private-checkin.md', status: 'modified', title: 'private checkin' }],
    added: 0,
    modified: 1,
    deleted: 0,
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

    expect(screen.getByText('Sriinnu, here is the board.')).toBeInTheDocument()
    expect(screen.getByText('Personal Sync')).toBeInTheDocument()
    expect(screen.getByText('Cloud Blocked')).toBeInTheDocument()
    const fallback = screen.getByTestId('dashboard-insights-fallback')
    expect(fallback).toHaveAttribute('data-locality', 'local-only')
    expect(fallback).toHaveTextContent('Egress blocked')

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

    fireEvent.click(screen.getAllByRole('button', { name: 'Catch a dream' })[0])
    expect(screen.getByTestId('dashboard-capture-input')).toHaveValue('/dream ')

    fireEvent.click(screen.getByText('A recent note'))
    expect(onOpenNote).toHaveBeenCalledWith(expect.objectContaining({ title: 'A recent note' }))
  })

  it('shows Dream Forge as a local-only private pattern surface', async () => {
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
    expect(contract).toHaveAccessibleName('Dream Forge private lens contract')
    for (const text of ['Records', '2', '1 dream / 1 journal', 'Held local', 'Signals']) expect(contract).toHaveTextContent(text)
    expect(contract).not.toHaveTextContent(/River Door|\/vault\//)
    for (const text of ['Dream Forge', 'Local only', '2 protected', 'Egress blocked', '4 signal labels held']) expect(panel).toHaveTextContent(text)
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

  it('shows Time Loom as metadata-only timeline without protected labels', async () => {
    const now = Math.floor(Date.now() / 1000)
    const yesterday = now - 24 * 60 * 60
    const protectedDream = {
      ...entry('Secret River Dream', 'Dream'),
      path: '/vault/dreams/secret-river.md',
      modifiedAt: now,
      createdAt: now,
    }
    const protectedJournal = {
      ...entry('Private Checkin', 'Journal'),
      path: '/vault/journal/private-checkin.md',
      modifiedAt: now,
      createdAt: now,
    }
    const task = { ...entry('Open Task', 'Task'), status: 'blocked but private language' }
    const meeting = {
      ...entry('Yesterday Sync', 'Meeting'),
      modifiedAt: yesterday,
      createdAt: yesterday,
    }
    const voice = {
      ...entry('Transcript - private voice memo', 'Transcript'),
      path: '/vault/Private/transcript-private-voice-memo.md',
      properties: {
        locality: 'local',
        source_audio: '/vault/Private/attachments/recordings/private-voice.webm',
        transcription_provider: 'local_whisper',
      },
      modifiedAt: now,
      createdAt: now,
    }

    render(
      <VaultDashboard
        conflictCount={0}
        entries={[protectedDream, protectedJournal, task, meeting, voice]}
        isGitVault={false}
        modifiedCount={0}
        onCapture={vi.fn()}
        onOpenCreateVault={vi.fn()}
        onOpenNote={vi.fn()}
        syncStatus="idle"
        vaultPath="/vault"
      />,
    )

    const panel = await screen.findByTestId('time-loom-panel')
    const dailyThread = await screen.findByTestId('daily-thread-rail')
    expect(dailyThread).toHaveTextContent('Review private captures')
    expect(dailyThread).toHaveTextContent('3 held local')
    expect(dailyThread).toHaveTextContent('Held local')
    expect(dailyThread).not.toHaveTextContent('Secret River Dream')
    expect(dailyThread).not.toHaveTextContent('private voice memo')
    expect(panel).toHaveTextContent('Time Loom')
    expect(panel).toHaveTextContent('Local timeline')
    expect(panel).toHaveTextContent('3 private')
    expect(panel).toHaveTextContent('1 voice')
    expect(panel).toHaveTextContent('Today')
    expect(panel).toHaveTextContent('Yesterday')
    expect(panel).toHaveTextContent('Dream 1')
    expect(panel).toHaveTextContent('Journal 1')
    expect(panel).toHaveTextContent('Voice 1')
    expect(panel).toHaveTextContent('Open 1')
    expect(panel).toHaveTextContent('Unmarked 3')
    expect(panel).not.toHaveTextContent('Secret River Dream')
    expect(panel).not.toHaveTextContent('private voice memo')
    expect(panel).not.toHaveTextContent('private-voice.webm')
    expect(panel).not.toHaveTextContent('/vault/dreams/secret-river.md')
    expect(panel).not.toHaveTextContent('blocked but private language')

    fireEvent.click(screen.getByTestId('time-loom-capture'))
    expect(screen.getByTestId('dashboard-capture-input')).toHaveValue('/journal ')
  })

  it('shows vault commits in Time Loom without leaking git history details', async () => {
    render(
      <VaultDashboard
        conflictCount={0}
        entries={[entry('Plain Note')]}
        isGitVault={true}
        modifiedCount={0}
        onCapture={vi.fn()}
        onOpenCreateVault={vi.fn()}
        onOpenNote={vi.fn()}
        pulseCommits={[commit()]}
        syncStatus="idle"
        vaultPath="/vault"
      />,
    )

    const panel = await screen.findByTestId('time-loom-panel')
    expect(panel).toHaveTextContent('1 commit')
    expect(panel).toHaveTextContent('1 private')
    expect(panel).toHaveTextContent('Commit 1')
    expect(panel).not.toHaveTextContent('Journal sync with private details')
    expect(panel).not.toHaveTextContent('private-commit-hash')
    expect(panel).not.toHaveTextContent('prv1234')
    expect(panel).not.toHaveTextContent('journal/private-checkin.md')
  })

  it('shows scheduled calendar entries in Time Loom without leaking event details', async () => {
    const today = todayIso()
    const yesterday = Math.floor(Date.now() / 1000) - 24 * 60 * 60

    render(
      <VaultDashboard
        conflictCount={0}
        entries={[
          entry('Private Appointment', 'Event', {
            path: '/vault/private/calendar/private-appointment.md',
            modifiedAt: yesterday,
            createdAt: yesterday,
            properties: {
              date: today,
              locality: 'local-only',
              location: 'Secret room',
            },
          }),
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

    const panel = await screen.findByTestId('time-loom-panel')
    expect(panel).toHaveTextContent('1 scheduled')
    expect(panel).toHaveTextContent('Calendar 1')
    expect(panel).not.toHaveTextContent('Private Appointment')
    expect(panel).not.toHaveTextContent('/vault/private/calendar/private-appointment.md')
    expect(panel).not.toHaveTextContent('Secret room')
  })

  it('shows Attention Mode as a quiet local next action', () => {
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

    const panel = screen.getByText('Attention Mode').closest('.vault-dashboard__panel') as HTMLElement
    expect(panel).toHaveTextContent('Attention Mode')
    expect(panel).toHaveTextContent('Journal')
    expect(panel).toHaveTextContent('No journal today')

    fireEvent.click(within(panel).getByRole('button', { name: 'Journal' }))
    expect(screen.getByTestId('dashboard-capture-input')).toHaveValue('/journal ')
  })

  it('opens memory review items from Attention Mode instead of adding more capture', () => {
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

    const panel = screen.getByText('Attention Mode').closest('.vault-dashboard__panel') as HTMLElement
    expect(panel).toHaveTextContent('Review memory')
    fireEvent.click(within(panel).getByRole('button', { name: 'Review' }))
    expect(onOpenNote).toHaveBeenCalledWith(expect.objectContaining({ title: 'Agent memory' }))
  })

  it('captures a local defer-sync reason from Attention Mode', () => {
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

    const panel = screen.getByText('Attention Mode').closest('.vault-dashboard__panel') as HTMLElement
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

    const preview = await screen.findByTestId('dashboard-ask-context-preview')
    expect(preview).toHaveTextContent('Agent Context')
    expect(preview).toHaveTextContent('1 public note')
    expect(preview).toHaveTextContent('Public Project')
    expect(preview).toHaveTextContent('2 protected notes withheld')
    expect(preview).not.toHaveTextContent('Secret River Dream')
    expect(preview).not.toHaveTextContent('Private Plan')
    expect(preview).not.toHaveTextContent('/vault/dreams')
  })
})
