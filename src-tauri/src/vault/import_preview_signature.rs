use std::fs;
use std::path::{Path, PathBuf};
use std::sync::atomic::AtomicBool;
use walkdir::{DirEntry, WalkDir};

use super::app_importer::import_app_export;
use super::app_importer_progress::import_app_export_with_progress;
use super::importer::{import_markdown_folder, path_to_string, MarkdownFolderImportReport};
use super::importer_progress::{
    import_markdown_folder_with_progress, MarkdownFolderImportProgressEvent,
};
use super::journal_importer::import_journal_export;
use super::journal_importer_progress::import_journal_export_with_progress;
use super::portability_capsule::{sha256_hex, validate_preview_signature};
use super::zip_importer::{import_markdown_zip, import_markdown_zip_with_progress};

const PRIVATE_SOURCE_DIRS: &[&str] = &[
    ".claude",
    ".codex",
    ".git",
    ".grimoire",
    ".grimoire-local",
    ".obsidian",
    ".trash",
    "__macosx",
    "certs",
    "mockups",
    "node_modules",
];
const PRIVATE_SOURCE_FILES: &[&str] = &[".ds_store", ".mcp.json"];

/// Builds the opaque token that binds an import autopsy preview to source bytes.
pub(crate) fn import_preview_signature(scope: &str, source_path: &Path) -> Result<String, String> {
    let selected = source_path
        .canonicalize()
        .map_err(|e| format!("Import source is not available: {e}"))?;
    let root = signature_root(&selected);
    let mut lines = vec![
        "import-preview-v1".to_string(),
        format!("scope={scope}"),
        format!("selected={}", selected_label(&root, &selected)),
    ];
    if root.is_file() {
        lines.push(file_signature_line("file", Path::new("."), &root)?);
    } else {
        lines.extend(directory_signature_lines(&root)?);
    }
    Ok(format!(
        "import-preview-v1:{}",
        sha256_hex(lines.join("\0").as_bytes())
    ))
}

/// Refuses to apply an import when the reviewed autopsy no longer matches disk.
pub(crate) fn validate_import_preview_signature(
    operation: &str,
    scope: &str,
    source_path: &Path,
    reviewed_signature: &str,
) -> Result<(), String> {
    validate_preview_signature(
        operation,
        reviewed_signature,
        &import_preview_signature(scope, source_path)?,
    )
}

pub fn import_reviewed_markdown_folder(
    vault_path: &Path,
    source_path: &Path,
    preview_signature: &str,
) -> Result<MarkdownFolderImportReport, String> {
    validate_import_preview_signature(
        "Markdown import",
        "markdown-folder",
        source_path,
        preview_signature,
    )?;
    import_markdown_folder(vault_path, source_path)
}

pub fn import_reviewed_markdown_folder_with_progress<F>(
    vault_path: &Path,
    source_path: &Path,
    preview_signature: &str,
    cancelled: &AtomicBool,
    on_progress: &F,
) -> Result<MarkdownFolderImportReport, String>
where
    F: Fn(MarkdownFolderImportProgressEvent),
{
    validate_import_preview_signature(
        "Markdown import",
        "markdown-folder",
        source_path,
        preview_signature,
    )?;
    import_markdown_folder_with_progress(vault_path, source_path, cancelled, on_progress)
}

pub fn import_reviewed_markdown_zip(
    vault_path: &Path,
    source_path: &Path,
    preview_signature: &str,
) -> Result<MarkdownFolderImportReport, String> {
    validate_import_preview_signature(
        "Markdown ZIP import",
        "markdown-zip",
        source_path,
        preview_signature,
    )?;
    import_markdown_zip(vault_path, source_path)
}

pub fn import_reviewed_markdown_zip_with_progress<F>(
    vault_path: &Path,
    source_path: &Path,
    preview_signature: &str,
    cancelled: &AtomicBool,
    on_progress: &F,
) -> Result<MarkdownFolderImportReport, String>
where
    F: Fn(MarkdownFolderImportProgressEvent),
{
    validate_import_preview_signature(
        "Markdown ZIP import",
        "markdown-zip",
        source_path,
        preview_signature,
    )?;
    import_markdown_zip_with_progress(vault_path, source_path, cancelled, on_progress)
}

pub fn import_reviewed_journal_export(
    vault_path: &Path,
    source_path: &Path,
    source_kind: &str,
    preview_signature: &str,
) -> Result<MarkdownFolderImportReport, String> {
    validate_import_preview_signature(
        "Journal import",
        &format!("journal:{source_kind}"),
        source_path,
        preview_signature,
    )?;
    import_journal_export(vault_path, source_path, source_kind)
}

