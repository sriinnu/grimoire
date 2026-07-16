use chrono::{DateTime, Utc};
use regex::Regex;
use rusqlite::{Connection, OpenFlags};
use serde::Serialize;
use std::collections::HashSet;
use std::fs;
use std::io;
use std::path::{Path, PathBuf};
use std::sync::OnceLock;
use tempfile::TempDir;

use super::app_importer::AppImportState;
use super::app_importer_io::{
    canonical_dir, canonical_existing, unique_destination_path, validate_source_boundary,
    write_text_file,
};
use super::journal_import_helpers::slugify_name;

/// Bear stores Core Data timestamps as seconds since 2001-01-01 UTC.
const CORE_DATA_EPOCH_OFFSET_SECONDS: f64 = 978_307_200.0;
const REQUIRED_ZSFNOTE_COLUMNS: &[&str] = &[
    "ZTITLE",
    "ZTEXT",
    "ZTRASHED",
    "ZENCRYPTED",
    "ZARCHIVED",
    "ZCREATIONDATE",
    "ZMODIFICATIONDATE",
];
const SAMPLE_TITLE_LIMIT: usize = 5;

/// Result of a direct Bear database import or dry run.
#[derive(Debug, Clone, Serialize)]
pub struct BearDatabaseImportSummary {
    pub source_store: String,
    /// Where notes were written; for dry runs this is the planned root.
    pub imported_root: String,
    pub report_path: Option<String>,
    pub notes_imported: usize,
    pub skipped_trashed: usize,
    pub skipped_encrypted: usize,
    pub failed_notes: usize,
    pub sample_titles: Vec<String>,
    pub dry_run: bool,
}

struct BearNote {
    title: String,
    text: String,
    archived: bool,
    created: Option<String>,
    modified: Option<String>,
    tags: Vec<String>,
}

/// Imports notes straight from a Bear SQLite store into the vault.
///
/// The live database is never opened: the store plus any `-wal`/`-shm`
/// siblings are snapshotted into a temp dir first, and the copy is opened
/// read-only. `dry_run` returns the same summary without writing anything.
pub fn import_bear_database(
    vault_path: &Path,
    store_path: &Path,
    dry_run: bool,
) -> Result<BearDatabaseImportSummary, String> {
    let vault_root = canonical_dir(vault_path, "Vault")?;
    let store = canonical_existing(store_path, "Bear database")?;
    if !store.is_file() {
        return Err("Bear database path is not a file".to_string());
    }
    if store.extension().and_then(|ext| ext.to_str()) != Some("sqlite") {
        return Err("Bear database path must end in .sqlite".to_string());
    }
    validate_source_boundary(&vault_root, &store)?;

    let snapshot_dir =
        TempDir::new().map_err(|e| format!("Failed to prepare Bear import workspace: {e}"))?;
    let snapshot = snapshot_store(&store, snapshot_dir.path())?;
    let connection = Connection::open_with_flags(&snapshot, OpenFlags::SQLITE_OPEN_READ_ONLY)
        .map_err(|e| format!("Failed to open Bear database snapshot: {e}"))?;
    validate_zsfnote_schema(&connection)?;

    let mut summary = BearDatabaseImportSummary {
        source_store: path_to_string(&store),
        imported_root: String::new(),
        report_path: None,
        notes_imported: 0,
        skipped_trashed: 0,
        skipped_encrypted: 0,
        failed_notes: 0,
        sample_titles: Vec::new(),
        dry_run,
    };
    let notes = read_importable_notes(&connection, &mut summary)?;

    let import_root = unique_bear_import_root(&vault_root, &store);
    summary.imported_root = path_to_string(&import_root);
    summary.notes_imported = notes.len();
    summary.sample_titles = notes
        .iter()
        .take(SAMPLE_TITLE_LIMIT)
        .map(|note| note.title.clone())
        .collect();
    if dry_run {
        return Ok(summary);
    }

    fs::create_dir_all(&import_root)
        .map_err(|e| format!("Failed to create Bear import folder: {e}"))?;
    let mut state = AppImportState::new();
    for note in &notes {
        write_bear_note(note, &import_root, &mut state);
    }
    summary.notes_imported = state.notes;
    summary.failed_notes = state.failed;
    summary.report_path = Some(path_to_string(&write_bear_report(
        &store,
        &import_root,
        &summary,
        &state.failures,
    )?));
    Ok(summary)
}

/// Copies the store plus `-wal`/`-shm` siblings so the live file stays untouched.
fn snapshot_store(store: &Path, snapshot_root: &Path) -> Result<PathBuf, String> {
    let store_name = store
        .file_name()
        .ok_or_else(|| "Failed to resolve Bear database file name".to_string())?;
    let snapshot = snapshot_root.join(store_name);
    copy_store_file(store, &snapshot)?;
    for suffix in ["-wal", "-shm"] {
        let sibling = sibling_path(store, suffix);
        if sibling.exists() {
            copy_store_file(&sibling, &sibling_path(&snapshot, suffix))?;
        }
    }
    Ok(snapshot)
}

