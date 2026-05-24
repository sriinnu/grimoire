use std::collections::HashMap;
use std::path::{Path, PathBuf};
use tempfile::TempDir;

use super::importer::MarkdownFolderImportPreview;
use super::journal_import_helpers::JournalEntry;
use super::journal_importer::{
    build_media_index, canonical_dir, canonical_existing, collect_entries, path_to_string,
    prepare_import_source, unique_import_root, validate_source_boundary, ImportState,
};

/// Previews a Day One, Journey, or Apple Journal import without writing to the vault.
pub fn preview_journal_export(
    vault_path: &Path,
    source_path: &Path,
    source_kind: &str,
) -> Result<MarkdownFolderImportPreview, String> {
    let vault_root = canonical_dir(vault_path, "Vault")?;
    let source = canonical_existing(source_path, "Source")?;
    validate_source_boundary(&vault_root, &source)?;

    let temp_dir = TempDir::new().map_err(|e| format!("Failed to prepare import preview: {e}"))?;
    let import_source = prepare_import_source(&source, temp_dir.path())?;
    let planned_import_root = unique_import_root(&vault_root, source_kind, &source)?;

    let mut state = ImportState::new();
    let media_index = build_media_index(&import_source, &mut state)?;
    let entries = collect_entries(&source, &import_source, source_kind, &mut state)?;
    state.notes = entries.len();
    state.assets = count_copyable_media(&entries, &media_index);

    Ok(MarkdownFolderImportPreview {
        source_path: path_to_string(&source),
        planned_import_root: path_to_string(&planned_import_root),
        notes_to_copy: state.notes,
        assets_to_copy: state.assets,
        skipped_files: state.skipped,
        failed_files: state.failed,
        writes_local_only_report: true,
    })
}

fn count_copyable_media(entries: &[JournalEntry], media_index: &HashMap<String, PathBuf>) -> usize {
    let mut copies = 0;
    for entry in entries {
        for key in &entry.media_keys {
            if media_source_exists(key, media_index) {
                copies += 1;
            }
        }
    }
    copies
}

fn media_source_exists(key: &str, media_index: &HashMap<String, PathBuf>) -> bool {
    let lookup = key.to_ascii_lowercase();
    media_index
        .get(&lookup)
        .or_else(|| media_index.get(file_stem_key(&lookup).as_str()))
        .and_then(|path| path.file_name())
        .is_some()
}

fn file_stem_key(value: &str) -> String {
    Path::new(value)
        .file_stem()
        .map(|stem| stem.to_string_lossy().to_ascii_lowercase())
        .unwrap_or_else(|| value.to_string())
}
