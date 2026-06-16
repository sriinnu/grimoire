import { useCallback, useRef } from 'react'
import type { MutableRefObject } from 'react'
import { formatFolderPickerActionError, pickFolder } from '../utils/vault-dialog'
import type { RegisterVaultSelectionOptions, VaultOpeningTarget } from './vaultSwitcherActionModel'
import { labelFromPath } from './vaultSwitcherShared'

type RegisterVaultSelection = (
  path: string,
  label: string,
  options?: RegisterVaultSelectionOptions,
) => Promise<void>

/** Opens a picked local folder only after it is verified and persisted as a notebook. */
export function useOpenLocalFolderAction(
  registerVaultSelection: RegisterVaultSelection,
  onToastRef: MutableRefObject<(msg: string) => void>,
  onVaultOpeningRef: MutableRefObject<((target: VaultOpeningTarget) => void) | undefined>,
) {
  const openLocalFolderPromiseRef = useRef<Promise<void> | null>(null)

  return useCallback(async () => {
    if (openLocalFolderPromiseRef.current) {
      return openLocalFolderPromiseRef.current
    }

    const openLocalFolderPromise = (async () => {
      let path: string | null
      try {
        path = await pickFolder('Open notebook folder')
      } catch (err) {
        onToastRef.current(formatFolderPickerActionError('Could not open notebook folder', err))
        return
      }

      if (!path) return

      const label = labelFromPath(path)
      try {
        await registerVaultSelection(path, label, {
          onBeforeSwitch: onVaultOpeningRef.current,
          storageProvider: 'local-folder',
          syncProvider: 'none',
        })
        onToastRef.current(`Notebook "${label}" opened`)
      } catch (err) {
        onToastRef.current(formatFolderPickerActionError('Could not open notebook folder', err))
      }
    })()

    openLocalFolderPromiseRef.current = openLocalFolderPromise
    try {
      await openLocalFolderPromise
    } finally {
      if (openLocalFolderPromiseRef.current === openLocalFolderPromise) {
        openLocalFolderPromiseRef.current = null
      }
    }
  }, [onToastRef, onVaultOpeningRef, registerVaultSelection])
}
