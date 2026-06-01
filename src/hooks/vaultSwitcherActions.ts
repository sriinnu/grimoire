import { useCallback } from 'react'
import type { Dispatch, MutableRefObject, SetStateAction } from 'react'
import type { VaultOption } from '../components/StatusBar'
import { formatFolderPickerActionError, pickFolder } from '../utils/vault-dialog'
import type { CreateEmptyVaultRequest } from '../utils/vaultCreation'
import type { PersistedVaultState, VaultCollections } from './vaultSwitcherState'
import {
  addVaultToList,
  applyRegisteredVaultSelection,
  buildRegisteredVaultSelection,
  ensureVaultCanBeRegistered,
  formatCreateEmptyVaultError,
  getRemovedVaultLabel,
  persistRegisteredVaultSelection,
  removeVaultFromState,
  restoreGettingStartedVault,
  switchVaultPath,
} from './vaultSwitcherActionModel'
import type { RegisterVaultSelectionOptions, RestoreGettingStartedOptions } from './vaultSwitcherActionModel'
import { labelFromPath, tauriCall } from './vaultSwitcherShared'
import { useOpenLocalFolderAction } from './vaultSwitcherOpenLocalAction'

interface VaultActionOptions extends PersistedVaultState, VaultCollections {
  onSwitchRef: MutableRefObject<() => void>
  onToastRef: MutableRefObject<(msg: string) => void>
  onVaultOpeningRef: MutableRefObject<((target: { label: string; path: string }) => void) | undefined>
}

interface RemoveVaultActionOptions {
  defaultVaults: VaultOption[]
  extraVaults: VaultOption[]
  hiddenDefaults: string[]
  onSwitchRef: MutableRefObject<() => void>
  onToastRef: MutableRefObject<(msg: string) => void>
  setExtraVaults: Dispatch<SetStateAction<VaultOption[]>>
  setHiddenDefaults: Dispatch<SetStateAction<string[]>>
  setSelectedVaultPath: Dispatch<SetStateAction<string | null>>
  setVaultPath: Dispatch<SetStateAction<string>>
  selectedVaultPath: string | null
  vaultPath: string
}

function useSwitchVaultAction(
  onSwitchRef: MutableRefObject<() => void>,
  setSelectedVaultPath: Dispatch<SetStateAction<string | null>>,
  setVaultPath: Dispatch<SetStateAction<string>>,
) {
  return useCallback((path: string) => {
    switchVaultPath({ setSelectedVaultPath, setVaultPath, onSwitchRef, path })
  }, [onSwitchRef, setSelectedVaultPath, setVaultPath])
}

function useVaultClonedAction(
  addAndSwitch: (path: string, label: string, metadata?: Pick<VaultOption, 'storageProvider' | 'syncProvider'>) => void,
  onToastRef: MutableRefObject<(msg: string) => void>,
) {
  return useCallback((path: string, label: string) => {
    addAndSwitch(path, label, { storageProvider: 'local-folder', syncProvider: 'git' })
    onToastRef.current(`Vault "${label}" cloned and opened`)
  }, [addAndSwitch, onToastRef])
}

function useRegisterVaultSelectionAction({
  defaultAvailable,
  defaultPath,
  extraVaults,
  hiddenDefaults,
  lastPersistedSnapshotRef,
  onSwitchRef,
  setDefaultAvailable,
  setExtraVaults,
  setHiddenDefaults,
  setSelectedVaultPath,
  setVaultPath,
}: {
  defaultAvailable: boolean
  defaultPath: string
  extraVaults: VaultOption[]
  hiddenDefaults: string[]
  lastPersistedSnapshotRef: MutableRefObject<string | null>
  onSwitchRef: MutableRefObject<() => void>
  setDefaultAvailable: Dispatch<SetStateAction<boolean>>
  setExtraVaults: Dispatch<SetStateAction<VaultOption[]>>
  setHiddenDefaults: Dispatch<SetStateAction<string[]>>
  setSelectedVaultPath: Dispatch<SetStateAction<string | null>>
  setVaultPath: Dispatch<SetStateAction<string>>
}) {
  return useCallback(async (path: string, label: string, options: RegisterVaultSelectionOptions = {}) => {
    if (options.verifyAvailability !== false) {
      await ensureVaultCanBeRegistered(path)
    }

    const nextSelection = buildRegisteredVaultSelection({
      defaultAvailable,
      defaultPath,
      extraVaults,
      hiddenDefaults,
      label,
      path,
      storageProvider: options.storageProvider,
      syncProvider: options.syncProvider,
    })
    await persistRegisteredVaultSelection({
      hiddenDefaults: nextSelection.nextHiddenDefaults,
      lastPersistedSnapshotRef,
      selectedVaultPath: nextSelection.nextSelectedVaultPath,
      vaults: nextSelection.nextExtraVaults,
    })
    options.onBeforeSwitch?.({ label, path })
    applyRegisteredVaultSelection({
      ...nextSelection,
      onSwitchRef,
      setDefaultAvailable,
      setExtraVaults,
      setHiddenDefaults,
      setSelectedVaultPath,
      setVaultPath,
    })
  }, [
    defaultAvailable,
    defaultPath,
    extraVaults,
    hiddenDefaults,
    lastPersistedSnapshotRef,
    onSwitchRef,
    setDefaultAvailable,
    setExtraVaults,
    setHiddenDefaults,
    setSelectedVaultPath,
    setVaultPath,
  ])
}

