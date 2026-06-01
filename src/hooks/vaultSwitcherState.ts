import { useEffect, useMemo, useRef, useState } from 'react'
import type { Dispatch, MutableRefObject, SetStateAction } from 'react'
import type { VaultOption } from '../components/StatusBar'
import { saveVaultList } from '../utils/vaultListStore'
import {
  buildAllVaults,
  buildDefaultVaults,
  buildVisibleDefaultVaults,
  loadInitialVaultState,
  serializePersistedVaultSnapshot,
  syncDefaultVaultExport,
} from './vaultSwitcherShared'

/** Persisted vault state and setters owned by the vault switcher facade. */
export interface PersistedVaultState {
  defaultAvailable: boolean
  defaultPath: string
  extraVaults: VaultOption[]
  hiddenDefaults: string[]
  lastPersistedSnapshotRef: MutableRefObject<string | null>
  loaded: boolean
  selectedVaultPath: string | null
  setDefaultAvailable: Dispatch<SetStateAction<boolean>>
  setExtraVaults: Dispatch<SetStateAction<VaultOption[]>>
  setHiddenDefaults: Dispatch<SetStateAction<string[]>>
  setSelectedVaultPath: Dispatch<SetStateAction<string | null>>
  setVaultPath: Dispatch<SetStateAction<string>>
  vaultPath: string
}

/** Derived default, hidden-default, and full vault collections for UI callers. */
export interface VaultCollections {
  allVaults: VaultOption[]
  defaultVaults: VaultOption[]
  isGettingStartedHidden: boolean
}

interface PersistedVaultStore extends PersistedVaultState {
  setDefaultPath: Dispatch<SetStateAction<string>>
  setLoaded: Dispatch<SetStateAction<boolean>>
}

declare const __DEMO_VAULT_PATH__: string | undefined

const STATIC_DEFAULT_PATH = typeof __DEMO_VAULT_PATH__ !== 'undefined' ? __DEMO_VAULT_PATH__ : ''

function applyResolvedDefaultPath({
  defaultAvailable,
  resolvedDefaultPath,
  setDefaultAvailable,
  setDefaultPath,
}: {
  defaultAvailable: boolean
  resolvedDefaultPath: string
  setDefaultAvailable: Dispatch<SetStateAction<boolean>>
  setDefaultPath: Dispatch<SetStateAction<string>>
}) {
  setDefaultAvailable(defaultAvailable)

  if (!resolvedDefaultPath) {
    return
  }

  setDefaultPath(resolvedDefaultPath)
  syncDefaultVaultExport(resolvedDefaultPath)
}

function normalizeInitialSelectedVaultPath(
  activeVault: string | null,
  resolvedDefaultPath: string,
  vaults: VaultOption[],
): string | null {
  if (!activeVault) {
    return null
  }

  const isRememberedDefaultOnlySelection = activeVault === resolvedDefaultPath && vaults.length === 0
  return isRememberedDefaultOnlySelection ? null : activeVault
}

function applyInitialVaultTarget({
  activeVault,
  resolvedDefaultPath,
  setSelectedVaultPath,
  setVaultPath,
  onSwitchRef,
}: {
  activeVault: string | null
  resolvedDefaultPath: string
  setSelectedVaultPath: Dispatch<SetStateAction<string | null>>
  setVaultPath: Dispatch<SetStateAction<string>>
  onSwitchRef: MutableRefObject<() => void>
}) {
  if (activeVault) {
    setVaultPath(activeVault)
    setSelectedVaultPath(activeVault)
    onSwitchRef.current()
    return
  }

  if (resolvedDefaultPath) {
    setVaultPath(resolvedDefaultPath)
  }
}

/** Returns derived vault collections for the switcher UI. */
export function useVaultCollections(
  defaultAvailable: boolean,
  defaultPath: string,
  hiddenDefaults: string[],
  extraVaults: VaultOption[],
): VaultCollections {
  const defaultVaults = useMemo(
    () => buildDefaultVaults({ defaultAvailable, defaultPath }),
    [defaultAvailable, defaultPath],
  )
  const visibleDefaults = useMemo(
    () => buildVisibleDefaultVaults({ defaultVaults, hiddenDefaults }),
    [defaultVaults, hiddenDefaults],
  )
  const allVaults = useMemo(
    () => buildAllVaults({ visibleDefaults, extraVaults }),
    [extraVaults, visibleDefaults],
  )
  const isGettingStartedHidden = useMemo(
    () => hiddenDefaults.includes(defaultPath),
    [defaultPath, hiddenDefaults],
  )

  return { allVaults, defaultVaults, isGettingStartedHidden }
}

