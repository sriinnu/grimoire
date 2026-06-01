const DEFAULT_MOCK_VAULT_PATH = '/Users/mock/demo-vault-v2'

interface MockObjectStorageArgs {
  vaultPath?: string
  mirrorPath?: string
  providerId?: string
  direction?: 'push' | 'pull'
  previewSignature?: string
}

interface MockS3LivePreflightArgs {
  bucket?: string | null
  region?: string | null
  prefix?: string | null
}

interface MockS3ProviderSyncArgs extends MockS3LivePreflightArgs {
  vaultPath?: string
  direction?: 'push' | 'pull'
  previewSignature?: string
}

interface MockAzureLivePreflightArgs {
  account?: string | null
  container?: string | null
  prefix?: string | null
}

interface MockAzureProviderSyncArgs extends MockAzureLivePreflightArgs {
  vaultPath?: string
  direction?: 'push' | 'pull'
  previewSignature?: string
}

interface MockDesktopStorageHealthArgs {
  vaultPath?: string
  providerId?: 'icloud-drive' | 'google-drive-desktop'
}

const REDACTED_PROVIDER_TARGET = 'redacted provider target'

/** Builds a deterministic object-storage sync report for browser-mode tests. */
export function mockObjectStorageReport(args: MockObjectStorageArgs, applied: boolean) {
  const vault = args.vaultPath ?? DEFAULT_MOCK_VAULT_PATH
  const provider = args.providerId ?? 's3'
  const direction = args.direction ?? 'push'
  const uploadCount = direction === 'push' ? 2 : 0
  const downloadCount = direction === 'pull' ? 2 : 0
  const primaryOperation = direction === 'push'
    ? { kind: 'upload', path: 'notes/public.md', reason: 'Missing from object-storage mirror' }
    : { kind: 'download', path: 'notes/remote.md', reason: 'Missing from local working copy' }
  return {
    provider_id: provider,
    adapter_phase: 'local-mirror-prototype',
    prototype_mode: 'local-mirror-fixture',
    direction,
    mirror_path: args.mirrorPath ?? '/Users/mock/Object Storage Mirror',
    preview_signature: args.previewSignature ?? `mock-${provider}-preview-signature`,
    applied,
    files_to_upload: uploadCount,
    files_to_download: downloadCount,
    files_to_delete: direction === 'push' ? 1 : 0,
    conflicts: 0,
    excluded_files: 1,
    operations: [
      primaryOperation,
      { kind: 'exclude', path: 'Journal/private.md', reason: 'Protected by local-only policy' },
    ],
    sync_report_path: applied ? `${vault}/.grimoire/sync-reports/${provider}-${direction}-report.md` : null,
    conflict_artifacts: [],
  }
}

/** Builds a redacted browser-mode S3 preflight report without cloud calls. */
export function mockS3LivePreflightReport(args: MockS3LivePreflightArgs = {}) {
  const bucketConfigured = Boolean(args.bucket)
  const regionConfigured = Boolean(args.region)
  const prefixConfigured = Boolean(args.prefix)
  return {
    provider_id: 's3',
    proof_level: 'live-read-only-preflight',
    configured: bucketConfigured,
    status: bucketConfigured ? 'reachable' : 'missing_config',
    bucket_configured: bucketConfigured,
    region_configured: regionConfigured,
    prefix_configured: prefixConfigured,
    head_bucket_checked: bucketConfigured,
    list_prefix_checked: bucketConfigured,
    message: bucketConfigured
      ? 'S3 bucket and prefix are reachable through read-only HeadBucket/ListObjectsV2 checks.'
      : 'Set an S3 bucket before running the live read-only preflight.',
    checked_at: new Date(0).toISOString(),
  }
}

/** Builds a deterministic browser-mode S3 provider report without cloud calls. */
export function mockS3ProviderSyncReport(args: MockS3ProviderSyncArgs = {}, applied: boolean) {
  if (applied && !args.previewSignature?.trim()) {
    throw new Error('Run S3 provider preview before applying sync.')
  }
  const vault = args.vaultPath ?? DEFAULT_MOCK_VAULT_PATH
  const direction = args.direction ?? 'push'
  requiredMockTarget(args.bucket, 'Set an S3 bucket before previewing provider sync.')
  const transferKind = direction === 'push' ? 'upload' : 'download'
  return {
    provider_id: 's3',
    adapter_phase: 'provider-sdk-adapter',
    prototype_mode: 's3-live-provider',
    direction,
    mirror_path: REDACTED_PROVIDER_TARGET,
    preview_signature: args.previewSignature ?? 'mock-s3-provider-preview-signature',
    applied,
    files_to_upload: direction === 'push' ? 1 : 0,
    files_to_download: direction === 'pull' ? 1 : 0,
    files_to_delete: 0,
    conflicts: 0,
    excluded_files: 1,
    operations: [
      { kind: transferKind, path: 'notes/public.md', reason: 'Missing from S3 provider target' },
      { kind: 'exclude', path: 'Journal/private.md', reason: 'Protected by local-only policy' },
    ],
    sync_report_path: applied ? `${vault}/.grimoire/sync-reports/s3-provider-${direction}.md` : null,
    conflict_artifacts: [],
  }
}

