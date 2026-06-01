import type { VaultOption } from '../components/StatusBar'
import { invoke } from '../lib/tauriRuntime'
import { isTauri, mockInvoke } from '../mock-tauri'
import { loadVaultList } from '../utils/vaultListStore'

export const GETTING_STARTED_LABEL = 'Getting Started'

declare const __DEMO_VAULT_PATH__: string | undefined

/** Build-time demo vault path. Production Tauri builds resolve the real path at runtime. */
const STATIC_DEFAULT_PATH = typeof __DEMO_VAULT_PATH__ !== 'undefined' ? __DEMO_VAULT_PATH__ : ''

/** Mutable exported default-vault option used by legacy tests and status-bar callers. */
export const DEFAULT_VAULTS: VaultOption[] = [
  { label: GETTING_STARTED_LABEL, path: STATIC_DEFAULT_PATH },
]

/** Returns the display label Grimoire uses when a folder has no saved vault name. */
export function labelFromPath(path: string): string {
  return path.split(/[\\/]/u).pop() || 'Local Vault'
}

/** Invokes Tauri in-app and mock Tauri in browser tests. */
export function tauriCall<T>(command: string, args: Record<string, unknown>): Promise<T> {
  return isTauri() ? invoke<T>(command, args) : mockInvoke<T>(command, args)
}

/** Serializes persisted vault state for cheap save de-duplication. */
export function serializePersistedVaultSnapshot(
  vaults: VaultOption[],
  activeVault: string | null,
  hiddenDefaults: string[],
): string {
  return JSON.stringify({
    activeVault,
    hiddenDefaults,
    vaults: vaults.map(({ id, label, path, storageProvider, syncProvider }) => ({
      id: id ?? null,
      label,
      path,
      storageProvider: storageProvider ?? 'local-folder',
      syncProvider: syncProvider ?? 'none',
    })),
  })
}

/** Keeps the legacy DEFAULT_VAULTS export aligned with the runtime default path. */
export function syncDefaultVaultExport(path: string) {
  DEFAULT_VAULTS[0] = { label: GETTING_STARTED_LABEL, path }
}

/** Checks whether a candidate vault path exists without treating failures as fatal. */
export async function checkVaultAvailability(path: string): Promise<boolean> {
  if (!path) {
    return false
  }

  try {
    return await tauriCall<boolean>('check_vault_exists', { path })
  } catch {
    return false
  }
}

/** Loads, sanitizes, and resolves persisted vault state for the app shell. */
export async function loadInitialVaultState() {
  const [vaultListResult, defaultPathResult] = await Promise.allSettled([
    loadVaultList(),
    resolveDefaultPath(),
  ])
  const { vaults, activeVault, hiddenDefaults } = vaultListResult.status === 'fulfilled'
    ? vaultListResult.value
    : { vaults: [], activeVault: null, hiddenDefaults: [] }
  const resolvedDefaultPath = defaultPathResult.status === 'fulfilled'
    ? defaultPathResult.value
    : ''
  const defaultAvailable = await checkVaultAvailability(resolvedDefaultPath)

  if (vaultListResult.status === 'rejected') {
    console.warn('Failed to load vault list:', vaultListResult.reason)
  }

  const sanitizedState = sanitizeCanonicalGettingStartedState({
    activeVault,
    defaultAvailable,
    hiddenDefaults,
    resolvedDefaultPath,
    vaults,
  })
  const persistedSnapshot = serializePersistedVaultSnapshot(vaults, activeVault, hiddenDefaults)

  return {
    ...sanitizedState,
    persistedSnapshot,
  }
}

/** Builds the visible default-vault collection after availability is known. */
export function buildDefaultVaults({
  defaultAvailable,
  defaultPath,
}: {
  defaultAvailable: boolean
  defaultPath: string
}): VaultOption[] {
  if (!defaultAvailable || !defaultPath) {
    return []
  }

  return [{ label: GETTING_STARTED_LABEL, path: defaultPath }]
}

/** Removes hidden default vaults from the visible vault list. */
export function buildVisibleDefaultVaults({
  defaultVaults,
  hiddenDefaults,
}: {
  defaultVaults: VaultOption[]
  hiddenDefaults: string[]
}): VaultOption[] {
  return defaultVaults.filter(vault => !hiddenDefaults.includes(vault.path))
}

/** Joins default and user-added vaults in the order the sidebar/status bar expects. */
export function buildAllVaults({
  visibleDefaults,
  extraVaults,
}: {
  visibleDefaults: VaultOption[]
  extraVaults: VaultOption[]
}): VaultOption[] {
  return [...visibleDefaults, ...extraVaults]
}

/** Returns the static dev default path, or asks native code for the user's default vault path. */
export async function resolveDefaultPath(): Promise<string> {
  if (STATIC_DEFAULT_PATH) {
    return STATIC_DEFAULT_PATH
  }

  try {
    return await tauriCall<string>('get_default_vault_path', {})
  } catch {
    return ''
  }
}

function isCanonicalGettingStartedPath(path: string, resolvedDefaultPath: string): boolean {
  return path === resolvedDefaultPath
}

function isUnavailableGettingStartedVault(vault: VaultOption): boolean {
  return vault.label === GETTING_STARTED_LABEL && vault.available === false
}

function shouldDropPersistedGettingStartedVault(vault: VaultOption, resolvedDefaultPath: string): boolean {
  return isCanonicalGettingStartedPath(vault.path, resolvedDefaultPath) || isUnavailableGettingStartedVault(vault)
}

function sanitizeCanonicalGettingStartedState({
  activeVault,
  defaultAvailable,
  hiddenDefaults,
  resolvedDefaultPath,
  vaults,
}: {
  activeVault: string | null
  defaultAvailable: boolean
  hiddenDefaults: string[]
  resolvedDefaultPath: string
  vaults: VaultOption[]
}) {
  if (!resolvedDefaultPath) {
    return { activeVault, defaultAvailable, hiddenDefaults, resolvedDefaultPath, vaults }
  }

  const filteredVaults = vaults.filter(
    (vault) => !shouldDropPersistedGettingStartedVault(vault, resolvedDefaultPath),
  )
  const removedStarterPaths = new Set(
    vaults
      .filter((vault) => shouldDropPersistedGettingStartedVault(vault, resolvedDefaultPath))
      .map((vault) => vault.path),
  )
  const sanitizedActiveVault = resolveSanitizedGettingStartedSelection({
    activeVault,
    defaultAvailable,
    filteredVaults,
    removedStarterPaths,
    resolvedDefaultPath,
  })

  return {
    activeVault: sanitizedActiveVault,
    defaultAvailable,
    hiddenDefaults,
    resolvedDefaultPath,
    vaults: filteredVaults,
  }
}

function resolveSanitizedGettingStartedSelection({
  activeVault,
  defaultAvailable,
  filteredVaults,
  removedStarterPaths,
  resolvedDefaultPath,
}: {
  activeVault: string | null
  defaultAvailable: boolean
  filteredVaults: VaultOption[]
  removedStarterPaths: Set<string>
  resolvedDefaultPath: string
}): string | null {
  if (!activeVault || !removedStarterPaths.has(activeVault)) {
    return activeVault
  }

  if (isCanonicalGettingStartedPath(activeVault, resolvedDefaultPath) && defaultAvailable) {
    return activeVault
  }

  return filteredVaults[0]?.path ?? null
}
