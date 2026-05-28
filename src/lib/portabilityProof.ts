import {
  listVaultExportTargets,
  listVaultImportSources,
  listVaultStorageProviders,
  type VaultPortabilityStatus,
} from './vaultPortability'

export type PortabilityProofLevel =
  | 'fixture-regression'
  | 'local-regression'
  | 'provider-managed-local-folder'
  | 'local-mirror-fixture'
  | 'live-read-only-plus-local-mirror'

export type PortabilitySupportStatus = VaultPortabilityStatus | 'fixture'

export interface PortabilityProofRow {
  id: 'imports' | 'exports' | 'desktop-sync' | 'object-storage'
  label: string
  supportStatus: PortabilitySupportStatus
  proofLevel: PortabilityProofLevel
  detail: string
  evidence: string
  remainingProof: string
}

/** Builds the user-facing proof matrix for import, export, and sync support. */
export function listPortabilityProofRows(): readonly PortabilityProofRow[] {
  const importSources = listVaultImportSources()
  const exportTargets = listVaultExportTargets()
  const storageProviders = listVaultStorageProviders()
  const readyImports = importSources.filter(source => source.status === 'ready')
  const readyExports = exportTargets.filter(target => target.status === 'ready')
  const filesystemStorage = storageProviders.filter(provider => provider.status === 'ready')
  const objectStorageLabels = storageProviders
    .filter(provider => provider.kind === 'object-storage')
    .map(provider => provider.label)
    .join(', ')

  return [
    {
      id: 'imports',
      label: 'Importers',
      supportStatus: 'ready',
      proofLevel: 'fixture-regression',
      detail: `${readyImports.length} no-write preview adapters`,
      evidence: readyImports.map(source => source.label).join(', '),
      remainingProof: 'Live export corpus still needed for Bear TextBundle/Markdown, Day One JSON/ZIP, Apple Journal ZIP/HTML/JSON, Obsidian vaults, Notion ZIP/folders, Journey, and mixed Markdown ZIPs.',
    },
    {
      id: 'exports',
      label: 'Exports',
      supportStatus: 'ready',
      proofLevel: 'local-regression',
      detail: `${readyExports.length} portable exits`,
      evidence: 'Vault folder, Git remote, Markdown ZIP, static HTML; local-only lanes withheld.',
      remainingProof: 'Manual round-trip checks with external readers and large attachment-heavy vaults still open.',
    },
    {
      id: 'desktop-sync',
      label: 'Desktop sync',
      supportStatus: 'ready',
      proofLevel: 'provider-managed-local-folder',
      detail: `${filesystemStorage.length} provider-managed local working copies`,
      evidence: 'Local folder, Git, iCloud Drive, and Google Drive Desktop are normal folders; Settings can run local read proof for iCloud/GDrive without storing cloud credentials.',
      remainingProof: 'Provider quota, offline recovery, auth expiry, and conflicted-file behavior need live provider testing.',
    },
    {
      id: 'object-storage',
      label: 'Object storage',
      supportStatus: 'fixture',
      proofLevel: 'live-read-only-plus-local-mirror',
      detail: `${objectStorageLabels} local mirror sync plus S3/Azure preflights`,
      evidence: 'S3 has a read-only HeadBucket/ListObjectsV2 preflight, Azure has a read-only CLI container/list preflight, and push/pull preview, exact-preview apply, conflicts, deletes, and local-only excludes remain wired against a local mirror.',
      remainingProof: 'Live S3/Azure apply, retries, bucket/container permissions, and provider conflict states remain open.',
    },
  ]
}

/** Converts proof levels into compact labels for Settings badges. */
export function portabilityProofLevelLabel(level: PortabilityProofLevel): string {
  switch (level) {
    case 'fixture-regression':
      return 'fixture/regression'
    case 'local-regression':
      return 'local regression'
    case 'provider-managed-local-folder':
      return 'desktop folder'
    case 'local-mirror-fixture':
      return 'local mirror'
    case 'live-read-only-plus-local-mirror':
      return 'preflight + mirror'
  }
}
