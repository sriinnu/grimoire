import { useEffect, useRef } from 'react'
import { useVaultActions } from './vaultSwitcherActions'
import type { VaultOpeningTarget } from './vaultSwitcherActionModel'
import { DEFAULT_VAULTS, GETTING_STARTED_LABEL } from './vaultSwitcherShared'
import { usePersistedVaultState, useVaultCollections } from './vaultSwitcherState'

export type { PersistedVaultList } from '../utils/vaultListStore'
export { DEFAULT_VAULTS, GETTING_STARTED_LABEL }

interface UseVaultSwitcherOptions {
  onSwitch: () => void
  onToast: (msg: string) => void
  onVaultOpening?: (target: VaultOpeningTarget) => void
}

/** Manages vault path, extra vaults, switching, cloning, and local folder opening. */
export function useVaultSwitcher({ onSwitch, onToast, onVaultOpening }: UseVaultSwitcherOptions) {
  const onSwitchRef = useRef(onSwitch)
  const onToastRef = useRef(onToast)
  const onVaultOpeningRef = useRef(onVaultOpening)

  useEffect(() => {
    onSwitchRef.current = onSwitch
    onToastRef.current = onToast
    onVaultOpeningRef.current = onVaultOpening
  })

  const persistedState = usePersistedVaultState(onSwitchRef)
  const {
    defaultAvailable,
    defaultPath,
    extraVaults,
    hiddenDefaults,
    loaded,
    selectedVaultPath,
    vaultPath,
  } = persistedState
  const { allVaults, defaultVaults, isGettingStartedHidden } = useVaultCollections(
    defaultAvailable,
    defaultPath,
    hiddenDefaults,
    extraVaults,
  )
  const {
    handleCreateEmptyVault,
    handleOpenLocalFolder,
    handleVaultCloned,
    registerVaultSelection,
    removeVault,
    restoreGettingStarted,
    syncVaultSelection,
    switchVault,
  } = useVaultActions({
    ...persistedState,
    allVaults,
    defaultVaults,
    isGettingStartedHidden,
    onSwitchRef,
    onToastRef,
    onVaultOpeningRef,
  })

  return {
    allVaults,
    defaultPath,
    handleCreateEmptyVault,
    handleOpenLocalFolder,
    handleVaultCloned,
    isGettingStartedHidden,
    loaded,
    registerVaultSelection,
    removeVault,
    restoreGettingStarted,
    selectedVaultPath,
    syncVaultSelection,
    switchVault,
    vaultPath,
  }
}
