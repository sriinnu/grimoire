use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use std::fs;
use std::path::{Path, PathBuf};
use tempfile::TempPath;
use walkdir::WalkDir;

use super::exporter::{canonical_dir, should_enter, should_skip_file, validate_target};
use super::locality::is_local_only_export_file;
use super::locality_attachments::local_only_referenced_attachments;
use super::portability_capsule_io::write_capsule;

#[derive(Debug, Clone, Copy, Deserialize, Serialize, PartialEq, Eq)]
#[serde(rename_all = "kebab-case")]
pub enum PortabilityCapsuleFormat {
    Json,
    Sqlite,
}

#[derive(Debug, Clone, Serialize, PartialEq, Eq)]
pub struct PortabilityCapsulePreviewReport {
    pub format: PortabilityCapsuleFormat,
    pub preview_signature: String,
    pub files_exportable: usize,
    pub notes_exportable: usize,
    pub assets_exportable: usize,
    pub skipped_files: usize,
    pub bytes_exportable: u64,
    pub locality_proof: PortabilityCapsuleProof,
    pub manifest_rows: Vec<PortabilityCapsuleManifestRow>,
}

#[derive(Debug, Clone, Deserialize, Serialize, PartialEq, Eq)]
pub struct PortabilityCapsuleProof {
    pub markdown_source_of_truth: bool,
    pub absolute_source_paths_redacted: bool,
    pub local_only_files_withheld: usize,
}

#[derive(Debug, Clone, Serialize, PartialEq, Eq)]
pub struct PortabilityCapsuleManifestRow {
    pub kind: String,
    pub path: String,
    pub bytes: u64,
    pub sha256: Option<String>,
    pub reason: Option<String>,
}

#[derive(Debug, Clone)]
pub(super) struct CapsuleInventory {
    pub(super) files: Vec<CapsuleFile>,
    pub(super) withheld: Vec<CapsuleWithheld>,
    bytes_exportable: u64,
}

#[derive(Debug, Clone)]
pub(super) struct CapsuleFile {
    pub(super) path: String,
    pub(super) kind: String,
    pub(super) bytes: Vec<u8>,
    pub(super) sha256: String,
}

#[derive(Debug, Clone)]
pub(super) struct CapsuleWithheld {
    pub(super) path: String,
    pub(super) reason: String,
}

/// Scans a vault and returns the reviewed capsule manifest before export.
pub fn preview_portability_capsule(
    vault_path: &Path,
    format: PortabilityCapsuleFormat,
) -> Result<PortabilityCapsulePreviewReport, String> {
    let vault_root = canonical_dir(vault_path, "Vault")?;
    let inventory = inventory_for_vault(&vault_root)?;
    Ok(preview_from_inventory(format, &inventory))
}

/// Writes a local JSON or SQLite snapshot while Markdown remains source of truth.
pub fn export_portability_capsule(
    vault_path: &Path,
    target_path: &Path,
    format: PortabilityCapsuleFormat,
    preview_signature: &str,
) -> Result<super::VaultExportReport, String> {
    let vault_root = canonical_dir(vault_path, "Vault")?;
    let target = target_with_extension(target_path, format.extension());
    validate_target(&vault_root, &target)?;
    if let Some(parent) = target.parent() {
        fs::create_dir_all(parent).map_err(|e| format!("Failed to create export folder: {e}"))?;
    }

    let inventory = inventory_for_vault(&vault_root)?;
    validate_preview_signature(
        "Capsule export",
        preview_signature,
        &preview_signature_for_inventory(format, &inventory),
    )?;
    let temp_path = create_capsule_temp_path(&target, format.extension())?;
    write_capsule(&vault_root, &inventory, &temp_path, format)?;
    persist_capsule_temp_path(temp_path, &target)?;
    Ok(super::VaultExportReport {
        export_path: target.to_string_lossy().into_owned(),
        files_exported: inventory.files.len(),
        skipped_files: inventory.withheld.len(),
    })
}

impl PortabilityCapsuleFormat {
    fn extension(self) -> &'static str {
        match self {
            PortabilityCapsuleFormat::Json => "json",
            PortabilityCapsuleFormat::Sqlite => "sqlite",
        }
    }

    pub(super) fn label(self) -> &'static str {
        match self {
            PortabilityCapsuleFormat::Json => "json-snapshot",
            PortabilityCapsuleFormat::Sqlite => "sqlite-snapshot",
        }
    }
}

fn inventory_for_vault(vault_root: &Path) -> Result<CapsuleInventory, String> {
    let local_only_attachments = local_only_referenced_attachments(vault_root)?;
    let mut files = Vec::new();
    let mut withheld = Vec::new();
    let mut bytes_exportable = 0;

    for entry in WalkDir::new(vault_root)
        .follow_links(false)
        .into_iter()
        .filter_entry(should_enter)
    {
        let entry =
            entry.map_err(|e| format!("Failed to inspect vault for capsule export: {e}"))?;
        if !entry.file_type().is_file() {
            continue;
        }
        let relative = normalized_relative_path(vault_root, entry.path())?;
        if should_skip_file(vault_root, &entry, &local_only_attachments) {
            withheld.push(CapsuleWithheld {
                path: relative,
                reason: withheld_reason(vault_root, entry.path(), &local_only_attachments),
            });
            continue;
        }
        let bytes = fs::read(entry.path())
            .map_err(|e| format!("Failed to read {}: {e}", entry.path().display()))?;
        bytes_exportable += bytes.len() as u64;
        files.push(CapsuleFile {
            kind: file_kind(&relative).to_string(),
            sha256: sha256_hex(&bytes),
            path: relative,
            bytes,
        });
    }
    files.sort_by(|left, right| left.path.cmp(&right.path));
    withheld.sort_by(|left, right| left.path.cmp(&right.path));
    Ok(CapsuleInventory {
        files,
        withheld,
        bytes_exportable,
    })
}

