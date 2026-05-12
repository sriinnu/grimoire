export type VaultPortabilityStatus = 'ready' | 'planned'
export type VaultStorageKind = 'local-folder' | 'git' | 'cloud-folder' | 'object-storage'
export type VaultStorageHealthState = 'active' | 'available' | 'not_selected' | 'planned'

export interface VaultImportSource {
  id: string
  label: string
  status: VaultPortabilityStatus
  input: string
  output: 'vault-folder'
  preservesMarkdown: boolean
  description: string
}

export interface VaultExportTarget {
  id: string
  label: string
  status: VaultPortabilityStatus
  output: string
  portable: boolean
  description: string
}

export interface VaultStorageProvider {
  id: string
  label: string
  kind: VaultStorageKind
  status: VaultPortabilityStatus
  localFirst: boolean
  requiresLocalWorkingCopy: boolean
  description: string
  userAction: string
}

export interface VaultStorageHealth {
  providerId: string
  state: VaultStorageHealthState
  message: string
}

export interface MarkdownFolderImportResult {
  imported_root: string
  report_path: string
  notes_copied: number
  assets_copied: number
  skipped_files: number
  failed_files: number
}

export interface MarkdownZipExportResult {
  export_path: string
  files_exported: number
  skipped_files: number
}

const IMPORT_SOURCES = [
  {
    id: 'markdown-folder',
    label: 'Markdown folder',
    status: 'ready',
    input: 'Existing folder of .md files and attachments',
    output: 'vault-folder',
    preservesMarkdown: true,
    description: 'Use an existing local Markdown folder as a Grimoire vault.',
  },
  {
    id: 'markdown-zip',
    label: 'Markdown ZIP',
    status: 'ready',
    input: 'Archive containing .md files and attachments',
    output: 'vault-folder',
    preservesMarkdown: true,
    description: 'Unpack a portable Markdown archive into the active vault with an import report.',
  },
  {
    id: 'bear',
    label: 'Bear',
    status: 'ready',
    input: 'Bear Markdown folder or TextBundle package folder',
    output: 'vault-folder',
    preservesMarkdown: true,
    description: 'Copy Bear Markdown/TextBundle exports into the vault with attachments and an import report.',
  },
  {
    id: 'day-one',
    label: 'Day One',
    status: 'ready',
    input: 'Day One JSON or JSON ZIP export',
    output: 'vault-folder',
    preservesMarkdown: false,
    description: 'Turn Day One journals into dated Markdown entries with media beside them.',
  },
  {
    id: 'journey',
    label: 'Journey',
    status: 'ready',
    input: 'Journey ZIP or JSON backup export',
    output: 'vault-folder',
    preservesMarkdown: false,
    description: 'Convert Journey backups into dated Markdown journal entries with media beside them.',
  },
  {
    id: 'obsidian',
    label: 'Obsidian',
    status: 'planned',
    input: 'Obsidian vault folder',
    output: 'vault-folder',
    preservesMarkdown: true,
    description: 'Read an Obsidian vault directly and normalize links where needed.',
  },
  {
    id: 'notion-markdown',
    label: 'Notion Markdown',
    status: 'planned',
    input: 'Notion Markdown + CSV export',
    output: 'vault-folder',
    preservesMarkdown: false,
    description: 'Convert Notion Markdown exports into clean files and documented metadata.',
  },
  {
    id: 'spanda',
    label: 'Spanda',
    status: 'planned',
    input: 'Spanda practice sessions, panchanga context, and practice library exports',
    output: 'vault-folder',
    preservesMarkdown: false,
    description: 'Map practice sessions and rituals into durable Sadhana Markdown notes.',
  },
] as const satisfies readonly VaultImportSource[]

