use std::path::Path;
use tempfile::TempDir;

use super::app_importer::{
    clean_relative_path, parse_kind, relative_import_path, unique_import_root, AppImportKind,
    AppImportState,
};
use super::app_importer_io::{
    canonical_dir, canonical_existing, collect_policy_skipped_files, is_attachment, is_markdown,
    prepare_import_source, unique_destination_path, validate_source_boundary, walk_files,
};
use super::import_manifest::{
    manifest_asset, manifest_note, manifest_withheld, ImportAutopsyManifestRow,
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
    let prepared_source = prepare_import_source(&source, temp_dir.path())?;
    let import_source = prepared_source.path;
    let planned_import_root = unique_import_root(&vault_root, kind, &source)?;
    let mut state = AppImportState::new();
    state.skipped += prepared_source.skipped_zip_entries;

    let manifest_rows = match kind {
        AppImportKind::Spanda => {
            preview_spanda_export(&source, &import_source, temp_dir.path(), &mut state)?;
            Vec::new()
        }
        AppImportKind::Notion | AppImportKind::Obsidian => {
            preview_markdown_like_export(kind, &import_source, &planned_import_root, &mut state)?
        }
    };

    Ok(MarkdownFolderImportPreview {
        source_path: path_to_string(&source),
        planned_import_root: path_to_string(&planned_import_root),
        notes_to_copy: state.notes,
        assets_to_copy: state.assets,
        skipped_files: state.skipped,
        failed_files: state.failed,
        writes_local_only_report: true,
        manifest_rows,
    })
}

fn preview_markdown_like_export(
    kind: AppImportKind,
    source_root: &Path,
    import_root: &Path,
    state: &mut AppImportState,
) -> Result<Vec<ImportAutopsyManifestRow>, String> {
    let mut rows = Vec::new();
    let policy_skipped = collect_policy_skipped_files(source_root)?;
    state.skipped += policy_skipped.len();
    rows.extend(
        policy_skipped
            .iter()
            .map(|path| manifest_withheld(path, "local-only folder skip")),
    );
    let source_files = if source_root.is_file() {
        vec![source_root.to_path_buf()]
    } else {
        walk_files(source_root)?
    };
    for source_file in source_files {
        let relative = relative_import_path(source_root, &source_file)?;
        if is_markdown(&source_file) {
            state.notes += 1;
            let destination = unique_destination_path(
                import_root.join(clean_relative_path(&relative, kind)),
                state,
            );
            rows.push(manifest_note(
                &source_file,
                &destination,
                "metadata/frontmatter map",
            ));
        } else if is_attachment(&source_file) {
            state.assets += 1;
            let destination = unique_destination_path(import_root.join(&relative), state);
            rows.push(manifest_asset(&source_file, &destination));
        } else {
            state.skipped += 1;
            rows.push(manifest_withheld(&source_file, "local-only skip"));
        }
    }
    if kind == AppImportKind::Notion && state.notes == 0 && state.assets == 0 {
        state.skipped += 1;
    }
    Ok(rows)
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
