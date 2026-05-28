use chrono::Utc;
use serde::Serialize;
use std::fs;
use std::path::{Path, PathBuf};

use super::boundary::with_boundary;

const ICLOUD_PROVIDER_ID: &str = "icloud-drive";
const GOOGLE_PROVIDER_ID: &str = "google-drive-desktop";
const PROOF_LEVEL: &str = "desktop-folder-read-check";

#[derive(Debug, Clone, Serialize, PartialEq, Eq)]
pub struct DesktopStorageHealthReport {
    pub provider_id: String,
    pub proof_level: String,
    pub configured: bool,
    pub status: String,
    pub local_path_checked: bool,
    pub provider_root_detected: bool,
    pub vault_directory_checked: bool,
    pub readable: bool,
    pub credentials_stored: bool,
    pub message: String,
    pub checked_at: String,
    pub risk_notes: Vec<String>,
}

#[derive(Debug, Clone, PartialEq, Eq)]
struct ProviderMatch {
    detected: bool,
    root_exists: bool,
}

/// Checks local iCloud Drive or Google Drive Desktop folder health without cloud credentials.
#[tauri::command]
pub fn storage_desktop_provider_health_check(
    vault_path: PathBuf,
    provider_id: String,
) -> Result<DesktopStorageHealthReport, String> {
    let raw_vault_path = vault_path.to_string_lossy();
    with_boundary(Some(raw_vault_path.as_ref()), |boundary| {
        Ok(desktop_provider_health_report(
            boundary.requested_root(),
            provider_id.as_str(),
        ))
    })
}

fn desktop_provider_health_report(
    vault_path: &Path,
    provider_id: &str,
) -> DesktopStorageHealthReport {
    let provider_match = provider_match(vault_path, provider_id);
    let metadata = fs::metadata(vault_path);
    let exists = metadata.is_ok();
    let is_directory = metadata.as_ref().map(|data| data.is_dir()).unwrap_or(false);
    let readable = is_directory && fs::read_dir(vault_path).is_ok();
    let local_path_checked = matches!(provider_id, ICLOUD_PROVIDER_ID | GOOGLE_PROVIDER_ID);
    let status =
        desktop_health_status(provider_id, exists, is_directory, readable, &provider_match);

    DesktopStorageHealthReport {
        provider_id: provider_id.to_string(),
        proof_level: PROOF_LEVEL.to_string(),
        configured: status == "ready",
        status: status.to_string(),
        local_path_checked,
        provider_root_detected: provider_match.detected && provider_match.root_exists,
        vault_directory_checked: exists && is_directory,
        readable,
        credentials_stored: false,
        message: desktop_health_message(provider_id, status),
        checked_at: Utc::now().to_rfc3339(),
        risk_notes: desktop_risk_notes(provider_id, status),
    }
}

fn desktop_health_status(
    provider_id: &str,
    exists: bool,
    is_directory: bool,
    readable: bool,
    provider_match: &ProviderMatch,
) -> &'static str {
    if !matches!(provider_id, ICLOUD_PROVIDER_ID | GOOGLE_PROVIDER_ID) {
        return "unsupported_provider";
    }
    if !exists {
        return "path_missing";
    }
    if !is_directory {
        return "not_directory";
    }
    if !provider_match.detected {
        return "not_selected";
    }
    if !provider_match.root_exists {
        return "provider_root_missing";
    }
    if !readable {
        return "inaccessible";
    }
    "ready"
}

fn desktop_health_message(provider_id: &str, status: &str) -> String {
    match status {
        "ready" => format!(
            "{} local folder is readable. Cloud sync remains owned by the desktop provider.",
            provider_label(provider_id)
        ),
        "not_selected" => format!(
            "Current vault is not inside the normal {} desktop folder.",
            provider_label(provider_id)
        ),
        "provider_root_missing" => format!(
            "{} path shape was detected, but the provider root is not readable on this Mac.",
            provider_label(provider_id)
        ),
        "path_missing" => "Current vault path is not available on disk.".to_string(),
        "not_directory" => "Current vault path is not a folder.".to_string(),
        "inaccessible" => "Current vault folder exists but cannot be read by Grimoire.".to_string(),
        "unsupported_provider" => {
            "Desktop storage health supports iCloud Drive and Google Drive Desktop.".to_string()
        }
        _ => "Desktop storage health check failed.".to_string(),
    }
}

