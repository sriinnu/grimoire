use chrono::Utc;
use serde::Serialize;
use std::fs;
use std::path::{Path, PathBuf};
use walkdir::{DirEntry, WalkDir};

pub(crate) const MARKDOWN_EXTENSIONS: &[&str] = &["md", "markdown", "mdown", "mkd"];
pub(crate) const ATTACHMENT_EXTENSIONS: &[&str] = &[
    "avif", "canvas", "csv", "gif", "heic", "heif", "jpeg", "jpg", "json", "m4a", "mdx", "mov",
    "mp3", "mp4", "ogg", "opus", "pdf", "png", "svg", "txt", "wav", "webm", "webp", "yaml", "yml",
];
pub(crate) const SKIPPED_DIRS: &[&str] = &[
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
pub(crate) const SKIPPED_FILES: &[&str] = &[".ds_store", ".mcp.json"];

#[derive(Debug, Clone, Serialize, PartialEq, Eq)]
pub struct MarkdownFolderImportReport {
    pub imported_root: String,
    pub report_path: String,
    pub notes_copied: usize,
    pub assets_copied: usize,
    pub skipped_files: usize,
    pub failed_files: usize,
}

#[derive(Debug, Clone, Serialize, PartialEq, Eq)]
pub struct MarkdownFolderImportPreview {
    pub source_path: String,
    pub planned_import_root: String,
    pub notes_to_copy: usize,
    pub assets_to_copy: usize,
    pub skipped_files: usize,
    pub failed_files: usize,
    pub writes_local_only_report: bool,
}

#[derive(Debug)]
pub(crate) struct ImportCounters {
    pub(crate) notes_copied: usize,
    pub(crate) assets_copied: usize,
    pub(crate) skipped_files: usize,
    pub(crate) failed_files: usize,
    pub(crate) failures: Vec<String>,
}

impl ImportCounters {
    pub(crate) fn new() -> Self {
        Self {
            notes_copied: 0,
            assets_copied: 0,
            skipped_files: 0,
            failed_files: 0,
            failures: Vec::new(),
        }
    }
}

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub(crate) enum ImportFileKind {
    Markdown,
    Attachment,
    Skip,
}

/// Copies Markdown notes and common attachments into `imports/<source-name>/`.
pub fn import_markdown_folder(
    vault_path: &Path,
    source_path: &Path,
) -> Result<MarkdownFolderImportReport, String> {
    let vault_root = canonical_dir(vault_path, "Vault")?;
    let source_root = canonical_dir(source_path, "Source")?;
    validate_source_boundary(&vault_root, &source_root)?;

    let import_root = unique_import_root(&vault_root, &source_root)?;
    fs::create_dir_all(&import_root).map_err(|e| format!("Failed to create import folder: {e}"))?;

    let mut counters = ImportCounters::new();
    copy_importable_files(&source_root, &import_root, &mut counters)?;

    let report_path = write_import_report(&source_root, &import_root, &counters)?;
    Ok(MarkdownFolderImportReport {
        imported_root: path_to_string(&import_root),
        report_path: path_to_string(&report_path),
        notes_copied: counters.notes_copied,
        assets_copied: counters.assets_copied,
        skipped_files: counters.skipped_files,
        failed_files: counters.failed_files,
    })
}

/// Previews the shared Markdown/Bear folder import without writing to the vault.
pub fn preview_markdown_folder_import(
    vault_path: &Path,
    source_path: &Path,
) -> Result<MarkdownFolderImportPreview, String> {
    let vault_root = canonical_dir(vault_path, "Vault")?;
    let source_root = canonical_dir(source_path, "Source")?;
    validate_source_boundary(&vault_root, &source_root)?;

    let import_root = unique_import_root(&vault_root, &source_root)?;
    let counters = preview_importable_files(&source_root)?;
    Ok(MarkdownFolderImportPreview {
        source_path: path_to_string(&source_root),
        planned_import_root: path_to_string(&import_root),
        notes_to_copy: counters.notes_copied,
        assets_to_copy: counters.assets_copied,
        skipped_files: counters.skipped_files,
        failed_files: counters.failed_files,
        writes_local_only_report: true,
    })
}

pub(crate) fn canonical_dir(path: &Path, label: &str) -> Result<PathBuf, String> {
    let canonical = path
        .canonicalize()
        .map_err(|e| format!("{label} folder is not available: {e}"))?;
    if !canonical.is_dir() {
        return Err(format!("{label} path is not a folder"));
    }
    Ok(canonical)
}

pub(crate) fn validate_source_boundary(
    vault_root: &Path,
    source_root: &Path,
) -> Result<(), String> {
    if source_root == vault_root {
        return Err("Choose a source folder outside the active vault".to_string());
    }
    if source_root.starts_with(vault_root) || vault_root.starts_with(source_root) {
        return Err("Import source and active vault must not contain each other".to_string());
    }
    Ok(())
}

pub(crate) fn unique_import_root(vault_root: &Path, source_root: &Path) -> Result<PathBuf, String> {
    let imports_root = vault_root.join("imports");
    let base = source_root
        .file_name()
        .map(|name| slugify_name(&name.to_string_lossy()))
        .filter(|name| !name.is_empty())
        .unwrap_or_else(|| "markdown-import".to_string());
    let mut candidate = imports_root.join(&base);
    let mut suffix = 2;
    while candidate.exists() {
        candidate = imports_root.join(format!("{base}-{suffix}"));
        suffix += 1;
    }
    Ok(candidate)
}

fn slugify_name(value: &str) -> String {
    let mut output = String::new();
    let mut previous_dash = false;
    for ch in value.chars().flat_map(char::to_lowercase) {
        if ch.is_ascii_alphanumeric() {
            output.push(ch);
            previous_dash = false;
        } else if !previous_dash {
            output.push('-');
            previous_dash = true;
        }
    }
    output.trim_matches('-').to_string()
}

pub(crate) fn copy_importable_files(
    source_root: &Path,
    import_root: &Path,
    counters: &mut ImportCounters,
) -> Result<(), String> {
    for entry in WalkDir::new(source_root)
        .follow_links(false)
        .into_iter()
        .filter_entry(should_enter)
    {
        let entry = entry.map_err(|e| format!("Failed to read source folder: {e}"))?;
        if !entry.file_type().is_file() {
            continue;
        }

        let relative_path = entry
            .path()
            .strip_prefix(source_root)
            .map_err(|_| "Failed to resolve source file relative to import root".to_string())?;
        match classify_import_file(entry.path()) {
            ImportFileKind::Skip => counters.skipped_files += 1,
            kind => copy_import_file(
                entry.path(),
                &import_root.join(relative_path),
                counters,
                kind,
            ),
        }
    }
    Ok(())
}

pub(crate) fn preview_importable_files(source_root: &Path) -> Result<ImportCounters, String> {
    let mut counters = ImportCounters::new();
    for entry in WalkDir::new(source_root)
        .follow_links(false)
        .into_iter()
        .filter_entry(should_enter)
    {
        let entry = entry.map_err(|e| format!("Failed to read source folder: {e}"))?;
        if !entry.file_type().is_file() {
            continue;
        }
        match classify_import_file(entry.path()) {
            ImportFileKind::Markdown => counters.notes_copied += 1,
            ImportFileKind::Attachment => counters.assets_copied += 1,
            ImportFileKind::Skip => counters.skipped_files += 1,
        }
    }
    Ok(counters)
}

pub(crate) fn should_enter(entry: &DirEntry) -> bool {
    if entry.depth() == 0 {
        return true;
    }
    if !entry.file_type().is_dir() {
        return true;
    }
    let name = entry.file_name().to_string_lossy().to_ascii_lowercase();
    !is_skipped_name(&name)
}

pub(crate) fn classify_import_file(path: &Path) -> ImportFileKind {
    let file_name = path
        .file_name()
        .map(|value| value.to_string_lossy().to_ascii_lowercase())
        .unwrap_or_default();
    if is_skipped_name(&file_name) || file_name.starts_with(".env") {
        return ImportFileKind::Skip;
    }
    let extension = path
        .extension()
        .map(|value| value.to_string_lossy().to_ascii_lowercase())
        .unwrap_or_default();
    if MARKDOWN_EXTENSIONS.contains(&extension.as_str()) {
        return ImportFileKind::Markdown;
    }
    if ATTACHMENT_EXTENSIONS.contains(&extension.as_str()) {
        return ImportFileKind::Attachment;
    }
    ImportFileKind::Skip
}

pub(crate) fn is_skipped_name(name: &str) -> bool {
    name.starts_with('.') || SKIPPED_DIRS.contains(&name) || SKIPPED_FILES.contains(&name)
}

pub(crate) fn copy_import_file(
    source_path: &Path,
    destination_path: &Path,
    counters: &mut ImportCounters,
    kind: ImportFileKind,
) {
    let result = (|| -> Result<(), String> {
        if let Some(parent) = destination_path.parent() {
            fs::create_dir_all(parent)
                .map_err(|e| format!("Failed to create {}: {e}", parent.display()))?;
        }
        fs::copy(source_path, destination_path).map_err(|e| {
            format!(
                "Failed to copy {} to {}: {e}",
                source_path.display(),
                destination_path.display()
            )
        })?;
        Ok(())
    })();

    match result {
        Ok(()) if kind == ImportFileKind::Markdown => counters.notes_copied += 1,
        Ok(()) => counters.assets_copied += 1,
        Err(error) => {
            counters.failed_files += 1;
            counters.failures.push(error);
        }
    }
}

pub(crate) fn write_import_report(
    source_root: &Path,
    import_root: &Path,
    counters: &ImportCounters,
) -> Result<PathBuf, String> {
    let report_path = import_root.join(format!(
        "import-report-{}.md",
        Utc::now().format("%Y%m%d-%H%M%S")
    ));
    fs::write(
        &report_path,
        format_report(source_root, import_root, counters),
    )
    .map_err(|e| format!("Failed to write import report: {e}"))?;
    Ok(report_path)
}

fn format_report(source_root: &Path, import_root: &Path, counters: &ImportCounters) -> String {
    let mut report = format!(
        "---\ntype: Import Report\nlocality: local\nlocal_only: true\nsource: \"{}\"\n---\n\n# Import Report\n\n- Source: `{}`\n- Imported to: `{}`\n- Markdown notes copied: {}\n- Assets copied: {}\n- Skipped files: {}\n- Failed files: {}\n",
        source_root.display(),
        source_root.display(),
        import_root.display(),
        counters.notes_copied,
        counters.assets_copied,
        counters.skipped_files,
        counters.failed_files,
    );
    if !counters.failures.is_empty() {
        report.push_str("\n## Failures\n\n");
        for failure in counters.failures.iter().take(20) {
            report.push_str(&format!("- {failure}\n"));
        }
    }
    report
}

pub(crate) fn path_to_string(path: &Path) -> String {
    path.to_string_lossy().into_owned()
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::TempDir;

    #[test]
    fn imports_markdown_and_assets_into_imports_folder() {
        let vault = TempDir::new().unwrap();
        let source = TempDir::new().unwrap();
        fs::write(source.path().join("note.md"), "# Note\n").unwrap();
        fs::create_dir_all(source.path().join("assets")).unwrap();
        fs::write(source.path().join("assets/image.svg"), "<svg/>").unwrap();
        fs::write(source.path().join("script.ts"), "console.log('skip')").unwrap();

        let result = import_markdown_folder(vault.path(), source.path()).unwrap();

        assert_eq!(result.notes_copied, 1);
        assert_eq!(result.assets_copied, 1);
        assert_eq!(result.skipped_files, 1);
        assert!(Path::new(&result.imported_root).join("note.md").exists());
        assert!(Path::new(&result.imported_root)
            .join("assets/image.svg")
            .exists());
        assert!(Path::new(&result.report_path).exists());
    }

    #[test]
    fn previews_markdown_import_without_writing_to_vault() {
        let vault = TempDir::new().unwrap();
        let source = TempDir::new().unwrap();
        fs::write(source.path().join("note.md"), "# Note\n").unwrap();
        fs::create_dir_all(source.path().join("assets")).unwrap();
        fs::write(source.path().join("assets/image.png"), "image").unwrap();
        fs::create_dir_all(source.path().join(".codex")).unwrap();
        fs::write(source.path().join(".mcp.json"), "{}").unwrap();
        fs::write(source.path().join(".codex/config.toml"), "local").unwrap();
        fs::write(source.path().join("tmp.bin"), "skip").unwrap();

        let result = preview_markdown_folder_import(vault.path(), source.path()).unwrap();

        assert_eq!(result.notes_to_copy, 1);
        assert_eq!(result.assets_to_copy, 1);
        assert_eq!(result.skipped_files, 2);
        assert!(result.writes_local_only_report);
        assert!(result.planned_import_root.contains("/imports/"));
        assert!(!Path::new(&result.planned_import_root).exists());
    }

    #[test]
    fn rejects_sources_that_contain_the_active_vault() {
        let source = TempDir::new().unwrap();
        let vault = source.path().join("vault");
        fs::create_dir_all(&vault).unwrap();

        let error = import_markdown_folder(&vault, source.path()).unwrap_err();

        assert!(error.contains("must not contain each other"));
    }
}
