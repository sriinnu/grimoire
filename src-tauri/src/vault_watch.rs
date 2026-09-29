//! Watches the open vault for changes made outside Grimoire (sync, another
//! editor, the phone) and tells the renderer which Markdown files moved, so
//! the list and the open note refresh while you watch instead of on the next
//! window focus.

use notify::RecursiveMode;
use notify_debouncer_full::{new_debouncer, DebounceEventResult, Debouncer, RecommendedCache};
use serde::Serialize;
use std::path::{Component, Path, PathBuf};
use std::sync::Mutex;
use std::time::Duration;
use tauri::{AppHandle, Emitter};

pub const VAULT_FS_CHANGED_EVENT: &str = "vault-fs-changed";
const DEBOUNCE: Duration = Duration::from_millis(400);

type VaultDebouncer = Debouncer<notify::RecommendedWatcher, RecommendedCache>;

/// One watcher at a time: opening another vault replaces it.
#[derive(Default)]
pub struct VaultWatchState(Mutex<Option<(PathBuf, VaultDebouncer)>>);

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct VaultFsChanged {
    pub vault_path: String,
    /// Absolute paths of Markdown files created, written, renamed or removed.
    pub paths: Vec<String>,
}

const IGNORED_DIRS: &[&str] = &[".git", ".obsidian", ".grimoire", "node_modules", ".trash"];

/// Only Markdown files matter, and never anything under a hidden or tooling
/// folder, editor temp files, or the index Grimoire writes itself.
pub fn is_relevant_path(path: &Path) -> bool {
    let Some(name) = path.file_name().and_then(|value| value.to_str()) else {
        return false;
    };
    if name.starts_with('.') || name.ends_with('~') || name.ends_with(".tmp") {
        return false;
    }
    if !name.to_ascii_lowercase().ends_with(".md") {
        return false;
    }
    !path.components().any(|component| match component {
        Component::Normal(part) => part
            .to_str()
            .is_some_and(|value| IGNORED_DIRS.contains(&value) || value.starts_with('.')),
        _ => false,
    })
}

fn changed_paths(result: DebounceEventResult) -> Vec<String> {
    let Ok(events) = result else {
        return Vec::new();
    };
    let mut paths: Vec<String> = events
        .into_iter()
        .flat_map(|event| event.paths.clone())
        .filter(|path| is_relevant_path(path))
        .filter_map(|path| path.into_os_string().into_string().ok())
        .collect();
    paths.sort();
    paths.dedup();
    paths
}

/// Start (or replace) the watcher for `vault_path`. Events are debounced so a
/// sync that touches fifty files produces one message.
pub fn watch_vault(
    app: AppHandle,
    state: tauri::State<'_, VaultWatchState>,
    vault_path: String,
) -> Result<(), String> {
    let root = PathBuf::from(&vault_path);
    if !root.is_dir() {
        return Err("Vault folder is not available to watch.".into());
    }
    let mut guard = state.0.lock().map_err(|_| "Vault watcher is busy.".to_string())?;
    if let Some((current, _)) = guard.as_ref() {
        if current == &root {
            return Ok(());
        }
    }
    *guard = None;

    let emit_target = app.clone();
    let vault_for_event = vault_path.clone();
    let mut debouncer = new_debouncer(DEBOUNCE, None, move |result: DebounceEventResult| {
        let paths = changed_paths(result);
        if paths.is_empty() {
            return;
        }
        let payload = VaultFsChanged { vault_path: vault_for_event.clone(), paths };
        if let Err(error) = emit_target.emit_to("main", VAULT_FS_CHANGED_EVENT, payload) {
            log::warn!("Could not emit vault change event: {error}");
        }
    })
    .map_err(|error| format!("Could not start the vault watcher: {error}"))?;
    debouncer
        .watch(&root, RecursiveMode::Recursive)
        .map_err(|error| format!("Could not watch the vault folder: {error}"))?;
    *guard = Some((root, debouncer));
    Ok(())
}

pub fn unwatch_vault(state: tauri::State<'_, VaultWatchState>) -> Result<(), String> {
    let mut guard = state.0.lock().map_err(|_| "Vault watcher is busy.".to_string())?;
    *guard = None;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn keeps_markdown_and_drops_tooling_temp_and_hidden_paths() {
        assert!(is_relevant_path(Path::new("/v/notes/today.md")));
        assert!(is_relevant_path(Path::new("/v/Deep/Folder/Note.MD")));
        assert!(!is_relevant_path(Path::new("/v/.git/index")));
        assert!(!is_relevant_path(Path::new("/v/.git/objects/ab.md")));
        assert!(!is_relevant_path(Path::new("/v/.obsidian/workspace.md")));
        assert!(!is_relevant_path(Path::new("/v/notes/.today.md.swp")));
        assert!(!is_relevant_path(Path::new("/v/notes/today.md~")));
        assert!(!is_relevant_path(Path::new("/v/notes/today.md.tmp")));
        assert!(!is_relevant_path(Path::new("/v/.grimoire-index.json")));
        assert!(!is_relevant_path(Path::new("/v/image.png")));
    }
}
