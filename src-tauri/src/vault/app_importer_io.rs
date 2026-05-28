use std::fs::{self, File};
use std::io;
use std::path::{Path, PathBuf};
use walkdir::{DirEntry, WalkDir};
use zip::ZipArchive;

use super::app_importer::AppImportState;

const ATTACHMENT_EXTENSIONS: &[&str] = &[
    "avif", "canvas", "csv", "gif", "heic", "heif", "jpeg", "jpg", "json", "m4a", "mov", "mp3",
    "mp4", "ogg", "opus", "pdf", "png", "svg", "txt", "wav", "webm", "webp", "yaml", "yml",
];
const MARKDOWN_EXTENSIONS: &[&str] = &["md", "markdown", "mdown", "mkd"];
const SKIPPED_DIRS: &[&str] = &[".git", ".obsidian", ".trash", "__macosx", "node_modules"];

pub(super) struct PreparedImportSource {
    pub(super) path: PathBuf,
    pub(super) skipped_zip_entries: usize,
}

pub(super) fn canonical_dir(path: &Path, label: &str) -> Result<PathBuf, String> {
    let canonical = path
        .canonicalize()
        .map_err(|e| format!("{label} folder is not available: {e}"))?;
    if !canonical.is_dir() {
        return Err(format!("{label} path is not a folder"));
    }
    Ok(canonical)
}

pub(super) fn canonical_existing(path: &Path, label: &str) -> Result<PathBuf, String> {
    path.canonicalize()
        .map_err(|e| format!("{label} path is not available: {e}"))
}

pub(super) fn validate_source_boundary(vault_root: &Path, source: &Path) -> Result<(), String> {
    if source == vault_root || source.starts_with(vault_root) {
        return Err("Choose a source outside the active vault".to_string());
    }
    if source.is_dir() && vault_root.starts_with(source) {
        return Err("Import source and active vault must not contain each other".to_string());
    }
    Ok(())
}

pub(super) fn prepare_import_source(
    source: &Path,
    temp_root: &Path,
) -> Result<PreparedImportSource, String> {
    if source.is_file() && extension(source).as_deref() == Some("zip") {
        let skipped_zip_entries = extract_zip(source, temp_root)?;
        return Ok(PreparedImportSource {
            path: temp_root.to_path_buf(),
            skipped_zip_entries,
        });
    }
    Ok(PreparedImportSource {
        path: source.to_path_buf(),
        skipped_zip_entries: 0,
    })
}

pub(super) fn walk_files(root: &Path) -> Result<Vec<PathBuf>, String> {
    let mut files = Vec::new();
    for entry in WalkDir::new(root)
        .follow_links(false)
        .into_iter()
        .filter_entry(should_enter)
    {
        let entry = entry.map_err(|e| format!("Failed to read import source: {e}"))?;
        if entry.file_type().is_file() && should_include_file(&entry) {
            files.push(entry.path().to_path_buf());
        }
    }
    Ok(files)
}

pub(super) fn count_policy_skipped_files(root: &Path) -> Result<usize, String> {
    Ok(collect_policy_skipped_files(root)?.len())
}

pub(super) fn collect_policy_skipped_files(root: &Path) -> Result<Vec<PathBuf>, String> {
    if root.is_file() {
        return Ok(if is_skipped_file_name(root) {
            vec![root.to_path_buf()]
        } else {
            Vec::new()
        });
    }
    let mut skipped = Vec::new();
    for entry in WalkDir::new(root).follow_links(false) {
        let entry = entry.map_err(|e| format!("Failed to read import source: {e}"))?;
        if entry.file_type().is_file() && is_skipped_relative_to(root, entry.path()) {
            skipped.push(entry.path().to_path_buf());
        }
    }
    Ok(skipped)
}

pub(super) fn is_markdown(path: &Path) -> bool {
    extension(path).is_some_and(|ext| MARKDOWN_EXTENSIONS.contains(&ext.as_str()))
}

pub(super) fn is_attachment(path: &Path) -> bool {
    extension(path).is_some_and(|ext| ATTACHMENT_EXTENSIONS.contains(&ext.as_str()))
}

