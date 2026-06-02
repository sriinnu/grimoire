import { act, renderHook } from '@testing-library/react'
import { useRef } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { pickFolder } from '../utils/vault-dialog'
import type { RegisterVaultSelectionOptions } from './vaultSwitcherActionModel'
import { useOpenLocalFolderAction } from './vaultSwitcherOpenLocalAction'

vi.mock('../utils/vault-dialog', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../utils/vault-dialog')>()
  return {
    ...actual,
    pickFolder: vi.fn(),
  }
})

type RegisterVaultSelection = (
  path: string,
  label: string,
  options?: RegisterVaultSelectionOptions,
) => Promise<void>

function createDeferred<T>() {
  let resolve!: (value: T | PromiseLike<T>) => void
  const promise = new Promise<T>((nextResolve) => {
    resolve = nextResolve
  })
  return { promise, resolve }
}

function renderOpenLocalFolderAction(registerVaultSelection: RegisterVaultSelection) {
  const onToast = vi.fn()
  const onVaultOpening = vi.fn()
  const hook = renderHook(() => {
    const onToastRef = useRef(onToast)
    const onVaultOpeningRef = useRef(onVaultOpening)
    return useOpenLocalFolderAction(registerVaultSelection, onToastRef, onVaultOpeningRef)
  })

  return {
    onToast,
    onVaultOpening,
    ...hook,
  }
}

describe('useOpenLocalFolderAction', () => {
  const pickedVaultPath = '/fixtures/vaults/my-vault'
  const pickFolderMock = vi.mocked(pickFolder)

  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('coalesces duplicate open-local-folder clicks while the native picker is pending', async () => {
    const pickedFolder = createDeferred<string | null>()
    pickFolderMock.mockReturnValue(pickedFolder.promise)
    const registerVaultSelection = vi.fn<RegisterVaultSelection>(async () => {})
    const { onToast, onVaultOpening, result } = renderOpenLocalFolderAction(registerVaultSelection)

    await act(async () => {
      const firstOpen = result.current()
      const duplicateOpen = result.current()

      expect(pickFolderMock).toHaveBeenCalledTimes(1)
      pickedFolder.resolve(pickedVaultPath)
      await Promise.all([firstOpen, duplicateOpen])
    })

    expect(registerVaultSelection).toHaveBeenCalledTimes(1)
    expect(registerVaultSelection).toHaveBeenCalledWith(
      pickedVaultPath,
      'my-vault',
      {
        onBeforeSwitch: onVaultOpening,
        storageProvider: 'local-folder',
        syncProvider: 'none',
      },
    )
    expect(onToast).toHaveBeenCalledWith('Vault "my-vault" opened')
  })

  it('allows another folder picker attempt after a cancellation', async () => {
    pickFolderMock
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(pickedVaultPath)
    const registerVaultSelection = vi.fn<RegisterVaultSelection>(async () => {})
    const { result } = renderOpenLocalFolderAction(registerVaultSelection)

    await act(async () => {
      await result.current()
    })
    await act(async () => {
      await result.current()
    })

    expect(pickFolderMock).toHaveBeenCalledTimes(2)
    expect(registerVaultSelection).toHaveBeenCalledTimes(1)
    expect(registerVaultSelection).toHaveBeenCalledWith(
      pickedVaultPath,
      'my-vault',
      expect.objectContaining({
        storageProvider: 'local-folder',
        syncProvider: 'none',
      }),
    )
  })

  it('allows another folder picker attempt after a picker error', async () => {
    pickFolderMock
      .mockRejectedValueOnce(new Error('dialog failed'))
      .mockResolvedValueOnce(pickedVaultPath)
    const registerVaultSelection = vi.fn<RegisterVaultSelection>(async () => {})
    const { onToast, result } = renderOpenLocalFolderAction(registerVaultSelection)

    await act(async () => {
      await result.current()
    })
    await act(async () => {
      await result.current()
    })

    expect(pickFolderMock).toHaveBeenCalledTimes(2)
    expect(onToast).toHaveBeenCalledWith('Could not open vault folder: dialog failed')
    expect(registerVaultSelection).toHaveBeenCalledTimes(1)
  })
})
