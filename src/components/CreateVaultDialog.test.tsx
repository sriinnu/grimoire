import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { CreateVaultDialog } from './CreateVaultDialog'

describe('CreateVaultDialog', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('creates a local vault from the modal without using prompt', async () => {
    const promptSpy = vi.spyOn(window, 'prompt').mockReturnValue(null)
    const onCreate = vi.fn().mockResolvedValue(true)
    const onClose = vi.fn()

    render(<CreateVaultDialog open={true} onClose={onClose} onCreate={onCreate} />)

    const contract = screen.getByTestId('create-vault-local-contract')
    expect(contract).toHaveTextContent('Plain Markdown')
    expect(contract).toHaveTextContent('Private by default')
    expect(contract).toHaveTextContent('Git optional')
    expect(screen.getByText('Vault home')).toBeInTheDocument()
    expect(screen.getByText('Markdown folder')).toBeInTheDocument()

    fireEvent.change(screen.getByTestId('create-vault-name'), { target: { value: 'Dreams' } })
    fireEvent.click(screen.getByTestId('create-vault-submit'))

    await waitFor(() => {
      expect(onCreate).toHaveBeenCalledWith({
        targetPath: '~/Grimoire/Vaults/Dreams',
        storageProvider: 'local-folder',
        syncProvider: 'none',
        initializeGit: false,
        templateKind: 'blank',
      })
    })
    expect(promptSpy).not.toHaveBeenCalled()
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('creates an iCloud-backed local vault path and can initialize Git', async () => {
    const onCreate = vi.fn().mockResolvedValue(true)

    render(<CreateVaultDialog open={true} onClose={vi.fn()} onCreate={onCreate} />)

    fireEvent.change(screen.getByTestId('create-vault-name'), { target: { value: 'Journals' } })
    fireEvent.click(screen.getByTestId('create-vault-storage-icloud'))
    fireEvent.click(screen.getByTestId('create-vault-git'))
    fireEvent.click(screen.getByTestId('create-vault-submit'))

    await waitFor(() => {
      expect(onCreate).toHaveBeenCalledWith({
        targetPath: '~/Library/Mobile Documents/com~apple~CloudDocs/Grimoire/Journals',
        storageProvider: 'icloud-drive',
        syncProvider: 'git',
        initializeGit: true,
        templateKind: 'blank',
      })
    })
  })

  it('preserves a manually edited folder path', async () => {
    const onCreate = vi.fn().mockResolvedValue(true)

    render(<CreateVaultDialog open={true} onClose={vi.fn()} onCreate={onCreate} />)

    fireEvent.change(screen.getByTestId('create-vault-path'), {
      target: { value: '~/Somewhere/Private Vault' },
    })
    fireEvent.change(screen.getByTestId('create-vault-name'), { target: { value: 'Renamed' } })
    fireEvent.click(screen.getByTestId('create-vault-submit'))

    await waitFor(() => {
      expect(onCreate).toHaveBeenCalledWith(expect.objectContaining({
        targetPath: '~/Somewhere/Private Vault',
      }))
    })
  })

  it('applies vault templates to the name, path, and create request', async () => {
    const onCreate = vi.fn().mockResolvedValue(true)

    render(<CreateVaultDialog open={true} onClose={vi.fn()} onCreate={onCreate} />)

    fireEvent.click(screen.getByTestId('create-vault-template-dreams'))
    expect(screen.getByTestId('create-vault-name')).toHaveValue('Dreams')
    expect(screen.getByTestId('create-vault-path')).toHaveValue('~/Grimoire/Vaults/Dreams')
    fireEvent.click(screen.getByTestId('create-vault-submit'))

    await waitFor(() => {
      expect(onCreate).toHaveBeenCalledWith(expect.objectContaining({
        targetPath: '~/Grimoire/Vaults/Dreams',
        templateKind: 'dreams',
      }))
    })
  })
})
