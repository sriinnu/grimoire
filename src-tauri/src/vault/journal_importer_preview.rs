use std::collections::HashMap;
use std::path::Path;
use tempfile::TempDir;

use super::import_manifest::{manifest_asset, manifest_note, ImportAutopsyManifestRow};
use super::importer::MarkdownFolderImportPreview;
use super::journal_import_helpers::{unique_note_name, JournalEntry};
use super::journal_importer::{
    build_media_index, canonical_dir, canonical_existing, collect_entries, path_to_string,
    prepare_import_source, unique_import_root, validate_source_boundary, ImportState,
};
use super::journal_media_import::{AttachmentPlanner, MediaIndex};

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
    let manifest_rows = preview_journal_manifest_rows(&planned_import_root, &entries, &media_index);

    Ok(MarkdownFolderImportPreview {
        source_path: path_to_string(&source),
        planned_import_root: path_to_string(&planned_import_root),
        preview_signature: None,
        notes_to_copy: state.notes,
        assets_to_copy: state.assets,
        skipped_files: state.skipped,
        failed_files: state.failed,
        writes_local_only_report: true,
        manifest_rows,
    })
}

fn preview_journal_manifest_rows(
    import_root: &Path,
    entries: &[JournalEntry],
    media_index: &MediaIndex,
) -> Vec<ImportAutopsyManifestRow> {
    let mut rows = Vec::new();
    let mut used_names = HashMap::<String, usize>::new();
    let mut attachment_planner = AttachmentPlanner::default();
    for entry in entries {
        rows.push(manifest_note(
            Path::new(&entry.source_path),
            &import_root.join(unique_note_name(entry, &mut used_names)),
            "journal metadata/frontmatter map",
        ));
        for key in &entry.media_keys {
            let Some(media_source) = media_index.resolve(key) else {
                continue;
            };
            let Some(plan) = attachment_planner.plan(media_source) else {
                continue;
            };
            if plan.is_new_copy {
                rows.push(manifest_asset(&plan.source, &import_root.join(&plan.link)));
            }
        }
    }
    rows
}

fn count_copyable_media(entries: &[JournalEntry], media_index: &MediaIndex) -> usize {
    let mut copies = 0;
    let mut attachment_planner = AttachmentPlanner::default();
    for entry in entries {
        for key in &entry.media_keys {
            if media_index
                .resolve(key)
                .and_then(|source| attachment_planner.plan(source))
                .is_some_and(|plan| plan.is_new_copy)
            {
                copies += 1;
            }
        }
    }
    copies
}
