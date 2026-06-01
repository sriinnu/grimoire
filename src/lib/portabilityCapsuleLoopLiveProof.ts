import type { PortabilityCapsuleFormat } from './portabilityCapsule'

export interface PortabilityCapsuleLoopLiveProof {
  proof_level: 'local-artifact-loop'
  format: PortabilityCapsuleFormat
  status: 'passed' | 'needs_review'
  checked_at: string
  export_signature_captured: boolean
  import_signature_captured: boolean
  files_exported: number
  notes_exported: number
  notes_previewed_for_import: number
  assets_exported: number
  assets_previewed_for_import: number
  local_only_files_withheld: number
  local_only_rows_previewed: number
  markdown_source_of_truth: boolean
  absolute_source_paths_redacted: boolean
  local_only_report_planned: boolean
  artifact_path_stored: boolean
}

export type PortabilityCapsuleArtifactStepId =
  | 'export-signature'
  | 'import-signature'
  | 'count-match'
  | 'locality-proof'
  | 'path-redaction'

export interface PortabilityCapsuleArtifactProofStep {
  id: PortabilityCapsuleArtifactStepId
  status: 'done' | 'warning'
}

/** Returns true when a generated capsule artifact passed a local export-to-preview loop. */
export function capsuleLoopArtifactProofPassed(proof: PortabilityCapsuleLoopLiveProof | null | undefined): boolean {
  return Boolean(
    proof
    && proof.status === 'passed'
    && proof.proof_level === 'local-artifact-loop'
    && proof.export_signature_captured
    && proof.import_signature_captured
    && proof.notes_exported === proof.notes_previewed_for_import
    && proof.assets_exported === proof.assets_previewed_for_import
    && proof.local_only_files_withheld === proof.local_only_rows_previewed
    && proof.markdown_source_of_truth
    && proof.absolute_source_paths_redacted
    && proof.local_only_report_planned
    && !proof.artifact_path_stored,
  )
}

/** Builds the visible generated-artifact proof checklist without exposing artifact paths. */
export function listCapsuleLoopArtifactProofSteps(
  proof: PortabilityCapsuleLoopLiveProof,
): PortabilityCapsuleArtifactProofStep[] {
  const countsMatch = (
    proof.notes_exported === proof.notes_previewed_for_import
    && proof.assets_exported === proof.assets_previewed_for_import
    && proof.local_only_files_withheld === proof.local_only_rows_previewed
  )
  const localityIntact = (
    proof.markdown_source_of_truth
    && proof.absolute_source_paths_redacted
    && proof.local_only_report_planned
  )

  return [
    {
      id: 'export-signature',
      status: proof.export_signature_captured ? 'done' : 'warning',
    },
    {
      id: 'import-signature',
      status: proof.import_signature_captured ? 'done' : 'warning',
    },
    {
      id: 'count-match',
      status: countsMatch ? 'done' : 'warning',
    },
    {
      id: 'locality-proof',
      status: localityIntact ? 'done' : 'warning',
    },
    {
      id: 'path-redaction',
      status: !proof.artifact_path_stored ? 'done' : 'warning',
    },
  ]
}
