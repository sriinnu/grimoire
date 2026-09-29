import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createTranslator } from '../../lib/i18n'
import * as invitationImport from '../../lib/chitraguptaInvitation'
import invitationFixture from '../../lib/__fixtures__/invitation-qr.json'
import { ChitraguptaSocketCard } from './ChitraguptaSocketCard'
const { mockInvoke } = vi.hoisted(() => ({ mockInvoke: vi.fn() }))
vi.mock('../../mock-tauri', () => ({ isTauri: () => false, mockInvoke }))

describe('ChitraguptaSocketCard', () => {
  beforeEach(() => { vi.restoreAllMocks(); mockInvoke.mockReset() })
  it('requires a six-digit Hub code, clears it, and shows the workspace approval step', async () => {
    mockInvoke.mockImplementation(async (command: string) => ({ contractVersion: 1, projectPath: '/vault', state: command === 'provision_chitragupta_socket_token' ? 'approval_required' : 'pairing_required' }))
    render(<ChitraguptaSocketCard t={createTranslator('en')} vaultPath="/vault" />)
    const code = await screen.findByLabelText('Six-digit pairing code')
    const connect = screen.getByTestId('settings-chitragupta-socket-connect')
    expect(connect).toBeDisabled()
    fireEvent.change(code, { target: { value: '12345' } })
    expect(connect).toBeDisabled()
    fireEvent.change(code, { target: { value: '123456' } })
    fireEvent.click(connect)
    await waitFor(() => expect(screen.getByTestId('settings-chitragupta-socket-waiting')).toHaveTextContent('Approve workspace access'))
    expect(screen.queryByLabelText('Six-digit pairing code')).not.toBeInTheDocument()
    expect(screen.getByTestId('settings-chitragupta-socket-status')).toHaveTextContent('Workspace approval required')
  })
  it.each([
    ['expired', 'pairing', 'Pair again', { reconnect: true, pairingCode: '654321' }],
    ['revoked', 'workspace', 'Request access again', { requestApproval: true }],
  ])('requires an explicit renewal action for %s %s access', async (state, reason, label, options) => {
    mockInvoke.mockResolvedValue({ contractVersion: 1, projectPath: '/vault', state, reason })
    render(<ChitraguptaSocketCard t={createTranslator('en')} vaultPath="/vault" />)
    const action = await screen.findByRole('button', { name: label as string })
    expect(mockInvoke).toHaveBeenCalledTimes(1)
    if (reason === 'pairing') {
      expect(action).toBeDisabled()
      fireEvent.change(screen.getByLabelText('Six-digit pairing code'), { target: { value: '654321' } })
    }
    fireEvent.click(action)
    await waitFor(() => expect(mockInvoke).toHaveBeenLastCalledWith('provision_chitragupta_socket_token', { vaultPath: '/vault', ...options as object }))
  })

  it('offers a fresh-code retry after pairing rejection and explicitly re-pairs', async () => {
    let attempts = 0
    mockInvoke.mockImplementation(async (command: string) => {
      if (command === 'get_chitragupta_socket_status') return { contractVersion: 1, projectPath: '/vault', state: 'pairing_required' }
      if (++attempts === 1) throw new Error('REPAIR_REQUIRED: Pair again with a fresh code from Chitragupta Hub.')
      return { contractVersion: 1, projectPath: '/vault', state: 'approval_required' }
    })
    render(<ChitraguptaSocketCard t={createTranslator('en')} vaultPath="/vault" />)
    fireEvent.change(await screen.findByLabelText('Six-digit pairing code'), { target: { value: '123456' } })
    fireEvent.click(screen.getByTestId('settings-chitragupta-socket-connect'))
    const retry = await screen.findByRole('button', { name: 'Pair again' })
    expect(screen.getByTestId('settings-chitragupta-socket-status')).toHaveTextContent('Connection needs attention')
    expect(screen.getByLabelText('Six-digit pairing code')).toHaveValue('')
    expect(retry).toBeDisabled()
    fireEvent.change(screen.getByLabelText('Six-digit pairing code'), { target: { value: '654321' } })
    fireEvent.click(retry)
    await waitFor(() => expect(mockInvoke).toHaveBeenLastCalledWith('provision_chitragupta_socket_token', { vaultPath: '/vault', pairingCode: '654321', reconnect: true }))
    await screen.findByTestId('settings-chitragupta-socket-waiting')
  })

  it('requires a selected vault before connecting', () => {
    render(<ChitraguptaSocketCard t={createTranslator('en')} />)
    expect(screen.getByTestId('settings-chitragupta-socket-connect')).toBeDisabled()
    expect(screen.getByTestId('settings-chitragupta-socket-status')).toHaveTextContent('Select a vault')
    expect(mockInvoke).not.toHaveBeenCalled()
  })
  it('shows a visible code and accepts the same bounded invitation without persisting it', async () => {
    mockInvoke.mockImplementation(async (command: string) => ({ contractVersion: 1, projectPath: '/vault', state: command === 'provision_chitragupta_socket_token' ? 'approval_required' : 'pairing_required' }))
    render(<ChitraguptaSocketCard t={createTranslator('en')} vaultPath="/vault" />)
    expect(await screen.findByLabelText('Six-digit pairing code')).toHaveAttribute('type', 'text')
    fireEvent.click(screen.getByRole('button', { name: 'Use invitation or QR' }))
    fireEvent.change(screen.getByLabelText('Pairing invitation link'), { target: { value: invitationFixture.payload.replace('app=grimoire', 'app=other') } })
    fireEvent.click(screen.getByTestId('settings-chitragupta-socket-connect'))
    await screen.findByRole('alert')
    expect(mockInvoke).toHaveBeenCalledTimes(1)
    fireEvent.change(screen.getByLabelText('Pairing invitation link'), { target: { value: invitationFixture.payload } })
    fireEvent.click(screen.getByTestId('settings-chitragupta-socket-connect'))
    await waitFor(() => expect(mockInvoke).toHaveBeenLastCalledWith('provision_chitragupta_socket_token', { vaultPath: '/vault', pairingInvitation: invitationFixture.payload }))
    await screen.findByTestId('settings-chitragupta-socket-waiting')
    expect(screen.queryByLabelText('Pairing invitation link')).not.toBeInTheDocument()
  })

  it('recovers an indeterminate renewal without requesting a new code', async () => {
    mockInvoke.mockResolvedValue({ contractVersion: 1, projectPath: '/vault', state: 'renewal_indeterminate', reason: 'pairing' })
    render(<ChitraguptaSocketCard t={createTranslator('en')} vaultPath="/vault" />)
    fireEvent.click(await screen.findByRole('button', { name: 'Recover connection' }))
    expect(screen.queryByLabelText('Six-digit pairing code')).not.toBeInTheDocument()
    await waitFor(() => expect(mockInvoke).toHaveBeenLastCalledWith('provision_chitragupta_socket_token', { vaultPath: '/vault' }))
  })

  it('does not offer a new code to resurrect a revoked device', async () => {
    mockInvoke.mockResolvedValue({ contractVersion: 1, projectPath: '/vault', state: 'revoked', reason: 'pairing' })
    render(<ChitraguptaSocketCard t={createTranslator('en')} vaultPath="/vault" />)
    await screen.findByText('Device pairing revoked')
    expect(screen.queryByTestId('settings-chitragupta-socket-connect')).not.toBeInTheDocument()
    expect(screen.queryByLabelText('Six-digit pairing code')).not.toBeInTheDocument()
    expect(mockInvoke).toHaveBeenCalledTimes(1)
  })

  it('imports an image only on selection and waits for an explicit Connect', async () => {
    const decode = vi.spyOn(invitationImport, 'readInvitationImage').mockResolvedValue(invitationFixture.payload)
    mockInvoke.mockImplementation(async (command: string) => ({ contractVersion: 1, projectPath: '/vault', state: command === 'provision_chitragupta_socket_token' ? 'approval_required' : 'pairing_required' }))
    render(<ChitraguptaSocketCard t={createTranslator('en')} vaultPath="/vault" />)
    await screen.findByLabelText('Six-digit pairing code')
    expect(decode).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: 'Use invitation or QR' }))
    const file = new File(['synthetic image'], 'invitation.png', { type: 'image/png' })
    fireEvent.change(screen.getByLabelText('QR invitation image'), { target: { files: [file] } })
    await waitFor(() => expect(screen.getByLabelText('Pairing invitation link')).toHaveValue(invitationFixture.payload))
    expect(decode).toHaveBeenCalledWith(file)
    expect(mockInvoke).toHaveBeenCalledTimes(1)
    fireEvent.click(screen.getByTestId('settings-chitragupta-socket-connect'))
    await screen.findByTestId('settings-chitragupta-socket-waiting')
    expect(mockInvoke).toHaveBeenLastCalledWith('provision_chitragupta_socket_token', { vaultPath: '/vault', pairingInvitation: invitationFixture.payload })
  })

  it('offers an explicit fresh invitation after renewal recovery fails without sending chat', async () => {
    let attempts = 0
    mockInvoke.mockImplementation(async (command: string) => {
      if (command === 'get_chitragupta_socket_status') return { contractVersion: 1, projectPath: '/vault', state: 'renewal_indeterminate', reason: 'pairing' }
      if (++attempts === 1) throw new Error('RENEWAL_INDETERMINATE: The previous acknowledgement can no longer be recovered.')
      return { contractVersion: 1, projectPath: '/vault', state: 'approval_required' }
    })
    render(<ChitraguptaSocketCard t={createTranslator('en')} vaultPath="/vault" />)
    fireEvent.click(await screen.findByRole('button', { name: 'Recover connection' }))
    const fallback = await screen.findByRole('button', { name: 'Use a fresh code or invitation' })
    expect(mockInvoke).toHaveBeenCalledTimes(2)
    expect(mockInvoke).toHaveBeenLastCalledWith('provision_chitragupta_socket_token', { vaultPath: '/vault' })
    expect(screen.queryByLabelText('Six-digit pairing code')).not.toBeInTheDocument()
    fireEvent.click(fallback)
    expect(mockInvoke).toHaveBeenCalledTimes(2)
    fireEvent.click(screen.getByRole('button', { name: 'Use invitation or QR' }))
    fireEvent.change(screen.getByLabelText('Pairing invitation link'), { target: { value: invitationFixture.payload } })
    fireEvent.click(screen.getByRole('button', { name: 'Pair again' }))
    await screen.findByTestId('settings-chitragupta-socket-waiting')
    expect(mockInvoke.mock.calls.map(([command]) => command)).toEqual(['get_chitragupta_socket_status', 'provision_chitragupta_socket_token', 'provision_chitragupta_socket_token'])
    expect(mockInvoke).toHaveBeenLastCalledWith('provision_chitragupta_socket_token', { vaultPath: '/vault', reconnect: true, pairingInvitation: invitationFixture.payload })
  })

})
