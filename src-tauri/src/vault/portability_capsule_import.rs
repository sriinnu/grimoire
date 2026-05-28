use std::fs;
use std::path::{Component, Path, PathBuf};

use super::import_manifest::{ImportAutopsyManifestKind, ImportAutopsyManifestRow};
use super::importer::{
    canonical_dir, is_skipped_name, path_to_string, unique_import_root, write_import_report,
    ImportCounters,
};
use super::portability_capsule::{sha256_hex, PortabilityCapsuleFormat};
use super::portability_capsule_import_filter::filter_inbound_capsule;
use super::portability_capsule_import_readers::read_capsule;
use super::{MarkdownFolderImportPreview, MarkdownFolderImportReport};

#[derive(Debug, Clone)]
pub(super) struct ImportedCapsule {
    pub(super) files: Vec<ImportedCapsuleFile>,
    pub(super) withheld: Vec<ImportedCapsuleWithheld>,
}

#[derive(Debug, Clone)]
pub(super) struct ImportedCapsuleFile {
    pub(super) path: String,
    pub(super) kind: String,
    pub(super) bytes: Vec<u8>,
    pub(super) sha256: String,
}

#[derive(Debug, Clone)]
pub(super) struct ImportedCapsuleWithheld {
    pub(super) path: String,
    pub(super) reason: String,
}

/// Previews a Grimoire JSON or SQLite capsule import without writing files.
pub fn preview_portability_capsule_import(
    vault_path: &Path,
    source_path: &Path,
    format: PortabilityCapsuleFormat,
) -> Result<MarkdownFolderImportPreview, String> {
    let (vault_root, source_file, capsule, import_root) =
        load_capsule_import_plan(vault_path, source_path, format)?;
    let counters = counters_for_capsule(&capsule);
    Ok(MarkdownFolderImportPreview {
        source_path: path_to_string(&source_file),
        planned_import_root: path_to_string(&import_root),
        notes_to_copy: counters.notes_copied,
        assets_to_copy: counters.assets_copied,
        skipped_files: counters.skipped_files,
        failed_files: counters.failed_files,
        writes_local_only_report: true,
        manifest_rows: capsule_manifest_rows(&vault_root, &source_file, &import_root, &capsule)?,
    })
}

/// Imports a reviewed Grimoire capsule into `imports/<capsule-name>/`.
pub fn import_portability_capsule(
    vault_path: &Path,
    source_path: &Path,
    format: PortabilityCapsuleFormat,
) -> Result<MarkdownFolderImportReport, String> {
    let (_vault_root, source_file, capsule, import_root) =
        load_capsule_import_plan(vault_path, source_path, format)?;
    fs::create_dir_all(&import_root).map_err(|e| format!("Failed to create import folder: {e}"))?;

    let mut counters = ImportCounters::new();
    counters.skipped_files = capsule.withheld.len();
    for file in &capsule.files {
        copy_capsule_file(&import_root, file, &mut counters);
    }
    let report_path = write_import_report(&source_file, &import_root, &counters)?;
    Ok(MarkdownFolderImportReport {
        imported_root: path_to_string(&import_root),
        report_path: path_to_string(&report_path),
        notes_copied: counters.notes_copied,
        assets_copied: counters.assets_copied,
        skipped_files: counters.skipped_files,
        failed_files: counters.failed_files,
    })
}

fn load_capsule_import_plan(
    vault_path: &Path,
    source_path: &Path,
    format: PortabilityCapsuleFormat,
) -> Result<(PathBuf, PathBuf, ImportedCapsule, PathBuf), String> {
    let vault_root = canonical_dir(vault_path, "Vault")?;
    let source_file = canonical_file(source_path)?;
    validate_capsule_source_boundary(&vault_root, &source_file)?;
    let capsule = read_capsule(&source_file, format)?;
    validate_capsule(&capsule)?;
    let capsule = filter_inbound_capsule(capsule);
    let import_root = unique_import_root(&vault_root, &source_file)?;
    Ok((vault_root, source_file, capsule, import_root))
}

fn canonical_file(path: &Path) -> Result<PathBuf, String> {
    let canonical = path
        .canonicalize()
        .map_err(|e| format!("Capsule file is not available: {e}"))?;
    if !canonical.is_file() {
        return Err("Capsule path is not a file".to_string());
    }
    Ok(canonical)
}

fn validate_capsule_source_boundary(vault_root: &Path, source_file: &Path) -> Result<(), String> {
    if source_file.starts_with(vault_root) {
        return Err("Choose a capsule file outside the active vault".to_string());
    }
    Ok(())
}

