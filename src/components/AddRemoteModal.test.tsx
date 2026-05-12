import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { AddRemoteModal } from './AddRemoteModal'

vi.mock('../mock-tauri', () => ({
  isTauri: () => false,
  mockInvoke: vi.fn(),
}))

import { mockInvoke } from '../mock-tauri'

const mockInvokeFn = vi.mocked(mockInvoke)

describe('AddRemoteModal', () => {
  const onClose = vi.fn()
  const onRemoteConnected = vi.fn()
  const connectedResult = {
    status: 'connected',
    message: 'Remote connected. This vault now tracks origin/main.',
  }

  beforeEach(() => {
    vi.clearAllMocks()
    mockInvokeFn.mockImplementation((cmd: string) => {
      if (cmd === 'is_git_repo') return Promise.resolve(true)
      if (cmd === 'git_add_remote') return Promise.resolve(connectedResult)
      return Promise.resolve(null)
    })
  })

  it('renders the add-remote form when open', async () => {
    render(
      <AddRemoteModal
        open={true}
        vaultPath="/vault"
        onClose={onClose}
        onRemoteConnected={onRemoteConnected}
      />
    )

    expect(screen.getByText('Add Remote')).toBeInTheDocument()
    const input = screen.getByTestId('add-remote-url')
    await waitFor(() => expect(input).toHaveFocus())
  })

  it('submits the repository URL to git_add_remote', async () => {
    render(
      <AddRemoteModal
        open={true}
        vaultPath="/vault"
        onClose={onClose}
        onRemoteConnected={onRemoteConnected}
      />
    )

    fireEvent.change(screen.getByTestId('add-remote-url'), {
      target: { value: 'git@github.com:user/my-vault.git' },
    })
    fireEvent.click(screen.getByTestId('add-remote-submit'))

    await waitFor(() => {
      expect(mockInvokeFn).toHaveBeenCalledWith('git_add_remote', {
        request: {
          vaultPath: '/vault',
          remoteUrl: 'git@github.com:user/my-vault.git',
        },
      })
    })

    expect(onRemoteConnected).toHaveBeenCalledWith('Remote connected. This vault now tracks origin/main.')
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('shows backend validation errors without closing the modal', async () => {
    mockInvokeFn.mockImplementation((cmd: string) => {
      if (cmd === 'is_git_repo') return Promise.resolve(true)
      if (cmd === 'git_add_remote') {
        return Promise.resolve({
          status: 'incompatible_history',
          message: 'This repository has unrelated history.',
        })
      }
      return Promise.resolve(null)
    })

    render(
      <AddRemoteModal
        open={true}
        vaultPath="/vault"
        onClose={onClose}
        onRemoteConnected={onRemoteConnected}
      />
    )

    fireEvent.change(screen.getByTestId('add-remote-url'), {
      target: { value: 'https://example.com/repo.git' },
    })
    fireEvent.click(screen.getByTestId('add-remote-submit'))

    await waitFor(() => {
      expect(screen.getByTestId('add-remote-error')).toHaveTextContent('This repository has unrelated history.')
    })

    expect(onRemoteConnected).not.toHaveBeenCalled()
    expect(onClose).not.toHaveBeenCalled()
  })

  it('initializes git before adding a remote to a local-only vault', async () => {
    const onGitInitialized = vi.fn()
    mockInvokeFn.mockImplementation((cmd: string) => {
      if (cmd === 'is_git_repo') return Promise.resolve(false)
      if (cmd === 'init_git_repo') return Promise.resolve(null)
      if (cmd === 'git_add_remote') return Promise.resolve(connectedResult)
      return Promise.resolve(null)
    })

    render(
      <AddRemoteModal
        open={true}
        vaultPath="/vault"
        onClose={onClose}
        onGitInitialized={onGitInitialized}
        onRemoteConnected={onRemoteConnected}
      />,
    )

    fireEvent.change(screen.getByTestId('add-remote-url'), {
      target: { value: 'https://example.com/repo.git' },
    })
    fireEvent.click(screen.getByTestId('add-remote-submit'))

    await waitFor(() => {
      expect(mockInvokeFn).toHaveBeenCalledWith('init_git_repo', { vaultPath: '/vault' })
      expect(mockInvokeFn).toHaveBeenCalledWith('git_add_remote', {
        request: { vaultPath: '/vault', remoteUrl: 'https://example.com/repo.git' },
      })
    })
    expect(onGitInitialized).toHaveBeenCalledOnce()
  })
})
