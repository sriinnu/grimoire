use super::importer::{import_markdown_folder, MarkdownFolderImportReport};
use std::fs::{self, File};
use std::io;
use std::path::{Path, PathBuf};
use tempfile::TempDir;
use zip::ZipArchive;

/// Extracts a Markdown ZIP export and imports supported files into the vault.
pub fn import_markdown_zip(
    vault_path: &Path,
    zip_path: &Path,
) -> Result<MarkdownFolderImportReport, String> {
    let vault_root = canonical_dir(vault_path, "Vault")?;
    let zip_file = canonical_zip_file(zip_path)?;
    validate_zip_source(&vault_root, &zip_file)?;

    let temp_dir = TempDir::new().map_err(|e| format!("Failed to prepare ZIP import: {e}"))?;
    let source_root = temp_dir.path().join(zip_source_name(&zip_file));
    fs::create_dir_all(&source_root)
        .map_err(|e| format!("Failed to prepare extracted ZIP folder: {e}"))?;

    extract_zip_archive(&zip_file, &source_root)?;
    import_markdown_folder(&vault_root, &source_root)
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

fn canonical_zip_file(path: &Path) -> Result<PathBuf, String> {
    let canonical = path
        .canonicalize()
        .map_err(|e| format!("ZIP file is not available: {e}"))?;
    if !canonical.is_file() {
        return Err("ZIP import source is not a file".to_string());
    }
    let extension = canonical
        .extension()
        .map(|value| value.to_string_lossy().to_ascii_lowercase())
        .unwrap_or_default();
    if extension != "zip" {
        return Err("Choose a .zip Markdown export".to_string());
    }
    Ok(canonical)
}

fn validate_zip_source(vault_root: &Path, zip_file: &Path) -> Result<(), String> {
    if zip_file.starts_with(vault_root) {
        return Err("Choose a ZIP file outside the active vault".to_string());
    }
    Ok(())
}

fn zip_source_name(zip_file: &Path) -> String {
    zip_file
        .file_stem()
        .map(|name| name.to_string_lossy().into_owned())
        .filter(|name| !name.trim().is_empty())
        .unwrap_or_else(|| "markdown-zip".to_string())
}

fn extract_zip_archive(zip_file: &Path, target_root: &Path) -> Result<(), String> {
    let file = File::open(zip_file).map_err(|e| format!("Failed to open ZIP import: {e}"))?;
    let mut archive =
        ZipArchive::new(file).map_err(|e| format!("Failed to read ZIP import: {e}"))?;

    for index in 0..archive.len() {
        let mut zipped = archive
            .by_index(index)
            .map_err(|e| format!("Failed to read ZIP entry: {e}"))?;
        let Some(enclosed_name) = zipped.enclosed_name().map(PathBuf::from) else {
            continue;
        };
        let output_path = target_root.join(enclosed_name);

        if zipped.is_dir() {
            fs::create_dir_all(&output_path)
                .map_err(|e| format!("Failed to create ZIP folder: {e}"))?;
            continue;
        }
        if let Some(parent) = output_path.parent() {
            fs::create_dir_all(parent).map_err(|e| format!("Failed to create ZIP folder: {e}"))?;
        }

        let mut output =
            File::create(&output_path).map_err(|e| format!("Failed to create ZIP file: {e}"))?;
        io::copy(&mut zipped, &mut output).map_err(|e| format!("Failed to write ZIP file: {e}"))?;
    }

    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::TempDir;
    use zip::write::FileOptions;

    #[test]
    fn imports_markdown_zip_with_assets() {
        let vault = TempDir::new().unwrap();
        let zip_dir = TempDir::new().unwrap();
        let zip_path = zip_dir.path().join("bear-export.zip");
        write_zip(
            &zip_path,
            &[
                ("note.md", b"# Note\n".as_slice()),
                ("assets/image.svg", b"<svg/>".as_slice()),
                ("src/app.ts", b"console.log('skip')".as_slice()),
            ],
        );

        let result = import_markdown_zip(vault.path(), &zip_path).unwrap();
        let import_root = Path::new(&result.imported_root);

        assert_eq!(result.notes_copied, 1);
        assert_eq!(result.assets_copied, 1);
        assert_eq!(result.skipped_files, 1);
        assert!(import_root.join("note.md").exists());
        assert!(import_root.join("assets/image.svg").exists());
        assert!(Path::new(&result.report_path).exists());
    }

    #[test]
    fn skips_zip_entries_that_escape_the_archive_root() {
        let vault = TempDir::new().unwrap();
        let zip_dir = TempDir::new().unwrap();
        let zip_path = zip_dir.path().join("unsafe.zip");
        write_zip(
            &zip_path,
            &[
                ("safe.md", b"# Safe\n".as_slice()),
                ("../escape.md", b"# Escape\n".as_slice()),
            ],
        );

        let result = import_markdown_zip(vault.path(), &zip_path).unwrap();
        let import_root = Path::new(&result.imported_root);

        assert_eq!(result.notes_copied, 1);
        assert!(import_root.join("safe.md").exists());
        assert!(!vault.path().join("escape.md").exists());
    }

    fn write_zip(path: &Path, entries: &[(&str, &[u8])]) {
        let file = File::create(path).unwrap();
        let mut zip = zip::ZipWriter::new(file);
        let options = FileOptions::default()
            .compression_method(zip::CompressionMethod::Deflated)
            .unix_permissions(0o644);

        for (name, body) in entries {
            zip.start_file(*name, options).unwrap();
            let mut reader = *body;
            io::copy(&mut reader, &mut zip).unwrap();
        }
        zip.finish().unwrap();
    }
}
