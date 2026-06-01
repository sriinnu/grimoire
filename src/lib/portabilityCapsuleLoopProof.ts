import type { PortabilityExportPreviewState } from './exportReviewGate'
import type { PortabilityCapsuleFormat } from './portabilityCapsule'
import type { ImportAutopsyPreviewState } from './vaultPortability'

export type PortabilityCapsuleLoopStatus = 'missing' | 'mismatch' | 'needs-review' | 'reviewed'
export type PortabilityCapsuleLoopStepStatus = 'done' | 'missing' | 'warning'

export interface PortabilityCapsuleLoopStep {
  id: 'export-preview' | 'import-preview' | 'format-match' | 'locality-proof'
  label: string
  status: PortabilityCapsuleLoopStepStatus
}

export interface PortabilityCapsuleLoopProof {
  detail: string
  formatLabel: string
  status: PortabilityCapsuleLoopStatus
  statusLabel: string
  steps: PortabilityCapsuleLoopStep[]
}

/** Builds a redacted proof summary for the local JSON/SQLite export -> import preview loop. */
export function buildPortabilityCapsuleLoopProof({
  exportPreview,
  importPreview,
}: {
  exportPreview?: PortabilityExportPreviewState | null
  importPreview?: ImportAutopsyPreviewState | null
}): PortabilityCapsuleLoopProof {
  const exportFormat = exportPreview?.format ?? null
  const importFormat = capsuleImportFormat(importPreview?.sourceId)
  const hasExport = Boolean(exportPreview)
  const hasImport = Boolean(importPreview)
  const formatMatch = Boolean(exportFormat && importFormat && exportFormat === importFormat)
  const exportReviewed = Boolean(exportPreview && exportLocalityReviewed(exportPreview))
  const importReviewed = Boolean(importPreview && importLocalityReviewed(importPreview))
  const status = loopStatus({ exportReviewed, formatMatch, hasExport, hasImport, importReviewed })

  return {
    detail: loopDetail(status, exportFormat, importFormat),
    formatLabel: loopFormatLabel(exportFormat, importFormat),
    status,
    statusLabel: loopStatusLabel(status),
    steps: [
      {
        id: 'export-preview',
        label: 'Reviewed export preview',
        status: hasExport ? exportReviewed ? 'done' : 'warning' : 'missing',
      },
      {
        id: 'import-preview',
        label: 'No-write import preview',
        status: hasImport ? importReviewed ? 'done' : 'warning' : 'missing',
      },
      {
        id: 'format-match',
        label: 'Matching capsule format',
        status: hasExport && hasImport ? formatMatch ? 'done' : 'warning' : 'missing',
      },
      {
        id: 'locality-proof',
        label: 'Locality proof intact',
        status: exportReviewed && importReviewed && formatMatch ? 'done' : hasExport || hasImport ? 'warning' : 'missing',
      },
    ],
  }
}

function loopStatus({
  exportReviewed,
  formatMatch,
  hasExport,
  hasImport,
  importReviewed,
}: {
  exportReviewed: boolean
  formatMatch: boolean
  hasExport: boolean
  hasImport: boolean
  importReviewed: boolean
}): PortabilityCapsuleLoopStatus {
  if (!hasExport || !hasImport) return 'missing'
  if (!formatMatch) return 'mismatch'
  if (!exportReviewed || !importReviewed) return 'needs-review'
  return 'reviewed'
}

function loopStatusLabel(status: PortabilityCapsuleLoopStatus): string {
  if (status === 'reviewed') return 'preview-paired'
  if (status === 'mismatch') return 'format mismatch'
  if (status === 'needs-review') return 'needs review'
  return 'not paired'
}

function loopDetail(
  status: PortabilityCapsuleLoopStatus,
  exportFormat: PortabilityCapsuleFormat | null,
  importFormat: PortabilityCapsuleFormat | null,
): string {
  if (status === 'reviewed') {
    return `${formatName(exportFormat)} export and matching no-write import previews are paired; apply still uses the reviewed action.`
  }
  if (status === 'mismatch') {
    return `${formatName(exportFormat)} export preview is paired with ${formatName(importFormat)} import preview; run matching previews.`
  }
  if (status === 'needs-review') {
    return 'A capsule preview pair exists, but locality proof, failed imports, or local-only report state still needs review.'
  }
  return 'Preview a JSON or SQLite export, then preview the matching capsule import before calling the local round trip proven.'
}

function loopFormatLabel(
  exportFormat: PortabilityCapsuleFormat | null,
  importFormat: PortabilityCapsuleFormat | null,
): string {
  if (exportFormat && importFormat && exportFormat === importFormat) return formatName(exportFormat)
  if (exportFormat || importFormat) return `${formatName(exportFormat)} / ${formatName(importFormat)}`
  return 'No capsule'
}

function exportLocalityReviewed(preview: PortabilityExportPreviewState): boolean {
  const proof = preview.result.locality_proof
  return (
    preview.result.format === preview.format &&
    proof.absolute_source_paths_redacted &&
    proof.markdown_source_of_truth &&
    proof.local_only_files_withheld === preview.result.skipped_files
  )
}

function importLocalityReviewed(preview: ImportAutopsyPreviewState): boolean {
  return preview.result.failed_files === 0 && preview.result.writes_local_only_report
}

function capsuleImportFormat(sourceId?: ImportAutopsyPreviewState['sourceId']): PortabilityCapsuleFormat | null {
  if (sourceId === 'json-capsule-preview') return 'json'
  if (sourceId === 'sqlite-capsule-preview') return 'sqlite'
  return null
}

function formatName(format: PortabilityCapsuleFormat | null): string {
  if (format === 'json') return 'JSON'
  if (format === 'sqlite') return 'SQLite'
  return 'missing'
}
