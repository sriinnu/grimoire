import { invoke } from '../lib/tauriRuntime'
import { isTauri, mockInvoke } from '../mock-tauri'
import type { VaultOption } from '../components/StatusBar'

const DEFAULT_STORAGE_PROVIDER = 'local-folder'

interface PersistedVaultEntry {
  id?: string | null
  label: string
  path: string
  storage_provider?: string
  sync_provider?: string
}

export interface PersistedVaultList {
  vaults: PersistedVaultEntry[]
  active_vault: string | null
  hidden_defaults: string[]
}

function tauriCall<T>(command: string, args: Record<string, unknown>): Promise<T> {
  return isTauri() ? invoke<T>(command, args) : mockInvoke<T>(command, args)
}

async function detectGitSync(path: string): Promise<boolean> {
  try {
    return Boolean(await tauriCall<boolean>('is_git_repo', { vaultPath: path }))
  } catch {
    return false
  }
}

function needsGitProbe(v: PersistedVaultEntry): boolean {
  return !v.sync_provider || v.sync_provider === 'git'
}

function resolveEntrySyncProvider(v: PersistedVaultEntry, available: boolean, isGitRepo: boolean): string {
  if (v.sync_provider && v.sync_provider !== 'git') return v.sync_provider
  if (!available) return v.sync_provider ?? 'git'
  return isGitRepo ? 'git' : 'none'
}

function toVaultOption(v: PersistedVaultEntry, available: boolean, isGitRepo: boolean): VaultOption {
  return {
    id: v.id ?? null,
    label: v.label,
    path: v.path,
    storageProvider: v.storage_provider ?? DEFAULT_STORAGE_PROVIDER,
    syncProvider: resolveEntrySyncProvider(v, available, isGitRepo),
    available,
  }
}

async function checkVaultExists(path: string): Promise<boolean> {
  try {
    return Boolean(await tauriCall<boolean>('check_vault_exists', { path }))
  } catch {
    return false
  }
}

/**
 * Existence and the git probe run concurrently: both gate the vault list at
 * launch, and awaiting them in sequence cost an extra IPC round-trip per vault.
 */
async function checkAvailability(v: PersistedVaultEntry): Promise<VaultOption> {
  const [exists, isGitRepo] = await Promise.all([
    checkVaultExists(v.path),
    needsGitProbe(v) ? detectGitSync(v.path) : Promise.resolve(false),
  ])
  return toVaultOption(v, exists, isGitRepo)
}

function resolveOptionSyncProvider(v: VaultOption): string {
  const configuredProvider = v.syncProvider ?? 'none'
  return configuredProvider
}

async function toPersistedVaultEntry(v: VaultOption): Promise<PersistedVaultEntry> {
  return {
    id: v.id ?? null,
    label: v.label,
    path: v.path,
    storage_provider: v.storageProvider ?? DEFAULT_STORAGE_PROVIDER,
    sync_provider: resolveOptionSyncProvider(v),
  }
}

export async function loadVaultList(): Promise<{ vaults: VaultOption[]; activeVault: string | null; hiddenDefaults: string[] }> {
  const data = await tauriCall<PersistedVaultList>('load_vault_list', {})
  const persisted = data?.vaults ?? []
  const checked = await Promise.all(persisted.map(checkAvailability))
  return { vaults: checked, activeVault: data?.active_vault ?? null, hiddenDefaults: data?.hidden_defaults ?? [] }
}

export async function saveVaultList(vaults: VaultOption[], activeVault: string | null, hiddenDefaults: string[] = []): Promise<void> {
  const list: PersistedVaultList = {
    vaults: await Promise.all(vaults.map(toPersistedVaultEntry)),
    active_vault: activeVault,
    hidden_defaults: hiddenDefaults,
  }
  return tauriCall('save_vault_list', { list })
}
