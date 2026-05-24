use std::path::Path;
use tempfile::TempDir;

use super::app_importer::{parse_kind, unique_import_root, AppImportKind, AppImportState};
use super::app_importer_io::{
    canonical_dir, canonical_existing, is_attachment, is_markdown, prepare_import_source,
    validate_source_boundary, walk_files,
};
use super::importer::MarkdownFolderImportPreview;
use super::spanda_importer::import_spanda_export;

/// Previews Obsidian, Notion Markdown, or Spanda imports without writing to the vault.
pub fn preview_app_export(
    vault_path: &Path,
    source_path: &Path,
    source_kind: &str,
) -> Result<MarkdownFolderImportPreview, String> {
    let kind = parse_kind(source_kind)?;
    let vault_root = canonical_dir(vault_path, "Vault")?;
    let source = canonical_existing(source_path, "Source")?;
    validate_source_boundary(&vault_root, &source)?;

    let temp_dir = TempDir::new().map_err(|e| format!("Failed to prepare import preview: {e}"))?;
    let import_source = prepare_import_source(&source, temp_dir.path())?;
    let planned_import_root = unique_import_root(&vault_root, kind, &source)?;
    let mut state = AppImportState::new();

    match kind {
        AppImportKind::Spanda => {
            preview_spanda_export(&source, &import_source, temp_dir.path(), &mut state)?
        }
        AppImportKind::Notion | AppImportKind::Obsidian => {
            preview_markdown_like_export(kind, &import_source, &mut state)?
        }
    }

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

fn preview_markdown_like_export(
    kind: AppImportKind,
    source_root: &Path,
    state: &mut AppImportState,
) -> Result<(), String> {
    let source_files = if source_root.is_file() {
        vec![source_root.to_path_buf()]
    } else {
        walk_files(source_root)?
    };
    for source_file in source_files {
        if is_markdown(&source_file) {
            state.notes += 1;
        } else if is_attachment(&source_file) {
            state.assets += 1;
        } else {
            state.skipped += 1;
        }
    }
    if kind == AppImportKind::Notion && state.notes == 0 && state.assets == 0 {
        state.skipped += 1;
    }
    Ok(())
}

fn preview_spanda_export(
    source: &Path,
    import_source: &Path,
    temp_root: &Path,
    state: &mut AppImportState,
) -> Result<(), String> {
    let preview_root = temp_root.join("spanda-preview");
    import_spanda_export(source, import_source, &preview_root, state)
}

fn path_to_string(path: &Path) -> String {
    path.to_string_lossy().into_owned()
}
