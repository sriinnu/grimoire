use chrono::Utc;
use std::collections::HashSet;
use std::fs;
use std::path::{Path, PathBuf};
use tempfile::TempDir;

use super::app_importer_io::{
    canonical_dir, canonical_existing, copy_file, count_policy_skipped_files, is_attachment,
    is_markdown, prepare_import_source, record_failure, unique_destination_path,
    validate_source_boundary, walk_files, write_text_file,
};
use super::importer::MarkdownFolderImportReport;
use super::journal_import_helpers::slugify_name;
use super::spanda_importer::import_spanda_export;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub(super) enum AppImportKind {
    Notion,
    Obsidian,
    Spanda,
}

#[derive(Debug)]
pub(super) struct AppImportState {
    pub(super) notes: usize,
    pub(super) assets: usize,
    pub(super) skipped: usize,
    pub(super) failed: usize,
    pub(super) failures: Vec<String>,
    pub(super) used_paths: HashSet<PathBuf>,
}

impl AppImportState {
    pub(super) fn new() -> Self {
        Self {
            notes: 0,
            assets: 0,
            skipped: 0,
            failed: 0,
            failures: Vec::new(),
            used_paths: HashSet::new(),
        }
    }
}

/// Imports Obsidian, Notion Markdown, or Spanda practice exports into the vault.
pub fn import_app_export(
    vault_path: &Path,
    source_path: &Path,
    source_kind: &str,
) -> Result<MarkdownFolderImportReport, String> {
    let kind = parse_kind(source_kind)?;
    let vault_root = canonical_dir(vault_path, "Vault")?;
    let source = canonical_existing(source_path, "Source")?;
    validate_source_boundary(&vault_root, &source)?;

    let temp_dir =
        TempDir::new().map_err(|e| format!("Failed to prepare import workspace: {e}"))?;
    let prepared_source = prepare_import_source(&source, temp_dir.path())?;
    let import_source = prepared_source.path;
    let import_root = unique_import_root(&vault_root, kind, &source)?;
    fs::create_dir_all(&import_root).map_err(|e| format!("Failed to create import folder: {e}"))?;

    let mut state = AppImportState::new();
    state.skipped += prepared_source.skipped_zip_entries;
    match kind {
        AppImportKind::Spanda => {
            import_spanda_export(&source, &import_source, &import_root, &mut state)?
        }
        AppImportKind::Notion | AppImportKind::Obsidian => {
            import_markdown_like_export(kind, &import_source, &import_root, &mut state)?
        }
    }
    let report_path = write_report(&source, &import_root, kind, &state)?;

    Ok(MarkdownFolderImportReport {
        imported_root: path_to_string(&import_root),
        report_path: path_to_string(&report_path),
        notes_copied: state.notes,
        assets_copied: state.assets,
        skipped_files: state.skipped,
        failed_files: state.failed,
    })
}

pub(super) fn parse_kind(value: &str) -> Result<AppImportKind, String> {
    match value {
        "notion" | "notion-markdown" => Ok(AppImportKind::Notion),
        "obsidian" => Ok(AppImportKind::Obsidian),
        "spanda" => Ok(AppImportKind::Spanda),
        other => Err(format!("Unsupported import source: {other}")),
    }
}

pub(super) fn unique_import_root(
    vault_root: &Path,
    kind: AppImportKind,
    source: &Path,
) -> Result<PathBuf, String> {
    let imports_root = vault_root.join("imports");
    let source_name = source
        .file_stem()
        .or_else(|| source.file_name())
        .map(|value| value.to_string_lossy())
        .unwrap_or_else(|| "app-export".into());
    let base = slugify_name(&format!("{}-{source_name}", kind_id(kind)));
    let mut candidate = imports_root.join(if base.is_empty() {
        format!("{}-import", kind_id(kind))
    } else {
        base.clone()
    });
    let mut suffix = 2;
    while candidate.exists() {
        candidate = imports_root.join(format!("{base}-{suffix}"));
        suffix += 1;
    }
    Ok(candidate)
}

pub(super) fn import_markdown_like_export(
    kind: AppImportKind,
    source_root: &Path,
    import_root: &Path,
    state: &mut AppImportState,
) -> Result<(), String> {
    state.skipped += count_policy_skipped_files(source_root)?;
    let source_files = if source_root.is_file() {
        vec![source_root.to_path_buf()]
    } else {
        walk_files(source_root)?
    };
    for source_file in source_files {
        let relative = relative_import_path(source_root, &source_file)?;
        if is_markdown(&source_file) {
            copy_markdown_file(kind, &source_file, &relative, import_root, state);
        } else if is_attachment(&source_file) {
            copy_asset_file(&source_file, &relative, import_root, state);
        } else {
            state.skipped += 1;
        }
    }
    Ok(())
}

pub(super) fn relative_import_path(
    source_root: &Path,
    source_file: &Path,
) -> Result<PathBuf, String> {
    if source_root.is_file() {
        return source_file
            .file_name()
            .map(PathBuf::from)
            .ok_or_else(|| "Failed to resolve import file name".to_string());
    }
    source_file
        .strip_prefix(source_root)
        .map(PathBuf::from)
        .map_err(|_| "Failed to resolve import file path".to_string())
}

