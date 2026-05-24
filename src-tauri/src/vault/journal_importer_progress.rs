use std::collections::HashMap;
use std::fs;
use std::path::{Path, PathBuf};
use std::sync::atomic::{AtomicBool, Ordering};
use tempfile::TempDir;

use super::importer::MarkdownFolderImportReport;
use super::importer_progress::MarkdownFolderImportProgressEvent;
use super::journal_import_helpers::{format_entry_markdown, unique_note_name, JournalEntry};
use super::journal_importer::{
    build_media_index, canonical_dir, canonical_existing, collect_entries, copy_entry_media,
    path_to_string, prepare_import_source, unique_import_root, validate_source_boundary,
    write_report, ImportState,
};

/// Imports journal exports while reporting progress and honoring cancellation.
pub fn import_journal_export_with_progress<F>(
    vault_path: &Path,
    source_path: &Path,
    source_kind: &str,
    cancelled: &AtomicBool,
    on_progress: &F,
) -> Result<MarkdownFolderImportReport, String>
where
    F: Fn(MarkdownFolderImportProgressEvent),
{
    let vault_root = canonical_dir(vault_path, "Vault")?;
    let source = canonical_existing(source_path, "Source")?;
    validate_source_boundary(&vault_root, &source)?;

    let temp_dir =
        TempDir::new().map_err(|e| format!("Failed to prepare import workspace: {e}"))?;
    let import_source = prepare_import_source(&source, temp_dir.path())?;
    let import_root = unique_import_root(&vault_root, source_kind, &source)?;
    let mut state = ImportState::new();
    let media_index = build_media_index(&import_source, &mut state)?;
    let entries = collect_entries(&source, &import_source, source_kind, &mut state)?;
    let total_files = entries.len().max(1);
    on_progress(MarkdownFolderImportProgressEvent::Started { total_files });
    check_cancelled(cancelled, &import_root, on_progress)?;

    fs::create_dir_all(&import_root).map_err(|e| format!("Failed to create import folder: {e}"))?;
    write_entries_with_progress(
        &entries,
        &import_root,
        source_kind,
        &media_index,
        &mut state,
        cancelled,
        on_progress,
    )?;
    let report_path = write_report(&source, &import_root, source_kind, entries.len(), &state)?;
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

fn write_entries_with_progress<F>(
    entries: &[JournalEntry],
    import_root: &Path,
    source_kind: &str,
    media_index: &HashMap<String, PathBuf>,
    state: &mut ImportState,
    cancelled: &AtomicBool,
    on_progress: &F,
) -> Result<(), String>
where
    F: Fn(MarkdownFolderImportProgressEvent),
{
    let mut used_names = HashMap::<String, usize>::new();
    let total_files = entries.len().max(1);
    for (index, entry) in entries.iter().enumerate() {
        check_cancelled(cancelled, import_root, on_progress)?;
        let note_name = write_one_entry(
            entry,
            import_root,
            source_kind,
            media_index,
            state,
            &mut used_names,
        )?;
        on_progress(MarkdownFolderImportProgressEvent::Progress {
            processed_files: index + 1,
            total_files,
            current_path: note_name,
        });
    }
    Ok(())
}

fn write_one_entry(
    entry: &JournalEntry,
    import_root: &Path,
    source_kind: &str,
    media_index: &HashMap<String, PathBuf>,
    state: &mut ImportState,
    used_names: &mut HashMap<String, usize>,
) -> Result<String, String> {
    let note_name = unique_note_name(entry, used_names);
    let note_path = import_root.join(&note_name);
    let links = copy_entry_media(entry, import_root, media_index, state);
    let content = format_entry_markdown(entry, source_kind, &links)?;
    match fs::write(&note_path, content) {
        Ok(()) => state.notes += 1,
        Err(error) => {
            state.failed += 1;
            state
                .failures
                .push(format!("Failed to write {}: {error}", note_path.display()));
        }
    }
    Ok(note_name)
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
