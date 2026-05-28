use super::import_manifest::{manifest_withheld, ImportAutopsyManifestRow};
use super::importer::{
    import_markdown_folder, preview_markdown_folder_import, MarkdownFolderImportPreview,
    MarkdownFolderImportReport,
};
use super::importer_progress::{
    import_markdown_folder_with_progress, MarkdownFolderImportProgressEvent,
};
use std::fs::{self, File};
use std::io;
use std::path::{Path, PathBuf};
use std::sync::atomic::{AtomicBool, Ordering};
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

    let extraction = extract_zip_archive(&zip_file, &source_root)?;
    let mut report = import_markdown_folder(&vault_root, &source_root)?;
    report.skipped_files += extraction.skipped_count();
    Ok(report)
}

/// Extracts a Markdown ZIP export and imports supported files with cancellable progress.
pub fn import_markdown_zip_with_progress<F>(
    vault_path: &Path,
    zip_path: &Path,
    cancelled: &AtomicBool,
    on_progress: &F,
) -> Result<MarkdownFolderImportReport, String>
where
    F: Fn(MarkdownFolderImportProgressEvent),
{
    let vault_root = canonical_dir(vault_path, "Vault")?;
    let zip_file = canonical_zip_file(zip_path)?;
    validate_zip_source(&vault_root, &zip_file)?;

    let temp_dir = TempDir::new().map_err(|e| format!("Failed to prepare ZIP import: {e}"))?;
    let source_root = temp_dir.path().join(zip_source_name(&zip_file));
    fs::create_dir_all(&source_root)
        .map_err(|e| format!("Failed to prepare extracted ZIP folder: {e}"))?;

    let extraction =
        extract_zip_archive_with_progress(&zip_file, &source_root, cancelled, on_progress)?;
    check_zip_cancelled(cancelled, on_progress)?;
    let relay_progress = |event| {
        if !matches!(event, MarkdownFolderImportProgressEvent::Finished { .. }) {
            on_progress(event);
        }
    };
    let mut report = import_markdown_folder_with_progress(
        &vault_root,
        &source_root,
        cancelled,
        &relay_progress,
    )?;
    report.skipped_files += extraction.skipped_count();
    on_progress(MarkdownFolderImportProgressEvent::Finished {
        result: report.clone(),
    });
    Ok(report)
}

