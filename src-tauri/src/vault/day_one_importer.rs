use chrono::{DateTime, SecondsFormat, Utc};
use chrono_tz::Tz;
use rusqlite::types::Value as SqlValue;
use rusqlite::{Connection, OpenFlags};
use serde::Serialize;
use std::collections::{HashMap, HashSet};
use std::fs;
use std::io;
use std::path::{Path, PathBuf};
use std::str::FromStr;
use tempfile::TempDir;

use super::app_importer::AppImportState;
use super::app_importer_io::{
    canonical_dir, canonical_existing, unique_destination_path, validate_source_boundary,
    write_text_file,
};
use super::journal_import_helpers::slugify_name;

/// Day One stores Core Data timestamps as seconds since 2001-01-01 UTC.
const CORE_DATA_EPOCH_OFFSET_SECONDS: f64 = 978_307_200.0;
const REQUIRED_ZENTRY_COLUMNS: &[&str] = &[
    "ZMARKDOWNTEXT",
    "ZCREATIONDATE",
    "ZMODIFIEDDATE",
    "ZTIMEZONE",
    "ZUUID",
    "ZISPINNED",
    "ZSTARRED",
    "ZJOURNAL",
    "ZLOCATION",
    "ZWEATHER",
];
const SAMPLE_TITLE_LIMIT: usize = 5;
/// Folder for entries that have no resolvable Day One journal.
const DEFAULT_JOURNAL_FOLDER: &str = "journal";

/// Result of a direct Day One database import or dry run.
#[derive(Debug, Clone, Serialize)]
pub struct DayOneDatabaseImportSummary {
    pub source_store: String,
    /// Where entries were written; for dry runs this is the planned root.
    pub imported_root: String,
    pub report_path: Option<String>,
    pub entries_imported: usize,
    pub skipped_empty: usize,
    pub skipped_trashed: usize,
    pub failed_entries: usize,
    pub journals: Vec<String>,
    pub sample_titles: Vec<String>,
    pub dry_run: bool,
}

struct DayOneEntry {
    uuid: Option<String>,
    title: String,
    text: String,
    created: Option<String>,
    modified: Option<String>,
    journal_name: Option<String>,
    journal_folder: String,
    starred: bool,
    pinned: bool,
    place_name: Option<String>,
    latitude: Option<f64>,
    longitude: Option<f64>,
    weather_condition: Option<String>,
    temperature_celsius: Option<f64>,
    tags: Vec<String>,
}

struct JournalInfo {
    name: Option<String>,
    is_trash: bool,
}

struct LocationInfo {
    place_name: Option<String>,
    latitude: Option<f64>,
    longitude: Option<f64>,
}

struct WeatherInfo {
    condition: Option<String>,
    temperature_celsius: Option<f64>,
}

