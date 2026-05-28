use chrono::Utc;
use std::collections::HashMap;
use std::fs::{self, File};
use std::io;
use std::path::{Path, PathBuf};
use tempfile::TempDir;
use walkdir::{DirEntry, WalkDir};
use zip::ZipArchive;

use super::importer::MarkdownFolderImportReport;
use super::journal_html_import_helpers::{html_entry_files, read_entry_from_html};
use super::journal_import_helpers::{
    extension, format_entry_markdown, read_entries_from_json, slugify_name, unique_note_name,
    JournalEntry,
};
use super::journal_media_import::{AttachmentPlanner, MediaIndex};

const JOURNAL_JSON_EXTENSIONS: &[&str] = &["json"];
const SKIPPED_DIRS: &[&str] = &[".git", "__macosx", "node_modules"];

#[derive(Debug)]
pub(super) struct ImportState {
    pub(super) notes: usize,
    pub(super) assets: usize,
    pub(super) skipped: usize,
    pub(super) failed: usize,
    pub(super) failures: Vec<String>,
}

impl ImportState {
    pub(super) fn new() -> Self {
        Self {
            notes: 0,
            assets: 0,
            skipped: 0,
            failed: 0,
            failures: Vec::new(),
        }
    }
}

/// Converts Day One or Journey JSON exports into Markdown notes and attachments.
pub fn import_journal_export(
    vault_path: &Path,
    source_path: &Path,
    source_kind: &str,
) -> Result<MarkdownFolderImportReport, String> {
    let vault_root = canonical_dir(vault_path, "Vault")?;
    let source = canonical_existing(source_path, "Source")?;
    validate_source_boundary(&vault_root, &source)?;

    let temp_dir =
        TempDir::new().map_err(|e| format!("Failed to prepare import workspace: {e}"))?;
    let import_source = prepare_import_source(&source, temp_dir.path())?;
    let import_root = unique_import_root(&vault_root, source_kind, &source)?;
    fs::create_dir_all(&import_root).map_err(|e| format!("Failed to create import folder: {e}"))?;

    let mut state = ImportState::new();
    let media_index = build_media_index(&import_source, &mut state)?;
    let entries = collect_entries(&source, &import_source, source_kind, &mut state)?;
    write_entries(
        &entries,
        &import_root,
        source_kind,
        &media_index,
        &mut state,
    )?;
    let report_path = write_report(&source, &import_root, source_kind, entries.len(), &state)?;

    Ok(MarkdownFolderImportReport {
        imported_root: path_to_string(&import_root),
        report_path: path_to_string(&report_path),
        notes_copied: state.notes,
        assets_copied: state.assets,
        skipped_files: state.skipped,
        failed_files: state.failed,
    })
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

pub(super) fn prepare_import_source(source: &Path, temp_root: &Path) -> Result<PathBuf, String> {
    if source.is_file() && extension(source).as_deref() == Some("zip") {
        extract_zip(source, temp_root)?;
        return Ok(temp_root.to_path_buf());
    }
    if source.is_file() {
        return Ok(source
            .parent()
            .unwrap_or_else(|| Path::new("/"))
            .to_path_buf());
    }
    Ok(source.to_path_buf())
}

fn extract_zip(zip_path: &Path, target_root: &Path) -> Result<(), String> {
    let file = File::open(zip_path).map_err(|e| format!("Failed to open ZIP export: {e}"))?;
    let mut archive =
        ZipArchive::new(file).map_err(|e| format!("Failed to read ZIP export: {e}"))?;
    for index in 0..archive.len() {
        let mut zipped = archive
            .by_index(index)
            .map_err(|e| format!("Failed to inspect ZIP entry: {e}"))?;
        let Some(enclosed) = zipped.enclosed_name().map(PathBuf::from) else {
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
    Ok(())
}

pub(super) fn unique_import_root(
    vault_root: &Path,
    source_kind: &str,
    source: &Path,
) -> Result<PathBuf, String> {
    let imports_root = vault_root.join("imports");
    let source_name = source
        .file_stem()
        .or_else(|| source.file_name())
        .map(|value| value.to_string_lossy())
        .unwrap_or_else(|| "journal-export".into());
    let base = slugify_name(&format!("{source_kind}-{source_name}"));
    let import_name = if base.is_empty() {
        "journal-import".into()
    } else {
        base.clone()
    };
    let mut candidate = imports_root.join(import_name);
    let mut suffix = 2;
    while candidate.exists() {
        candidate = imports_root.join(format!("{base}-{suffix}"));
        suffix += 1;
    }
    Ok(candidate)
}

pub(super) fn build_media_index(
    root: &Path,
    state: &mut ImportState,
) -> Result<MediaIndex, String> {
    let (index, skipped) = super::journal_media_import::build_media_index(root, walk_files(root)?);
    state.skipped += skipped;
    Ok(index)
}

pub(super) fn collect_entries(
    selected_source: &Path,
    root: &Path,
    source_kind: &str,
    state: &mut ImportState,
) -> Result<Vec<JournalEntry>, String> {
    let json_files = if selected_source.is_file()
        && extension(selected_source).as_deref() == Some("json")
    {
        vec![selected_source.to_path_buf()]
    } else {
        walk_files(root)?
            .into_iter()
            .filter(|path| {
                extension(path).is_some_and(|ext| JOURNAL_JSON_EXTENSIONS.contains(&ext.as_str()))
            })
            .collect()
    };

    let mut entries = Vec::new();
    for json_path in json_files {
        match read_entries_from_json(&json_path, source_kind) {
            Ok(mut found) if !found.is_empty() => entries.append(&mut found),
            Ok(_) => state.skipped += 1,
            Err(error) => {
                state.failed += 1;
                state.failures.push(error);
            }
        }
    }
    if source_kind == "apple-journal" {
        for html_path in html_entry_files(selected_source, root, walk_files)? {
            match read_entry_from_html(&html_path, source_kind) {
                Ok(Some(entry)) => entries.push(entry),
                Ok(None) => state.skipped += 1,
                Err(error) => {
                    state.failed += 1;
                    state.failures.push(error);
                }
            }
        }
    }
    if entries.is_empty() {
        return Err("No journal entries were found in that export".to_string());
    }
    Ok(entries)
}

fn walk_files(root: &Path) -> Result<Vec<PathBuf>, String> {
    let mut files = Vec::new();
    for entry in WalkDir::new(root)
        .follow_links(false)
        .into_iter()
        .filter_entry(should_enter)
    {
        let entry = entry.map_err(|e| format!("Failed to read import source: {e}"))?;
        if entry.file_type().is_file() {
            files.push(entry.path().to_path_buf());
        }
    }
    Ok(files)
}

fn should_enter(entry: &DirEntry) -> bool {
    if !entry.file_type().is_dir() {
        return true;
    }
    let name = entry.file_name().to_string_lossy().to_ascii_lowercase();
    !SKIPPED_DIRS.contains(&name.as_str())
}

pub(super) fn write_entries(
    entries: &[JournalEntry],
    import_root: &Path,
    source_kind: &str,
    media_index: &MediaIndex,
    state: &mut ImportState,
) -> Result<(), String> {
    let mut used_names = HashMap::<String, usize>::new();
    let mut attachment_planner = AttachmentPlanner::default();
    for entry in entries {
        let note_path = import_root.join(unique_note_name(entry, &mut used_names));
        let links = copy_entry_media(
            entry,
            import_root,
            media_index,
            &mut attachment_planner,
            state,
        );
        let content = format_entry_markdown(entry, source_kind, &links)?;
        match fs::write(&note_path, content) {
            Ok(()) => state.notes += 1,
            Err(error) => {
                state.failed += 1;
                state
                    .failures
                    .push(format!("Failed to write {}: {error}", note_path.display()));
            }
        }
    }
    Ok(())
}

pub(super) fn copy_entry_media(
    entry: &JournalEntry,
    import_root: &Path,
    media_index: &MediaIndex,
    attachment_planner: &mut AttachmentPlanner,
    state: &mut ImportState,
) -> Vec<String> {
    let mut links = Vec::new();
    for key in &entry.media_keys {
        let Some(source) = media_index.resolve(key) else {
            continue;
        };
        let Some(plan) = attachment_planner.plan(source) else {
            continue;
        };
        if plan.is_new_copy {
            let destination = import_root.join(&plan.link);
            if let Err(error) = copy_file(&plan.source, &destination) {
                state.failed += 1;
                state.failures.push(error);
                continue;
            }
            state.assets += 1;
        }
        links.push(plan.link);
    }
    links.sort();
    links.dedup();
    links
}

fn copy_file(source: &Path, destination: &Path) -> Result<(), String> {
    if let Some(parent) = destination.parent() {
        fs::create_dir_all(parent)
            .map_err(|e| format!("Failed to create {}: {e}", parent.display()))?;
    }
    fs::copy(source, destination)
        .map(|_| ())
        .map_err(|e| format!("Failed to copy media {}: {e}", source.display()))
}

pub(super) fn write_report(
    source: &Path,
    import_root: &Path,
    source_kind: &str,
    discovered_entries: usize,
    state: &ImportState,
) -> Result<PathBuf, String> {
    let report_path = import_root.join(format!(
        "import-report-{}.md",
        Utc::now().format("%Y%m%d-%H%M%S")
    ));
    let mut report = format!(
        "---\ntype: Import Report\nsource_app: {source_kind}\nlocality: local\nlocal_only: true\n---\n\n# {source_kind} Import Report\n\n- Source: `{}`\n- Imported to: `{}`\n- Entries discovered: {}\n- Notes created: {}\n- Attachments copied: {}\n- Skipped files: {}\n- Failed files: {}\n",
        source.display(),
        import_root.display(),
        discovered_entries,
        state.notes,
        state.assets,
        state.skipped,
        state.failed,
    );
    if !state.failures.is_empty() {
        report.push_str("\n## Failures\n\n");
        for failure in state.failures.iter().take(40) {
            report.push_str(&format!("- {failure}\n"));
        }
    }
    fs::write(&report_path, report).map_err(|e| format!("Failed to write import report: {e}"))?;
    Ok(report_path)
}

pub(super) fn path_to_string(path: &Path) -> String {
    path.to_string_lossy().into_owned()
}