pub fn import_reviewed_journal_export_with_progress<F>(
    vault_path: &Path,
    source_path: &Path,
    source_kind: &str,
    preview_signature: &str,
    cancelled: &AtomicBool,
    on_progress: &F,
) -> Result<MarkdownFolderImportReport, String>
where
    F: Fn(MarkdownFolderImportProgressEvent),
{
    validate_import_preview_signature(
        "Journal import",
        &format!("journal:{source_kind}"),
        source_path,
        preview_signature,
    )?;
    import_journal_export_with_progress(
        vault_path,
        source_path,
        source_kind,
        cancelled,
        on_progress,
    )
}

pub fn import_reviewed_app_export(
    vault_path: &Path,
    source_path: &Path,
    source_kind: &str,
    preview_signature: &str,
) -> Result<MarkdownFolderImportReport, String> {
    validate_import_preview_signature(
        "App import",
        &format!("app:{source_kind}"),
        source_path,
        preview_signature,
    )?;
    import_app_export(vault_path, source_path, source_kind)
}

pub fn import_reviewed_app_export_with_progress<F>(
    vault_path: &Path,
    source_path: &Path,
    source_kind: &str,
    preview_signature: &str,
    cancelled: &AtomicBool,
    on_progress: &F,
) -> Result<MarkdownFolderImportReport, String>
where
    F: Fn(MarkdownFolderImportProgressEvent),
{
    validate_import_preview_signature(
        "App import",
        &format!("app:{source_kind}"),
        source_path,
        preview_signature,
    )?;
    import_app_export_with_progress(vault_path, source_path, source_kind, cancelled, on_progress)
}

fn signature_root(selected: &Path) -> PathBuf {
    if selected.is_file() && extension(selected).as_deref() != Some("zip") {
        return selected
            .parent()
            .unwrap_or_else(|| Path::new("/"))
            .to_path_buf();
    }
    selected.to_path_buf()
}

fn selected_label(root: &Path, selected: &Path) -> String {
    selected
        .strip_prefix(root)
        .ok()
        .map(path_to_string)
        .filter(|label| !label.is_empty())
        .unwrap_or_else(|| {
            selected
                .file_name()
                .map(|name| name.to_string_lossy().into_owned())
                .unwrap_or_else(|| ".".to_string())
        })
}

fn directory_signature_lines(root: &Path) -> Result<Vec<String>, String> {
    let mut lines = Vec::new();
    for entry in WalkDir::new(root)
        .follow_links(false)
        .into_iter()
        .filter_entry(should_enter)
    {
        let entry = entry.map_err(|e| format!("Failed to inspect import source: {e}"))?;
        if entry.file_type().is_file() {
            let relative = entry
                .path()
                .strip_prefix(root)
                .map_err(|_| "Failed to resolve import source fingerprint".to_string())?;
            lines.push(file_signature_line("file", relative, entry.path())?);
        }
    }
    lines.sort();
    Ok(lines)
}

fn file_signature_line(role: &str, relative: &Path, source: &Path) -> Result<String, String> {
    let label = normalize_relative(relative);
    if is_private_source(relative) {
        return Ok(format!("{role}:withheld:{label}"));
    }
    let bytes = fs::read(source).map_err(|e| format!("Failed to read import source: {e}"))?;
    Ok(format!(
        "{role}:{}:{}:{label}",
        bytes.len(),
        sha256_hex(&bytes)
    ))
}

fn normalize_relative(path: &Path) -> String {
    path_to_string(path).replace('\\', "/")
}

fn should_enter(entry: &DirEntry) -> bool {
    if entry.depth() == 0 || !entry.file_type().is_dir() {
        return true;
    }
    !is_private_name(&entry.file_name().to_string_lossy().to_ascii_lowercase())
}

fn is_private_source(path: &Path) -> bool {
    path.components().any(|component| {
        let name = component.as_os_str().to_string_lossy().to_ascii_lowercase();
        is_private_name(&name)
    })
}

fn is_private_name(name: &str) -> bool {
    if name == "." || name == ".." {
        return false;
    }
    name.starts_with(".env")
        || name.starts_with('.')
        || PRIVATE_SOURCE_DIRS.contains(&name)
        || PRIVATE_SOURCE_FILES.contains(&name)
}

fn extension(path: &Path) -> Option<String> {
    path.extension()
        .map(|value| value.to_string_lossy().to_ascii_lowercase())
}
