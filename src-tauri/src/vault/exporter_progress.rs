use serde::Serialize;
use std::fs::{self, File};
use std::path::{Path, PathBuf};
use std::sync::atomic::{AtomicBool, Ordering};
use walkdir::WalkDir;
use zip::write::FileOptions;

use super::exporter::{
    add_file_to_zip, canonical_dir, resolve_target_path, should_enter, should_skip_file,
    validate_target, VaultExportReport,
};
use super::locality_attachments::local_only_referenced_attachments;

#[derive(Debug, Clone, Serialize, PartialEq, Eq)]
#[serde(tag = "event", content = "data")]
pub enum VaultExportProgressEvent {
    #[serde(rename_all = "camelCase")]
    Started {
        total_files: usize,
    },
    #[serde(rename_all = "camelCase")]
    Progress {
        processed_files: usize,
        total_files: usize,
        current_path: String,
    },
    Cancelled,
    #[serde(rename_all = "camelCase")]
    Finished {
        result: VaultExportReport,
    },
}

/// Writes a portable Markdown ZIP archive while reporting progress and honoring cancellation.
pub fn export_markdown_zip_with_progress<F>(
    vault_path: &Path,
    target_path: &Path,
    cancelled: &AtomicBool,
    on_progress: &F,
) -> Result<VaultExportReport, String>
where
    F: Fn(VaultExportProgressEvent) + ?Sized,
{
    let vault_root = canonical_dir(vault_path, "Vault")?;
    let target = resolve_target_path(target_path);
    validate_target(&vault_root, &target)?;
    if let Some(parent) = target.parent() {
        fs::create_dir_all(parent).map_err(|e| format!("Failed to create export folder: {e}"))?;
    }

    let (files, skipped_files) = collect_exportable_files(&vault_root)?;
    let total_files = files.len();
    on_progress(VaultExportProgressEvent::Started { total_files });
    check_cancelled(cancelled, &target, on_progress)?;

    let file = File::create(&target).map_err(|e| format!("Failed to create ZIP export: {e}"))?;
    let mut zip = zip::ZipWriter::new(file);
    let options = FileOptions::default()
        .compression_method(zip::CompressionMethod::Deflated)
        .unix_permissions(0o644);
    for (index, source_path) in files.iter().enumerate() {
        check_cancelled(cancelled, &target, on_progress)?;
        add_file_to_zip(&vault_root, source_path, &mut zip, options)?;
        on_progress(VaultExportProgressEvent::Progress {
            processed_files: index + 1,
            total_files,
            current_path: relative_path(&vault_root, source_path)?,
        });
    }
    check_cancelled(cancelled, &target, on_progress)?;
    zip.finish()
        .map_err(|e| format!("Failed to finish ZIP export: {e}"))?;
    let report = VaultExportReport {
        export_path: target.to_string_lossy().into_owned(),
        files_exported: files.len(),
        skipped_files,
    };
    on_progress(VaultExportProgressEvent::Finished {
        result: report.clone(),
    });
    Ok(report)
}

fn collect_exportable_files(vault_root: &Path) -> Result<(Vec<PathBuf>, usize), String> {
    let local_only_attachments = local_only_referenced_attachments(vault_root)?;
    let mut files = Vec::new();
    let mut skipped_files = 0;
    for entry in WalkDir::new(vault_root)
        .follow_links(false)
        .into_iter()
        .filter_entry(should_enter)
    {
        let entry = entry.map_err(|e| format!("Failed to read vault for export: {e}"))?;
        if !entry.file_type().is_file() {
            continue;
        }
        if should_skip_file(vault_root, &entry, &local_only_attachments) {
            skipped_files += 1;
        } else {
            files.push(entry.path().to_path_buf());
        }
    }
    Ok((files, skipped_files))
}

fn relative_path(vault_root: &Path, source_path: &Path) -> Result<String, String> {
    source_path
        .strip_prefix(vault_root)
        .map(|path| path.to_string_lossy().replace('\\', "/"))
        .map_err(|_| "Failed to resolve vault file during export".to_string())
}

fn check_cancelled<F>(cancelled: &AtomicBool, target: &Path, on_progress: &F) -> Result<(), String>
where
    F: Fn(VaultExportProgressEvent) + ?Sized,
{
    if !cancelled.load(Ordering::SeqCst) {
        return Ok(());
    }
    let _ = fs::remove_file(target);
    on_progress(VaultExportProgressEvent::Cancelled);
    Err("Export cancelled".to_string())
}
