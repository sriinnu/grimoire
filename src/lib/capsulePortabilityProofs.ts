import type { PortabilityExportPreviewState } from './exportReviewGate'
import type { ImportAutopsyPreviewState } from './vaultPortability'
import type { PortabilityLiveProof } from './portabilityProof'

/** Builds redacted proof cards for reviewed JSON/SQLite capsule import previews. */
export function capsuleImportLiveProofs(
  preview?: ImportAutopsyPreviewState | null,
): readonly PortabilityLiveProof[] {
  const format = capsuleImportFormat(preview?.sourceId)
  if (!preview || !format) return []
  const id: PortabilityLiveProof['id'] = format === 'json'
    ? 'json-capsule-import-preview'
    : 'sqlite-capsule-import-preview'
  const label = format === 'json' ? 'JSON capsule import preview' : 'SQLite capsule import preview'
  const result = preview.result
  return [{
    id,
    label,
    status: result.failed_files > 0 ? 'needs review' : 'reviewed',
    detail: [
      `${result.notes_to_copy} notes`,
      `${result.assets_to_copy} assets`,
      `${result.skipped_files} withheld`,
      `${result.failed_files} failed`,
      proofFlag(result.writes_local_only_report, 'local-only report planned', 'local-only report missing'),
    ].join('; '),
  }]
}

/** Builds redacted proof cards for reviewed JSON/SQLite capsule export previews. */
export function capsuleExportLiveProofs(
  preview?: PortabilityExportPreviewState | null,
): readonly PortabilityLiveProof[] {
  if (!preview) return []
  const id: PortabilityLiveProof['id'] = preview.format === 'json'
    ? 'json-capsule-export-preview'
    : 'sqlite-capsule-export-preview'
  const label = preview.format === 'json' ? 'JSON capsule export preview' : 'SQLite capsule export preview'
  const { result } = preview
  const proof = result.locality_proof
  const redacted = proof.markdown_source_of_truth && proof.absolute_source_paths_redacted
  return [{
    id,
    label,
    status: redacted ? 'reviewed' : 'needs review',
    detail: [
      `${result.files_exportable} files`,
      `${result.notes_exportable} notes`,
      `${result.assets_exportable} assets`,
      `${proof.local_only_files_withheld} withheld`,
      `${result.bytes_exportable} bytes`,
      proofFlag(proof.markdown_source_of_truth, 'Markdown source of truth', 'Markdown source unclear'),
      proofFlag(proof.absolute_source_paths_redacted, 'absolute paths redacted', 'absolute paths need review'),
    ].join('; '),
  }]
}

function capsuleImportFormat(sourceId?: ImportAutopsyPreviewState['sourceId']): 'json' | 'sqlite' | null {
  if (sourceId === 'json-capsule-preview') return 'json'
  if (sourceId === 'sqlite-capsule-preview') return 'sqlite'
  return null
}

function proofFlag(enabled: boolean, enabledLabel: string, disabledLabel: string): string {
  return enabled ? enabledLabel : disabledLabel
}
