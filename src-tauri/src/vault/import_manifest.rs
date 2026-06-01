use serde::Serialize;
use std::path::{Path, PathBuf};
use walkdir::WalkDir;

use super::importer::{
    classify_import_file, is_skipped_name, is_textbundle_markdown_file, should_enter,
    ImportFileKind,
};

#[derive(Debug, Clone, Serialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum ImportAutopsyManifestKind {
    Asset,
    Metadata,
    Note,
    Withheld,
}

#[derive(Debug, Clone, Serialize, PartialEq, Eq)]
pub struct ImportAutopsyManifestRow {
    pub kind: ImportAutopsyManifestKind,
    pub source_path: String,
    pub destination_path: Option<String>,
    pub detail: String,
}

pub(crate) fn manifest_asset(
    source_path: &Path,
    destination_path: &Path,
) -> ImportAutopsyManifestRow {
    manifest_row(
        ImportAutopsyManifestKind::Asset,
        source_path,
        Some(destination_path),
        "attachment move",
    )
}

pub(crate) fn manifest_note(
    source_path: &Path,
    destination_path: &Path,
    detail: impl Into<String>,
) -> ImportAutopsyManifestRow {
    manifest_row(
        ImportAutopsyManifestKind::Note,
        source_path,
        Some(destination_path),
        detail,
    )
}

pub(crate) fn manifest_metadata(
    source_path: &Path,
    destination_path: &Path,
    detail: impl Into<String>,
) -> ImportAutopsyManifestRow {
    manifest_row(
        ImportAutopsyManifestKind::Metadata,
        source_path,
        Some(destination_path),
        detail,
    )
}

pub(crate) fn manifest_withheld(
    source_path: &Path,
    detail: impl Into<String>,
) -> ImportAutopsyManifestRow {
    manifest_row(
        ImportAutopsyManifestKind::Withheld,
        source_path,
        None,
        detail,
    )
}

pub(crate) fn preview_markdown_manifest_rows(
    source_root: &Path,
    import_root: &Path,
) -> Result<Vec<ImportAutopsyManifestRow>, String> {
    let mut rows = Vec::new();
    append_pruned_dir_rows(source_root, &mut rows)?;
    for entry in WalkDir::new(source_root)
        .follow_links(false)
        .into_iter()
        .filter_entry(should_enter)
    {
        let entry = entry.map_err(|e| format!("Failed to read source folder: {e}"))?;
        if !entry.file_type().is_file() {
            continue;
        }
        let relative = relative_import_path(source_root, entry.path())?;
        match classify_import_file(entry.path()) {
            ImportFileKind::Markdown => rows.push(manifest_note(
                entry.path(),
                &import_root.join(relative),
                if is_textbundle_markdown_file(entry.path()) {
                    "Bear TextBundle Markdown copy"
                } else {
                    "Markdown copy"
                },
            )),
            ImportFileKind::Attachment => {
                rows.push(manifest_asset(entry.path(), &import_root.join(relative)))
            }
            ImportFileKind::Metadata => rows.push(manifest_metadata(
                entry.path(),
                &import_root.join(relative),
                "Bear TextBundle metadata",
            )),
            ImportFileKind::Skip => rows.push(manifest_withheld(entry.path(), "local-only skip")),
        }
    }
    Ok(rows)
}

pub(crate) fn relative_import_path(root: &Path, source_file: &Path) -> Result<PathBuf, String> {
    if root.is_file() {
        return source_file
            .file_name()
            .map(PathBuf::from)
            .ok_or_else(|| "Failed to resolve import file name".to_string());
    }
    source_file
        .strip_prefix(root)
        .map(PathBuf::from)
        .map_err(|_| "Failed to resolve import file path".to_string())
}

fn append_pruned_dir_rows(
    source_root: &Path,
    rows: &mut Vec<ImportAutopsyManifestRow>,
) -> Result<(), String> {
    for entry in WalkDir::new(source_root).follow_links(false) {
        let entry = entry.map_err(|e| format!("Failed to read source folder: {e}"))?;
        if entry.file_type().is_file() && has_skipped_parent(source_root, entry.path()) {
            rows.push(manifest_withheld(entry.path(), "local-only folder skip"));
        }
    }
    Ok(())
}

fn has_skipped_parent(source_root: &Path, path: &Path) -> bool {
    let relative = path.strip_prefix(source_root).unwrap_or(path);
    relative.components().rev().skip(1).any(|component| {
        let name = component.as_os_str().to_string_lossy().to_ascii_lowercase();
        is_skipped_name(&name)
    })
}

fn manifest_row(
    kind: ImportAutopsyManifestKind,
    source_path: &Path,
    destination_path: Option<&Path>,
    detail: impl Into<String>,
) -> ImportAutopsyManifestRow {
    ImportAutopsyManifestRow {
        kind,
        source_path: source_path.to_string_lossy().into_owned(),
        destination_path: destination_path.map(|path| path.to_string_lossy().into_owned()),
        detail: detail.into(),
    }
}
