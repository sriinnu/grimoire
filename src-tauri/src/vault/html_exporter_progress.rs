use std::fs;
use std::path::{Path, PathBuf};
use std::sync::atomic::{AtomicBool, Ordering};
use walkdir::WalkDir;

use super::exporter::VaultExportReport;
use super::exporter_progress::VaultExportProgressEvent;
use super::html_exporter::{
    canonical_dir, copy_asset, is_markdown, relative_path, should_enter, should_skip_file,
    unique_archive_dir, write_index, write_markdown_page,
};
use super::locality_attachments::local_only_referenced_attachments;

enum HtmlExportFileKind {
    Markdown,
    Asset,
}

struct HtmlExportFile {
    source_path: PathBuf,
    relative_path: PathBuf,
    kind: HtmlExportFileKind,
}

/// Writes a static HTML archive while reporting progress and honoring cancellation.
pub fn export_static_html_archive_with_progress<F>(
    vault_path: &Path,
    target_path: &Path,
    cancelled: &AtomicBool,
    on_progress: &F,
) -> Result<VaultExportReport, String>
where
    F: Fn(VaultExportProgressEvent) + ?Sized,
{
    let vault_root = canonical_dir(vault_path, "Vault")?;
    let target_root = unique_archive_dir(&vault_root, target_path)?;
    let (files, skipped_files) = collect_html_exportable_files(&vault_root)?;
    let total_files = files.len();
    on_progress(VaultExportProgressEvent::Started { total_files });
    check_cancelled(cancelled, &target_root, on_progress)?;

    fs::create_dir_all(&target_root)
        .map_err(|e| format!("Failed to create HTML export folder: {e}"))?;
    let mut pages = Vec::new();
    for (index, file) in files.iter().enumerate() {
        check_cancelled(cancelled, &target_root, on_progress)?;
        match file.kind {
            HtmlExportFileKind::Markdown => pages.push(write_markdown_page(
                &target_root,
                &file.source_path,
                &file.relative_path,
            )?),
            HtmlExportFileKind::Asset => {
                copy_asset(&target_root, &file.source_path, &file.relative_path)?
            }
        }
        on_progress(VaultExportProgressEvent::Progress {
            processed_files: index + 1,
            total_files,
            current_path: file.relative_path.to_string_lossy().replace('\\', "/"),
        });
    }

    check_cancelled(cancelled, &target_root, on_progress)?;
    pages.sort_by(|left, right| left.title.cmp(&right.title));
    write_index(&target_root, &pages)?;
    let report = VaultExportReport {
        export_path: target_root.to_string_lossy().into_owned(),
        files_exported: files.len(),
        skipped_files,
    };
    on_progress(VaultExportProgressEvent::Finished {
        result: report.clone(),
    });
    Ok(report)
}

fn collect_html_exportable_files(
    vault_root: &Path,
) -> Result<(Vec<HtmlExportFile>, usize), String> {
    let local_only_attachments = local_only_referenced_attachments(vault_root)?;
    let mut files = Vec::new();
    let mut skipped_files = 0;
    for entry in WalkDir::new(vault_root)
        .follow_links(false)
        .into_iter()
        .filter_entry(should_enter)
    {
        let entry = entry.map_err(|e| format!("Failed to read vault for HTML export: {e}"))?;
        if !entry.file_type().is_file() {
            continue;
        }
        if should_skip_file(vault_root, &entry, &local_only_attachments) {
            skipped_files += 1;
            continue;
        }
        let relative_path = relative_path(vault_root, entry.path())?;
        let kind = if is_markdown(entry.path()) {
            HtmlExportFileKind::Markdown
        } else {
            HtmlExportFileKind::Asset
        };
        files.push(HtmlExportFile {
            source_path: entry.path().to_path_buf(),
            relative_path,
            kind,
        });
    }
    Ok((files, skipped_files))
}

fn check_cancelled<F>(
    cancelled: &AtomicBool,
    target_root: &Path,
    on_progress: &F,
) -> Result<(), String>
where
    F: Fn(VaultExportProgressEvent) + ?Sized,
{
    if !cancelled.load(Ordering::SeqCst) {
        return Ok(());
    }
    let _ = fs::remove_dir_all(target_root);
    on_progress(VaultExportProgressEvent::Cancelled);
    Err("Export cancelled".to_string())
}
