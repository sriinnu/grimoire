mod ai;
mod code_intelligence;
mod delete;
pub mod export_file;
mod folders;
mod git;
pub mod git_clone;
mod git_connect;
mod reveal;
mod settings_cmds;
mod system;
mod transcription;
mod vault;
mod version;

use std::borrow::Cow;

pub use ai::*;
pub use code_intelligence::*;
pub use delete::*;
pub use export_file::*;
pub use folders::*;
pub use git::*;
pub use git_connect::*;
pub use reveal::*;
pub use settings_cmds::*;
pub use system::*;
pub use transcription::*;
pub use vault::*;
pub use version::*;

/// Expand a leading `~` or `~/` in a path string to the user's home directory.
/// Returns the original string unchanged if it doesn't start with `~` or if the
/// home directory cannot be determined.
pub fn expand_tilde(path: &str) -> Cow<'_, str> {
    let Some(home) = dirs::home_dir() else {
        return Cow::Borrowed(path);
    };

    match path {
        "~" => Cow::Owned(home.to_string_lossy().into_owned()),
        _ => path
            .strip_prefix("~/")
            .map(|rest| Cow::Owned(home.join(rest).to_string_lossy().into_owned()))
            .unwrap_or(Cow::Borrowed(path)),
    }
}

fn is_numeric_version_part(part: &str) -> bool {
    !part.is_empty() && part.chars().all(|ch| ch.is_ascii_digit())
}

fn is_legacy_build_version(minor: &str, patch: &str) -> bool {
    minor.len() >= 6 && is_numeric_version_part(minor) && is_numeric_version_part(patch)
}

fn parse_legacy_build_label(version: &str) -> Option<String> {
    let parts: Vec<&str> = version.split('.').collect();
    match parts.as_slice() {
        [_, minor, patch] if is_legacy_build_version(minor, patch) => Some(format!("b{}", patch)),
        _ => None,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn expand_tilde_with_subpath() {
        let home = dirs::home_dir().unwrap();
        let result = expand_tilde("~/Documents/vault");
        assert_eq!(result, format!("{}/Documents/vault", home.display()));
    }

    #[test]
    fn expand_tilde_alone() {
        let home = dirs::home_dir().unwrap();
        let result = expand_tilde("~");
        assert_eq!(result, home.to_string_lossy());
    }

    #[test]
    fn expand_tilde_noop_for_absolute_path() {
        let result = expand_tilde("/usr/local/bin");
        assert_eq!(result, "/usr/local/bin");
    }

    #[test]
    fn expand_tilde_noop_for_relative_path() {
        let result = expand_tilde("some/relative/path");
        assert_eq!(result, "some/relative/path");
    }

    #[test]
    fn expand_tilde_noop_for_tilde_in_middle() {
        let result = expand_tilde("/home/~user/path");
        assert_eq!(result, "/home/~user/path");
    }
}

#[cfg(desktop)]
#[tauri::command]
pub fn watch_vault(
    app: tauri::AppHandle,
    state: tauri::State<'_, crate::vault_watch::VaultWatchState>,
    vault_path: String,
) -> Result<(), String> {
    crate::vault_watch::watch_vault(app, state, vault_path)
}

#[cfg(desktop)]
#[tauri::command]
pub fn unwatch_vault(
    state: tauri::State<'_, crate::vault_watch::VaultWatchState>,
) -> Result<(), String> {
    crate::vault_watch::unwatch_vault(state)
}

#[cfg(mobile)]
#[tauri::command]
pub fn watch_vault(_vault_path: String) -> Result<(), String> {
    Ok(())
}

#[cfg(mobile)]
#[tauri::command]
pub fn unwatch_vault() -> Result<(), String> {
    Ok(())
}

#[tauri::command]
pub async fn index_refresh(
    state: tauri::State<'_, crate::vault_index::VaultIndexState>,
    vault_path: String,
) -> Result<crate::vault_index::IndexRefreshReport, String> {
    let vault_path = vault_path.clone();
    let state = state.inner().clone();
    tauri::async_runtime::spawn_blocking(move || { crate::vault_index::refresh(&state, std::path::Path::new(&vault_path)) })
        .await
        .map_err(|error| format!("Index task failed: {error}"))?
}

#[tauri::command]
pub async fn index_search(
    state: tauri::State<'_, crate::vault_index::VaultIndexState>,
    vault_path: String,
    query: String,
    limit: Option<usize>,
) -> Result<crate::vault_index::IndexSearchResponse, String> {
    let vault_path = vault_path.clone();
    let state = state.inner().clone();
    tauri::async_runtime::spawn_blocking(move || { crate::vault_index::search(&state, std::path::Path::new(&vault_path), &query, limit.unwrap_or(50).clamp(1, 500)) })
        .await
        .map_err(|error| format!("Index task failed: {error}"))?
}

#[tauri::command]
pub async fn index_tags(
    state: tauri::State<'_, crate::vault_index::VaultIndexState>,
    vault_path: String,
) -> Result<crate::vault_index::IndexTagSnapshot, String> {
    let vault_path = vault_path.clone();
    let state = state.inner().clone();
    tauri::async_runtime::spawn_blocking(move || { crate::vault_index::tags(&state, std::path::Path::new(&vault_path)) })
        .await
        .map_err(|error| format!("Index task failed: {error}"))?
}

#[tauri::command]
pub async fn index_mentions(
    state: tauri::State<'_, crate::vault_index::VaultIndexState>,
    vault_path: String,
    phrase: String,
    limit: Option<usize>,
) -> Result<Vec<String>, String> {
    let vault_path = vault_path.clone();
    let state = state.inner().clone();
    tauri::async_runtime::spawn_blocking(move || { crate::vault_index::mentions(&state, std::path::Path::new(&vault_path), &phrase, limit.unwrap_or(100).clamp(1, 1000)) })
        .await
        .map_err(|error| format!("Index task failed: {error}"))?
}