fn desktop_risk_notes(provider_id: &str, status: &str) -> Vec<String> {
    let mut notes = vec![
        "No cloud credentials, account tokens, or remote file lists are read or stored by Grimoire.".to_string(),
        "Provider quota, paused sync, offline recovery, and cross-device conflicts still belong to the desktop sync client.".to_string(),
    ];
    if status == "ready" {
        notes.push(format!(
            "{} is treated as a local working folder; protected notes still stay behind the Locality Firewall.",
            provider_label(provider_id)
        ));
    }
    notes
}

fn provider_label(provider_id: &str) -> &'static str {
    match provider_id {
        ICLOUD_PROVIDER_ID => "iCloud Drive",
        GOOGLE_PROVIDER_ID => "Google Drive Desktop",
        _ => "Desktop cloud",
    }
}

fn provider_match(path: &Path, provider_id: &str) -> ProviderMatch {
    let normalized = normalize_path(path);
    match provider_id {
        ICLOUD_PROVIDER_ID => provider_match_from_markers(
            path,
            &normalized,
            &[
                "/Library/Mobile Documents/com~apple~CloudDocs",
                "/iCloud Drive",
            ],
        ),
        GOOGLE_PROVIDER_ID => provider_match_from_markers(
            path,
            &normalized,
            &[
                "/Library/CloudStorage/GoogleDrive-",
                "/Google Drive",
                "/Volumes/GoogleDrive",
            ],
        ),
        _ => ProviderMatch {
            detected: false,
            root_exists: false,
        },
    }
}

fn provider_match_from_markers(path: &Path, normalized: &str, markers: &[&str]) -> ProviderMatch {
    let detected = markers.iter().any(|marker| normalized.contains(marker));
    ProviderMatch {
        detected,
        root_exists: detected && provider_root_exists(path, normalized, markers),
    }
}

fn provider_root_exists(path: &Path, normalized: &str, markers: &[&str]) -> bool {
    markers
        .iter()
        .filter_map(|marker| provider_root_candidate(normalized, marker))
        .any(|candidate| Path::new(&candidate).exists())
        || path.exists()
}

fn provider_root_candidate(normalized: &str, marker: &str) -> Option<String> {
    let start = normalized.find(marker)?;
    Some(normalized[..start + marker.len()].to_string())
}

fn normalize_path(path: &Path) -> String {
    path.to_string_lossy().replace('\\', "/")
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::TempDir;

    #[test]
    fn desktop_provider_health_detects_readable_icloud_folder() {
        let home = TempDir::new().unwrap();
        let vault = home
            .path()
            .join("Library/Mobile Documents/com~apple~CloudDocs/Grimoire");
        fs::create_dir_all(&vault).unwrap();

        let report = desktop_provider_health_report(&vault, ICLOUD_PROVIDER_ID);

        assert_eq!(report.status, "ready");
        assert!(report.configured);
        assert!(report.provider_root_detected);
        assert!(report.vault_directory_checked);
        assert!(report.readable);
        assert!(!report.credentials_stored);
    }

    #[test]
    fn desktop_provider_health_keeps_plain_local_folder_not_selected() {
        let vault = TempDir::new().unwrap();
        let report = desktop_provider_health_report(vault.path(), GOOGLE_PROVIDER_ID);

        assert_eq!(report.status, "not_selected");
        assert!(!report.configured);
        assert!(!report.provider_root_detected);
        assert!(report.vault_directory_checked);
        assert!(report.message.contains("not inside"));
    }

    #[test]
    fn desktop_provider_health_rejects_unknown_provider() {
        let vault = TempDir::new().unwrap();
        let report = desktop_provider_health_report(vault.path(), "dropbox");

        assert_eq!(report.status, "unsupported_provider");
        assert!(!report.local_path_checked);
        assert!(!report.credentials_stored);
    }
}