const EXPORT_TARGETS = [
  {
    id: 'vault-folder',
    label: 'Vault folder',
    status: 'ready',
    output: 'Plain Markdown files and attachments on disk',
    portable: true,
    description: 'The live vault is already a portable Markdown folder.',
  },
  {
    id: 'git-remote',
    label: 'Git remote',
    status: 'ready',
    output: 'Versioned Markdown vault pushed to a remote',
    portable: true,
    description: 'Use Git as the versioned sync and backup layer.',
  },
  {
    id: 'markdown-zip',
    label: 'Markdown ZIP',
    status: 'ready',
    output: 'Portable archive of notes, attachments, and metadata',
    portable: true,
    description: 'Package the vault as a normal archive that any Markdown app can read.',
  },
  {
    id: 'static-html',
    label: 'Static HTML archive',
    status: 'planned',
    output: 'Read-only HTML pages generated from Markdown',
    portable: true,
    description: 'Generate a browsable archive for sharing and long-term reading.',
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
    description: 'Store the vault in any normal local folder.',
    userAction: 'Choose a folder on this Mac.',
  },
  {
    id: 'git',
    label: 'Git remote',
    kind: 'git',
    status: 'ready',
    localFirst: true,
    requiresLocalWorkingCopy: true,
    description: 'Sync through a Git remote while editing local Markdown.',
    userAction: 'Connect or initialize a Git remote.',
  },
  {
    id: 'icloud-drive',
    label: 'iCloud Drive',
    kind: 'cloud-folder',
    status: 'ready',
    localFirst: true,
    requiresLocalWorkingCopy: true,
    description: 'Use an iCloud Drive folder as the local working vault.',
    userAction: 'Choose or create a vault folder under iCloud Drive.',
  },
  {
    id: 'google-drive-desktop',
    label: 'Google Drive Desktop',
    kind: 'cloud-folder',
    status: 'ready',
    localFirst: true,
    requiresLocalWorkingCopy: true,
    description: 'Use a Google Drive Desktop folder as the local working vault.',
    userAction: 'Choose or create a vault folder under Google Drive.',
  },
  {
    id: 's3',
    label: 'Amazon S3',
    kind: 'object-storage',
    status: 'planned',
    localFirst: true,
    requiresLocalWorkingCopy: true,
    description: 'Mirror a local working vault to an S3 bucket through a sync adapter.',
    userAction: 'Configure bucket, region, and local credentials when the adapter lands.',
  },
  {
    id: 'azure-blob',
    label: 'Azure Blob Storage',
    kind: 'object-storage',
    status: 'planned',
    localFirst: true,
    requiresLocalWorkingCopy: true,
    description: 'Mirror a local working vault to Azure Blob Storage through a sync adapter.',
    userAction: 'Configure account, container, and local credentials when the adapter lands.',
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

/** Returns user-facing storage health for the current vault path. */
export function getVaultStorageHealth(vaultPath: string): readonly VaultStorageHealth[] {
  const normalizedPath = normalizeVaultPath(vaultPath)
  return STORAGE_PROVIDERS.map(provider => ({
    providerId: provider.id,
    ...healthForProvider(provider, normalizedPath),
  }))
}

/** Returns true when the current vault path is inside the provider's normal local folder. */
export function isVaultPathInStorageProvider(providerId: string, vaultPath: string): boolean {
  const provider = getVaultStorageProvider(providerId)
  if (!provider) return false
  return healthForProvider(provider, normalizeVaultPath(vaultPath)).state === 'active'
}

function healthForProvider(
  provider: VaultStorageProvider,
  normalizedPath: string,
): Pick<VaultStorageHealth, 'state' | 'message'> {
  if (provider.status === 'planned') {
    return { state: 'planned', message: 'Adapter planned around a local working copy.' }
  }
  if (provider.id === 'local-folder') {
    return normalizedPath
      ? { state: 'active', message: 'Current vault is a normal local folder.' }
      : { state: 'not_selected', message: provider.userAction }
  }
  if (provider.id === 'git') {
    return { state: 'available', message: 'Git health is shown in the status bar.' }
  }
  if (provider.id === 'icloud-drive') {
    return cloudFolderHealth(normalizedPath, isICloudDrivePath, 'Current vault is inside iCloud Drive.', provider.userAction)
  }
  if (provider.id === 'google-drive-desktop') {
    return cloudFolderHealth(
      normalizedPath,
      isGoogleDrivePath,
      'Current vault is inside Google Drive Desktop.',
      provider.userAction,
    )
  }
  return { state: 'available', message: provider.userAction }
}

function cloudFolderHealth(
  normalizedPath: string,
  matcher: (path: string) => boolean,
  activeMessage: string,
  fallbackMessage: string,
): Pick<VaultStorageHealth, 'state' | 'message'> {
  return normalizedPath && matcher(normalizedPath)
    ? { state: 'active', message: activeMessage }
    : { state: 'not_selected', message: fallbackMessage }
}

function normalizeVaultPath(vaultPath: string): string {
  return vaultPath.trim().replace(/\\/g, '/')
}

function isICloudDrivePath(path: string): boolean {
  return path.includes('/Library/Mobile Documents/com~apple~CloudDocs/')
    || path.endsWith('/Library/Mobile Documents/com~apple~CloudDocs')
    || path.includes('/iCloud Drive/')
}

function isGoogleDrivePath(path: string): boolean {
  return path.includes('/Library/CloudStorage/GoogleDrive-')
    || path.includes('/Google Drive/')
    || path.startsWith('/Volumes/GoogleDrive/')
}
