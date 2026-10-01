import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
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

const HEALTHY_STATUS = { contractVersion: 1, state: 'ready', projectPath: '/vault' }

function session(id: string, title: string, gist: string | null = null) {
  return { id, title, updated_at: 1752570000, created_at: null, message_count: null, gist }
}

describe('ChitraguptaPastSessions', () => {
  beforeEach(() => {
    mockInvoke.mockReset()
  })

  it('keeps refresh available without requesting unauthorized session history', async () => {
    mockInvoke.mockImplementation(async (cmd: string) => {
      if (cmd === 'get_chitragupta_socket_status') {
        return { ...HEALTHY_STATUS, state: 'approval_required' }
      }
      throw new Error(`unexpected command ${cmd}`)
    })

    render(<ChitraguptaPastSessions activeEntry={entry()} vaultPath="/vault" />)

    await waitFor(() =>
      expect(mockInvoke.mock.calls.some(([cmd]) => cmd === 'get_chitragupta_socket_status')).toBe(true))
    expect(await screen.findByText('Connect this vault in Local AI settings to view history.')).toBeVisible()
    expect(screen.getByRole('button', { name: 'Refresh history' })).toBeEnabled()
    expect(mockInvoke.mock.calls.some(([command]) => command === 'list_chitragupta_note_sessions')).toBe(false)
  })

  it('puts pending and newest sessions first and lets every older session be opened', async () => {
    const sessions = [
      session('s1', 'Alpha rollout', 'Talked through the rollout.'),
      session('s2', 'Second'),
      session('s3', 'Third'),
      session('s4', 'Fourth'),
      session('s5', 'Fifth'),
      { ...session('s6', 'Pending sixth'), pending_request_id: 'request-six' },
      { ...session('s7', 'Newest seventh'), updated_at: 1752570300 },
    ]
    mockInvoke.mockImplementation(async (cmd: string) => {
      if (cmd === 'get_chitragupta_socket_status') return HEALTHY_STATUS
      if (cmd === 'list_chitragupta_note_sessions') return sessions
      if (cmd === 'get_chitragupta_session') return { messages: [{ role: 'assistant', content: 'Older history is reachable' }] }
      throw new Error(`unexpected command ${cmd}`)
    })

    render(<ChitraguptaPastSessions activeEntry={entry()} vaultPath="/vault" />)

    await screen.findByTestId('chitragupta-past-session-s6')
    const rows = screen.getByTestId('chitragupta-past-sessions').querySelectorAll('li button')
    expect(rows[0]).toHaveTextContent('Pending sixth')
    expect(rows[1]).toHaveTextContent('Newest seventh')
    expect(screen.queryByTestId('chitragupta-past-session-s5')).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Show all 7 sessions' }))
    fireEvent.click(screen.getByTestId('chitragupta-past-session-s5'))
    expect(await screen.findByTestId('chitragupta-session-transcript-dialog')).toHaveTextContent('Older history is reachable')
  })

  it('opens a read-only transcript dialog when a session row is clicked', async () => {
    mockInvoke.mockImplementation(async (cmd: string, args?: Record<string, unknown>) => {
      if (cmd === 'get_chitragupta_socket_status') return HEALTHY_STATUS
      if (cmd === 'list_chitragupta_note_sessions') return [session('s1', 'Alpha rollout')]
      if (cmd === 'get_chitragupta_session') {
        expect(args).toEqual({ id: 's1', vaultPath: '/vault' })
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
  it.each(['/vault', '/other'])('discards an in-flight transcript when switching notes into %s', async (nextVault) => {
    let release: ((payload: unknown) => void) | undefined
    mockInvoke.mockImplementation(async (command: string, args?: Record<string, unknown>) => {
      if (command === 'get_chitragupta_socket_status') return { ...HEALTHY_STATUS, projectPath: args?.vaultPath }
      if (command === 'list_chitragupta_note_sessions') return [session('s1', 'Scoped session')]
      if (command === 'get_chitragupta_session') return new Promise((resolve) => { release = resolve })
      throw new Error(`unexpected command ${command}`)
    })
    const { rerender } = render(<ChitraguptaPastSessions activeEntry={entry()} vaultPath="/vault" />)
    fireEvent.click(await screen.findByTestId('chitragupta-past-session-s1'))
    rerender(<ChitraguptaPastSessions activeEntry={entry({ path: `${nextVault}/notes/beta.md` })} vaultPath={nextVault} />)
    await screen.findByTestId('chitragupta-past-session-s1')
    await act(async () => { release?.({ messages: [{ role: 'assistant', content: 'Private old vault answer' }] }) })
    expect(screen.queryByTestId('chitragupta-session-transcript-dialog')).not.toBeInTheDocument()
    expect(screen.getByTestId('chitragupta-past-session-s1')).toBeEnabled()
  })

  it('only unlocks an indeterminate request after explicit acknowledgement of its exact marker', async () => {
    mockInvoke.mockImplementation(async (command: string, args?: Record<string, unknown>) => {
      if (command === 'get_chitragupta_socket_status') return HEALTHY_STATUS
      if (command === 'list_chitragupta_note_sessions') return [session('s1', 'Review request')]
      if (command === 'get_chitragupta_session') return {
        messages: [{ role: 'user', content: 'Original question' }], connector: { pendingRequestId: 'request-7' },
      }
      if (command === 'acknowledge_chitragupta_request') {
        expect(args).toEqual({ vaultPath: '/vault', sessionId: 's1', requestId: 'request-7' })
        return { sessionId: 's1', acknowledgedRequestId: 'request-7' }
      }
      throw new Error(`unexpected command ${command}`)
    })
    render(<ChitraguptaPastSessions activeEntry={entry()} vaultPath="/vault" />)
    fireEvent.click(await screen.findByTestId('chitragupta-past-session-s1'))
    const allow = await screen.findByRole('button', { name: 'Allow a new message' })
    expect(screen.getByTestId('chitragupta-session-transcript-dialog')).toHaveTextContent('Original question')
    expect(mockInvoke.mock.calls.filter(([command]) => command === 'acknowledge_chitragupta_request')).toHaveLength(0)
    fireEvent.click(allow)
    await waitFor(() => expect(screen.queryByRole('button', { name: 'Allow a new message' })).not.toBeInTheDocument())
    expect(screen.getByTestId('chitragupta-session-transcript-dialog')).toHaveTextContent('Original question')
  })

  it('refreshes empty history to make the first indeterminate chat recoverable', async () => {
    let history: ReturnType<typeof session>[] = []
    mockInvoke.mockImplementation(async (command: string) => {
      if (command === 'get_chitragupta_socket_status') return HEALTHY_STATUS
      if (command === 'list_chitragupta_note_sessions') return history
      if (command === 'get_chitragupta_session') return { messages: [], connector: { pendingRequestId: 'first-request' } }
      throw new Error(`unexpected command ${command}`)
    })
    render(<ChitraguptaPastSessions activeEntry={entry()} vaultPath="/vault" />)
    await screen.findByText('No sessions yet.')
    history = [session('first', 'First question')]
    fireEvent.click(screen.getByRole('button', { name: 'Refresh history' }))
    fireEvent.click(await screen.findByTestId('chitragupta-past-session-first'))
    expect(await screen.findByRole('button', { name: 'Allow a new message' })).toBeEnabled()
  })

})
