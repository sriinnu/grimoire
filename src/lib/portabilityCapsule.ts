export type PortabilityCapsuleFormat = 'json' | 'sqlite'

export interface PortabilityCapsuleProof {
  markdown_source_of_truth: boolean
  absolute_source_paths_redacted: boolean
  local_only_files_withheld: number
}

export interface PortabilityCapsuleManifestRow {
  kind: 'markdown' | 'text' | 'asset' | 'withheld'
  path: string
  bytes: number
  sha256?: string | null
  reason?: string | null
}

export interface PortabilityCapsulePreviewResult {
  format: PortabilityCapsuleFormat
  files_exportable: number
  notes_exportable: number
  assets_exportable: number
  skipped_files: number
  bytes_exportable: number
  locality_proof: PortabilityCapsuleProof
  manifest_rows: PortabilityCapsuleManifestRow[]
}

/** Returns the compact human label for a local portability capsule format. */
export function portabilityCapsuleFormatLabel(format: PortabilityCapsuleFormat): string {
  return format === 'json' ? 'JSON snapshot' : 'SQLite snapshot'
}