/** Builds a deterministic browser-mode Azure provider report without cloud calls. */
export function mockAzureProviderSyncReport(args: MockAzureProviderSyncArgs = {}, applied: boolean) {
  if (applied && !args.previewSignature?.trim()) {
    throw new Error('Run Azure provider preview before applying sync.')
  }
  const vault = args.vaultPath ?? DEFAULT_MOCK_VAULT_PATH
  const direction = args.direction ?? 'push'
  requiredMockTarget(args.account, 'Set an Azure storage account before previewing provider sync.')
  requiredMockTarget(args.container, 'Set an Azure container before previewing provider sync.')
  const transferKind = direction === 'push' ? 'upload' : 'download'
  return {
    provider_id: 'azure-blob',
    adapter_phase: 'provider-sdk-adapter',
    prototype_mode: 'azure-live-provider',
    direction,
    mirror_path: REDACTED_PROVIDER_TARGET,
    preview_signature: args.previewSignature ?? 'mock-azure-provider-preview-signature',
    applied,
    files_to_upload: direction === 'push' ? 1 : 0,
    files_to_download: direction === 'pull' ? 1 : 0,
    files_to_delete: 0,
    conflicts: 0,
    excluded_files: 1,
    operations: [
      { kind: transferKind, path: 'notes/public.md', reason: 'Missing from Azure Blob provider target' },
      { kind: 'exclude', path: 'Journal/private.md', reason: 'Protected by local-only policy' },
    ],
    sync_report_path: applied ? `${vault}/.grimoire/sync-reports/azure-provider-${direction}.md` : null,
    conflict_artifacts: [],
  }
}

function requiredMockTarget(value: string | null | undefined, message: string): string {
  const clean = value?.trim()
  if (!clean) throw new Error(message)
  return clean
}

/** Builds a redacted browser-mode Azure preflight report without cloud calls. */
export function mockAzureLivePreflightReport(args: MockAzureLivePreflightArgs = {}) {
  const accountConfigured = Boolean(args.account)
  const containerConfigured = Boolean(args.container)
  const prefixConfigured = Boolean(args.prefix)
  const configured = accountConfigured && containerConfigured
  return {
    provider_id: 'azure-blob',
    proof_level: 'live-read-only-preflight',
    configured,
    status: configured ? 'reachable' : 'missing_config',
    account_configured: accountConfigured,
    container_configured: containerConfigured,
    prefix_configured: prefixConfigured,
    container_checked: configured,
    list_prefix_checked: configured,
    message: configured
      ? 'Azure container and prefix are reachable through read-only CLI container/list checks.'
      : 'Set an Azure storage account and container before running the live read-only preflight.',
    checked_at: new Date(0).toISOString(),
  }
}

/** Builds a redacted browser-mode desktop-folder health report without cloud credentials. */
export function mockDesktopStorageHealthReport(args: MockDesktopStorageHealthArgs = {}) {
  const provider = args.providerId ?? 'icloud-drive'
  const vaultPath = args.vaultPath ?? DEFAULT_MOCK_VAULT_PATH
  const active = provider === 'icloud-drive'
    ? vaultPath.includes('/Mobile Documents/com~apple~CloudDocs/') || vaultPath.includes('/iCloud Drive/')
    : vaultPath.includes('/CloudStorage/GoogleDrive-') || vaultPath.includes('/Google Drive/')
  return {
    provider_id: provider,
    proof_level: 'desktop-folder-read-check',
    configured: active,
    status: active ? 'ready' : 'not_selected',
    local_path_checked: true,
    provider_root_detected: active,
    vault_directory_checked: true,
    readable: true,
    credentials_stored: false,
    message: active
      ? 'Provider-managed local folder is readable. Cloud sync remains owned by the desktop provider.'
      : 'Current vault is not inside this desktop provider folder.',
    checked_at: new Date(0).toISOString(),
    risk_notes: [
      'No cloud credentials, account tokens, or remote file lists are read or stored by Grimoire.',
      'Provider quota, paused sync, offline recovery, and cross-device conflicts still belong to the desktop sync client.',
    ],
  }
}
