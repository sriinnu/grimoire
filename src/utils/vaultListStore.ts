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

async function resolveEntrySyncProvider(v: PersistedVaultEntry, available: boolean): Promise<string> {
  if (v.sync_provider && v.sync_provider !== 'git') return v.sync_provider
  if (!available) return v.sync_provider ?? 'git'
  if (await detectGitSync(v.path)) return 'git'
  return 'none'
}

async function toVaultOption(v: PersistedVaultEntry, available: boolean): Promise<VaultOption> {
  return {
    id: v.id ?? null,
    label: v.label,
    path: v.path,
    storageProvider: v.storage_provider ?? DEFAULT_STORAGE_PROVIDER,
    syncProvider: await resolveEntrySyncProvider(v, available),
    available,
  }
}

async function checkAvailability(v: PersistedVaultEntry): Promise<VaultOption> {
  try {
    const exists = await tauriCall<boolean>('check_vault_exists', { path: v.path })
    return toVaultOption(v, exists)
  } catch {
    return toVaultOption(v, false)
  }
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
