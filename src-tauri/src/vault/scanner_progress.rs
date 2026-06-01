use serde::Serialize;
use std::collections::HashMap;
use std::path::{Path, PathBuf};
use std::sync::atomic::{AtomicBool, Ordering};
use walkdir::WalkDir;

use super::scanner::{is_hidden_dir, try_parse_file};
use super::VaultEntry;
use crate::git::GitDates;

#[derive(Debug, Clone, Serialize)]
#[serde(tag = "event", content = "data")]
pub enum VaultRebuildProgressEvent {
    #[serde(rename_all = "camelCase")]
    Started {
        total_files: usize,
    },
    #[serde(rename_all = "camelCase")]
    Progress {
        processed_files: usize,
        total_files: usize,
        current_path: String,
    },
    Cancelled,
    #[serde(rename_all = "camelCase")]
    Finished {
        result: Vec<VaultEntry>,
    },
}

/// Scan vault files with progress events and cancellation checkpoints.
pub fn scan_vault_with_progress<F>(
    vault_path: &Path,
    git_dates: &HashMap<String, GitDates>,
    cancelled: &AtomicBool,
    on_progress: &F,
) -> Result<Vec<VaultEntry>, String>
where
    F: Fn(VaultRebuildProgressEvent) + ?Sized,
{
    validate_vault_path(vault_path)?;
    recover_pending_renames(vault_path);

    let files = collect_scannable_files(vault_path)?;
    let total_files = files.len();
    on_progress(VaultRebuildProgressEvent::Started { total_files });
    check_cancelled(cancelled, on_progress)?;

    let mut entries = Vec::new();
    for (index, path) in files.iter().enumerate() {
        check_cancelled(cancelled, on_progress)?;
        try_parse_file(path, vault_path, git_dates, &mut entries);
        on_progress(VaultRebuildProgressEvent::Progress {
            processed_files: index + 1,
            total_files,
            current_path: relative_path(vault_path, path),
        });
    }

    check_cancelled(cancelled, on_progress)?;
    entries.sort_by_key(|entry| std::cmp::Reverse(entry.modified_at));
    on_progress(VaultRebuildProgressEvent::Finished {
        result: entries.clone(),
    });
    Ok(entries)
}

fn validate_vault_path(vault_path: &Path) -> Result<(), String> {
    if !vault_path.exists() {
        return Err(format!(
            "Vault path does not exist: {}",
            vault_path.display()
        ));
    }
    if !vault_path.is_dir() {
        return Err(format!(
            "Vault path is not a directory: {}",
            vault_path.display()
        ));
    }
    Ok(())
}

fn recover_pending_renames(vault_path: &Path) {
    if let Err(err) = super::rename::recover_pending_rename_transactions(vault_path) {
        log::warn!(
            "Failed to recover pending rename transactions in {}: {}",
            vault_path.display(),
            err
        );
    }
}

fn collect_scannable_files(vault_path: &Path) -> Result<Vec<PathBuf>, String> {
    let walker = WalkDir::new(vault_path)
        .follow_links(false)
        .into_iter()
        .filter_entry(|entry| {
            if entry.file_type().is_dir() {
                let name = entry.file_name().to_string_lossy();
                return entry.depth() == 0 || !is_hidden_dir(&name);
            }
            true
        });
    let mut files = Vec::new();
    for entry in walker {
        let entry = entry.map_err(|e| format!("Failed to scan vault: {e}"))?;
        if !entry.file_type().is_file() {
            continue;
        }
        let filename = entry.file_name().to_string_lossy();
        if filename.starts_with('.') {
            continue;
        }
        files.push(entry.path().to_path_buf());
    }
    Ok(files)
}

fn relative_path(vault_root: &Path, source_path: &Path) -> String {
    source_path
        .strip_prefix(vault_root)
        .unwrap_or(source_path)
        .to_string_lossy()
        .replace('\\', "/")
}

fn check_cancelled<F>(cancelled: &AtomicBool, on_progress: &F) -> Result<(), String>
where
    F: Fn(VaultRebuildProgressEvent) + ?Sized,
{
    if !cancelled.load(Ordering::SeqCst) {
        return Ok(());
    }
    on_progress(VaultRebuildProgressEvent::Cancelled);
    Err("Vault rebuild cancelled".to_string())
}