fn preview_from_inventory(
    format: PortabilityCapsuleFormat,
    inventory: &CapsuleInventory,
) -> PortabilityCapsulePreviewReport {
    let notes_exportable = inventory
        .files
        .iter()
        .filter(|file| file.kind == "markdown")
        .count();
    let manifest_rows = inventory
        .files
        .iter()
        .map(exportable_row)
        .chain(inventory.withheld.iter().map(withheld_row))
        .collect();
    PortabilityCapsulePreviewReport {
        format,
        preview_signature: preview_signature_for_inventory(format, inventory),
        files_exportable: inventory.files.len(),
        notes_exportable,
        assets_exportable: inventory.files.len().saturating_sub(notes_exportable),
        skipped_files: inventory.withheld.len(),
        bytes_exportable: inventory.bytes_exportable,
        locality_proof: proof_for_inventory(inventory),
        manifest_rows,
    }
}

pub(super) fn validate_preview_signature(
    operation: &str,
    reviewed_signature: &str,
    current_signature: &str,
) -> Result<(), String> {
    let reviewed_signature = reviewed_signature.trim();
    if reviewed_signature.is_empty() {
        return Err(format!("{operation} requires a reviewed preview signature"));
    }
    if reviewed_signature != current_signature {
        return Err(format!(
            "{operation} preview is stale; run preview again before continuing"
        ));
    }
    Ok(())
}

fn preview_signature_for_inventory(
    format: PortabilityCapsuleFormat,
    inventory: &CapsuleInventory,
) -> String {
    let mut payload = format!(
        "capsule-preview-v1\0{}\0{}\0{}\0",
        format.label(),
        inventory.bytes_exportable,
        inventory.withheld.len()
    );
    for file in &inventory.files {
        payload.push_str(&format!(
            "file\0{}\0{}\0{}\0{}\0",
            file.kind,
            file.path,
            file.bytes.len(),
            file.sha256
        ));
    }
    for file in &inventory.withheld {
        payload.push_str(&format!("withheld\0{}\0{}\0", file.path, file.reason));
    }
    format!("capsule-preview-v1:{}", sha256_hex(payload.as_bytes()))
}

fn exportable_row(file: &CapsuleFile) -> PortabilityCapsuleManifestRow {
    PortabilityCapsuleManifestRow {
        kind: file.kind.clone(),
        path: file.path.clone(),
        bytes: file.bytes.len() as u64,
        sha256: Some(file.sha256.clone()),
        reason: None,
    }
}

fn withheld_row(file: &CapsuleWithheld) -> PortabilityCapsuleManifestRow {
    PortabilityCapsuleManifestRow {
        kind: "withheld".to_string(),
        path: file.path.clone(),
        bytes: 0,
        sha256: None,
        reason: Some(file.reason.clone()),
    }
}

pub(super) fn proof_for_inventory(inventory: &CapsuleInventory) -> PortabilityCapsuleProof {
    PortabilityCapsuleProof {
        markdown_source_of_truth: true,
        absolute_source_paths_redacted: true,
        local_only_files_withheld: inventory.withheld.len(),
    }
}

fn normalized_relative_path(vault_root: &Path, path: &Path) -> Result<String, String> {
    path.strip_prefix(vault_root)
        .map(|path| path.to_string_lossy().replace('\\', "/"))
        .map_err(|_| "Failed to resolve vault file for capsule export".to_string())
}

fn withheld_reason(
    vault_root: &Path,
    path: &Path,
    local_only_attachments: &std::collections::BTreeSet<String>,
) -> String {
    let relative = normalized_relative_path(vault_root, path).unwrap_or_default();
    if local_only_attachments.contains(&relative) {
        return "Referenced only by a local-only note".to_string();
    }
    if is_local_only_export_file(vault_root, path) {
        return "Protected by Locality Firewall".to_string();
    }
    "Excluded runtime, hidden, or tool-owned file".to_string()
}

fn file_kind(path: &str) -> &'static str {
    match Path::new(path)
        .extension()
        .map(|extension| extension.to_string_lossy().to_ascii_lowercase())
        .as_deref()
    {
        Some("md" | "markdown" | "mdown" | "mkd") => "markdown",
        Some("json" | "yaml" | "yml" | "toml" | "txt" | "csv") => "text",
        _ => "asset",
    }
}

pub(super) fn sha256_hex(bytes: &[u8]) -> String {
    Sha256::digest(bytes)
        .iter()
        .map(|byte| format!("{byte:02x}"))
        .collect()
}

fn target_with_extension(path: &Path, extension: &str) -> PathBuf {
    if path.extension().is_some() {
        return path.to_path_buf();
    }
    path.with_extension(extension)
}

fn create_capsule_temp_path(target: &Path, extension: &str) -> Result<TempPath, String> {
    let parent = target.parent().unwrap_or_else(|| Path::new("."));
    tempfile::Builder::new()
        .prefix(".grimoire-capsule-")
        .suffix(&format!(".{extension}.tmp"))
        .tempfile_in(parent)
        .map(|file| file.into_temp_path())
        .map_err(|e| format!("Failed to create temporary capsule export: {e}"))
}

fn persist_capsule_temp_path(temp_path: TempPath, target: &Path) -> Result<(), String> {
    temp_path
        .persist(target)
        .map(|_| ())
        .map_err(|e| format!("Failed to finalize capsule export: {e}"))
}

pub(super) fn vault_label(vault_root: &Path) -> String {
    vault_root
        .file_name()
        .map(|name| name.to_string_lossy().into_owned())
        .unwrap_or_else(|| "vault".to_string())
}
