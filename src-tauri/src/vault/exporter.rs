use serde::Serialize;
use std::fs::{self, File};
use std::io;
use std::path::{Path, PathBuf};
use walkdir::{DirEntry, WalkDir};
use zip::write::FileOptions;

const SKIPPED_DIRS: &[&str] = &[".git", "node_modules", "target"];
const SKIPPED_FILES: &[&str] = &[".DS_Store"];

#[derive(Debug, Clone, Serialize, PartialEq, Eq)]
pub struct VaultExportReport {
    pub export_path: String,
    pub files_exported: usize,
    pub skipped_files: usize,
}

/// Writes the current vault as a portable Markdown ZIP archive.
pub fn export_markdown_zip(
    vault_path: &Path,
    target_path: &Path,
) -> Result<VaultExportReport, String> {
    let vault_root = canonical_dir(vault_path, "Vault")?;
    let target = resolve_target_path(target_path);
    validate_target(&vault_root, &target)?;
    if let Some(parent) = target.parent() {
        fs::create_dir_all(parent).map_err(|e| format!("Failed to create export folder: {e}"))?;
    }

    let file = File::create(&target).map_err(|e| format!("Failed to create ZIP export: {e}"))?;
    let mut zip = zip::ZipWriter::new(file);
    let options = FileOptions::default()
        .compression_method(zip::CompressionMethod::Deflated)
        .unix_permissions(0o644);
    let mut files_exported = 0;
    let mut skipped_files = 0;

    for entry in WalkDir::new(&vault_root)
        .follow_links(false)
        .into_iter()
        .filter_entry(should_enter)
    {
        let entry = entry.map_err(|e| format!("Failed to read vault for export: {e}"))?;
        if !entry.file_type().is_file() {
            continue;
        }
        if should_skip_file(&entry) {
            skipped_files += 1;
            continue;
        }
        add_file_to_zip(&vault_root, entry.path(), &mut zip, options)?;
        files_exported += 1;
    }

    zip.finish()
        .map_err(|e| format!("Failed to finish ZIP export: {e}"))?;
    Ok(VaultExportReport {
        export_path: target.to_string_lossy().into_owned(),
        files_exported,
        skipped_files,
    })
}

fn canonical_dir(path: &Path, label: &str) -> Result<PathBuf, String> {
    let canonical = path
        .canonicalize()
        .map_err(|e| format!("{label} folder is not available: {e}"))?;
    if !canonical.is_dir() {
        return Err(format!("{label} path is not a folder"));
    }
    Ok(canonical)
}

fn resolve_target_path(path: &Path) -> PathBuf {
    if path.extension().is_some() {
        return path.to_path_buf();
    }
    path.with_extension("zip")
}

fn validate_target(vault_root: &Path, target: &Path) -> Result<(), String> {
    let parent = target
        .parent()
        .unwrap_or_else(|| Path::new("."))
        .canonicalize()
        .map_err(|e| format!("Failed to inspect export folder: {e}"))?;
    let canonical_target = parent.join(
        target
            .file_name()
            .ok_or_else(|| "Export target must include a file name".to_string())?,
    );
    if canonical_target.starts_with(vault_root) {
        return Err("Choose an export path outside the active vault".to_string());
    }
    Ok(())
}

fn should_enter(entry: &DirEntry) -> bool {
    if !entry.file_type().is_dir() {
        return true;
    }
    let name = entry.file_name().to_string_lossy().to_ascii_lowercase();
    !SKIPPED_DIRS.contains(&name.as_str())
}

fn should_skip_file(entry: &DirEntry) -> bool {
    entry
        .file_name()
        .to_str()
        .is_some_and(|name| SKIPPED_FILES.contains(&name))
}

fn add_file_to_zip(
    vault_root: &Path,
    source_path: &Path,
    zip: &mut zip::ZipWriter<File>,
    options: FileOptions,
) -> Result<(), String> {
    let relative_path = source_path
        .strip_prefix(vault_root)
        .map_err(|_| "Failed to resolve vault file during export".to_string())?;
    let archive_name = relative_path.to_string_lossy().replace('\\', "/");
    zip.start_file(archive_name, options)
        .map_err(|e| format!("Failed to add ZIP entry: {e}"))?;
    let mut source = File::open(source_path)
        .map_err(|e| format!("Failed to open {}: {e}", source_path.display()))?;
    io::copy(&mut source, zip)
        .map(|_| ())
        .map_err(|e| format!("Failed to write {} into ZIP: {e}", source_path.display()))
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::TempDir;

    #[test]
    fn exports_vault_files_to_zip() {
        let vault = TempDir::new().unwrap();
        let target_dir = TempDir::new().unwrap();
        fs::write(vault.path().join("note.md"), "# Note\n").unwrap();
        fs::create_dir_all(vault.path().join("assets")).unwrap();
        fs::write(vault.path().join("assets/image.svg"), "<svg/>").unwrap();

        let result =
            export_markdown_zip(vault.path(), &target_dir.path().join("vault.zip")).unwrap();

        assert_eq!(result.files_exported, 2);
        assert!(Path::new(&result.export_path).exists());
    }

    #[test]
    fn rejects_export_inside_vault() {
        let vault = TempDir::new().unwrap();
        let error =
            export_markdown_zip(vault.path(), &vault.path().join("export.zip")).unwrap_err();

        assert!(error.contains("outside the active vault"));
    }
}
