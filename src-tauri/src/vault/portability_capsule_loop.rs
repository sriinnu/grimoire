use chrono::Utc;
use serde::Serialize;
use std::path::Path;

use super::portability_capsule::{
    export_portability_capsule, preview_portability_capsule, PortabilityCapsuleFormat,
};
use super::portability_capsule_import::preview_portability_capsule_import;

#[derive(Debug, Clone, Serialize, PartialEq, Eq)]
pub struct PortabilityCapsuleLoopProofReport {
    pub proof_level: String,
    pub format: PortabilityCapsuleFormat,
    pub status: String,
    pub checked_at: String,
    pub export_signature_captured: bool,
    pub import_signature_captured: bool,
    pub files_exported: usize,
    pub notes_exported: usize,
    pub notes_previewed_for_import: usize,
    pub assets_exported: usize,
    pub assets_previewed_for_import: usize,
    pub local_only_files_withheld: usize,
    pub local_only_rows_previewed: usize,
    pub markdown_source_of_truth: bool,
    pub absolute_source_paths_redacted: bool,
    pub local_only_report_planned: bool,
    pub artifact_path_stored: bool,
}

/// Runs a local export-to-import preview loop for a generated JSON/SQLite capsule.
pub fn run_portability_capsule_loop_proof(
    vault_path: &Path,
    format: PortabilityCapsuleFormat,
) -> Result<PortabilityCapsuleLoopProofReport, String> {
    let export_preview = preview_portability_capsule(vault_path, format)?;
    let temp_dir = tempfile::tempdir()
        .map_err(|e| format!("Failed to create temporary capsule proof folder: {e}"))?;
    let capsule_path = temp_dir
        .path()
        .join(format!("grimoire-loop.{}", extension(format)));
    let export_report = export_portability_capsule(
        vault_path,
        capsule_path.as_path(),
        format,
        export_preview.preview_signature.as_str(),
    )?;
    let import_preview = preview_portability_capsule_import(
        vault_path,
        Path::new(&export_report.export_path),
        format,
    )?;
    let status = proof_status(&export_preview, &import_preview);

    Ok(PortabilityCapsuleLoopProofReport {
        proof_level: "local-artifact-loop".to_string(),
        format,
        status: status.to_string(),
        checked_at: Utc::now().to_rfc3339(),
        export_signature_captured: !export_preview.preview_signature.trim().is_empty(),
        import_signature_captured: import_preview
            .preview_signature
            .as_deref()
            .map(str::trim)
            .is_some_and(|signature| !signature.is_empty()),
        files_exported: export_report.files_exported,
        notes_exported: export_preview.notes_exportable,
        notes_previewed_for_import: import_preview.notes_to_copy,
        assets_exported: export_preview.assets_exportable,
        assets_previewed_for_import: import_preview.assets_to_copy,
        local_only_files_withheld: export_preview.skipped_files,
        local_only_rows_previewed: import_preview.skipped_files,
        markdown_source_of_truth: export_preview.locality_proof.markdown_source_of_truth,
        absolute_source_paths_redacted: export_preview
            .locality_proof
            .absolute_source_paths_redacted,
        local_only_report_planned: import_preview.writes_local_only_report,
        artifact_path_stored: false,
    })
}

fn proof_status(
    export_preview: &super::portability_capsule::PortabilityCapsulePreviewReport,
    import_preview: &super::MarkdownFolderImportPreview,
) -> &'static str {
    let proof = &export_preview.locality_proof;
    if proof.markdown_source_of_truth
        && proof.absolute_source_paths_redacted
        && export_preview.notes_exportable == import_preview.notes_to_copy
        && export_preview.assets_exportable == import_preview.assets_to_copy
        && export_preview.skipped_files == import_preview.skipped_files
        && import_preview.failed_files == 0
        && import_preview.writes_local_only_report
    {
        "passed"
    } else {
        "needs_review"
    }
}

fn extension(format: PortabilityCapsuleFormat) -> &'static str {
    match format {
        PortabilityCapsuleFormat::Json => "json",
        PortabilityCapsuleFormat::Sqlite => "sqlite",
    }
}
