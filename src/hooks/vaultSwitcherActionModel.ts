import type { Dispatch, MutableRefObject, SetStateAction } from 'react'
import type { VaultOption } from '../components/StatusBar'
import { trackEvent } from '../lib/telemetry'
import { saveVaultList } from '../utils/vaultListStore'
import {
  checkVaultAvailability,
  labelFromPath,
  serializePersistedVaultSnapshot,
  tauriCall,
} from './vaultSwitcherShared'

/** Options used when registering a selected folder as a vault. */
export interface RegisterVaultSelectionOptions {
  onBeforeSwitch?: (target: VaultOpeningTarget) => void
  verifyAvailability?: boolean
  storageProvider?: VaultOption['storageProvider']
  syncProvider?: VaultOption['syncProvider']
}

/** Label and path for a vault transition that is ready to be shown as loading. */
export interface VaultOpeningTarget {
  label: string
  path: string
}

/** The next vault-list and selection state after registration. */
export interface RegisteredVaultSelection {
  nextDefaultAvailable: boolean
  nextExtraVaults: VaultOption[]
  nextHiddenDefaults: string[]
  nextSelectedVaultPath: string
}

/** Inputs required to restore the default Getting Started vault. */
export interface RestoreGettingStartedOptions {
  defaultPath: string
  onToastRef: MutableRefObject<(msg: string) => void>
  setDefaultAvailable: Dispatch<SetStateAction<boolean>>
  setHiddenDefaults: Dispatch<SetStateAction<string[]>>
  switchVault: (path: string) => void
}

interface AddVaultToListOptions {
  label: string
  path: string
  setExtraVaults: Dispatch<SetStateAction<VaultOption[]>>
  storageProvider?: VaultOption['storageProvider']
  syncProvider?: VaultOption['syncProvider']
}

interface RemainingVaultOptions {
  defaultVaults: VaultOption[]
  extraVaults: VaultOption[]
  hiddenDefaults: string[]
  isDefault: boolean
  removedPath: string
}

interface RemoveVaultStateOptions extends RemainingVaultOptions {
  selectedVaultPath: string | null
  onSwitchRef: MutableRefObject<() => void>
  setExtraVaults: Dispatch<SetStateAction<VaultOption[]>>
  setHiddenDefaults: Dispatch<SetStateAction<string[]>>
  setSelectedVaultPath: Dispatch<SetStateAction<string | null>>
  setVaultPath: Dispatch<SetStateAction<string>>
  vaultPath: string
}

/** Formats network and clone failures for restoring the Getting Started vault. */
export function formatGettingStartedRestoreError(err: unknown): string {
  const message =
    typeof err === 'string'
      ? err
      : err instanceof Error
        ? err.message
        : `${err}`

  const networkErrors = [
    'unable to access',
    'Could not resolve host',
    'network',
    'timed out',
  ]

  if (networkErrors.some(fragment => message.includes(fragment))) {
    return 'Getting Started requires internet. Clone it later.'
  }

  return `Could not prepare Getting Started vault: ${message}`
}

/** Formats native empty-vault creation failures for user-facing toasts. */
export function formatCreateEmptyVaultError(err: unknown): string {
  const message =
    typeof err === 'string'
      ? err
      : err instanceof Error
        ? err.message
        : `${err}`

  if (message.includes('Choose an empty folder')) {
    return message
  }

  return `Could not create empty vault: ${message}`
}

/** Ensures the default vault exists, creating it through native code when needed. */
export async function ensureGettingStartedVaultReady(path: string): Promise<void> {
  const exists = await tauriCall<boolean>('check_vault_exists', { path })
  if (!exists) {
    await tauriCall<string>('create_getting_started_vault', { targetPath: path })
  }
}

