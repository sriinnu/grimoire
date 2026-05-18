import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { useVaultSwitcher, DEFAULT_VAULTS } from './useVaultSwitcher'
import type { PersistedVaultList } from './useVaultSwitcher'

const mockDefaultVaultPath = '/mock/Documents/Getting Started'
const expectedDefaultVaultPath = DEFAULT_VAULTS[0].path || mockDefaultVaultPath
const legacyGitVaultPath = '/fixtures/vaults/legacy-grimoire'
const pickedVaultPath = '/fixtures/vaults/my-vault'
const createdVaultPath = '/fixtures/vaults/new-vault'
const icloudJournalsPath = '/fixtures/icloud-drive/grimoire/journals'
const busyFolderPath = '/fixtures/vaults/busy-folder'

let mockVaultListStore: PersistedVaultList = { vaults: [], active_vault: null, hidden_defaults: [] }

const mockInvokeFn = vi.fn((cmd: string, args?: Record<string, unknown>): Promise<unknown> => {
  if (cmd === 'load_vault_list') return Promise.resolve({ ...mockVaultListStore })
  if (cmd === 'save_vault_list') {
    mockVaultListStore = { ...(args as { list: PersistedVaultList }).list }
    return Promise.resolve(null)
  }
  if (cmd === 'get_default_vault_path') return Promise.resolve(mockDefaultVaultPath)
  if (cmd === 'check_vault_exists') return Promise.resolve(true)
  return Promise.resolve(null)
})

vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn(),
}))

vi.mock('../mock-tauri', () => ({
  isTauri: () => false,
  mockInvoke: (cmd: string, args?: Record<string, unknown>) => mockInvokeFn(cmd, args),
}))

vi.mock('../utils/vault-dialog', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../utils/vault-dialog')>()
  return {
    ...actual,
    pickFolder: vi.fn(),
  }
})

import { NativeFolderPickerBlockedError } from '../utils/vault-dialog'

type MockInvokeOverrides = {
  checkVaultExists?: boolean | ((args: { path?: string }) => boolean)
  isGitRepo?: boolean | ((args: { vaultPath?: string }) => boolean)
  createEmptyVault?: (args: { targetPath: string; initializeGit?: boolean }) => Promise<unknown> | unknown
  createGettingStartedVault?: (args: { targetPath: string }) => Promise<unknown> | unknown
}

