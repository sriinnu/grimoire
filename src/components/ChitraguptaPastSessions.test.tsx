import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { VaultEntry } from '../types'
import { ChitraguptaPastSessions } from './ChitraguptaPastSessions'

const { mockInvoke } = vi.hoisted(() => ({ mockInvoke: vi.fn() }))

vi.mock('../mock-tauri', () => ({
  isTauri: () => false,
  mockInvoke,
}))

function entry(overrides: Partial<VaultEntry> = {}): VaultEntry {
  return {
    path: '/vault/notes/alpha.md', filename: 'alpha.md', title: 'Alpha', isA: null,
    aliases: [], belongsTo: [], relatedTo: [], status: null, archived: false,
    modifiedAt: 1700000000, createdAt: 1700000000, fileSize: 0, snippet: '', wordCount: 0,
    relationships: {}, icon: null, color: null, order: null, sidebarLabel: null, template: null,
    sort: null, view: null, visible: null, organized: false, favorite: false, favoriteIndex: null,
    listPropertiesDisplay: [], outgoingLinks: [], properties: {}, hasH1: true, fileKind: 'markdown',
    ...overrides,
  } as VaultEntry
}

const HEALTHY_STATUS = {
  healthy: true,
  version: '0.1.10',
  token_present: true,
  token_source: 'keychain',
  base_url: 'http://127.0.0.1:3141',
}

function session(id: string, title: string, gist: string | null = null) {
  return { id, title, updated_at: 1752570000, created_at: null, message_count: null, gist }
}

describe('ChitraguptaPastSessions', () => {
  beforeEach(() => {
    mockInvoke.mockReset()
  })

  it('renders nothing when the daemon is unreachable', async () => {
    mockInvoke.mockImplementation(async (cmd: string) => {
      if (cmd === 'get_chitragupta_socket_status') {
        return { ...HEALTHY_STATUS, healthy: false, token_present: false, token_source: 'missing' }
      }
      throw new Error(`unexpected command ${cmd}`)
    })

    render(<ChitraguptaPastSessions activeEntry={entry()} vaultPath="/vault" />)

    await waitFor(() =>
      expect(mockInvoke.mock.calls.some(([cmd]) => cmd === 'get_chitragupta_socket_status')).toBe(true))
    expect(screen.queryByTestId('chitragupta-past-sessions')).not.toBeInTheDocument()
  })

  it('renders a quiet capped list of sessions with gists and an overflow count', async () => {
    const sessions = [
      session('s1', 'Alpha rollout', 'Talked through the rollout.'),
      session('s2', 'Second'),
      session('s3', 'Third'),
      session('s4', 'Fourth'),
      session('s5', 'Fifth'),
      session('s6', 'Sixth'),
      session('s7', 'Seventh'),
    ]
    mockInvoke.mockImplementation(async (cmd: string) => {
      if (cmd === 'get_chitragupta_socket_status') return HEALTHY_STATUS
      if (cmd === 'list_chitragupta_note_sessions') return sessions
      throw new Error(`unexpected command ${cmd}`)
    })

    render(<ChitraguptaPastSessions activeEntry={entry()} vaultPath="/vault" />)

    const list = await screen.findByTestId('chitragupta-past-sessions')
    expect(list).toHaveTextContent('Past sessions')
    expect(list).toHaveTextContent('Alpha rollout')
    expect(list).toHaveTextContent('Talked through the rollout.')
    expect(list).toHaveTextContent('Fifth')
    expect(list).not.toHaveTextContent('Sixth')
    expect(screen.getByTestId('chitragupta-past-sessions-more')).toHaveTextContent('+2 more')
  })

  it('opens a read-only transcript dialog when a session row is clicked', async () => {
    mockInvoke.mockImplementation(async (cmd: string, args?: Record<string, unknown>) => {
      if (cmd === 'get_chitragupta_socket_status') return HEALTHY_STATUS
      if (cmd === 'list_chitragupta_note_sessions') return [session('s1', 'Alpha rollout')]
      if (cmd === 'get_chitragupta_session') {
        expect(args).toEqual({ id: 's1' })
        return {
          messages: [
            { role: 'user', content: 'What did we decide?' },
            { role: 'assistant', content: 'Ship it Friday.' },
          ],
        }
      }
      throw new Error(`unexpected command ${cmd}`)
    })

    render(<ChitraguptaPastSessions activeEntry={entry()} vaultPath="/vault" />)

    fireEvent.click(await screen.findByTestId('chitragupta-past-session-s1'))

    const dialog = await screen.findByTestId('chitragupta-session-transcript-dialog')
    expect(dialog).toHaveTextContent('Alpha rollout')
    expect(dialog).toHaveTextContent('What did we decide?')
    expect(dialog).toHaveTextContent('Ship it Friday.')
  })
})
