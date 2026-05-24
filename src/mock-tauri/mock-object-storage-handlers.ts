const DEFAULT_MOCK_VAULT_PATH = '/Users/mock/demo-vault-v2'

interface MockObjectStorageArgs {
  vaultPath?: string
  mirrorPath?: string
  providerId?: string
  direction?: 'push' | 'pull'
  previewSignature?: string
}

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
