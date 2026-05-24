use std::fs;
use std::path::Path;
use std::sync::atomic::{AtomicBool, Ordering};
use tempfile::TempDir;

use super::app_importer::{
    copy_asset_file, copy_markdown_file, parse_kind, path_to_string, relative_import_path,
    unique_import_root, write_report, AppImportKind, AppImportState,
};
use super::app_importer_io::{
    canonical_dir, canonical_existing, is_attachment, is_markdown, prepare_import_source,
    validate_source_boundary, walk_files,
};
use super::importer::MarkdownFolderImportReport;
use super::importer_progress::MarkdownFolderImportProgressEvent;
use super::spanda_importer::import_spanda_export;

/// Imports an app export while reporting progress and honoring cancellation.
pub fn import_app_export_with_progress<F>(
    vault_path: &Path,
    source_path: &Path,
    source_kind: &str,
    cancelled: &AtomicBool,
    on_progress: &F,
) -> Result<MarkdownFolderImportReport, String>
where
    F: Fn(MarkdownFolderImportProgressEvent),
{
    let kind = parse_kind(source_kind)?;
    let vault_root = canonical_dir(vault_path, "Vault")?;
    let source = canonical_existing(source_path, "Source")?;
    validate_source_boundary(&vault_root, &source)?;

    let temp_dir =
        TempDir::new().map_err(|e| format!("Failed to prepare import workspace: {e}"))?;
    let import_source = prepare_import_source(&source, temp_dir.path())?;
    let import_root = unique_import_root(&vault_root, kind, &source)?;
    let total_files = progress_total(&source, &import_source).unwrap_or(1).max(1);
    on_progress(MarkdownFolderImportProgressEvent::Started { total_files });
    check_cancelled(cancelled, &import_root, on_progress)?;

    fs::create_dir_all(&import_root).map_err(|e| format!("Failed to create import folder: {e}"))?;
    let mut state = AppImportState::new();
    match kind {
        AppImportKind::Spanda => {
            import_spanda_export(&source, &import_source, &import_root, &mut state)?;
            on_progress(MarkdownFolderImportProgressEvent::Progress {
                processed_files: total_files,
                total_files,
                current_path: "spanda export".to_string(),
            });
        }
        AppImportKind::Notion | AppImportKind::Obsidian => import_markdown_like_with_progress(
            kind,
            &import_source,
            &import_root,
            total_files,
            &mut state,
            cancelled,
            on_progress,
        )?,
    }
    check_cancelled(cancelled, &import_root, on_progress)?;
    let report_path = write_report(&source, &import_root, kind, &state)?;
    let report = MarkdownFolderImportReport {
        imported_root: path_to_string(&import_root),
        report_path: path_to_string(&report_path),
        notes_copied: state.notes,
        assets_copied: state.assets,
        skipped_files: state.skipped,
        failed_files: state.failed,
    };
    on_progress(MarkdownFolderImportProgressEvent::Finished {
        result: report.clone(),
    });
    Ok(report)
}

fn import_markdown_like_with_progress<F>(
    kind: AppImportKind,
    source_root: &Path,
    import_root: &Path,
    total_files: usize,
    state: &mut AppImportState,
    cancelled: &AtomicBool,
    on_progress: &F,
) -> Result<(), String>
where
    F: Fn(MarkdownFolderImportProgressEvent),
{
    let source_files = source_files(source_root)?;
    for (index, source_file) in source_files.iter().enumerate() {
        check_cancelled(cancelled, import_root, on_progress)?;
        let relative = relative_import_path(source_root, source_file)?;
        if is_markdown(source_file) {
            copy_markdown_file(kind, source_file, &relative, import_root, state);
        } else if is_attachment(source_file) {
            copy_asset_file(source_file, &relative, import_root, state);
        } else {
            state.skipped += 1;
        }
        on_progress(MarkdownFolderImportProgressEvent::Progress {
            processed_files: index + 1,
            total_files,
            current_path: path_to_string(&relative),
        });
    }
    Ok(())
}

fn progress_total(selected_source: &Path, import_source: &Path) -> Result<usize, String> {
    if selected_source.is_file() {
        return Ok(1);
    }
    source_files(import_source).map(|files| files.len())
}

fn source_files(source_root: &Path) -> Result<Vec<std::path::PathBuf>, String> {
    if source_root.is_file() {
        return Ok(vec![source_root.to_path_buf()]);
    }
    walk_files(source_root)
}

fn check_cancelled<F>(
    cancelled: &AtomicBool,
    import_root: &Path,
    on_progress: &F,
) -> Result<(), String>
where
    F: Fn(MarkdownFolderImportProgressEvent),
{
    if !cancelled.load(Ordering::SeqCst) {
        return Ok(());
    }
    let _ = fs::remove_dir_all(import_root);
    on_progress(MarkdownFolderImportProgressEvent::Cancelled);
    Err("Import cancelled".to_string())
}
