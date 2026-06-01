import { useCallback } from 'react'
import type { MutableRefObject } from 'react'
import { formatFolderPickerActionError, pickFolder } from '../utils/vault-dialog'
import type { RegisterVaultSelectionOptions, VaultOpeningTarget } from './vaultSwitcherActionModel'
import { labelFromPath } from './vaultSwitcherShared'

type RegisterVaultSelection = (
  path: string,
  label: string,
  options?: RegisterVaultSelectionOptions,
) => Promise<void>

/** Opens a picked local folder only after it is verified and persisted as a vault. */
export function useOpenLocalFolderAction(
  registerVaultSelection: RegisterVaultSelection,
  onToastRef: MutableRefObject<(msg: string) => void>,
  onVaultOpeningRef: MutableRefObject<((target: VaultOpeningTarget) => void) | undefined>,
) {
  return useCallback(async () => {
    let path: string | null
    try {
      path = await pickFolder('Open vault folder')
    } catch (err) {
      onToastRef.current(formatFolderPickerActionError('Could not open vault folder', err))
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
      onToastRef.current(`Vault "${label}" opened`)
    } catch (err) {
      onToastRef.current(formatFolderPickerActionError('Could not open vault folder', err))
    }
  }, [onToastRef, onVaultOpeningRef, registerVaultSelection])
}