describe('useVaultSwitcher', () => {
  const onSwitch = vi.fn()
  const onToast = vi.fn()

  const setMockInvokeBehavior = (overrides: MockInvokeOverrides = {}) => {
    mockInvokeFn.mockImplementation((cmd: string, args?: Record<string, unknown>): Promise<unknown> => {
      if (cmd === 'load_vault_list') return Promise.resolve({ ...mockVaultListStore })
      if (cmd === 'save_vault_list') {
        mockVaultListStore = { ...(args as { list: PersistedVaultList }).list }
        return Promise.resolve(null)
      }
      if (cmd === 'get_default_vault_path') return Promise.resolve(mockDefaultVaultPath)
      if (cmd === 'check_vault_exists') {
        const checkVaultExists = overrides.checkVaultExists
        return Promise.resolve(typeof checkVaultExists === 'function'
          ? checkVaultExists(args as { path?: string })
          : checkVaultExists ?? true)
      }
      if (cmd === 'is_git_repo') {
        const isGitRepo = overrides.isGitRepo
        return Promise.resolve(typeof isGitRepo === 'function'
          ? isGitRepo(args as { vaultPath?: string })
          : isGitRepo ?? false)
      }
      if (cmd === 'create_empty_vault' && overrides.createEmptyVault) {
        return Promise.resolve().then(() => overrides.createEmptyVault?.(args as { targetPath: string }))
      }
      if (cmd === 'create_getting_started_vault' && overrides.createGettingStartedVault) {
        return Promise.resolve().then(() => overrides.createGettingStartedVault?.(args as { targetPath: string }))
      }
      return Promise.resolve(null)
    })
  }

  const renderLoadedVaultSwitcher = async () => {
    const hook = renderHook(() => useVaultSwitcher({ onSwitch, onToast }))
    await waitFor(() => {
      expect(hook.result.current.loaded).toBe(true)
    })
    return hook
  }

  const setWorkVaultWithHiddenGettingStarted = () => {
    mockVaultListStore = {
      vaults: [{ label: 'Work', path: '/work/vault' }],
      active_vault: '/work/vault',
      hidden_defaults: [expectedDefaultVaultPath],
    }
  }

  beforeEach(() => {
    vi.resetAllMocks()
    mockVaultListStore = { vaults: [], active_vault: null, hidden_defaults: [] }
    setMockInvokeBehavior()
  })

  it('loads the default vault when the resolved path exists', async () => {
    const { result } = await renderLoadedVaultSwitcher()

    expect(result.current.allVaults).toEqual([{ label: 'Getting Started', path: expectedDefaultVaultPath }])
    expect(result.current.vaultPath).toBe(expectedDefaultVaultPath)
  })

  it('loads persisted vaults on mount', async () => {
    mockVaultListStore = {
      vaults: [{ label: 'My Vault', path: legacyGitVaultPath }],
      active_vault: legacyGitVaultPath,
    }

    const { result } = renderHook(() => useVaultSwitcher({ onSwitch, onToast }))

    await waitFor(() => {
      expect(result.current.loaded).toBe(true)
    })

    expect(result.current.allVaults).toHaveLength(2) // default + persisted
    expect(result.current.allVaults[1].label).toBe('My Vault')
    expect(result.current.allVaults[1].path).toBe(legacyGitVaultPath)
    expect(result.current.allVaults[1].available).toBe(true)
    expect(result.current.allVaults[1].storageProvider).toBe('local-folder')
    expect(result.current.allVaults[1].syncProvider).toBe('none')
    expect(result.current.vaultPath).toBe(legacyGitVaultPath)
    expect(mockInvokeFn).toHaveBeenCalledWith('load_vault_list', {})
  })

  it('keeps explicit local-only sync metadata even when the folder has Git metadata', async () => {
    mockVaultListStore = {
      vaults: [{ label: 'Legacy Git Vault', path: legacyGitVaultPath, sync_provider: 'none' }],
      active_vault: legacyGitVaultPath,
      hidden_defaults: [],
    }
    setMockInvokeBehavior({
      isGitRepo: ({ vaultPath }) => vaultPath === legacyGitVaultPath,
    })

    const { result } = await renderLoadedVaultSwitcher()

    expect(result.current.allVaults[1]).toEqual(expect.objectContaining({
      label: 'Legacy Git Vault',
      syncProvider: 'none',
    }))
  })

  it('derives Git sync metadata for legacy entries without an explicit provider', async () => {
    mockVaultListStore = {
      vaults: [{ label: 'Legacy Git Vault', path: legacyGitVaultPath }],
      active_vault: legacyGitVaultPath,
      hidden_defaults: [],
    }
    setMockInvokeBehavior({
      isGitRepo: ({ vaultPath }) => vaultPath === legacyGitVaultPath,
    })

    const { result } = await renderLoadedVaultSwitcher()

    expect(result.current.allVaults[1]).toEqual(expect.objectContaining({
      label: 'Legacy Git Vault',
      syncProvider: 'git',
    }))
  })

  it('preserves storage metadata for persisted vaults', async () => {
    mockVaultListStore = {
      vaults: [{
        id: 'dreams',
        label: 'Dreams',
        path: '/icloud/Dreams',
        storage_provider: 'icloud-drive',
        sync_provider: 'none',
      }],
      active_vault: '/icloud/Dreams',
      hidden_defaults: [],
    }

    const { result } = await renderLoadedVaultSwitcher()
    const dreamsVault = result.current.allVaults.find(vault => vault.id === 'dreams')

    expect(dreamsVault).toEqual(expect.objectContaining({
      label: 'Dreams',
      path: '/icloud/Dreams',
      storageProvider: 'icloud-drive',
      syncProvider: 'none',
      available: true,
    }))
  })

  it('marks unavailable vaults when check_vault_exists returns false', async () => {
    mockVaultListStore = {
      vaults: [{ label: 'External', path: '/Volumes/USB/vault' }],
      active_vault: null,
    }
    setMockInvokeBehavior({
      checkVaultExists: ({ path }) => path === expectedDefaultVaultPath,
    })

    const { result } = await renderLoadedVaultSwitcher()
    const externalVault = result.current.allVaults.find(vault => vault.label === 'External')

    expect(externalVault?.available).toBe(false)
    expect(externalVault?.label).toBe('External')
  })

  it('persists vault list when adding a vault via handleVaultCloned', async () => {
    const { result } = renderHook(() => useVaultSwitcher({ onSwitch, onToast }))

    await waitFor(() => { expect(result.current.loaded).toBe(true) })

    act(() => {
      result.current.handleVaultCloned('/cloned/vault', 'Cloned')
    })

    await waitFor(() => {
      expect(mockInvokeFn).toHaveBeenCalledWith('save_vault_list', expect.objectContaining({
        list: expect.objectContaining({
          vaults: expect.arrayContaining([
            expect.objectContaining({
              label: 'Cloned',
              path: '/cloned/vault',
              sync_provider: 'git',
            }),
          ]),
        }),
      }))
    })
  })

  it('registers an onboarding vault selection before switching to it', async () => {
    const { result } = await renderLoadedVaultSwitcher()

    await act(async () => {
      await result.current.registerVaultSelection('/selected/vault', 'Selected Vault')
    })

    expect(result.current.vaultPath).toBe('/selected/vault')
    expect(result.current.selectedVaultPath).toBe('/selected/vault')
    expect(mockVaultListStore).toEqual({
      vaults: [{
        id: null,
        label: 'Selected Vault',
        path: '/selected/vault',
        storage_provider: 'local-folder',
        sync_provider: 'none',
      }],
      active_vault: '/selected/vault',
      hidden_defaults: [],
    })
  })

  it('registers the canonical Getting Started vault without persisting a duplicate entry', async () => {
    setMockInvokeBehavior({
      checkVaultExists: ({ path }) => path === expectedDefaultVaultPath,
    })

    const { result } = await renderLoadedVaultSwitcher()

    await act(async () => {
      await result.current.registerVaultSelection(expectedDefaultVaultPath, 'Getting Started')
    })

    expect(result.current.vaultPath).toBe(expectedDefaultVaultPath)
    expect(result.current.selectedVaultPath).toBe(expectedDefaultVaultPath)
    expect(result.current.allVaults).toEqual([{ label: 'Getting Started', path: expectedDefaultVaultPath }])
    expect(mockVaultListStore).toEqual({
      vaults: [],
      active_vault: expectedDefaultVaultPath,
      hidden_defaults: [],
    })
  })

  it('persists active vault when switching', async () => {
    mockVaultListStore = {
      vaults: [{ label: 'Work', path: '/work/vault' }],
      active_vault: null,
    }

    const { result } = renderHook(() => useVaultSwitcher({ onSwitch, onToast }))

    await waitFor(() => { expect(result.current.loaded).toBe(true) })

    act(() => {
      result.current.switchVault('/work/vault')
    })

    await waitFor(() => {
      expect(mockInvokeFn).toHaveBeenCalledWith('save_vault_list', expect.objectContaining({
        list: expect.objectContaining({
          active_vault: '/work/vault',
        }),
      }))
    })
    expect(onSwitch).toHaveBeenCalled()
  })

  it('does not persist the implicit default vault as an active selection', async () => {
    const { result } = renderHook(() => useVaultSwitcher({ onSwitch, onToast }))

    await waitFor(() => { expect(result.current.loaded).toBe(true) })

    expect(result.current.vaultPath).toBe(expectedDefaultVaultPath)
    expect(result.current.selectedVaultPath).toBeNull()
    expect(mockVaultListStore.active_vault).toBeNull()
  })

  it('keeps the implicit default vault out of the list when its path is missing', async () => {
    setMockInvokeBehavior({ checkVaultExists: false })

    const { result } = await renderLoadedVaultSwitcher()

    expect(result.current.allVaults).toEqual([])
    expect(result.current.vaultPath).toBe(expectedDefaultVaultPath)
    expect(result.current.isGettingStartedHidden).toBe(false)
  })

  it('drops stale canonical Getting Started entries when the starter path is missing', async () => {
    mockVaultListStore = {
      vaults: [
        { label: 'Getting Started', path: expectedDefaultVaultPath },
        { label: 'Work', path: '/work/vault' },
      ],
      active_vault: '/work/vault',
      hidden_defaults: [],
    }
    setMockInvokeBehavior({
      checkVaultExists: ({ path }) => path === '/work/vault',
    })

    const { result } = await renderLoadedVaultSwitcher()

    expect(result.current.allVaults).toEqual([
      expect.objectContaining({ label: 'Work', path: '/work/vault', available: true }),
    ])
    expect(result.current.vaultPath).toBe('/work/vault')

    await waitFor(() => {
      expect(mockVaultListStore).toEqual({
        vaults: [{
          id: null,
          label: 'Work',
          path: '/work/vault',
          storage_provider: 'local-folder',
          sync_provider: 'none',
        }],
        active_vault: '/work/vault',
        hidden_defaults: [],
      })
    })
  })

  it('clears a stale canonical Getting Started selection when the starter path is missing', async () => {
    mockVaultListStore = {
      vaults: [{ label: 'Getting Started', path: expectedDefaultVaultPath }],
      active_vault: expectedDefaultVaultPath,
      hidden_defaults: [],
    }
    setMockInvokeBehavior({ checkVaultExists: false })

    const { result } = await renderLoadedVaultSwitcher()

    expect(result.current.allVaults).toEqual([])
    expect(result.current.selectedVaultPath).toBeNull()

    await waitFor(() => {
      expect(mockVaultListStore).toEqual({
        vaults: [],
        active_vault: null,
        hidden_defaults: [],
      })
    })
  })

  it('handles load error gracefully', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    mockInvokeFn.mockImplementation((cmd: string) => {
      if (cmd === 'load_vault_list') return Promise.reject(new Error('disk error'))
      if (cmd === 'get_default_vault_path') return Promise.resolve(mockDefaultVaultPath)
      if (cmd === 'check_vault_exists') return Promise.resolve(true)
      return Promise.resolve(null)
    })

    const { result } = renderHook(() => useVaultSwitcher({ onSwitch, onToast }))

    await waitFor(() => { expect(result.current.loaded).toBe(true) })

    // Should fall back to defaults
    expect(result.current.allVaults).toHaveLength(1)
    expect(result.current.allVaults[0].label).toBe('Getting Started')
    expect(result.current.allVaults[0].path).toBe(expectedDefaultVaultPath)
    warnSpy.mockRestore()
  })

  it('does not duplicate vaults with same path', async () => {
    const { result } = renderHook(() => useVaultSwitcher({ onSwitch, onToast }))
    await waitFor(() => { expect(result.current.loaded).toBe(true) })

    act(() => {
      result.current.handleVaultCloned('/some/vault', 'First')
    })
    act(() => {
      result.current.handleVaultCloned('/some/vault', 'Duplicate')
    })

    const extras = result.current.allVaults.filter(v => v.path === '/some/vault')
    expect(extras).toHaveLength(1)
  })

  it('opens local folder and persists', async () => {
    const { pickFolder } = await import('../utils/vault-dialog')
    vi.mocked(pickFolder).mockResolvedValue(pickedVaultPath)

    const { result } = renderHook(() => useVaultSwitcher({ onSwitch, onToast }))
    await waitFor(() => { expect(result.current.loaded).toBe(true) })

    await act(async () => {
      await result.current.handleOpenLocalFolder()
    })

    expect(result.current.allVaults.some(v => v.path === pickedVaultPath)).toBe(true)
    expect(onToast).toHaveBeenCalledWith('Vault "my-vault" opened')
  })

  it('shows a clear toast when folder picking is blocked until restart', async () => {
    const { pickFolder } = await import('../utils/vault-dialog')
    vi.mocked(pickFolder).mockRejectedValue(new NativeFolderPickerBlockedError())

    const { result } = await renderLoadedVaultSwitcher()

    await act(async () => {
      await result.current.handleOpenLocalFolder()
    })

    expect(onToast).toHaveBeenCalledWith(
      'Grimoire needs a restart before macOS can open another folder picker. Restart to apply the downloaded update and try again.',
    )
  })

  it('creates an empty vault and switches to it', async () => {
    const { pickFolder } = await import('../utils/vault-dialog')
    vi.mocked(pickFolder).mockResolvedValue(createdVaultPath)
    setMockInvokeBehavior({
      createEmptyVault: ({ targetPath }) => targetPath,
    })

    const { result } = await renderLoadedVaultSwitcher()

    await act(async () => {
      await result.current.handleCreateEmptyVault()
    })

    expect(mockInvokeFn).toHaveBeenCalledWith('create_empty_vault', { targetPath: createdVaultPath })
    expect(result.current.vaultPath).toBe(createdVaultPath)
    expect(result.current.allVaults.some(v => v.path === createdVaultPath)).toBe(true)
    expect(onToast).toHaveBeenCalledWith('Vault "new-vault" created and opened')
  })

  it('creates an empty vault from an explicit modal request without prompting', async () => {
    const { pickFolder } = await import('../utils/vault-dialog')
    setMockInvokeBehavior({
      createEmptyVault: ({ targetPath }) => targetPath,
    })

    const { result } = await renderLoadedVaultSwitcher()

    await act(async () => {
      await result.current.handleCreateEmptyVault({
        targetPath: icloudJournalsPath,
        storageProvider: 'icloud-drive',
        syncProvider: 'none',
      })
    })

    expect(pickFolder).not.toHaveBeenCalled()
    expect(mockInvokeFn).toHaveBeenCalledWith('create_empty_vault', {
      targetPath: icloudJournalsPath,
    })
    expect(result.current.vaultPath).toBe(icloudJournalsPath)
    expect(result.current.allVaults).toContainEqual(expect.objectContaining({
      label: 'journals',
      path: icloudJournalsPath,
      storageProvider: 'icloud-drive',
      syncProvider: 'none',
      available: true,
    }))
  })

  it('shows a friendly toast when empty-vault creation targets a non-empty folder', async () => {
    const { pickFolder } = await import('../utils/vault-dialog')
    vi.mocked(pickFolder).mockResolvedValue(busyFolderPath)
    setMockInvokeBehavior({
      createEmptyVault: () => Promise.reject('Choose an empty folder to create a new vault'),
    })

    const { result } = await renderLoadedVaultSwitcher()

    await act(async () => {
      await result.current.handleCreateEmptyVault()
    })

    expect(result.current.vaultPath).toBe(expectedDefaultVaultPath)
    expect(onToast).toHaveBeenCalledWith('Choose an empty folder to create a new vault')
  })

  describe('removeVault', () => {
    it('removes an extra vault from the list', async () => {
      mockVaultListStore = {
        vaults: [{ label: 'Work', path: '/work/vault' }],
        active_vault: null,
        hidden_defaults: [],
      }

      const { result } = renderHook(() => useVaultSwitcher({ onSwitch, onToast }))
      await waitFor(() => { expect(result.current.loaded).toBe(true) })

      expect(result.current.allVaults).toHaveLength(2) // default + Work

      act(() => {
        result.current.removeVault('/work/vault')
      })

      expect(result.current.allVaults.some(v => v.path === '/work/vault')).toBe(false)
      expect(onToast).toHaveBeenCalledWith('Vault "Work" removed from list')
    })

    it('hides a default vault instead of deleting it', async () => {
      const { result } = renderHook(() => useVaultSwitcher({ onSwitch, onToast }))
      await waitFor(() => { expect(result.current.loaded).toBe(true) })

      const defaultPath = DEFAULT_VAULTS[0].path
      expect(result.current.allVaults.some(v => v.path === defaultPath)).toBe(true)

      act(() => {
        result.current.removeVault(defaultPath)
      })

      expect(result.current.allVaults.some(v => v.path === defaultPath)).toBe(false)
      expect(result.current.isGettingStartedHidden).toBe(true)
    })

    it('switches to another vault when removing the active vault', async () => {
      mockVaultListStore = {
        vaults: [{ label: 'Work', path: '/work/vault' }],
        active_vault: '/work/vault',
        hidden_defaults: [],
      }

      const { result } = renderHook(() => useVaultSwitcher({ onSwitch, onToast }))
      await waitFor(() => { expect(result.current.loaded).toBe(true) })

      expect(result.current.vaultPath).toBe('/work/vault')

      act(() => {
        result.current.removeVault('/work/vault')
      })

      // Should switch to the default vault
      expect(result.current.vaultPath).toBe(DEFAULT_VAULTS[0].path)
    })

    it('shows toast when vault is removed', async () => {
      mockVaultListStore = {
        vaults: [{ label: 'Docs', path: '/docs/vault' }],
        active_vault: null,
        hidden_defaults: [],
      }

      const { result } = renderHook(() => useVaultSwitcher({ onSwitch, onToast }))
      await waitFor(() => { expect(result.current.loaded).toBe(true) })

      act(() => {
        result.current.removeVault('/docs/vault')
      })

      expect(onToast).toHaveBeenCalledWith('Vault "Docs" removed from list')
    })

    it('persists hidden_defaults when removing a default vault', async () => {
      const { result } = renderHook(() => useVaultSwitcher({ onSwitch, onToast }))
      await waitFor(() => { expect(result.current.loaded).toBe(true) })

      // Add another vault first so we're not removing the last one
      act(() => {
        result.current.handleVaultCloned('/other/vault', 'Other')
      })

      act(() => {
        result.current.removeVault(DEFAULT_VAULTS[0].path)
      })

      await waitFor(() => {
        expect(mockInvokeFn).toHaveBeenCalledWith('save_vault_list', expect.objectContaining({
          list: expect.objectContaining({
            hidden_defaults: [DEFAULT_VAULTS[0].path],
          }),
        }))
      })
    })
  })

  describe('restoreGettingStarted', () => {
    it('un-hides the Getting Started vault', async () => {
      setWorkVaultWithHiddenGettingStarted()

      const { result } = renderHook(() => useVaultSwitcher({ onSwitch, onToast }))
      await waitFor(() => { expect(result.current.loaded).toBe(true) })

      expect(result.current.isGettingStartedHidden).toBe(true)

      await act(async () => {
        await result.current.restoreGettingStarted()
      })

      expect(result.current.isGettingStartedHidden).toBe(false)
      expect(result.current.allVaults.some(v => v.path === expectedDefaultVaultPath)).toBe(true)
    })

    it('switches to the Getting Started vault after restoring', async () => {
      setWorkVaultWithHiddenGettingStarted()

      const { result } = renderHook(() => useVaultSwitcher({ onSwitch, onToast }))
      await waitFor(() => { expect(result.current.loaded).toBe(true) })

      await act(async () => {
        await result.current.restoreGettingStarted()
      })

      expect(result.current.vaultPath).toBe(expectedDefaultVaultPath)
      expect(onToast).toHaveBeenCalledWith('Getting Started vault ready')
    })

    it('attempts to create vault on disk if it does not exist', async () => {
      setWorkVaultWithHiddenGettingStarted()
      setMockInvokeBehavior({
        checkVaultExists: false,
        createGettingStartedVault: ({ targetPath }) => targetPath,
      })

      const { result } = await renderLoadedVaultSwitcher()

      await act(async () => {
        await result.current.restoreGettingStarted()
      })

      expect(mockInvokeFn).toHaveBeenCalledWith('check_vault_exists', { path: expectedDefaultVaultPath })
      expect(mockInvokeFn).toHaveBeenCalledWith('create_getting_started_vault', { targetPath: expectedDefaultVaultPath })
    })

    it('shows a friendly toast and keeps the hidden vault hidden when cloning fails', async () => {
      setWorkVaultWithHiddenGettingStarted()
      setMockInvokeBehavior({
        checkVaultExists: false,
        createGettingStartedVault: () => Promise.reject('git clone failed: fatal: unable to access'),
      })

      const { result } = await renderLoadedVaultSwitcher()

      await act(async () => {
        await result.current.restoreGettingStarted()
      })

      expect(result.current.vaultPath).toBe('/work/vault')
      expect(result.current.isGettingStartedHidden).toBe(true)
      expect(onToast).toHaveBeenCalledWith('Getting Started requires internet. Clone it later.')
    })
  })

  describe('default vault path', () => {
    it('does not contain CI runner paths', () => {
      // Regression: production builds must never bake in the CI runner's absolute path
      expect(DEFAULT_VAULTS[0].path).not.toContain(['', 'Users', 'runner', ''].join('/'))
      expect(DEFAULT_VAULTS[0].path).not.toContain('/home/runner/')
    })

    it('keeps persisted active vault when one exists', async () => {
      const persistedPath = pickedVaultPath
      mockVaultListStore = {
        vaults: [{ label: 'My Vault', path: persistedPath }],
        active_vault: persistedPath,
        hidden_defaults: [],
      }

      const { result } = renderHook(() => useVaultSwitcher({ onSwitch, onToast }))
      await waitFor(() => { expect(result.current.loaded).toBe(true) })

      expect(result.current.vaultPath).toBe(persistedPath)
    })

    it('treats a remembered default vault as unselected when it is the only vault', async () => {
      mockVaultListStore = {
        vaults: [],
        active_vault: expectedDefaultVaultPath,
        hidden_defaults: [],
      }

      const { result } = renderHook(() => useVaultSwitcher({ onSwitch, onToast }))
      await waitFor(() => { expect(result.current.loaded).toBe(true) })

      expect(result.current.vaultPath).toBe(expectedDefaultVaultPath)
      expect(result.current.selectedVaultPath).toBeNull()
    })
  })

  describe('isGettingStartedHidden', () => {
    it('is false by default', async () => {
      const { result } = renderHook(() => useVaultSwitcher({ onSwitch, onToast }))
      await waitFor(() => { expect(result.current.loaded).toBe(true) })
      expect(result.current.isGettingStartedHidden).toBe(false)
    })

    it('is true when Getting Started path is in hidden_defaults', async () => {
      mockVaultListStore = {
        vaults: [],
        active_vault: null,
        hidden_defaults: [expectedDefaultVaultPath],
      }

      const { result } = renderHook(() => useVaultSwitcher({ onSwitch, onToast }))
      await waitFor(() => { expect(result.current.loaded).toBe(true) })
      expect(result.current.isGettingStartedHidden).toBe(true)
    })
  })
})
