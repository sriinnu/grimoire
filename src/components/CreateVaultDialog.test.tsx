import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { CreateVaultDialog } from './CreateVaultDialog'
import { buildVaultTargetPath } from '@/utils/vaultCreation'
import * as mockTauri from '../mock-tauri'
import * as vaultDialog from '@/utils/vault-dialog'

describe('CreateVaultDialog', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('prefills the folder name from a Windows-style picked path', async () => {
    const tauriSpy = vi.spyOn(mockTauri, 'isTauri').mockReturnValue(true)
    const pickFolder = vi.spyOn(vaultDialog, 'pickFolder').mockResolvedValue('C\\Users\\test\\My Workspace')

    render(<CreateVaultDialog open={true} onClose={vi.fn()} onCreate={vi.fn()} />)

    fireEvent.click(screen.getByRole('button', { name: 'Choose' }))

    await waitFor(() => {
      expect(screen.getByTestId('create-vault-name')).toHaveValue('My Workspace')
    })
    expect(screen.getByTestId('create-vault-path')).toHaveValue('C\\Users\\test\\My Workspace')
    tauriSpy.mockRestore()
    pickFolder.mockRestore()
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
    expect(screen.getByText('Notebook home')).toBeInTheDocument()
    expect(screen.getByText('Theme preview')).toBeInTheDocument()
    expect(screen.getByTestId('create-vault-experience-preview')).toHaveAttribute(
      'data-theme-preset-preview',
      'morning-notebook',
    )
    expect(screen.getByTestId('create-vault-experience-grid')).toBeVisible()
    expect(screen.getByText('Markdown folder')).toBeInTheDocument()
    expect(screen.getByTestId('create-vault-plan')).toHaveTextContent('Git stays off')
    expect(screen.getByTestId('create-vault-plan')).toHaveTextContent('plain Markdown without a repo')

    fireEvent.change(screen.getByTestId('create-vault-name'), { target: { value: 'Dreams' } })
    fireEvent.click(screen.getByTestId('create-vault-submit'))

    await waitFor(() => {
      expect(onCreate).toHaveBeenCalledWith({
        targetPath: buildVaultTargetPath('local', 'Dreams'),
        storageProvider: 'local-folder',
        syncProvider: 'none',
        initializeGit: false,
        templateKind: 'blank',
        themePreset: 'morning-notebook',
      })
    })
    expect(promptSpy).not.toHaveBeenCalled()
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('keeps create actions pinned while the long setup body scrolls', () => {
    render(<CreateVaultDialog open={true} onClose={vi.fn()} onCreate={vi.fn()} />)

    expect(screen.getByTestId('create-vault-dialog')).toHaveClass(
      'max-h-[calc(100dvh-2rem)]',
      'grid-rows-[auto_minmax(0,1fr)]',
      'overflow-hidden',
    )
    expect(screen.getByTestId('create-vault-dialog').querySelector('form')).toHaveClass('overflow-hidden')
    expect(screen.getByTestId('create-vault-scroll-body')).toHaveClass('min-h-0', 'overflow-y-auto', 'pt-2')
    expect(screen.getByTestId('create-vault-action-footer')).toHaveClass(
      'sticky',
      'bottom-0',
      'z-10',
      'shrink-0',
      'border-t',
    )
    expect(screen.getByTestId('create-vault-submit')).toBeVisible()
  })

  it('creates an iCloud-backed local vault path and can initialize Git', async () => {
    const onCreate = vi.fn().mockResolvedValue(true)

    render(<CreateVaultDialog open={true} onClose={vi.fn()} onCreate={onCreate} />)

    fireEvent.change(screen.getByTestId('create-vault-name'), { target: { value: 'Journals' } })
    fireEvent.click(screen.getByTestId('create-vault-storage-icloud'))
    fireEvent.click(screen.getByTestId('create-vault-git'))
    expect(screen.getByTestId('create-vault-plan')).toHaveTextContent('iCloud Drive is still a local folder')
    expect(screen.getByTestId('create-vault-plan')).toHaveTextContent('Grimoire stores no cloud credentials')
    expect(screen.getByTestId('create-vault-plan')).toHaveTextContent('Git history starts')
    fireEvent.click(screen.getByTestId('create-vault-submit'))

    await waitFor(() => {
      expect(onCreate).toHaveBeenCalledWith({
        targetPath: buildVaultTargetPath('icloud', 'Journals'),
        storageProvider: 'icloud-drive',
        syncProvider: 'git',
        initializeGit: true,
        templateKind: 'blank',
        themePreset: 'morning-notebook',
      })
    })
  })

  it('sends the aurora experience profile and coerces unknown presets', async () => {
    const onCreate = vi.fn().mockResolvedValue(true)

    // Any removed/unknown preset normalizes back to the single shipped Aurora theme.
    render(<CreateVaultDialog initialThemePreset={'nocturne' as never} open={true} onClose={vi.fn()} onCreate={onCreate} />)

    expect(screen.getByTestId('create-vault-experience-preview')).toHaveAttribute(
      'data-theme-preset-preview',
      'morning-notebook',
    )
    expect(screen.getByTestId('create-vault-experience-morning-notebook')).toHaveAttribute('aria-checked', 'true')
    expect(screen.getByTestId('create-vault-plan')).toHaveTextContent('Aurora')

    fireEvent.click(screen.getByTestId('create-vault-experience-morning-notebook'))
    expect(screen.getByTestId('create-vault-experience-preview')).toHaveAttribute(
      'data-theme-preset-preview',
      'morning-notebook',
    )
    expect(screen.getByTestId('create-vault-experience-morning-notebook')).toHaveAttribute('aria-checked', 'true')
    fireEvent.click(screen.getByTestId('create-vault-submit'))

    await waitFor(() => {
      expect(onCreate).toHaveBeenCalledWith(expect.objectContaining({
        themePreset: 'morning-notebook',
      }))
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
    expect(screen.getByTestId('create-vault-path')).toHaveValue(buildVaultTargetPath('local', 'Dreams'))
    fireEvent.click(screen.getByTestId('create-vault-submit'))

    await waitFor(() => {
      expect(onCreate).toHaveBeenCalledWith(expect.objectContaining({
        targetPath: buildVaultTargetPath('local', 'Dreams'),
        templateKind: 'dreams',
        themePreset: 'morning-notebook',
      }))
    })
  })
})