function useSyncVaultSelectionAction({
  defaultAvailable,
  defaultPath,
  extraVaults,
  hiddenDefaults,
  onSwitchRef,
  setDefaultAvailable,
  setExtraVaults,
  setHiddenDefaults,
  setSelectedVaultPath,
  setVaultPath,
}: {
  defaultAvailable: boolean
  defaultPath: string
  extraVaults: VaultOption[]
  hiddenDefaults: string[]
  onSwitchRef: MutableRefObject<() => void>
  setDefaultAvailable: Dispatch<SetStateAction<boolean>>
  setExtraVaults: Dispatch<SetStateAction<VaultOption[]>>
  setHiddenDefaults: Dispatch<SetStateAction<string[]>>
  setSelectedVaultPath: Dispatch<SetStateAction<string | null>>
  setVaultPath: Dispatch<SetStateAction<string>>
}) {
  return useCallback((path: string, label: string) => {
    const nextSelection = buildRegisteredVaultSelection({
      defaultAvailable,
      defaultPath,
      extraVaults,
      hiddenDefaults,
      label,
      path,
    })
    applyRegisteredVaultSelection({
      ...nextSelection,
      onSwitchRef,
      setDefaultAvailable,
      setExtraVaults,
      setHiddenDefaults,
      setSelectedVaultPath,
      setVaultPath,
    })
  }, [
    defaultAvailable,
    defaultPath,
    extraVaults,
    hiddenDefaults,
    onSwitchRef,
    setDefaultAvailable,
    setExtraVaults,
    setHiddenDefaults,
    setSelectedVaultPath,
    setVaultPath,
  ])
}

function useCreateEmptyVaultAction(
  addAndSwitch: (path: string, label: string, metadata?: Pick<VaultOption, 'storageProvider' | 'syncProvider'>) => void,
  onToastRef: MutableRefObject<(msg: string) => void>,
) {
  return useCallback(async (request?: CreateEmptyVaultRequest): Promise<boolean> => {
    let targetPath: string | null = request?.targetPath?.trim() ?? null
    try {
      if (!targetPath) {
        targetPath = await pickFolder('Choose where to create your vault')
      }
    } catch (err) {
      onToastRef.current(formatFolderPickerActionError('Could not choose where to create your vault', err))
      return false
    }

    try {
      if (!targetPath) return false
      const commandArgs: Record<string, unknown> = { targetPath }
      if (request?.initializeGit) {
        commandArgs.initializeGit = true
      }
      if (request?.templateKind) {
        commandArgs.templateKind = request.templateKind
      }

      const vaultPath = await tauriCall<string>('create_empty_vault', commandArgs)
      const label = labelFromPath(vaultPath)
      addAndSwitch(vaultPath, label, {
        storageProvider: request?.storageProvider,
        syncProvider: request?.syncProvider ?? (request?.initializeGit ? 'git' : undefined),
      })
      onToastRef.current(`Vault "${label}" created and opened`)
      return true
    } catch (err) {
      onToastRef.current(formatCreateEmptyVaultError(err))
      return false
    }
  }, [addAndSwitch, onToastRef])
}

