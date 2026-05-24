use serde::Serialize;
use std::fs;
use std::path::{Path, PathBuf};

#[derive(Debug, Clone, Serialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum ObjectStorageSyncOperationKind {
    Upload,
    Download,
    DeleteRemote,
    Conflict,
    Exclude,
}

#[derive(Debug, Clone, Serialize, PartialEq, Eq)]
pub struct ObjectStorageSyncOperation {
    pub kind: ObjectStorageSyncOperationKind,
    pub path: String,
    pub reason: String,
}

#[derive(Debug, Clone, Serialize, PartialEq, Eq)]
pub struct ObjectStorageSyncReport {
    pub provider_id: String,
    pub direction: String,
    pub mirror_path: String,
    pub preview_signature: String,
    pub applied: bool,
    pub files_to_upload: usize,
    pub files_to_download: usize,
    pub files_to_delete: usize,
    pub conflicts: usize,
    pub excluded_files: usize,
    pub operations: Vec<ObjectStorageSyncOperation>,
    pub sync_report_path: Option<String>,
    pub conflict_artifacts: Vec<String>,
}

pub(crate) fn count_kind(
    operations: &[ObjectStorageSyncOperation],
    kind: ObjectStorageSyncOperationKind,
) -> usize {
    operations
        .iter()
        .filter(|operation| operation.kind == kind)
        .count()
}

pub(crate) fn operation(
    kind: ObjectStorageSyncOperationKind,
    path: &str,
    reason: &str,
) -> ObjectStorageSyncOperation {
    ObjectStorageSyncOperation {
        kind,
        path: path.to_string(),
        reason: reason.to_string(),
    }
}

pub(crate) fn write_conflict_artifact(
    vault_root: &Path,
    mirror_root: &Path,
    report: &ObjectStorageSyncReport,
    relative_path: &str,
) -> Result<PathBuf, String> {
    let artifact_path = vault_root
        .join(".grimoire")
        .join("sync-conflicts")
        .join(&report.provider_id)
        .join(&report.direction)
        .join(format!("{relative_path}.conflict.md"));
    if let Some(parent) = artifact_path.parent() {
        fs::create_dir_all(parent).map_err(|e| format!("Failed to create conflict folder: {e}"))?;
    }
    fs::write(
        &artifact_path,
        format_conflict_artifact(mirror_root, report, relative_path),
    )
    .map_err(|e| format!("Failed to write conflict artifact: {e}"))?;
    Ok(artifact_path)
}

pub(crate) fn write_sync_report(
    vault_root: &Path,
    report: &ObjectStorageSyncReport,
    conflict_artifacts: &[String],
) -> Result<PathBuf, String> {
    let report_path = vault_root
        .join(".grimoire")
        .join("sync-reports")
        .join(format!(
            "{}-{}-report.md",
            report.provider_id, report.direction
        ));
    if let Some(parent) = report_path.parent() {
        fs::create_dir_all(parent).map_err(|e| format!("Failed to create report folder: {e}"))?;
    }
    fs::write(&report_path, format_sync_report(report, conflict_artifacts))
        .map_err(|e| format!("Failed to write sync report: {e}"))?;
    Ok(report_path)
}

fn format_conflict_artifact(
    mirror_root: &Path,
    report: &ObjectStorageSyncReport,
    relative_path: &str,
) -> String {
    format!(
        "---\ntype: Sync Conflict\nlocality: local\nprovider: {}\ndirection: {}\npath: {:?}\n---\n# Sync Conflict: {}\n\n- Provider: {}\n- Direction: {}\n- Local path: `{}`\n- Mirror path: `{}`\n\nResolve this manually, then run sync preview again.\n",
        report.provider_id,
        report.direction,
        relative_path,
        relative_path,
        report.provider_id,
        report.direction,
        relative_path,
        mirror_root.join(relative_path).display(),
    )
}

fn format_sync_report(report: &ObjectStorageSyncReport, conflict_artifacts: &[String]) -> String {
    let artifacts = if conflict_artifacts.is_empty() {
        "None".to_string()
    } else {
        conflict_artifacts
            .iter()
            .map(|path| format!("- `{path}`"))
            .collect::<Vec<_>>()
            .join("\n")
    };

    format!(
        "---\ntype: Sync Report\nlocality: local\nprovider: {}\ndirection: {}\n---\n# Object Storage Sync Report\n\n- Provider: {}\n- Direction: {}\n- Mirror: `{}`\n- Uploads: {}\n- Downloads: {}\n- Deletes: {}\n- Conflicts: {}\n- Excluded local-only files: {}\n\n## Conflict Artifacts\n\n{}\n",
        report.provider_id,
        report.direction,
        report.provider_id,
        report.direction,
        report.mirror_path,
        report.files_to_upload,
        report.files_to_download,
        report.files_to_delete,
        report.conflicts,
        report.excluded_files,
        artifacts,
    )
}