fn sibling_path(store: &Path, suffix: &str) -> PathBuf {
    let mut name = store.file_name().unwrap_or_default().to_os_string();
    name.push(suffix);
    store.with_file_name(name)
}

fn copy_store_file(source: &Path, destination: &Path) -> Result<(), String> {
    fs::copy(source, destination)
        .map(|_| ())
        .map_err(|e| store_access_error(source, &e))
}

/// TCC denials surface as PermissionDenied; tell the user how to unblock
/// instead of leaking a raw OS error.
fn store_access_error(source: &Path, error: &io::Error) -> String {
    if error.kind() == io::ErrorKind::PermissionDenied {
        return format!(
            "macOS denied access to {}. Grant Grimoire file access (System Settings → Privacy & Security → Full Disk Access), then retry.",
            source.display()
        );
    }
    format!("Failed to snapshot {}: {error}", source.display())
}

/// Defends against Bear schema drift with a clear per-column failure.
fn validate_zsfnote_schema(connection: &Connection) -> Result<(), String> {
    let mut statement = connection
        .prepare("PRAGMA table_info(ZSFNOTE)")
        .map_err(|e| format!("Failed to inspect Bear database schema: {e}"))?;
    let columns: HashSet<String> = statement
        .query_map([], |row| row.get::<_, String>(1))
        .map_err(|e| format!("Failed to inspect Bear database schema: {e}"))?
        .filter_map(Result::ok)
        .collect();
    if columns.is_empty() {
        return Err("Bear database has no ZSFNOTE table; is this a Bear database.sqlite store?"
            .to_string());
    }
    for required in REQUIRED_ZSFNOTE_COLUMNS {
        if !columns.contains(*required) {
            return Err(format!(
                "Bear database schema changed: expected column {required} is missing from ZSFNOTE"
            ));
        }
    }
    Ok(())
}

fn read_importable_notes(
    connection: &Connection,
    summary: &mut BearDatabaseImportSummary,
) -> Result<Vec<BearNote>, String> {
    let mut statement = connection
        .prepare(
            "SELECT ZTITLE, ZTEXT, ZTRASHED, ZENCRYPTED, ZARCHIVED, ZCREATIONDATE, ZMODIFICATIONDATE FROM ZSFNOTE ORDER BY ZMODIFICATIONDATE DESC",
        )
        .map_err(|e| format!("Failed to read Bear notes: {e}"))?;
    let rows = statement
        .query_map([], |row| {
            Ok((
                row.get::<_, Option<String>>(0)?,
                row.get::<_, Option<String>>(1)?,
                row.get::<_, Option<i64>>(2)?.unwrap_or(0),
                row.get::<_, Option<i64>>(3)?.unwrap_or(0),
                row.get::<_, Option<i64>>(4)?.unwrap_or(0),
                row.get::<_, Option<f64>>(5)?,
                row.get::<_, Option<f64>>(6)?,
            ))
        })
        .map_err(|e| format!("Failed to read Bear notes: {e}"))?;

    let mut notes = Vec::new();
    for row in rows {
        let (title, text, trashed, encrypted, archived, created, modified) =
            row.map_err(|e| format!("Failed to read a Bear note row: {e}"))?;
        if trashed != 0 {
            summary.skipped_trashed += 1;
            continue;
        }
        if encrypted != 0 {
            summary.skipped_encrypted += 1;
            continue;
        }
        let text = text.unwrap_or_default();
        notes.push(BearNote {
            title: resolve_title(title.as_deref(), &text),
            tags: extract_top_level_tags(&text),
            text,
            archived: archived != 0,
            created: core_data_timestamp(created),
            modified: core_data_timestamp(modified),
        });
    }
    Ok(notes)
}

fn resolve_title(title: Option<&str>, text: &str) -> String {
    if let Some(title) = title.map(str::trim).filter(|value| !value.is_empty()) {
        return title.to_string();
    }
    text.lines()
        .map(|line| line.trim().trim_start_matches('#').trim())
        .find(|line| !line.is_empty())
        .map(|line| line.chars().take(80).collect())
        .unwrap_or_else(|| "Untitled".to_string())
}

/// Converts a Core Data epoch value (seconds since 2001-01-01) to RFC 3339 UTC.
fn core_data_timestamp(value: Option<f64>) -> Option<String> {
    let seconds = value?;
    if !seconds.is_finite() {
        return None;
    }
    let unix_seconds = seconds + CORE_DATA_EPOCH_OFFSET_SECONDS;
    let timestamp = DateTime::<Utc>::from_timestamp(unix_seconds as i64, 0)?;
    Some(timestamp.format("%Y-%m-%dT%H:%M:%SZ").to_string())
}