fn validate_capsule(capsule: &ImportedCapsule) -> Result<(), String> {
    for file in &capsule.files {
        safe_relative_path(&file.path)?;
        if sha256_hex(&file.bytes) != file.sha256 {
            return Err(format!("Capsule checksum mismatch for {}", file.path));
        }
    }
    for file in &capsule.withheld {
        safe_relative_path(&file.path)?;
    }
    Ok(())
}

fn counters_for_capsule(capsule: &ImportedCapsule) -> ImportCounters {
    let mut counters = ImportCounters::new();
    counters.skipped_files = capsule.withheld.len();
    for file in &capsule.files {
        if is_markdown_capsule_file(file) {
            counters.notes_copied += 1;
        } else {
            counters.assets_copied += 1;
        }
    }
    counters
}

fn copy_capsule_file(
    import_root: &Path,
    file: &ImportedCapsuleFile,
    counters: &mut ImportCounters,
) {
    let result = (|| -> Result<(), String> {
        let relative = safe_relative_path(&file.path)?;
        let destination = import_root.join(relative);
        if let Some(parent) = destination.parent() {
            fs::create_dir_all(parent)
                .map_err(|e| format!("Failed to create {}: {e}", parent.display()))?;
        }
        fs::write(&destination, &file.bytes)
            .map_err(|e| format!("Failed to write {}: {e}", destination.display()))
    })();

    match result {
        Ok(()) if is_markdown_capsule_file(file) => counters.notes_copied += 1,
        Ok(()) => counters.assets_copied += 1,
        Err(error) => {
            counters.failed_files += 1;
            counters.failures.push(error);
        }
    }
}

fn capsule_manifest_rows(
    vault_root: &Path,
    source_file: &Path,
    import_root: &Path,
    capsule: &ImportedCapsule,
) -> Result<Vec<ImportAutopsyManifestRow>, String> {
    let mut rows = Vec::new();
    for file in &capsule.files {
        rows.push(ImportAutopsyManifestRow {
            kind: if is_markdown_capsule_file(file) {
                ImportAutopsyManifestKind::Note
            } else {
                ImportAutopsyManifestKind::Asset
            },
            source_path: capsule_source_label(source_file, &file.path),
            destination_path: Some(path_to_string(
                &import_root.join(safe_relative_path(&file.path)?),
            )),
            detail: "Grimoire capsule restore".to_string(),
        });
    }
    for file in &capsule.withheld {
        rows.push(ImportAutopsyManifestRow {
            kind: ImportAutopsyManifestKind::Withheld,
            source_path: capsule_source_label(source_file, &file.path),
            destination_path: None,
            detail: format!("withheld at export: {}", file.reason),
        });
    }
    Ok(redact_vault_root(vault_root, rows))
}

fn capsule_source_label(source_file: &Path, relative_path: &str) -> String {
    let file_name = source_file
        .file_name()
        .map(|name| name.to_string_lossy())
        .unwrap_or_default();
    format!("{file_name}/{relative_path}")
}

fn redact_vault_root(
    vault_root: &Path,
    rows: Vec<ImportAutopsyManifestRow>,
) -> Vec<ImportAutopsyManifestRow> {
    let root = vault_root.to_string_lossy();
    rows.into_iter()
        .map(|mut row| {
            if let Some(destination) = &row.destination_path {
                row.destination_path = Some(destination.replace(root.as_ref(), "."));
            }
            row
        })
        .collect()
}

fn safe_relative_path(path: &str) -> Result<PathBuf, String> {
    if path.trim().is_empty() || path.contains('\\') || Path::new(path).is_absolute() {
        return Err(format!("Unsafe capsule path `{path}`"));
    }
    let mut safe = PathBuf::new();
    for component in Path::new(path).components() {
        match component {
            Component::Normal(part) => {
                let name = part.to_string_lossy().to_ascii_lowercase();
                if is_skipped_name(&name) || name.starts_with(".env") {
                    return Err(format!("Unsafe capsule path `{path}`"));
                }
                safe.push(part);
            }
            _ => return Err(format!("Unsafe capsule path `{path}`")),
        }
    }
    Ok(safe)
}

fn is_markdown_capsule_file(file: &ImportedCapsuleFile) -> bool {
    file.kind == "markdown"
        || Path::new(&file.path)
            .extension()
            .map(|extension| {
                matches!(
                    extension.to_string_lossy().to_ascii_lowercase().as_str(),
                    "md" | "markdown" | "mdown" | "mkd"
                )
            })
            .unwrap_or(false)
}
