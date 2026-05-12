use crate::vault::{self, MarkdownFolderImportReport, VaultExportReport};
use std::path::PathBuf;

use super::boundary::with_boundary;

/// Imports a Markdown folder into the active vault without mutating the source.
#[tauri::command]
pub fn import_markdown_folder(
    vault_path: PathBuf,
    source_path: PathBuf,
) -> Result<MarkdownFolderImportReport, String> {
    let raw_vault_path = vault_path.to_string_lossy();
    with_boundary(Some(raw_vault_path.as_ref()), |boundary| {
        vault::import_markdown_folder(boundary.requested_root(), source_path.as_path())
    })
}

/// Imports a portable Markdown ZIP archive into the active vault.
#[tauri::command]
pub fn import_markdown_zip(
    vault_path: PathBuf,
    source_path: PathBuf,
) -> Result<MarkdownFolderImportReport, String> {
    let raw_vault_path = vault_path.to_string_lossy();
    with_boundary(Some(raw_vault_path.as_ref()), |boundary| {
        vault::import_markdown_zip(boundary.requested_root(), source_path.as_path())
    })
}

/// Imports a Day One or Journey export into the active vault.
#[tauri::command]
pub fn import_journal_export(
    vault_path: PathBuf,
    source_path: PathBuf,
    source_kind: String,
) -> Result<MarkdownFolderImportReport, String> {
    let raw_vault_path = vault_path.to_string_lossy();
    with_boundary(Some(raw_vault_path.as_ref()), |boundary| {
        vault::import_journal_export(
            boundary.requested_root(),
            source_path.as_path(),
            source_kind.as_str(),
        )
    })
}

/// Exports the active vault as a portable Markdown ZIP archive.
#[tauri::command]
pub fn export_markdown_zip(
    vault_path: PathBuf,
    target_path: PathBuf,
) -> Result<VaultExportReport, String> {
    let raw_vault_path = vault_path.to_string_lossy();
    with_boundary(Some(raw_vault_path.as_ref()), |boundary| {
        vault::export_markdown_zip(boundary.requested_root(), target_path.as_path())
    })
}