fn tag_pattern() -> &'static Regex {
    static PATTERN: OnceLock<Regex> = OnceLock::new();
    PATTERN.get_or_init(|| {
        Regex::new(r"(?:^|\s)#([\p{L}\p{N}][\p{L}\p{N}_\-/]*)").expect("valid Bear tag pattern")
    })
}

/// Pulls the top-level segment of every inline `#tag` (so `#work/project`
/// contributes `work`). Headings never match because `# Heading` has a space
/// after the hash. The body text itself is left untouched.
fn extract_top_level_tags(text: &str) -> Vec<String> {
    let mut tags = Vec::new();
    for capture in tag_pattern().captures_iter(text) {
        let tag = capture[1]
            .split('/')
            .next()
            .unwrap_or_default()
            .trim_matches('-')
            .to_string();
        if !tag.is_empty() && !tags.contains(&tag) {
            tags.push(tag);
        }
    }
    tags
}

/// Mirrors `unique_import_root`: imports/bear-<store-stem>, suffixed on collision.
fn unique_bear_import_root(vault_root: &Path, store: &Path) -> PathBuf {
    let imports_root = vault_root.join("imports");
    let store_stem = store
        .file_stem()
        .map(|value| value.to_string_lossy())
        .unwrap_or_else(|| "database".into());
    let base = slugify_name(&format!("bear-{store_stem}"));
    let base = if base.is_empty() {
        "bear-import".to_string()
    } else {
        base
    };
    let mut candidate = imports_root.join(&base);
    let mut suffix = 2;
    while candidate.exists() {
        candidate = imports_root.join(format!("{base}-{suffix}"));
        suffix += 1;
    }
    candidate
}

fn write_bear_note(note: &BearNote, import_root: &Path, state: &mut AppImportState) {
    let result = (|| -> Result<(), String> {
        let stem = slugify_name(&note.title);
        let stem = if stem.is_empty() {
            "untitled".to_string()
        } else {
            stem
        };
        let destination =
            unique_destination_path(import_root.join(format!("{stem}.md")), state);
        write_text_file(&destination, &render_bear_note(note)?)
    })();
    match result {
        Ok(()) => state.notes += 1,
        Err(error) => {
            state.failed += 1;
            state.failures.push(error);
        }
    }
}

fn render_bear_note(note: &BearNote) -> Result<String, String> {
    let mut frontmatter = serde_json::Map::new();
    frontmatter.insert("type".into(), "Note".into());
    frontmatter.insert("source_app".into(), "bear".into());
    if let Some(created) = &note.created {
        frontmatter.insert("created".into(), created.as_str().into());
    }
    if let Some(modified) = &note.modified {
        frontmatter.insert("modified".into(), modified.as_str().into());
    }
    if note.archived {
        frontmatter.insert("archived".into(), true.into());
    }
    if !note.tags.is_empty() {
        frontmatter.insert("tags".into(), note.tags.clone().into());
    }
    let yaml = serde_yaml::to_string(&serde_json::Value::Object(frontmatter))
        .map_err(|e| format!("Failed to serialize Bear note frontmatter: {e}"))?;
    Ok(format!("---\n{yaml}---\n\n{}", note.text))
}

fn write_bear_report(
    store: &Path,
    import_root: &Path,
    summary: &BearDatabaseImportSummary,
    failures: &[String],
) -> Result<PathBuf, String> {
    let report_path = import_root.join(format!(
        "import-report-{}.md",
        Utc::now().format("%Y%m%d-%H%M%S")
    ));
    let mut report = format!(
        "---\ntype: Import Report\nsource_app: bear\nlocality: local\nlocal_only: true\n---\n\n# Bear Database Import Report\n\n- Source: `{}`\n- Imported to: `{}`\n- Notes created: {}\n- Skipped (trashed): {}\n- Skipped (encrypted): {}\n- Failed notes: {}\n\n## Import Autopsy\n\n- Bear's live database was never opened; Grimoire snapshotted it (with -wal/-shm siblings) and read the copy read-only.\n- Grimoire wrote into the import folder only.\n- This report is local-only and excluded from portable Markdown ZIP exports.\n- Review failures here before trusting the import as complete.\n",
        store.display(),
        import_root.display(),
        summary.notes_imported,
        summary.skipped_trashed,
        summary.skipped_encrypted,
        summary.failed_notes,
    );
    if !failures.is_empty() {
        report.push_str("\n## Failures\n\n");
        for failure in failures.iter().take(40) {
            report.push_str(&format!("- {failure}\n"));
        }
    }
    fs::write(&report_path, report)
        .map_err(|e| format!("Failed to write Bear import report: {e}"))?;
    Ok(report_path)
}

fn path_to_string(path: &Path) -> String {
    path.to_string_lossy().into_owned()
}