function useLoadPersistedVaultState(
  store: PersistedVaultStore,
  onSwitchRef: MutableRefObject<() => void>,
) {
  const {
    lastPersistedSnapshotRef,
    setDefaultAvailable,
    setDefaultPath,
    setExtraVaults,
    setHiddenDefaults,
    setLoaded,
    setSelectedVaultPath,
    setVaultPath,
  } = store

  useEffect(() => {
    let cancelled = false

    loadInitialVaultState()
      .then(({ activeVault, defaultAvailable, hiddenDefaults: hidden, persistedSnapshot, resolvedDefaultPath, vaults }) => {
        if (cancelled) return

        lastPersistedSnapshotRef.current = persistedSnapshot
        setExtraVaults(vaults)
        setHiddenDefaults(hidden)
        applyResolvedDefaultPath({
          defaultAvailable,
          resolvedDefaultPath,
          setDefaultAvailable,
          setDefaultPath,
        })
        applyInitialVaultTarget({
          activeVault: normalizeInitialSelectedVaultPath(activeVault, resolvedDefaultPath, vaults),
          resolvedDefaultPath,
          setSelectedVaultPath,
          setVaultPath,
          onSwitchRef,
        })
      })
      .finally(() => {
        if (!cancelled) {
          setLoaded(true)
        }
      })

    return () => { cancelled = true }
  }, [lastPersistedSnapshotRef, onSwitchRef, setDefaultAvailable, setDefaultPath, setExtraVaults, setHiddenDefaults, setLoaded, setSelectedVaultPath, setVaultPath])
}

function usePersistedVaultStorage(store: PersistedVaultStore) {
  const { extraVaults, hiddenDefaults, lastPersistedSnapshotRef, loaded, selectedVaultPath } = store

  useEffect(() => {
    if (!loaded) return

    const snapshot = serializePersistedVaultSnapshot(extraVaults, selectedVaultPath, hiddenDefaults)

    if (lastPersistedSnapshotRef.current === snapshot) {
      return
    }

    saveVaultList(extraVaults, selectedVaultPath, hiddenDefaults)
      .then(() => {
        lastPersistedSnapshotRef.current = snapshot
      })
      .catch(err => {
        console.warn('Failed to persist vault list:', err)
      })
  }, [extraVaults, hiddenDefaults, lastPersistedSnapshotRef, loaded, selectedVaultPath])
}

/** Loads and persists the vault switcher's selected path and saved vault list. */
export function usePersistedVaultState(onSwitchRef: MutableRefObject<() => void>): PersistedVaultState {
  const [vaultPath, setVaultPath] = useState(STATIC_DEFAULT_PATH)
  const [selectedVaultPath, setSelectedVaultPath] = useState<string | null>(null)
  const [extraVaults, setExtraVaults] = useState<VaultOption[]>([])
  const [hiddenDefaults, setHiddenDefaults] = useState<string[]>([])
  const [defaultAvailable, setDefaultAvailable] = useState(false)
  const lastPersistedSnapshotRef = useRef<string | null>(null)
  const [loaded, setLoaded] = useState(false)
  const [defaultPath, setDefaultPath] = useState(STATIC_DEFAULT_PATH)

  const store: PersistedVaultStore = {
    defaultAvailable,
    defaultPath,
    extraVaults,
    hiddenDefaults,
    lastPersistedSnapshotRef,
    loaded,
    selectedVaultPath,
    setDefaultAvailable,
    setDefaultPath,
    setExtraVaults,
    setHiddenDefaults,
    setLoaded,
    setSelectedVaultPath,
    setVaultPath,
    vaultPath,
  }

  useLoadPersistedVaultState(store, onSwitchRef)
  usePersistedVaultStorage(store)

  return {
    defaultAvailable,
    defaultPath,
    extraVaults,
    hiddenDefaults,
    lastPersistedSnapshotRef,
    loaded,
    selectedVaultPath,
    setDefaultAvailable,
    setExtraVaults,
    setHiddenDefaults,
    setSelectedVaultPath,
    setVaultPath,
    vaultPath,
  }
}