/// Previews a Markdown ZIP import without writing into the active vault.
pub fn preview_markdown_zip_import(
    vault_path: &Path,
    zip_path: &Path,
) -> Result<MarkdownFolderImportPreview, String> {
    let vault_root = canonical_dir(vault_path, "Vault")?;
    let zip_file = canonical_zip_file(zip_path)?;
    validate_zip_source(&vault_root, &zip_file)?;

    let temp_dir = TempDir::new().map_err(|e| format!("Failed to prepare ZIP import: {e}"))?;
    let source_root = temp_dir.path().join(zip_source_name(&zip_file));
    fs::create_dir_all(&source_root)
        .map_err(|e| format!("Failed to prepare extracted ZIP folder: {e}"))?;

    let extraction = extract_zip_archive(&zip_file, &source_root)?;
    let mut preview = preview_markdown_folder_import(&vault_root, &source_root)?;
    preview.source_path = zip_file.to_string_lossy().into_owned();
    preview.skipped_files += extraction.skipped_count();
    preview.manifest_rows.extend(unsafe_zip_manifest_rows(
        &zip_file,
        &extraction.skipped_entries,
    ));
    Ok(preview)
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

#[derive(Debug, Default)]
struct ZipExtractionSummary {
    skipped_entries: Vec<String>,
}

impl ZipExtractionSummary {
    fn skipped_count(&self) -> usize {
        self.skipped_entries.len()
    }
}

fn extract_zip_archive(
    zip_file: &Path,
    target_root: &Path,
) -> Result<ZipExtractionSummary, String> {
    let file = File::open(zip_file).map_err(|e| format!("Failed to open ZIP import: {e}"))?;
    let mut archive =
        ZipArchive::new(file).map_err(|e| format!("Failed to read ZIP import: {e}"))?;
    let mut summary = ZipExtractionSummary::default();

    for index in 0..archive.len() {
        let mut zipped = archive
            .by_index(index)
            .map_err(|e| format!("Failed to read ZIP entry: {e}"))?;
        let Some(enclosed_name) = zipped.enclosed_name().map(PathBuf::from) else {
            summary.skipped_entries.push(zipped.name().to_string());
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

    Ok(summary)
}

fn extract_zip_archive_with_progress<F>(
    zip_file: &Path,
    target_root: &Path,
    cancelled: &AtomicBool,
    on_progress: &F,
) -> Result<ZipExtractionSummary, String>
where
    F: Fn(MarkdownFolderImportProgressEvent),
{
    let file = File::open(zip_file).map_err(|e| format!("Failed to open ZIP import: {e}"))?;
    let mut archive =
        ZipArchive::new(file).map_err(|e| format!("Failed to read ZIP import: {e}"))?;
    let total_files = archive.len();
    let mut summary = ZipExtractionSummary::default();
    on_progress(MarkdownFolderImportProgressEvent::Started { total_files });

    for index in 0..total_files {
        check_zip_cancelled(cancelled, on_progress)?;
        let mut zipped = archive
            .by_index(index)
            .map_err(|e| format!("Failed to read ZIP entry: {e}"))?;
        let current_path = zipped.name().to_string();
        let Some(enclosed_name) = zipped.enclosed_name().map(PathBuf::from) else {
            summary.skipped_entries.push(current_path.clone());
            on_progress(MarkdownFolderImportProgressEvent::Progress {
                processed_files: index + 1,
                total_files,
                current_path,
            });
            continue;
        };
        let output_path = target_root.join(enclosed_name);

        if zipped.is_dir() {
            fs::create_dir_all(&output_path)
                .map_err(|e| format!("Failed to create ZIP folder: {e}"))?;
        } else {
            if let Some(parent) = output_path.parent() {
                fs::create_dir_all(parent)
                    .map_err(|e| format!("Failed to create ZIP folder: {e}"))?;
            }
            let mut output = File::create(&output_path)
                .map_err(|e| format!("Failed to create ZIP file: {e}"))?;
            io::copy(&mut zipped, &mut output)
                .map_err(|e| format!("Failed to write ZIP file: {e}"))?;
        }
        on_progress(MarkdownFolderImportProgressEvent::Progress {
            processed_files: index + 1,
            total_files,
            current_path,
        });
    }

    Ok(summary)
}

fn unsafe_zip_manifest_rows(
    zip_file: &Path,
    skipped_entries: &[String],
) -> Vec<ImportAutopsyManifestRow> {
    skipped_entries
        .iter()
        .map(|entry| {
            let source = format!("{}!/{entry}", zip_entry_source_name(zip_file));
            manifest_withheld(Path::new(&source), "unsafe ZIP traversal skip")
        })
        .collect()
}

fn zip_entry_source_name(zip_file: &Path) -> String {
    zip_file
        .file_name()
        .map(|name| name.to_string_lossy().into_owned())
        .unwrap_or_else(|| "markdown.zip".to_string())
}

fn check_zip_cancelled<F>(cancelled: &AtomicBool, on_progress: &F) -> Result<(), String>
where
    F: Fn(MarkdownFolderImportProgressEvent),
{
    if !cancelled.load(Ordering::SeqCst) {
        return Ok(());
    }
    on_progress(MarkdownFolderImportProgressEvent::Cancelled);
    Err("Import cancelled".to_string())
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
        assert_eq!(result.skipped_files, 1);
        assert!(import_root.join("safe.md").exists());
        assert!(!vault.path().join("escape.md").exists());
    }

    #[test]
    fn previews_markdown_zip_without_writing_to_vault() {
        let vault = TempDir::new().unwrap();
        let zip_dir = TempDir::new().unwrap();
        let zip_path = zip_dir.path().join("portable.zip");
        write_zip(
            &zip_path,
            &[
                ("note.md", b"# Note\n".as_slice()),
                ("assets/image.png", b"image".as_slice()),
                ("src/app.ts", b"console.log('skip')".as_slice()),
            ],
        );

        let result = preview_markdown_zip_import(vault.path(), &zip_path).unwrap();

        assert_eq!(
            result.source_path,
            zip_path.canonicalize().unwrap().to_string_lossy()
        );
        assert_eq!(result.notes_to_copy, 1);
        assert_eq!(result.assets_to_copy, 1);
        assert_eq!(result.skipped_files, 1);
        assert!(result.writes_local_only_report);
        assert!(result.planned_import_root.contains("/imports/portable"));
        assert!(!Path::new(&result.planned_import_root).exists());
    }

    #[test]
    fn preview_counts_zip_entries_that_escape_the_archive_root() {
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

        let result = preview_markdown_zip_import(vault.path(), &zip_path).unwrap();

        assert_eq!(result.notes_to_copy, 1);
        assert_eq!(result.skipped_files, 1);
        assert!(!vault.path().join("imports").exists());
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
