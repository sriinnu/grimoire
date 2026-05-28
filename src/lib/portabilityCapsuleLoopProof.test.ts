import { describe, expect, it } from 'vitest'
import type { PortabilityExportPreviewState } from './exportReviewGate'
import type { ImportAutopsyPreviewState } from './vaultPortability'
import { buildPortabilityCapsuleLoopProof } from './portabilityCapsuleLoopProof'

const jsonExportPreview: PortabilityExportPreviewState = {
  format: 'json',
  result: {
    assets_exportable: 1,
    bytes_exportable: 2048,
    files_exportable: 4,
    format: 'json',
    preview_signature: 'capsule-preview-v1:test',
    locality_proof: {
      absolute_source_paths_redacted: true,
      local_only_files_withheld: 2,
      markdown_source_of_truth: true,
    },
    manifest_rows: [{ bytes: 128, kind: 'markdown', path: '/Users/sriinnu/private.md' }],
    notes_exportable: 3,
    skipped_files: 2,
  },
}

const jsonImportPreview: ImportAutopsyPreviewState = {
  sourceId: 'json-capsule-preview',
  result: {
    assets_to_copy: 1,
    failed_files: 0,
    manifest_rows: [{ detail: '/Users/sriinnu/private.md', kind: 'withheld', source_path: '/Users/sriinnu/private.md' }],
    notes_to_copy: 3,
    planned_import_root: '/Users/sriinnu/Grimoire/imports/json',
    preview_signature: 'capsule-import-preview-v1:test',
    skipped_files: 2,
    source_path: '/Users/sriinnu/capsule.json',
    writes_local_only_report: true,
  },
}

describe('portabilityCapsuleLoopProof', () => {
  it('marks matching reviewed export and no-write import previews as paired', () => {
    const proof = buildPortabilityCapsuleLoopProof({
      exportPreview: jsonExportPreview,
      importPreview: jsonImportPreview,
    })

    expect(proof).toMatchObject({
      detail: 'JSON export and matching no-write import previews are paired; apply still uses the reviewed action.',
      formatLabel: 'JSON',
      status: 'reviewed',
      statusLabel: 'preview-paired',
    })
    expect(proof.steps.map(step => [step.id, step.status])).toEqual([
      ['export-preview', 'done'],
      ['import-preview', 'done'],
      ['format-match', 'done'],
      ['locality-proof', 'done'],
    ])
    expect(JSON.stringify(proof)).not.toMatch(/\/Users\/|private\.md|secret|token|password/i)
  })

  it('does not treat mismatched capsule formats as a local loop proof', () => {
    const proof = buildPortabilityCapsuleLoopProof({
      exportPreview: jsonExportPreview,
      importPreview: {
        ...jsonImportPreview,
        sourceId: 'sqlite-capsule-preview',
      },
    })

    expect(proof.status).toBe('mismatch')
    expect(proof.formatLabel).toBe('JSON / SQLite')
    expect(proof.steps.find(step => step.id === 'format-match')?.status).toBe('warning')
  })

  it('keeps failed imports or broken locality proof in review state', () => {
    const proof = buildPortabilityCapsuleLoopProof({
      exportPreview: {
        ...jsonExportPreview,
        result: {
          ...jsonExportPreview.result,
          locality_proof: {
            ...jsonExportPreview.result.locality_proof,
            absolute_source_paths_redacted: false,
          },
        },
      },
      importPreview: {
        ...jsonImportPreview,
        result: {
          ...jsonImportPreview.result,
          failed_files: 1,
        },
      },
    })

    expect(proof.status).toBe('needs-review')
    expect(proof.steps.find(step => step.id === 'export-preview')?.status).toBe('warning')
    expect(proof.steps.find(step => step.id === 'import-preview')?.status).toBe('warning')
  })
})
