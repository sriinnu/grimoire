import { describe, expect, it } from 'vitest'
import type { PortabilityExportPreviewState } from './exportReviewGate'
import { exportRequiresReview, hasReviewedExportPreview, reviewedExportFormat } from './exportReviewGate'

const preview: PortabilityExportPreviewState = {
  format: 'json',
  result: {
    format: 'json',
    preview_signature: 'capsule-preview-v1:test',
    files_exportable: 2,
    notes_exportable: 1,
    assets_exportable: 1,
    skipped_files: 1,
    bytes_exportable: 1024,
    locality_proof: {
      absolute_source_paths_redacted: true,
      local_only_files_withheld: 1,
      markdown_source_of_truth: true,
    },
    manifest_rows: [],
  },
}

describe('exportReviewGate', () => {
  it('requires matching capsule previews before JSON or SQLite export writes', () => {
    expect(exportRequiresReview('export-json')).toBe(true)
    expect(exportRequiresReview('export-markdown-zip')).toBe(false)
    expect(hasReviewedExportPreview('export-json', preview)).toBe(true)
    expect(hasReviewedExportPreview('export-sqlite', preview)).toBe(false)
    expect(reviewedExportFormat('export-json', preview)).toBe('json')
    expect(reviewedExportFormat('export-sqlite', preview)).toBeNull()
  })

  it('rejects capsule previews without a signature', () => {
    const unsignedPreview: PortabilityExportPreviewState = {
      ...preview,
      result: { ...preview.result, preview_signature: '' },
    }

    expect(hasReviewedExportPreview('export-json', unsignedPreview)).toBe(false)
    expect(reviewedExportFormat('export-json', unsignedPreview)).toBeNull()
  })
})
