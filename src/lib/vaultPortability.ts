export type VaultPortabilityStatus = 'ready' | 'planned'
export type VaultStorageKind = 'local-folder' | 'git' | 'cloud-folder' | 'object-storage'

export interface VaultImportSource {
  id: string
  label: string
  status: VaultPortabilityStatus
  input: string
  output: 'vault-folder'
  preservesMarkdown: boolean
}

export interface VaultExportTarget {
  id: string
  label: string
  status: VaultPortabilityStatus
  output: string
  portable: boolean
}

export interface VaultStorageProvider {
  id: string
  label: string
  kind: VaultStorageKind
  status: VaultPortabilityStatus
  localFirst: boolean
  requiresLocalWorkingCopy: boolean
}

const IMPORT_SOURCES = [
  {
    id: 'markdown-folder',
    label: 'Markdown folder',
    status: 'ready',
    input: 'Existing folder of .md files and attachments',
    output: 'vault-folder',
    preservesMarkdown: true,
  },
  {
    id: 'markdown-zip',
    label: 'Markdown ZIP',
    status: 'planned',
    input: 'Archive containing .md files and attachments',
    output: 'vault-folder',
    preservesMarkdown: true,
  },
  {
    id: 'bear',
    label: 'Bear',
    status: 'planned',
    input: 'Bear Markdown export',
    output: 'vault-folder',
    preservesMarkdown: true,
  },
  {
    id: 'day-one',
    label: 'Day One',
    status: 'planned',
    input: 'Day One export converted into Markdown notes',
    output: 'vault-folder',
    preservesMarkdown: false,
  },
  {
    id: 'obsidian',
    label: 'Obsidian',
    status: 'planned',
    input: 'Obsidian vault folder',
    output: 'vault-folder',
    preservesMarkdown: true,
  },
  {
    id: 'notion-markdown',
    label: 'Notion Markdown',
    status: 'planned',
    input: 'Notion Markdown + CSV export',
    output: 'vault-folder',
    preservesMarkdown: false,
  },
] as const satisfies readonly VaultImportSource[]

const EXPORT_TARGETS = [
  {
    id: 'vault-folder',
    label: 'Vault folder',
    status: 'ready',
    output: 'Plain Markdown files and attachments on disk',
    portable: true,
  },
  {
    id: 'git-remote',
    label: 'Git remote',
    status: 'ready',
    output: 'Versioned Markdown vault pushed to a remote',
    portable: true,
  },
  {
    id: 'markdown-zip',
    label: 'Markdown ZIP',
    status: 'planned',
    output: 'Portable archive of notes, attachments, and metadata',
    portable: true,
  },
  {
    id: 'static-html',
    label: 'Static HTML archive',
    status: 'planned',
    output: 'Read-only HTML pages generated from Markdown',
    portable: true,
  },
] as const satisfies readonly VaultExportTarget[]

const STORAGE_PROVIDERS = [
  {
    id: 'local-folder',
    label: 'Local folder',
    kind: 'local-folder',
    status: 'ready',
    localFirst: true,
    requiresLocalWorkingCopy: true,
  },
  {
    id: 'git',
    label: 'Git remote',
    kind: 'git',
    status: 'ready',
    localFirst: true,
    requiresLocalWorkingCopy: true,
  },
  {
    id: 'icloud-drive',
    label: 'iCloud Drive',
    kind: 'cloud-folder',
    status: 'planned',
    localFirst: true,
    requiresLocalWorkingCopy: true,
  },
  {
    id: 'google-drive-desktop',
    label: 'Google Drive Desktop',
    kind: 'cloud-folder',
    status: 'planned',
    localFirst: true,
    requiresLocalWorkingCopy: true,
  },
  {
    id: 's3',
    label: 'Amazon S3',
    kind: 'object-storage',
    status: 'planned',
    localFirst: true,
    requiresLocalWorkingCopy: true,
  },
  {
    id: 'azure-blob',
    label: 'Azure Blob Storage',
    kind: 'object-storage',
    status: 'planned',
    localFirst: true,
    requiresLocalWorkingCopy: true,
  },
] as const satisfies readonly VaultStorageProvider[]

/** Lists app import adapters from external note systems into a Grimoire vault. */
export function listVaultImportSources(): readonly VaultImportSource[] {
  return IMPORT_SOURCES
}

/** Lists supported and planned export targets for a Grimoire vault. */
export function listVaultExportTargets(): readonly VaultExportTarget[] {
  return EXPORT_TARGETS
}

/** Lists storage/sync locations that can back a local-first Grimoire vault. */
export function listVaultStorageProviders(): readonly VaultStorageProvider[] {
  return STORAGE_PROVIDERS
}

/** Finds one storage provider by its stable id. */
export function getVaultStorageProvider(id: string): VaultStorageProvider | null {
  return STORAGE_PROVIDERS.find(provider => provider.id === id) ?? null
}

/** Returns whether the provider can be represented as a normal local folder. */
export function isFilesystemBackedStorageProvider(provider: VaultStorageProvider): boolean {
  return provider.kind === 'local-folder' || provider.kind === 'cloud-folder' || provider.kind === 'git'
}
