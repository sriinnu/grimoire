import { describe, expect, it } from 'vitest'
import {
  capsuleLoopArtifactProofPassed,
  listCapsuleLoopArtifactProofSteps,
  type PortabilityCapsuleLoopLiveProof,
} from './portabilityCapsuleLoopLiveProof'

const passedProof: PortabilityCapsuleLoopLiveProof = {
  absolute_source_paths_redacted: true,
  artifact_path_stored: false,
  assets_exported: 1,
  assets_previewed_for_import: 1,
  checked_at: '2026-05-29T00:00:00Z',
  export_signature_captured: true,
  files_exported: 4,
  format: 'json',
  import_signature_captured: true,
  local_only_files_withheld: 2,
  local_only_report_planned: true,
  local_only_rows_previewed: 2,
  markdown_source_of_truth: true,
  notes_exported: 3,
  notes_previewed_for_import: 3,
  proof_level: 'local-artifact-loop',
  status: 'passed',
}

describe('portabilityCapsuleLoopLiveProof', () => {
  it('marks a generated capsule loop proof as passed only when every local safety contract holds', () => {
    expect(capsuleLoopArtifactProofPassed(passedProof)).toBe(true)
    expect(listCapsuleLoopArtifactProofSteps(passedProof)).toEqual([
      { id: 'export-signature', status: 'done' },
      { id: 'import-signature', status: 'done' },
      { id: 'count-match', status: 'done' },
      { id: 'locality-proof', status: 'done' },
      { id: 'path-redaction', status: 'done' },
    ])
    expect(JSON.stringify(listCapsuleLoopArtifactProofSteps(passedProof))).not.toContain('/Users/')
  })

  it('downgrades the exact failed proof contracts without exposing artifact paths', () => {
    const brokenProof: PortabilityCapsuleLoopLiveProof = {
      ...passedProof,
      absolute_source_paths_redacted: false,
      artifact_path_stored: true,
      assets_previewed_for_import: 0,
      import_signature_captured: false,
      local_only_report_planned: false,
      status: 'needs_review',
    }

    expect(capsuleLoopArtifactProofPassed(brokenProof)).toBe(false)
    expect(listCapsuleLoopArtifactProofSteps(brokenProof)).toEqual([
      { id: 'export-signature', status: 'done' },
      { id: 'import-signature', status: 'warning' },
      { id: 'count-match', status: 'warning' },
      { id: 'locality-proof', status: 'warning' },
      { id: 'path-redaction', status: 'warning' },
    ])
  })
})