/** Restores the Getting Started vault and switches to it when native prep succeeds. */
export async function restoreGettingStartedVault({
  defaultPath,
  onToastRef,
  setDefaultAvailable,
  setHiddenDefaults,
  switchVault,
}: RestoreGettingStartedOptions) {
  if (!defaultPath) {
    onToastRef.current('Could not resolve the Getting Started vault path')
    return
  }

  try {
    await ensureGettingStartedVaultReady(defaultPath)
    setDefaultAvailable(true)
    setHiddenDefaults(previousHidden => previousHidden.filter(path => path !== defaultPath))
    switchVault(defaultPath)
    onToastRef.current('Getting Started vault ready')
  } catch (err) {
    onToastRef.current(formatGettingStartedRestoreError(err))
  }
}

/** Adds or refreshes an extra vault entry while keeping local-first defaults. */
export function addVaultToList({
  setExtraVaults,
  path,
  label,
  storageProvider,
  syncProvider,
}: AddVaultToListOptions) {
  setExtraVaults(previousVaults => {
    const exists = previousVaults.some(vault => vault.path === path)
    return exists
      ? previousVaults.map(vault => vault.path === path
        ? {
            ...vault,
            label: vault.label || label,
            storageProvider: storageProvider ?? vault.storageProvider ?? 'local-folder',
            syncProvider: syncProvider ?? vault.syncProvider ?? 'none',
            available: true,
          }
        : vault)
      : [...previousVaults, {
          label,
          path,
          storageProvider: storageProvider ?? 'local-folder',
          syncProvider: syncProvider ?? 'none',
          available: true,
        }]
  })
}

/** Builds the next persisted vault selection after opening, creating, or cloning. */
export function buildRegisteredVaultSelection({
  defaultAvailable,
  defaultPath,
  extraVaults,
  hiddenDefaults,
  label,
  path,
  storageProvider,
  syncProvider,
}: {
  defaultAvailable: boolean
  defaultPath: string
  extraVaults: VaultOption[]
  hiddenDefaults: string[]
  label: string
  path: string
  storageProvider?: VaultOption['storageProvider']
  syncProvider?: VaultOption['syncProvider']
}): RegisteredVaultSelection {
  const isCanonicalDefaultVault = path === defaultPath && defaultPath.length > 0

  return {
    nextDefaultAvailable: isCanonicalDefaultVault ? true : defaultAvailable,
    nextExtraVaults: isCanonicalDefaultVault
      ? extraVaults.filter((vault) => vault.path !== path)
      : upsertAvailableVaultOption(extraVaults, path, label, { storageProvider, syncProvider }),
    nextHiddenDefaults: isCanonicalDefaultVault
      ? hiddenDefaults.filter((hiddenPath) => hiddenPath !== path)
      : hiddenDefaults,
    nextSelectedVaultPath: path,
  }
}

/** Saves the selected vault list before applying it to React state. */
export async function persistRegisteredVaultSelection({
  hiddenDefaults,
  lastPersistedSnapshotRef,
  selectedVaultPath,
  vaults,
}: {
  hiddenDefaults: string[]
  lastPersistedSnapshotRef: MutableRefObject<string | null>
  selectedVaultPath: string
  vaults: VaultOption[]
}): Promise<void> {
  const nextSnapshot = serializePersistedVaultSnapshot(
    vaults,
    selectedVaultPath,
    hiddenDefaults,
  )
  await saveVaultList(vaults, selectedVaultPath, hiddenDefaults)
  lastPersistedSnapshotRef.current = nextSnapshot
}

/** Applies an already-computed vault registration to local React state. */
export function applyRegisteredVaultSelection({
  nextDefaultAvailable,
  nextExtraVaults,
  nextHiddenDefaults,
  nextSelectedVaultPath,
  onSwitchRef,
  setDefaultAvailable,
  setExtraVaults,
  setHiddenDefaults,
  setSelectedVaultPath,
  setVaultPath,
}: RegisteredVaultSelection & {
  onSwitchRef: MutableRefObject<() => void>
  setDefaultAvailable: Dispatch<SetStateAction<boolean>>
  setExtraVaults: Dispatch<SetStateAction<VaultOption[]>>
  setHiddenDefaults: Dispatch<SetStateAction<string[]>>
  setSelectedVaultPath: Dispatch<SetStateAction<string | null>>
  setVaultPath: Dispatch<SetStateAction<string>>
}) {
  setDefaultAvailable(nextDefaultAvailable)
  setExtraVaults(nextExtraVaults)
  setHiddenDefaults(nextHiddenDefaults)
  switchVaultPath({
    setSelectedVaultPath,
    setVaultPath,
    onSwitchRef,
    path: nextSelectedVaultPath,
  })
}

