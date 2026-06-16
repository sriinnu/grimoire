import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { PulseCommit, VaultEntry } from '../../types'
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

function commit(): PulseCommit {
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
  }
}

function todayIso(now = new Date()): string {
  return [now.getFullYear(), String(now.getMonth() + 1).padStart(2, '0'), String(now.getDate()).padStart(2, '0')].join('-')
}

describe('VaultDashboard trail privacy', () => {
  it('shows the trail as metadata-only without protected labels', async () => {
    const now = Math.floor(Date.now() / 1000)
    const yesterday = now - 24 * 60 * 60
    const voice = entry('Transcript - private voice memo', 'Transcript', {
      path: '/vault/Private/transcript-private-voice-memo.md',
      properties: {
        locality: 'local',
        source_audio: '/vault/Private/attachments/recordings/private-voice.webm',
        transcription_provider: 'local_whisper',
      },
      modifiedAt: now,
      createdAt: now,
    })

    render(
      <VaultDashboard
        conflictCount={0}
        entries={[
          entry('Secret River Dream', 'Dream', { path: '/vault/dreams/secret-river.md', modifiedAt: now, createdAt: now }),
          entry('Private Checkin', 'Journal', { path: '/vault/journal/private-checkin.md', modifiedAt: now, createdAt: now }),
          { ...entry('Open Task', 'Task'), status: 'blocked but private language' },
          entry('Yesterday Sync', 'Meeting', { modifiedAt: yesterday, createdAt: yesterday }),
          voice,
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
    const dailyThread = await screen.findByTestId('daily-thread-rail')
    expect(dailyThread).toHaveTextContent('Review private captures')
    expect(dailyThread).toHaveTextContent('3 held local')
    expect(dailyThread).not.toHaveTextContent('Secret River Dream')
    expect(panel).toHaveTextContent('3 private')
    expect(panel).toHaveTextContent('1 dream')
    expect(panel).toHaveTextContent('1 journal')
    expect(panel).toHaveTextContent('1 voice capture')
    expect(panel).not.toHaveTextContent('private-voice.webm')
    expect(panel).not.toHaveTextContent('/vault/dreams/secret-river.md')
    expect(panel).not.toHaveTextContent('blocked but private language')

    fireEvent.click(screen.getByTestId('time-loom-capture'))
    expect(screen.getByTestId('dashboard-capture-input')).toHaveValue('/journal ')
  })

  it('shows vault saved points in the trail without leaking git history details', async () => {
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
    expect(panel).toHaveTextContent('1 saved point')
    expect(panel).toHaveTextContent('1 note')
    expect(panel).not.toHaveTextContent('Journal sync with private details')
    expect(panel).not.toHaveTextContent('private-commit-hash')
    expect(panel).not.toHaveTextContent('journal/private-checkin.md')
  })

  it('shows planned calendar entries in the trail without leaking event details', async () => {
    render(
      <VaultDashboard
        conflictCount={0}
        entries={[
          entry('Private Appointment', 'Event', {
            path: '/vault/private/calendar/private-appointment.md',
            modifiedAt: Math.floor(Date.now() / 1000) - 24 * 60 * 60,
            properties: { date: todayIso(), locality: 'local-only', location: 'Secret room' },
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
    expect(panel).toHaveTextContent('1 planned')
    expect(panel).toHaveTextContent('1 planned mark')
    expect(panel).not.toHaveTextContent('Private Appointment')
    expect(panel).not.toHaveTextContent('/vault/private/calendar/private-appointment.md')
    expect(panel).not.toHaveTextContent('Secret room')
  })
})