pub(super) fn copy_markdown_file(
    kind: AppImportKind,
    source_file: &Path,
    relative: &Path,
    import_root: &Path,
    state: &mut AppImportState,
) {
    let result = (|| -> Result<(), String> {
        let mut destination = import_root.join(clean_relative_path(relative, kind));
        destination = unique_destination_path(destination, state);
        let mut content = fs::read_to_string(source_file)
            .map_err(|e| format!("Failed to read {}: {e}", source_file.display()))?;
        if kind == AppImportKind::Notion {
            content = merge_source_frontmatter(
                &content,
                kind,
                relative,
                notion_id_from_path(relative).as_deref(),
            )?;
        }
        write_text_file(&destination, &content)
    })();

    match result {
        Ok(()) => state.notes += 1,
        Err(error) => record_failure(state, error),
    }
}

pub(super) fn copy_asset_file(
    source_file: &Path,
    relative: &Path,
    import_root: &Path,
    state: &mut AppImportState,
) {
    let destination = unique_destination_path(import_root.join(relative), state);
    match copy_file(source_file, &destination) {
        Ok(()) => state.assets += 1,
        Err(error) => record_failure(state, error),
    }
}

fn merge_source_frontmatter(
    content: &str,
    kind: AppImportKind,
    relative: &Path,
    notion_id: Option<&str>,
) -> Result<String, String> {
    let source_path = relative.to_string_lossy().replace('\\', "/");
    let source = serde_yaml::to_string(&serde_json::json!({
        "source_app": kind_id(kind),
        "source_path": source_path,
        "notion_id": notion_id,
    }))
    .map_err(|e| format!("Failed to serialize source frontmatter: {e}"))?;
    if let Some((existing, body)) = split_frontmatter(content) {
        return Ok(format!("---\n{existing}\n{source}---{body}"));
    }
    Ok(format!("---\ntype: Note\n{source}---\n\n{content}"))
}

fn split_frontmatter(content: &str) -> Option<(&str, &str)> {
    for (opening, closing) in [("---\n", "\n---"), ("---\r\n", "\r\n---")] {
        let Some(rest) = content.strip_prefix(opening) else {
            continue;
        };
        let Some(index) = rest.find(closing) else {
            continue;
        };
        let existing = &rest[..index];
        let body = &rest[index + closing.len()..];
        return Some((existing, body));
    }
    None
}

pub(super) fn clean_relative_path(relative: &Path, kind: AppImportKind) -> PathBuf {
    if kind != AppImportKind::Notion {
        return relative.to_path_buf();
    }
    let mut cleaned = PathBuf::new();
    for component in relative.components() {
        let text = component.as_os_str().to_string_lossy();
        let path = Path::new(text.as_ref());
        let stem = path
            .file_stem()
            .map(|value| value.to_string_lossy())
            .unwrap_or_else(|| text.clone());
        let extension = path.extension().map(|value| value.to_string_lossy());
        let (name, _) = strip_notion_id(&stem);
        cleaned.push(match extension {
            Some(ext) => format!("{name}.{ext}"),
            None => name,
        });
    }
    cleaned
}

fn strip_notion_id(stem: &str) -> (String, Option<String>) {
    let trimmed = stem.trim();
    let Some((prefix, candidate)) = trimmed.rsplit_once(' ') else {
        return (safe_stem(trimmed), None);
    };
    if is_notion_id(candidate) {
        return (safe_stem(prefix), Some(candidate.to_string()));
    }
    (safe_stem(trimmed), None)
}

fn notion_id_from_path(path: &Path) -> Option<String> {
    path.file_stem()
        .map(|value| strip_notion_id(&value.to_string_lossy()).1)
        .unwrap_or_default()
}

fn is_notion_id(value: &str) -> bool {
    let stripped = value.replace('-', "");
    (stripped.len() == 32 || stripped.len() == 36)
        && stripped.chars().all(|ch| ch.is_ascii_hexdigit())
}

fn safe_stem(value: &str) -> String {
    let trimmed = value.trim();
    if trimmed.is_empty() {
        "Untitled".to_string()
    } else {
        trimmed.to_string()
    }
}

pub(super) fn write_report(
    source: &Path,
    import_root: &Path,
    kind: AppImportKind,
    state: &AppImportState,
) -> Result<PathBuf, String> {
    let report_path = import_root.join(format!(
        "import-report-{}.md",
        Utc::now().format("%Y%m%d-%H%M%S")
    ));
    let mut report = format!(
        "---\ntype: Import Report\nsource_app: {}\nlocality: local\nlocal_only: true\n---\n\n# {} Import Report\n\n- Source: `{}`\n- Imported to: `{}`\n- Notes created: {}\n- Assets copied: {}\n- Skipped files: {}\n- Failed files: {}\n\n## Import Autopsy\n\n- Source export was read only; Grimoire wrote into the import folder only.\n- This report is local-only and excluded from portable Markdown ZIP exports.\n- Review failures here before deleting the original export.\n",
        kind_id(kind),
        kind_label(kind),
        source.display(),
        import_root.display(),
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

fn kind_id(kind: AppImportKind) -> &'static str {
    match kind {
        AppImportKind::Notion => "notion",
        AppImportKind::Obsidian => "obsidian",
        AppImportKind::Spanda => "spanda",
    }
}

fn kind_label(kind: AppImportKind) -> &'static str {
    match kind {
        AppImportKind::Notion => "Notion",
        AppImportKind::Obsidian => "Obsidian",
        AppImportKind::Spanda => "Spanda",
    }
}

pub(super) fn path_to_string(path: &Path) -> String {
    path.to_string_lossy().into_owned()
}