pub(super) fn extension(path: &Path) -> Option<String> {
    path.extension()
        .map(|value| value.to_string_lossy().to_ascii_lowercase())
}

pub(super) fn write_text_file(path: &Path, content: &str) -> Result<(), String> {
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent)
            .map_err(|e| format!("Failed to create {}: {e}", parent.display()))?;
    }
    fs::write(path, content).map_err(|e| format!("Failed to write {}: {e}", path.display()))
}

pub(super) fn copy_file(source: &Path, destination: &Path) -> Result<(), String> {
    if let Some(parent) = destination.parent() {
        fs::create_dir_all(parent)
            .map_err(|e| format!("Failed to create {}: {e}", parent.display()))?;
    }
    fs::copy(source, destination)
        .map(|_| ())
        .map_err(|e| format!("Failed to copy {}: {e}", source.display()))
}

pub(super) fn record_failure(state: &mut AppImportState, error: String) {
    state.failed += 1;
    state.failures.push(error);
}

pub(super) fn unique_destination_path(path: PathBuf, state: &mut AppImportState) -> PathBuf {
    let mut candidate = path;
    let mut suffix = 2;
    while candidate.exists() || state.used_paths.contains(&candidate) {
        let extension = candidate.extension().map(|value| value.to_string_lossy());
        let stem = candidate
            .file_stem()
            .map(|value| value.to_string_lossy())
            .unwrap_or_else(|| "file".into());
        let next_name = match extension {
            Some(ext) => format!("{stem}-{suffix}.{ext}"),
            None => format!("{stem}-{suffix}"),
        };
        candidate = candidate.with_file_name(next_name);
        suffix += 1;
    }
    state.used_paths.insert(candidate.clone());
    candidate
}

fn extract_zip(zip_path: &Path, target_root: &Path) -> Result<usize, String> {
    let file = File::open(zip_path).map_err(|e| format!("Failed to open ZIP export: {e}"))?;
    let mut archive =
        ZipArchive::new(file).map_err(|e| format!("Failed to read ZIP export: {e}"))?;
    let mut skipped_entries = 0;
    for index in 0..archive.len() {
        let mut zipped = archive
            .by_index(index)
            .map_err(|e| format!("Failed to inspect ZIP entry: {e}"))?;
        let Some(enclosed) = zipped.enclosed_name().map(PathBuf::from) else {
            skipped_entries += 1;
            continue;
        };
        let destination = target_root.join(enclosed);
        if zipped.is_dir() {
            fs::create_dir_all(&destination)
                .map_err(|e| format!("Failed to create ZIP folder: {e}"))?;
            continue;
        }
        if let Some(parent) = destination.parent() {
            fs::create_dir_all(parent).map_err(|e| format!("Failed to create ZIP folder: {e}"))?;
        }
        let mut output =
            File::create(&destination).map_err(|e| format!("Failed to extract ZIP file: {e}"))?;
        io::copy(&mut zipped, &mut output).map_err(|e| format!("Failed to write ZIP file: {e}"))?;
    }
    Ok(skipped_entries)
}

fn should_enter(entry: &DirEntry) -> bool {
    if entry.depth() == 0 {
        return true;
    }
    if !entry.file_type().is_dir() {
        return true;
    }
    let name = entry.file_name().to_string_lossy().to_ascii_lowercase();
    !is_skipped_name(&name)
}

fn should_include_file(entry: &DirEntry) -> bool {
    let name = entry.file_name().to_string_lossy().to_ascii_lowercase();
    !is_skipped_name(&name)
}

fn is_skipped_name(name: &str) -> bool {
    name.starts_with('.') || SKIPPED_DIRS.contains(&name)
}

fn is_skipped_file_name(path: &Path) -> bool {
    path.file_name()
        .map(|name| is_skipped_name(&name.to_string_lossy().to_ascii_lowercase()))
        .unwrap_or(false)
}

fn is_skipped_relative_to(root: &Path, path: &Path) -> bool {
    path.strip_prefix(root)
        .unwrap_or(path)
        .components()
        .any(|component| {
            let name = component.as_os_str().to_string_lossy().to_ascii_lowercase();
            is_skipped_name(&name)
        })
}
