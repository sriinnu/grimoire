import { describe, expect, it } from 'vitest'
import type { ImportAutopsyPreviewState } from './vaultPortability'
import { hasReviewedImportPreview, importRequiresReview, reviewedImportSourcePath } from './importReviewGate'

const preview: ImportAutopsyPreviewState = {
  sourceId: 'day-one-preview',
  result: {
    source_path: '/local/day-one.zip',
    planned_import_root: '/vault/imports/day-one',
    notes_to_copy: 1,
    assets_to_copy: 0,
    skipped_files: 0,
    failed_files: 0,
    writes_local_only_report: true,
  },
}

const capsulePreview: ImportAutopsyPreviewState = {
  sourceId: 'json-capsule-preview',
  result: {
    ...preview.result,
    source_path: '/local/grimoire.json',
    preview_signature: 'capsule-import-preview-v1:test',
  },
}

describe('importReviewGate', () => {
  it('requires matching no-write previews before import writes can use a source path', () => {
    expect(importRequiresReview('day-one')).toBe(true)
    expect(importRequiresReview('day-one-preview')).toBe(false)
    expect(hasReviewedImportPreview('day-one', preview)).toBe(true)
    expect(hasReviewedImportPreview('journey', preview)).toBe(false)
    expect(reviewedImportSourcePath('day-one', preview)).toBe('/local/day-one.zip')
    expect(reviewedImportSourcePath('journey', preview)).toBeNull()
  })

  it('requires capsule import previews to carry the exact preview signature', () => {
    expect(hasReviewedImportPreview('json-capsule', capsulePreview)).toBe(true)
    expect(reviewedImportSourcePath('json-capsule', capsulePreview)).toBe('/local/grimoire.json')
    expect(hasReviewedImportPreview('json-capsule', {
      ...capsulePreview,
      result: { ...capsulePreview.result, preview_signature: '' },
    })).toBe(false)
  })
})
