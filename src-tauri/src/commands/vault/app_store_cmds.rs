use crate::vault::{self, BearDatabaseImportSummary, DiscoveredApp};
use std::path::PathBuf;

use super::boundary::with_boundary;

/// Lists installed apps whose local data stores Grimoire can import directly.
/// Missing apps come back as data (`installed: false`), never as errors.
#[tauri::command]
pub async fn discover_importable_apps() -> Result<Vec<DiscoveredApp>, String> {
    tokio::task::spawn_blocking(vault::discover_importable_apps)
        .await
        .map_err(|e| format!("App discovery task failed: {e}"))
}

/// Imports notes straight from a snapshotted Bear SQLite store.
///
/// The vault path is boundary-validated; the store path legitimately lives
/// OUTSIDE the vault (Bear's group container) and is validated by the
/// importer to exist, end in `.sqlite`, and stay outside the vault.
#[tauri::command]
pub async fn import_bear_database(
    vault_path: PathBuf,
    store_path: PathBuf,
    dry_run: bool,
) -> Result<BearDatabaseImportSummary, String> {
    let raw_vault_path = vault_path.to_string_lossy().into_owned();
    tokio::task::spawn_blocking(move || {
        with_boundary(Some(raw_vault_path.as_str()), |boundary| {
            vault::import_bear_database(boundary.requested_root(), store_path.as_path(), dry_run)
        })
    })
    .await
    .map_err(|e| format!("Bear database import task failed: {e}"))?
}
