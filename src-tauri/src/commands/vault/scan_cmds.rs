use crate::commands::expand_tilde;
use crate::search::SearchResponse;
use crate::vault::{VaultEntry, VaultRebuildProgressEvent};
use crate::{search, vault, vault_list};
use std::path::{Path, PathBuf};
use tauri::ipc::Channel;

use super::boundary::{with_validated_path, ValidatedPathMode};
use super::portability_progress::{
    operation_id_error, register_portability_operation, unregister_portability_operation,
};

fn collect_registered_vault_roots(vault_list: &vault_list::VaultList) -> Vec<PathBuf> {
    let mut roots = vault_list
        .vaults
        .iter()
        .map(|entry| PathBuf::from(expand_tilde(&entry.path).into_owned()))
        .collect::<Vec<_>>();

    if let Some(active_vault) = &vault_list.active_vault {
        roots.push(PathBuf::from(expand_tilde(active_vault).into_owned()));
    }

    roots
}

fn find_registered_vault_root(path: &Path, registered_roots: &[PathBuf]) -> Option<PathBuf> {
    registered_roots
        .iter()
        .filter_map(|root| {
            let canonical_root = root.canonicalize().ok()?;
            path.starts_with(&canonical_root)
                .then_some((canonical_root.components().count(), root.clone()))
        })
        .max_by_key(|(depth, _)| *depth)
        .map(|(_, root)| root)
}

fn resolve_reload_vault_path(
    path: &Path,
    vault_path: Option<&Path>,
) -> Result<Option<PathBuf>, String> {
    if let Some(vault_path) = vault_path {
        return Ok(Some(vault_path.to_path_buf()));
    }

    if !path.is_absolute() {
        return Ok(None);
    }

    let canonical_path = match path.canonicalize() {
        Ok(canonical_path) => canonical_path,
        Err(_) => return Ok(None),
    };

    let vault_list = vault_list::load_vault_list()?;
    let registered_roots = collect_registered_vault_roots(&vault_list);
    Ok(find_registered_vault_root(
        canonical_path.as_path(),
        &registered_roots,
    ))
}

#[tauri::command]
pub fn reload_vault_entry(
    path: PathBuf,
    vault_path: Option<PathBuf>,
) -> Result<VaultEntry, String> {
    let resolved_vault_path = resolve_reload_vault_path(path.as_path(), vault_path.as_deref())?;
    let raw_path = path.to_string_lossy();
    let raw_vault_path = resolved_vault_path
        .as_ref()
        .map(|value| value.to_string_lossy().into_owned());
    with_validated_path(
        &raw_path,
        raw_vault_path.as_deref(),
        ValidatedPathMode::Existing,
        |validated_path| vault::reload_entry(Path::new(validated_path)),
    )
}

#[tauri::command]
pub async fn reload_vault(
    app_handle: tauri::AppHandle,
    path: String,
) -> Result<Vec<crate::vault::VaultEntry>, String> {
    let path = expand_tilde(&path).into_owned();
    crate::sync_vault_asset_scope(&app_handle, Path::new(&path))?;
    tokio::task::spawn_blocking(move || {
        vault::invalidate_cache(Path::new(&path));
        vault::scan_vault_cached(Path::new(&path))
    })
    .await
    .map_err(|e| format!("Task panicked: {e}"))?
}

#[tauri::command]
pub async fn reload_vault_with_progress(
    app_handle: tauri::AppHandle,
    path: String,
    operation_id: String,
    on_event: Channel<VaultRebuildProgressEvent>,
) -> Result<(), String> {
    if let Some(error) = operation_id_error(&operation_id) {
        return Err(error);
    }

    let path = expand_tilde(&path).into_owned();
    crate::sync_vault_asset_scope(&app_handle, Path::new(&path))?;
    let cancellation = register_portability_operation(&operation_id)?;
    let cleanup_operation_id = operation_id.clone();
    let task_result = tauri::async_runtime::spawn_blocking(move || {
        let vault_path = Path::new(&path);
        vault::invalidate_cache(vault_path);
        let git_dates = crate::git::get_all_file_dates(vault_path);
        vault::scan_vault_with_progress(vault_path, &git_dates, cancellation.as_ref(), &|event| {
            let _ = on_event.send(event);
        })
    })
    .await;

    unregister_portability_operation(&cleanup_operation_id);
    let result = task_result.map_err(|e| format!("Vault reload task failed: {e}"))?;
    result.map(|_| ())
}

#[tauri::command]
pub async fn search_vault(
    vault_path: String,
    query: String,
    mode: String,
    limit: Option<usize>,
) -> Result<SearchResponse, String> {
    let vault_path = expand_tilde(&vault_path).into_owned();
    let limit = limit.unwrap_or(20);
    tokio::task::spawn_blocking(move || search::search_vault(&vault_path, &query, &mode, limit))
        .await
        .map_err(|e| format!("Search task failed: {}", e))?
}

#[cfg(test)]
mod tests {
    use super::{collect_registered_vault_roots, find_registered_vault_root};
    use crate::vault_list::{VaultEntry as VaultListEntry, VaultList};

    fn vault_entry(label: &str, path: String) -> VaultListEntry {
        VaultListEntry {
            id: None,
            label: label.to_string(),
            path,
            storage_provider: "local-folder".to_string(),
            sync_provider: "none".to_string(),
        }
    }

    #[test]
    fn finds_registered_vault_root_for_an_absolute_note_path() {
        let dir = tempfile::TempDir::new().unwrap();
        let vault_root = dir.path().join("vault");
        let note_path = vault_root.join("note.md");
        std::fs::create_dir_all(&vault_root).unwrap();
        std::fs::write(&note_path, "# Note\n").unwrap();

        let vault_list = VaultList {
            vaults: vec![vault_entry(
                "Test",
                vault_root.to_string_lossy().into_owned(),
            )],
            active_vault: None,
            hidden_defaults: vec![],
        };

        let registered_roots = collect_registered_vault_roots(&vault_list);
        let canonical_note_path = note_path.canonicalize().unwrap();

        assert_eq!(
            find_registered_vault_root(canonical_note_path.as_path(), &registered_roots),
            Some(vault_root),
        );
    }

    #[test]
    fn prefers_the_deepest_registered_vault_root() {
        let dir = tempfile::TempDir::new().unwrap();
        let parent_root = dir.path().join("vault");
        let nested_root = parent_root.join("projects");
        let note_path = nested_root.join("note.md");
        std::fs::create_dir_all(&nested_root).unwrap();
        std::fs::write(&note_path, "# Note\n").unwrap();

        let vault_list = VaultList {
            vaults: vec![
                vault_entry("Parent", parent_root.to_string_lossy().into_owned()),
                vault_entry("Nested", nested_root.to_string_lossy().into_owned()),
            ],
            active_vault: None,
            hidden_defaults: vec![],
        };

        let registered_roots = collect_registered_vault_roots(&vault_list);
        let canonical_note_path = note_path.canonicalize().unwrap();

        assert_eq!(
            find_registered_vault_root(canonical_note_path.as_path(), &registered_roots),
            Some(nested_root),
        );
    }
}