function useRemoveVaultAction({
  defaultVaults,
  extraVaults,
  hiddenDefaults,
  onSwitchRef,
  onToastRef,
  setExtraVaults,
  setHiddenDefaults,
  setSelectedVaultPath,
  setVaultPath,
  selectedVaultPath,
  vaultPath,
}: RemoveVaultActionOptions) {
  return useCallback((path: string) => {
    const isDefault = defaultVaults.some(vault => vault.path === path)

    removeVaultFromState({
      defaultVaults,
      extraVaults,
      hiddenDefaults,
      isDefault,
      onSwitchRef,
      removedPath: path,
      setExtraVaults,
      setHiddenDefaults,
      setSelectedVaultPath,
      setVaultPath,
      selectedVaultPath,
      vaultPath,
    })
    onToastRef.current(`Vault "${getRemovedVaultLabel({ path, defaultVaults, extraVaults })}" removed from list`)
  }, [
    defaultVaults,
    extraVaults,
    hiddenDefaults,
    onSwitchRef,
    onToastRef,
    setExtraVaults,
    setHiddenDefaults,
    setSelectedVaultPath,
    setVaultPath,
    selectedVaultPath,
    vaultPath,
  ])
}

function useRestoreGettingStartedAction(options: RestoreGettingStartedOptions) {
  const { defaultPath, onToastRef, setDefaultAvailable, setHiddenDefaults, switchVault } = options

  return useCallback(() => {
    return restoreGettingStartedVault({
      defaultPath,
      onToastRef,
      setDefaultAvailable,
      setHiddenDefaults,
      switchVault,
    })
  }, [defaultPath, onToastRef, setDefaultAvailable, setHiddenDefaults, switchVault])
}

/** Builds the action callbacks returned by the vault switcher facade. */
export function useVaultActions({
  defaultAvailable,
  defaultPath,
  defaultVaults,
  extraVaults,
  hiddenDefaults,
  lastPersistedSnapshotRef,
  onSwitchRef,
  onToastRef,
  onVaultOpeningRef,
  setDefaultAvailable,
  setExtraVaults,
  setHiddenDefaults,
  selectedVaultPath,
  setSelectedVaultPath,
  setVaultPath,
  vaultPath,
}: VaultActionOptions) {
  const addVault = useCallback((
    path: string,
    label: string,
    metadata: Pick<VaultOption, 'storageProvider' | 'syncProvider'> = {},
  ) => {
    addVaultToList({ setExtraVaults, path, label, ...metadata })
  }, [setExtraVaults])

  const switchVault = useSwitchVaultAction(onSwitchRef, setSelectedVaultPath, setVaultPath)
  const registerVaultSelection = useRegisterVaultSelectionAction({
    defaultAvailable,
    defaultPath,
    extraVaults,
    hiddenDefaults,
    lastPersistedSnapshotRef,
    onSwitchRef,
    setDefaultAvailable,
    setExtraVaults,
    setHiddenDefaults,
    setSelectedVaultPath,
    setVaultPath,
  })
  const syncVaultSelection = useSyncVaultSelectionAction({
    defaultAvailable,
    defaultPath,
    extraVaults,
    hiddenDefaults,
    onSwitchRef,
    setDefaultAvailable,
    setExtraVaults,
    setHiddenDefaults,
    setSelectedVaultPath,
    setVaultPath,
  })
  const addAndSwitch = useCallback((
    path: string,
    label: string,
    metadata?: Pick<VaultOption, 'storageProvider' | 'syncProvider'>,
  ) => {
    addVault(path, label, metadata)
    switchVault(path)
  }, [addVault, switchVault])

  return {
    handleCreateEmptyVault: useCreateEmptyVaultAction(addAndSwitch, onToastRef),
    handleOpenLocalFolder: useOpenLocalFolderAction(registerVaultSelection, onToastRef, onVaultOpeningRef),
    handleVaultCloned: useVaultClonedAction(addAndSwitch, onToastRef),
    registerVaultSelection,
    removeVault: useRemoveVaultAction({
      defaultVaults,
      extraVaults,
      hiddenDefaults,
      onSwitchRef,
      onToastRef,
      setExtraVaults,
      setHiddenDefaults,
      setSelectedVaultPath,
      setVaultPath,
      selectedVaultPath,
      vaultPath,
    }),
    restoreGettingStarted: useRestoreGettingStartedAction({
      defaultPath,
      onToastRef,
      setDefaultAvailable,
      setHiddenDefaults,
      switchVault,
    }),
    syncVaultSelection,
    switchVault,
  }
}