/// Imports journal entries straight from a Day One SQLite store into the vault.
///
/// The live database is never opened: the store plus any `-wal`/`-shm`
/// siblings are snapshotted into a temp dir first, and the copy is opened
/// read-only. `dry_run` returns the same summary without writing anything.
pub fn import_day_one_database(
    vault_path: &Path,
    store_path: &Path,
    dry_run: bool,
) -> Result<DayOneDatabaseImportSummary, String> {
    let vault_root = canonical_dir(vault_path, "Vault")?;
    let store = canonical_existing(store_path, "Day One database")?;
    if !store.is_file() {
        return Err("Day One database path is not a file".to_string());
    }
    if store.extension().and_then(|ext| ext.to_str()) != Some("sqlite") {
        return Err("Day One database path must end in .sqlite".to_string());
    }
    validate_source_boundary(&vault_root, &store)?;

    let snapshot_dir =
        TempDir::new().map_err(|e| format!("Failed to prepare Day One import workspace: {e}"))?;
    let snapshot = snapshot_store(&store, snapshot_dir.path())?;
    let connection = Connection::open_with_flags(&snapshot, OpenFlags::SQLITE_OPEN_READ_ONLY)
        .map_err(|e| format!("Failed to open Day One database snapshot: {e}"))?;
    validate_zentry_schema(&connection)?;

    let mut summary = DayOneDatabaseImportSummary {
        source_store: path_to_string(&store),
        imported_root: String::new(),
        report_path: None,
        entries_imported: 0,
        skipped_empty: 0,
        skipped_trashed: 0,
        failed_entries: 0,
        journals: Vec::new(),
        sample_titles: Vec::new(),
        dry_run,
    };
    let entries = read_importable_entries(&connection, &mut summary)?;

    let import_root = unique_day_one_import_root(&vault_root);
    summary.imported_root = path_to_string(&import_root);
    summary.entries_imported = entries.len();
    summary.journals = collect_journal_names(&entries);
    summary.sample_titles = entries
        .iter()
        .take(SAMPLE_TITLE_LIMIT)
        .map(|entry| entry.title.clone())
        .collect();
    if dry_run {
        return Ok(summary);
    }

    fs::create_dir_all(&import_root)
        .map_err(|e| format!("Failed to create Day One import folder: {e}"))?;
    let mut state = AppImportState::new();
    for entry in &entries {
        write_day_one_entry(entry, &import_root, &mut state);
    }
    summary.entries_imported = state.notes;
    summary.failed_entries = state.failed;
    summary.report_path = Some(path_to_string(&write_day_one_report(
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
        .ok_or_else(|| "Failed to resolve Day One database file name".to_string())?;
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

/// Defends against Day One schema drift with a clear per-column failure.
fn validate_zentry_schema(connection: &Connection) -> Result<(), String> {
    let columns = table_columns(connection, "ZENTRY")
        .map_err(|e| format!("Failed to inspect Day One database schema: {e}"))?;
    if columns.is_empty() {
        return Err(
            "Day One database has no ZENTRY table; is this a DayOne.sqlite store?".to_string(),
        );
    }
    for required in REQUIRED_ZENTRY_COLUMNS {
        if !columns.contains(*required) {
            return Err(format!(
                "Day One database schema changed: expected column {required} is missing from ZENTRY"
            ));
        }
    }
    Ok(())
}

fn table_columns(connection: &Connection, table: &str) -> rusqlite::Result<HashSet<String>> {
    let mut statement = connection.prepare(&format!("PRAGMA table_info(\"{table}\")"))?;
    let columns = statement
        .query_map([], |row| row.get::<_, String>(1))?
        .filter_map(Result::ok)
        .collect();
    Ok(columns)
}

fn read_importable_entries(
    connection: &Connection,
    summary: &mut DayOneDatabaseImportSummary,
) -> Result<Vec<DayOneEntry>, String> {
    let journals = read_journals(connection);
    let locations = read_locations(connection);
    let weather = read_weather(connection);
    let tags = read_entry_tags(connection);

    let mut statement = connection
        .prepare(
            "SELECT Z_PK, ZUUID, ZMARKDOWNTEXT, ZCREATIONDATE, ZMODIFIEDDATE, ZTIMEZONE, ZISPINNED, ZSTARRED, ZJOURNAL, ZLOCATION, ZWEATHER FROM ZENTRY ORDER BY ZCREATIONDATE ASC",
        )
        .map_err(|e| format!("Failed to read Day One entries: {e}"))?;
    let rows = statement
        .query_map([], |row| {
            Ok((
                row.get::<_, i64>(0)?,
                row.get::<_, Option<String>>(1)?,
                row.get::<_, Option<String>>(2)?,
                row.get::<_, Option<f64>>(3)?,
                row.get::<_, Option<f64>>(4)?,
                row.get::<_, SqlValue>(5)?,
                row.get::<_, Option<i64>>(6)?.unwrap_or(0),
                row.get::<_, Option<i64>>(7)?.unwrap_or(0),
                row.get::<_, Option<i64>>(8)?,
                row.get::<_, Option<i64>>(9)?,
                row.get::<_, Option<i64>>(10)?,
            ))
        })
        .map_err(|e| format!("Failed to read Day One entries: {e}"))?;

    let mut entries = Vec::new();
    for row in rows {
        let (
            entry_pk,
            uuid,
            markdown,
            created,
            modified,
            timezone_value,
            pinned,
            starred,
            journal_pk,
            location_pk,
            weather_pk,
        ) = row.map_err(|e| format!("Failed to read a Day One entry row: {e}"))?;
        let journal = journal_pk.and_then(|pk| journals.get(&pk));
        if journal.is_some_and(|info| info.is_trash) {
            summary.skipped_trashed += 1;
            continue;
        }
        let text = markdown.unwrap_or_default();
        if text.trim().is_empty() {
            summary.skipped_empty += 1;
            continue;
        }
        let timezone = timezone_from_value(&timezone_value);
        let journal_name = journal.and_then(|info| info.name.clone());
        let location = location_pk.and_then(|pk| locations.get(&pk));
        let weather = weather_pk.and_then(|pk| weather.get(&pk));
        entries.push(DayOneEntry {
            uuid,
            title: resolve_title(&text),
            created: core_data_timestamp(created, timezone),
            modified: core_data_timestamp(modified, timezone),
            journal_folder: journal_folder_name(journal_name.as_deref()),
            journal_name,
            starred: starred != 0,
            pinned: pinned != 0,
            place_name: location.and_then(|info| info.place_name.clone()),
            latitude: location.and_then(|info| info.latitude),
            longitude: location.and_then(|info| info.longitude),
            weather_condition: weather.and_then(|info| info.condition.clone()),
            temperature_celsius: weather.and_then(|info| info.temperature_celsius),
            tags: tags.get(&entry_pk).cloned().unwrap_or_default(),
            text,
        });
    }
    Ok(entries)
}

/// Journal metadata is best-effort: a missing or reshaped ZJOURNAL table just
/// means entries land in the default folder instead of failing the import.
fn read_journals(connection: &Connection) -> HashMap<i64, JournalInfo> {
    let Ok(columns) = table_columns(connection, "ZJOURNAL") else {
        return HashMap::new();
    };
    if !columns.contains("ZNAME") {
        return HashMap::new();
    }
    let trash_column = if columns.contains("ZISTRASHJOURNAL") {
        "ZISTRASHJOURNAL"
    } else {
        "0"
    };
    let query = format!("SELECT Z_PK, ZNAME, {trash_column} FROM ZJOURNAL");
    read_rows(connection, &query, |row| {
        Ok((
            row.get::<_, i64>(0)?,
            JournalInfo {
                name: row
                    .get::<_, Option<String>>(1)?
                    .map(|name| name.trim().to_string())
                    .filter(|name| !name.is_empty()),
                is_trash: row.get::<_, Option<i64>>(2)?.unwrap_or(0) != 0,
            },
        ))
    })
}

fn read_locations(connection: &Connection) -> HashMap<i64, LocationInfo> {
    let Ok(columns) = table_columns(connection, "ZLOCATION") else {
        return HashMap::new();
    };
    if !["ZPLACENAME", "ZLATITUDE", "ZLONGITUDE"]
        .iter()
        .all(|column| columns.contains(*column))
    {
        return HashMap::new();
    }
    read_rows(
        connection,
        "SELECT Z_PK, ZPLACENAME, ZLATITUDE, ZLONGITUDE FROM ZLOCATION",
        |row| {
            Ok((
                row.get::<_, i64>(0)?,
                LocationInfo {
                    place_name: row
                        .get::<_, Option<String>>(1)?
                        .map(|name| name.trim().to_string())
                        .filter(|name| !name.is_empty()),
                    latitude: row.get::<_, Option<f64>>(2)?,
                    longitude: row.get::<_, Option<f64>>(3)?,
                },
            ))
        },
    )
}

fn read_weather(connection: &Connection) -> HashMap<i64, WeatherInfo> {
    let Ok(columns) = table_columns(connection, "ZWEATHER") else {
        return HashMap::new();
    };
    if !["ZCONDITIONSDESCRIPTION", "ZTEMPERATURECELSIUS"]
        .iter()
        .all(|column| columns.contains(*column))
    {
        return HashMap::new();
    }
    read_rows(
        connection,
        "SELECT Z_PK, ZCONDITIONSDESCRIPTION, ZTEMPERATURECELSIUS FROM ZWEATHER",
        |row| {
            Ok((
                row.get::<_, i64>(0)?,
                WeatherInfo {
                    condition: row
                        .get::<_, Option<String>>(1)?
                        .map(|value| value.trim().to_string())
                        .filter(|value| !value.is_empty()),
                    temperature_celsius: row.get::<_, Option<f64>>(2)?,
                },
            ))
        },
    )
}

/// Core Data names the entry↔tag join table `Z_<entryEntity>TAGS` with
/// per-store entity numbers (e.g. `Z_17TAGS` joining `Z_17ENTRIES` to
/// `Z_62TAGS1`), so the table and its columns are discovered from
/// `Z_PRIMARYKEY` and `PRAGMA table_info` instead of being hardcoded.
/// Any failure along the way resolves to "no tags", never an error.
fn read_entry_tags(connection: &Connection) -> HashMap<i64, Vec<String>> {
    let Some((join_table, entries_column, tags_column)) = discover_tag_join_table(connection)
    else {
        return HashMap::new();
    };
    let Ok(tag_columns) = table_columns(connection, "ZTAG") else {
        return HashMap::new();
    };
    if !tag_columns.contains("ZNAME") {
        return HashMap::new();
    }
    let query = format!(
        "SELECT j.\"{entries_column}\", t.ZNAME FROM \"{join_table}\" j JOIN ZTAG t ON t.Z_PK = j.\"{tags_column}\""
    );
    let Ok(mut statement) = connection.prepare(&query) else {
        return HashMap::new();
    };
    let Ok(rows) = statement.query_map([], |row| {
        Ok((
            row.get::<_, i64>(0)?,
            row.get::<_, Option<String>>(1)?.unwrap_or_default(),
        ))
    }) else {
        return HashMap::new();
    };
    let mut tags: HashMap<i64, Vec<String>> = HashMap::new();
    for (entry_pk, tag) in rows.filter_map(Result::ok) {
        let tag = tag.trim().to_string();
        if tag.is_empty() {
            continue;
        }
        tags.entry(entry_pk).or_default().push(tag);
    }
    for names in tags.values_mut() {
        names.sort();
        names.dedup();
    }
    tags
}

fn discover_tag_join_table(connection: &Connection) -> Option<(String, String, String)> {
    let entry_entity: i64 = connection
        .query_row(
            "SELECT Z_ENT FROM Z_PRIMARYKEY WHERE Z_NAME = 'Entry'",
            [],
            |row| row.get(0),
        )
        .ok()?;
    let join_table = format!("Z_{entry_entity}TAGS");
    let columns = table_columns(connection, &join_table).ok()?;
    let entries_column = columns
        .iter()
        .find(|column| column.ends_with("ENTRIES"))?
        .clone();
    let tags_column = columns
        .iter()
        .find(|column| **column != entries_column && column.contains("TAGS"))?
        .clone();
    Some((join_table, entries_column, tags_column))
}

/// Runs a metadata query where failure legitimately means "no data".
fn read_rows<T>(
    connection: &Connection,
    query: &str,
    mut map_row: impl FnMut(&rusqlite::Row<'_>) -> rusqlite::Result<(i64, T)>,
) -> HashMap<i64, T> {
    let Ok(mut statement) = connection.prepare(query) else {
        return HashMap::new();
    };
    let Ok(rows) = statement.query_map([], |row| map_row(row)) else {
        return HashMap::new();
    };
    rows.filter_map(Result::ok).collect()
}

fn resolve_title(text: &str) -> String {
    text.lines()
        .map(|line| line.trim().trim_start_matches('#').trim())
        .find(|line| !line.is_empty())
        .map(|line| line.chars().take(80).collect())
        .unwrap_or_else(|| "Journal Entry".to_string())
}

/// Day One archives `ZTIMEZONE` as an NSKeyedArchiver binary plist wrapping an
/// NSTimeZone. The IANA name (e.g. `Europe/Vienna`) is embedded as plain
/// ASCII, so candidate runs are extracted and validated against the tz
/// database instead of parsing the plist. Plain-text values are handled too.
fn timezone_from_value(value: &SqlValue) -> Option<Tz> {
    match value {
        SqlValue::Text(text) => Tz::from_str(text.trim()).ok(),
        SqlValue::Blob(bytes) => timezone_from_archived_blob(bytes),
        _ => None,
    }
}

fn timezone_from_archived_blob(bytes: &[u8]) -> Option<Tz> {
    let mut candidate = String::new();
    let mut result = None;
    for byte in bytes.iter().copied().chain(std::iter::once(0)) {
        let ch = byte as char;
        if ch.is_ascii_alphanumeric() || matches!(ch, '/' | '_' | '+' | '-') {
            candidate.push(ch);
            continue;
        }
        if let Some(zone) = zone_from_candidate_run(&candidate) {
            result = Some(zone);
            break;
        }
        candidate.clear();
    }
    result
}

/// Binary plist markers can butt right up against the archived name (e.g. the
/// data marker `O` yields a run of `Europe/ViennaO`), so prefixes are tried
/// from longest to shortest until one is a real zone.
fn zone_from_candidate_run(candidate: &str) -> Option<Tz> {
    for end in (1..=candidate.len()).rev() {
        let prefix = &candidate[..end];
        if !prefix.contains('/') {
            return None;
        }
        if let Ok(zone) = Tz::from_str(prefix) {
            return Some(zone);
        }
    }
    None
}

/// Converts a Core Data epoch value to RFC 3339 in the entry's timezone when
/// one resolved, otherwise UTC.
fn core_data_timestamp(value: Option<f64>, timezone: Option<Tz>) -> Option<String> {
    let seconds = value?;
    if !seconds.is_finite() {
        return None;
    }
    let unix_seconds = seconds + CORE_DATA_EPOCH_OFFSET_SECONDS;
    let timestamp = DateTime::<Utc>::from_timestamp(unix_seconds as i64, 0)?;
    Some(match timezone {
        Some(zone) => timestamp
            .with_timezone(&zone)
            .to_rfc3339_opts(SecondsFormat::Secs, false),
        None => timestamp.to_rfc3339_opts(SecondsFormat::Secs, true),
    })
}

fn journal_folder_name(journal_name: Option<&str>) -> String {
    let slug = journal_name.map(slugify_name).unwrap_or_default();
    if slug.is_empty() {
        DEFAULT_JOURNAL_FOLDER.to_string()
    } else {
        slug
    }
}

fn collect_journal_names(entries: &[DayOneEntry]) -> Vec<String> {
    let mut names: Vec<String> = Vec::new();
    for entry in entries {
        let name = entry
            .journal_name
            .clone()
            .unwrap_or_else(|| DEFAULT_JOURNAL_FOLDER.to_string());
        if !names.contains(&name) {
            names.push(name);
        }
    }
    names
}

/// Mirrors `unique_bear_import_root`: imports/day-one, suffixed on collision.
fn unique_day_one_import_root(vault_root: &Path) -> PathBuf {
    let imports_root = vault_root.join("imports");
    let base = "day-one";
    let mut candidate = imports_root.join(base);
    let mut suffix = 2;
    while candidate.exists() {
        candidate = imports_root.join(format!("{base}-{suffix}"));
        suffix += 1;
    }
    candidate
}

fn write_day_one_entry(entry: &DayOneEntry, import_root: &Path, state: &mut AppImportState) {
    let result = (|| -> Result<(), String> {
        let date = entry
            .created
            .as_deref()
            .and_then(|value| value.get(0..10))
            .unwrap_or("undated");
        let stem = slugify_name(&entry.title);
        let stem = if stem.is_empty() {
            "entry".to_string()
        } else {
            stem
        };
        let destination = unique_destination_path(
            import_root
                .join(&entry.journal_folder)
                .join(format!("{date}-{stem}.md")),
            state,
        );
        write_text_file(&destination, &render_day_one_entry(entry)?)
    })();
    match result {
        Ok(()) => state.notes += 1,
        Err(error) => {
            state.failed += 1;
            state.failures.push(error);
        }
    }
}

fn render_day_one_entry(entry: &DayOneEntry) -> Result<String, String> {
    let mut frontmatter = serde_json::Map::new();
    frontmatter.insert("type".into(), "Journal".into());
    frontmatter.insert("source_app".into(), "day-one".into());
    if let Some(created) = &entry.created {
        frontmatter.insert("created".into(), created.as_str().into());
    }
    if let Some(modified) = &entry.modified {
        frontmatter.insert("modified".into(), modified.as_str().into());
    }
    if let Some(uuid) = &entry.uuid {
        frontmatter.insert("day_one_uuid".into(), uuid.as_str().into());
    }
    if let Some(journal) = &entry.journal_name {
        frontmatter.insert("journal".into(), journal.as_str().into());
    }
    if entry.starred {
        frontmatter.insert("starred".into(), true.into());
    }
    if entry.pinned {
        frontmatter.insert("pinned".into(), true.into());
    }
    if let Some(place) = &entry.place_name {
        frontmatter.insert("location".into(), place.as_str().into());
    }
    if let Some(latitude) = entry.latitude {
        frontmatter.insert("latitude".into(), latitude.into());
    }
    if let Some(longitude) = entry.longitude {
        frontmatter.insert("longitude".into(), longitude.into());
    }
    if let Some(condition) = &entry.weather_condition {
        frontmatter.insert("weather".into(), condition.as_str().into());
    }
    if let Some(temperature) = entry.temperature_celsius {
        frontmatter.insert("temperature_celsius".into(), temperature.into());
    }
    if !entry.tags.is_empty() {
        frontmatter.insert("tags".into(), entry.tags.clone().into());
    }
    let yaml = serde_yaml::to_string(&serde_json::Value::Object(frontmatter))
        .map_err(|e| format!("Failed to serialize Day One entry frontmatter: {e}"))?;
    Ok(format!("---\n{yaml}---\n\n{}", entry.text))
}

fn write_day_one_report(
    store: &Path,
    import_root: &Path,
    summary: &DayOneDatabaseImportSummary,
    failures: &[String],
) -> Result<PathBuf, String> {
    let report_path = import_root.join(format!(
        "import-report-{}.md",
        Utc::now().format("%Y%m%d-%H%M%S")
    ));
    let mut report = format!(
        "---\ntype: Import Report\nsource_app: day-one\nlocality: local\nlocal_only: true\n---\n\n# Day One Database Import Report\n\n- Source: `{}`\n- Imported to: `{}`\n- Entries created: {}\n- Skipped (empty body): {}\n- Skipped (trashed): {}\n- Failed entries: {}\n- Journals: {}\n\n## Import Autopsy\n\n- Day One's live database was never opened; Grimoire snapshotted it (with -wal/-shm siblings) and read the copy read-only.\n- Entries are typed `Journal`, so the Locality Firewall keeps them local-only automatically.\n- Grimoire wrote into the import folder only.\n- This report is local-only and excluded from portable Markdown ZIP exports.\n- Review failures here before trusting the import as complete.\n",
        store.display(),
        import_root.display(),
        summary.entries_imported,
        summary.skipped_empty,
        summary.skipped_trashed,
        summary.failed_entries,
        if summary.journals.is_empty() {
            "none".to_string()
        } else {
            summary.journals.join(", ")
        },
    );
    if !failures.is_empty() {
        report.push_str("\n## Failures\n\n");
        for failure in failures.iter().take(40) {
            report.push_str(&format!("- {failure}\n"));
        }
    }
    fs::write(&report_path, report)
        .map_err(|e| format!("Failed to write Day One import report: {e}"))?;
    Ok(report_path)
}

fn path_to_string(path: &Path) -> String {
    path.to_string_lossy().into_owned()
}
