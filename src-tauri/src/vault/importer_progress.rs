use serde::Serialize;
use std::fs;
use std::path::Path;
use std::sync::atomic::{AtomicBool, Ordering};
use walkdir::WalkDir;

use super::importer::{
    canonical_dir, classify_import_file, copy_import_file, path_to_string,
    preview_importable_files, should_enter, unique_import_root, validate_source_boundary,
    write_import_report, ImportCounters, ImportFileKind,
};
use super::MarkdownFolderImportReport;

#[derive(Debug, Clone, Serialize, PartialEq, Eq)]
#[serde(tag = "event", content = "data")]
pub enum MarkdownFolderImportProgressEvent {
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
        result: MarkdownFolderImportReport,
    },
}

/// Imports a Markdown folder while reporting progress and honoring cancellation.
pub fn import_markdown_folder_with_progress<F>(
    vault_path: &Path,
    source_path: &Path,
    cancelled: &AtomicBool,
    on_progress: &F,
) -> Result<MarkdownFolderImportReport, String>
where
    F: Fn(MarkdownFolderImportProgressEvent),
{
    let vault_root = canonical_dir(vault_path, "Vault")?;
    let source_root = canonical_dir(source_path, "Source")?;
    validate_source_boundary(&vault_root, &source_root)?;

    let import_root = unique_import_root(&vault_root, &source_root)?;
    let planned = preview_importable_files(&source_root)?;
    let total_files = planned.notes_copied + planned.assets_copied;
    on_progress(MarkdownFolderImportProgressEvent::Started { total_files });
    check_cancelled(cancelled, &import_root, on_progress)?;

    fs::create_dir_all(&import_root).map_err(|e| format!("Failed to create import folder: {e}"))?;
    let counters = copy_importable_files_with_progress(
        &source_root,
        &import_root,
        total_files,
        cancelled,
        on_progress,
    )?;
    let report_path = write_import_report(&source_root, &import_root, &counters)?;
    let report = MarkdownFolderImportReport {
        imported_root: path_to_string(&import_root),
        report_path: path_to_string(&report_path),
        notes_copied: counters.notes_copied,
        assets_copied: counters.assets_copied,
        skipped_files: counters.skipped_files,
        failed_files: counters.failed_files,
    };
    on_progress(MarkdownFolderImportProgressEvent::Finished {
        result: report.clone(),
    });
    Ok(report)
}

fn copy_importable_files_with_progress<F>(
    source_root: &Path,
    import_root: &Path,
    total_files: usize,
    cancelled: &AtomicBool,
    on_progress: &F,
) -> Result<ImportCounters, String>
where
    F: Fn(MarkdownFolderImportProgressEvent),
{
    let mut counters = ImportCounters::new();
    let mut processed_files = 0usize;
    for entry in WalkDir::new(source_root)
        .follow_links(false)
        .into_iter()
        .filter_entry(should_enter)
    {
        check_cancelled(cancelled, import_root, on_progress)?;
        let entry = entry.map_err(|e| format!("Failed to read source folder: {e}"))?;
        if !entry.file_type().is_file() {
            continue;
        }

        let relative_path = entry
            .path()
            .strip_prefix(source_root)
            .map_err(|_| "Failed to resolve source file relative to import root".to_string())?;
        match classify_import_file(entry.path()) {
            ImportFileKind::Skip => counters.skipped_files += 1,
            kind => {
                copy_import_file(
                    entry.path(),
                    &import_root.join(relative_path),
                    &mut counters,
                    kind,
                );
                processed_files += 1;
                on_progress(MarkdownFolderImportProgressEvent::Progress {
                    processed_files,
                    total_files,
                    current_path: path_to_string(relative_path),
                });
            }
        }
    }
    Ok(counters)
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

#[cfg(test)]
mod tests {
    use super::*;
    use std::sync::atomic::AtomicBool;
    use std::sync::{Arc, Mutex};
    use tempfile::TempDir;

    #[test]
    fn reports_progress_and_finishes_with_report() {
        let vault = TempDir::new().unwrap();
        let source = TempDir::new().unwrap();
        fs::write(source.path().join("note.md"), "# Note\n").unwrap();
        fs::write(source.path().join("image.png"), "image").unwrap();
        let events = Arc::new(Mutex::new(Vec::new()));
        let sink_events = Arc::clone(&events);

        let report = import_markdown_folder_with_progress(
            vault.path(),
            source.path(),
            &AtomicBool::new(false),
            &move |event| sink_events.lock().unwrap().push(event),
        )
        .unwrap();

        let events = events.lock().unwrap();
        assert!(matches!(
            events.first(),
            Some(MarkdownFolderImportProgressEvent::Started { total_files: 2 })
        ));
        assert!(events.iter().any(|event| matches!(
            event,
            MarkdownFolderImportProgressEvent::Progress {
                processed_files: 2,
                ..
            }
        )));
        assert!(matches!(
            events.last(),
            Some(MarkdownFolderImportProgressEvent::Finished { .. })
        ));
        assert_eq!(report.notes_copied, 1);
        assert_eq!(report.assets_copied, 1);
    }

    #[test]
    fn cancelled_import_removes_partial_folder() {
        let vault = TempDir::new().unwrap();
        let source = TempDir::new().unwrap();
        fs::write(source.path().join("note.md"), "# Note\n").unwrap();
        let cancelled = AtomicBool::new(true);
        let events = Arc::new(Mutex::new(Vec::new()));
        let sink_events = Arc::clone(&events);

        let error = import_markdown_folder_with_progress(
            vault.path(),
            source.path(),
            &cancelled,
            &move |event| sink_events.lock().unwrap().push(event),
        )
        .unwrap_err();

        assert_eq!(error, "Import cancelled");
        assert!(events
            .lock()
            .unwrap()
            .iter()
            .any(|event| matches!(event, MarkdownFolderImportProgressEvent::Cancelled)));
        assert!(!vault.path().join("imports").exists());
    }
}