/** Switches the active vault and emits the telemetry event for the transition. */
export function switchVaultPath({
  setSelectedVaultPath,
  setVaultPath,
  onSwitchRef,
  path,
}: {
  setSelectedVaultPath: Dispatch<SetStateAction<string | null>>
  setVaultPath: Dispatch<SetStateAction<string>>
  onSwitchRef: MutableRefObject<() => void>
  path: string
}) {
  trackEvent('vault_switched')
  setSelectedVaultPath(path)
  setVaultPath(path)
  onSwitchRef.current()
}

/** Rejects unavailable local folders before registering them as vaults. */
export async function ensureVaultCanBeRegistered(path: string): Promise<void> {
  const exists = await checkVaultAvailability(path)
  if (!exists) {
    throw new Error('Selected folder is not available')
  }
}

/** Removes a vault from state and selects a remaining vault when needed. */
export function removeVaultFromState({
  defaultVaults,
  extraVaults,
  hiddenDefaults,
  isDefault,
  onSwitchRef,
  removedPath,
  setExtraVaults,
  setHiddenDefaults,
  setSelectedVaultPath,
  setVaultPath,
  selectedVaultPath,
  vaultPath,
}: RemoveVaultStateOptions) {
  if (isDefault) {
    setHiddenDefaults(previousHidden => previousHidden.includes(removedPath) ? previousHidden : [...previousHidden, removedPath])
  } else {
    setExtraVaults(previousVaults => previousVaults.filter(vault => vault.path !== removedPath))
  }

  if (vaultPath !== removedPath) {
    if (selectedVaultPath === removedPath) {
      setSelectedVaultPath(null)
    }
    return
  }

  const remainingVaults = listRemainingVaults({
    defaultVaults,
    extraVaults,
    hiddenDefaults,
    isDefault,
    removedPath,
  })
  if (remainingVaults.length === 0) {
    setSelectedVaultPath(null)
    return
  }

  const nextPath = remainingVaults[0].path
  setSelectedVaultPath(nextPath)
  setVaultPath(nextPath)
  onSwitchRef.current()
}

/** Returns the display name for a vault that was just removed from the list. */
export function getRemovedVaultLabel({
  path,
  defaultVaults,
  extraVaults,
}: {
  path: string
  defaultVaults: VaultOption[]
  extraVaults: VaultOption[]
}): string {
  const removedVault = [...defaultVaults, ...extraVaults].find(vault => vault.path === path)
  return removedVault?.label ?? labelFromPath(path)
}

function upsertAvailableVaultOption(
  extraVaults: VaultOption[],
  path: string,
  label: string,
  metadata: Pick<VaultOption, 'storageProvider' | 'syncProvider'> = {},
): VaultOption[] {
  const existingVault = extraVaults.find((vault) => vault.path === path)
  if (!existingVault) {
    return [...extraVaults, {
      label,
      path,
      storageProvider: metadata.storageProvider ?? 'local-folder',
      syncProvider: metadata.syncProvider ?? 'none',
      available: true,
    }]
  }

  return extraVaults.map((vault) => (
    vault.path === path
      ? {
          ...vault,
          label: vault.label || label,
          storageProvider: metadata.storageProvider ?? vault.storageProvider ?? 'local-folder',
          syncProvider: metadata.syncProvider ?? vault.syncProvider ?? 'none',
          available: true,
        }
      : vault
  ))
}

function listRemainingVaults({
  defaultVaults,
  extraVaults,
  hiddenDefaults,
  isDefault,
  removedPath,
}: RemainingVaultOptions) {
  const visibleDefaults = defaultVaults.filter(vault => (
    vault.path !== removedPath
    && (!isDefault || !hiddenDefaults.includes(vault.path))
  ))

  return [...visibleDefaults, ...extraVaults.filter(vault => vault.path !== removedPath)]
}
