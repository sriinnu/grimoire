use rusqlite::Connection;
use std::fs;
use std::path::{Path, PathBuf};

use super::import_day_one_database;

/// 2023-01-01T00:00:00Z expressed in Core Data seconds (since 2001-01-01).
/// In Europe/Vienna that instant is 2023-01-01T01:00:00+01:00 (CET).
const CORE_DATA_2023_01_01: f64 = 694_224_000.0;
/// 2023-06-15T12:30:45Z expressed in Core Data seconds.
/// In Europe/Vienna that instant is 2023-06-15T14:30:45+02:00 (CEST).
const CORE_DATA_2023_06_15: f64 = 708_525_045.0;

/// The Day One entry entity id used by the fixture; the importer must
/// discover it from Z_PRIMARYKEY, never assume it.
const ENTRY_ENTITY: i64 = 5;

enum FixtureTimezone {
    None,
    Text(&'static str),
    ArchivedBlob(&'static str),
}

struct FixtureEntry {
    uuid: &'static str,
    markdown: Option<&'static str>,
    created: Option<f64>,
    modified: Option<f64>,
    timezone: FixtureTimezone,
    pinned: i64,
    starred: i64,
    journal: Option<i64>,
    location: Option<i64>,
    weather: Option<i64>,
    tags: &'static [&'static str],
}

fn fixture_entry(uuid: &'static str, markdown: &'static str) -> FixtureEntry {
    FixtureEntry {
        uuid,
        markdown: Some(markdown),
        created: Some(CORE_DATA_2023_01_01),
        modified: Some(CORE_DATA_2023_06_15),
        timezone: FixtureTimezone::None,
        pinned: 0,
        starred: 0,
        journal: None,
        location: None,
        weather: None,
        tags: &[],
    }
}

/// Fakes the NSKeyedArchiver plist Day One stores in ZTIMEZONE: binary junk,
/// decoy slash-bearing runs, and the IANA name embedded as plain ASCII with
/// the next plist marker (`O`, the data marker) butted right against it, as
/// observed in real stores.
fn archived_timezone_blob(name: &str) -> Vec<u8> {
    let mut blob: Vec<u8> = Vec::new();
    blob.extend_from_slice(b"bplist00\x00\x01X$versionY$archiver");
    blob.extend_from_slice(b"NSTimeZone\x00CET-1CEST,M3.5.0/3\x00TZif2\xff\xfe");
    blob.extend_from_slice(name.as_bytes());
    blob.extend_from_slice(b"O\x11\x08\x94TZif2\x00NSObject\x00");
    blob
}

fn create_day_one_store(store: &Path, entries: &[FixtureEntry]) {
    fs::create_dir_all(store.parent().unwrap()).unwrap();
    let connection = Connection::open(store).unwrap();
    connection
        .execute_batch(&format!(
            "CREATE TABLE ZENTRY (
                Z_PK INTEGER PRIMARY KEY,
                ZUUID TEXT,
                ZMARKDOWNTEXT TEXT,
                ZRICHTEXTJSON TEXT,
                ZCREATIONDATE REAL,
                ZMODIFIEDDATE REAL,
                ZTIMEZONE BLOB,
                ZISPINNED INTEGER,
                ZSTARRED INTEGER,
                ZJOURNAL INTEGER,
                ZLOCATION INTEGER,
                ZWEATHER INTEGER
            );
            CREATE TABLE ZJOURNAL (
                Z_PK INTEGER PRIMARY KEY,
                ZNAME TEXT,
                ZISTRASHJOURNAL INTEGER
            );
            CREATE TABLE ZLOCATION (
                Z_PK INTEGER PRIMARY KEY,
                ZPLACENAME TEXT,
                ZLATITUDE REAL,
                ZLONGITUDE REAL
            );
            CREATE TABLE ZWEATHER (
                Z_PK INTEGER PRIMARY KEY,
                ZCONDITIONSDESCRIPTION TEXT,
                ZTEMPERATURECELSIUS REAL
            );
            CREATE TABLE ZTAG (Z_PK INTEGER PRIMARY KEY, ZNAME TEXT);
            CREATE TABLE Z_PRIMARYKEY (Z_ENT INTEGER, Z_NAME TEXT, Z_MAX INTEGER);
            CREATE TABLE Z_{ENTRY_ENTITY}TAGS (Z_{ENTRY_ENTITY}ENTRIES INTEGER, Z_9TAGS1 INTEGER);
            INSERT INTO Z_PRIMARYKEY (Z_ENT, Z_NAME, Z_MAX) VALUES ({ENTRY_ENTITY}, 'Entry', 0), (9, 'Tag', 0);
            INSERT INTO ZJOURNAL (Z_PK, ZNAME, ZISTRASHJOURNAL) VALUES
                (1, 'Daily', 0),
                (2, 'E954E57C-5255-4D7D-B9B8-B9D03938DAFB', 1),
                (3, 'Dreams & Rituals', 0);
            INSERT INTO ZLOCATION (Z_PK, ZPLACENAME, ZLATITUDE, ZLONGITUDE) VALUES
                (1, 'Vienna Coffee Shop', 48.2, 16.37);
            INSERT INTO ZWEATHER (Z_PK, ZCONDITIONSDESCRIPTION, ZTEMPERATURECELSIUS) VALUES
                (1, 'Partly Cloudy', 21.5);"
        ))
        .unwrap();
    let mut next_tag_pk = 1i64;
    for (index, entry) in entries.iter().enumerate() {
        let entry_pk = index as i64 + 1;
        let timezone: Option<rusqlite::types::Value> = match &entry.timezone {
            FixtureTimezone::None => None,
            FixtureTimezone::Text(name) => Some((*name).to_string().into()),
            FixtureTimezone::ArchivedBlob(name) => Some(archived_timezone_blob(name).into()),
        };
        connection
            .execute(
                "INSERT INTO ZENTRY (Z_PK, ZUUID, ZMARKDOWNTEXT, ZCREATIONDATE, ZMODIFIEDDATE, ZTIMEZONE, ZISPINNED, ZSTARRED, ZJOURNAL, ZLOCATION, ZWEATHER)
                 VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11)",
                rusqlite::params![
                    entry_pk,
                    entry.uuid,
                    entry.markdown,
                    entry.created,
                    entry.modified,
                    timezone,
                    entry.pinned,
                    entry.starred,
                    entry.journal,
                    entry.location,
                    entry.weather,
                ],
            )
            .unwrap();
        for tag in entry.tags {
            connection
                .execute(
                    "INSERT INTO ZTAG (Z_PK, ZNAME) VALUES (?1, ?2)",
                    rusqlite::params![next_tag_pk, tag],
                )
                .unwrap();
            connection
                .execute(
                    &format!(
                        "INSERT INTO Z_{ENTRY_ENTITY}TAGS (Z_{ENTRY_ENTITY}ENTRIES, Z_9TAGS1) VALUES (?1, ?2)"
                    ),
                    rusqlite::params![entry_pk, next_tag_pk],
                )
                .unwrap();
            next_tag_pk += 1;
        }
    }
}

fn workspace_with_store(entries: &[FixtureEntry]) -> (tempfile::TempDir, PathBuf, PathBuf) {
    let workspace = tempfile::tempdir().unwrap();
    let vault = workspace.path().join("vault");
    let store = workspace.path().join("day-one-data/DayOne.sqlite");
    fs::create_dir_all(&vault).unwrap();
    create_day_one_store(&store, entries);
    (workspace, vault, store)
}

#[test]
fn imports_entries_into_journal_folders_with_full_frontmatter() {
    let (_workspace, vault, store) = workspace_with_store(&[
        FixtureEntry {
            uuid: "UUID-MORNING",
            markdown: Some("# Morning Run\n\nRan 5k along the canal."),
            timezone: FixtureTimezone::Text("Europe/Vienna"),
            pinned: 1,
            starred: 1,
            journal: Some(1),
            location: Some(1),
            weather: Some(1),
            tags: &["running", "gratitude"],
            ..fixture_entry("UUID-MORNING", "")
        },
        FixtureEntry {
            journal: None,
            ..fixture_entry("UUID-LOOSE", "Loose thought without a journal.")
        },
    ]);

    let summary = import_day_one_database(&vault, &store, false).unwrap();

    assert_eq!(summary.entries_imported, 2);
    assert_eq!(summary.failed_entries, 0);
    assert!(!summary.dry_run);
    let root = PathBuf::from(&summary.imported_root);
    assert!(root.starts_with(vault.canonicalize().unwrap().join("imports")));
    assert!(root.to_string_lossy().contains("day-one"));

    // Vienna is +01:00 on Jan 1, so the filename date matches the local date.
    let morning = fs::read_to_string(root.join("daily/2023-01-01-morning-run.md")).unwrap();
    assert!(morning.starts_with("---\n"));
    assert!(morning.contains("type: Journal"));
    assert!(morning.contains("source_app: day-one"));
    assert!(morning.contains("day_one_uuid: UUID-MORNING"));
    assert!(morning.contains("journal: Daily"));
    assert!(morning.contains("created: 2023-01-01T01:00:00+01:00"));
    assert!(morning.contains("modified: 2023-06-15T14:30:45+02:00"));
    assert!(morning.contains("starred: true"));
    assert!(morning.contains("pinned: true"));
    assert!(morning.contains("location: Vienna Coffee Shop"));
    assert!(morning.contains("latitude: 48.2"));
    assert!(morning.contains("longitude: 16.37"));
    assert!(morning.contains("weather: Partly Cloudy"));
    assert!(morning.contains("temperature_celsius: 21.5"));
    assert!(morning.contains("tags:"));
    assert!(morning.contains("- gratitude"));
    assert!(morning.contains("- running"));
    assert!(morning.contains("Ran 5k along the canal."));

    // Entries without a journal land in the default folder, timestamps in UTC.
    let loose =
        fs::read_to_string(root.join("journal/2023-01-01-loose-thought-without-a-journal.md"))
            .unwrap();
    assert!(loose.contains("created: 2023-01-01T00:00:00Z"));
    assert!(!loose.contains("journal: "));
    assert!(!loose.contains("starred"));
    assert!(!loose.contains("pinned"));
    assert!(!loose.contains("location"));
    assert!(!loose.contains("weather"));
    assert!(!loose.contains("tags:"));
    assert_eq!(
        summary.journals,
        vec!["Daily".to_string(), "journal".to_string()]
    );
}

#[test]
fn archived_timezone_blobs_resolve_like_plain_names() {
    let (_workspace, vault, store) = workspace_with_store(&[FixtureEntry {
        timezone: FixtureTimezone::ArchivedBlob("Europe/Vienna"),
        journal: Some(3),
        ..fixture_entry("UUID-BLOB", "Archived timezone entry.")
    }]);

    let summary = import_day_one_database(&vault, &store, false).unwrap();

    let root = PathBuf::from(&summary.imported_root);
    let entry =
        fs::read_to_string(root.join("dreams-rituals/2023-01-01-archived-timezone-entry.md"))
            .unwrap();
    assert!(entry.contains("created: 2023-01-01T01:00:00+01:00"));
    assert!(entry.contains("modified: 2023-06-15T14:30:45+02:00"));
    assert!(entry.contains("journal: Dreams & Rituals"));
}

#[test]
fn skips_empty_bodies_and_trash_journal_entries_with_reason_counts() {
    let (_workspace, vault, store) = workspace_with_store(&[
        fixture_entry("UUID-KEEP", "Keep me."),
        FixtureEntry {
            markdown: None,
            ..fixture_entry("UUID-NULL", "")
        },
        FixtureEntry {
            markdown: Some("   \n  "),
            ..fixture_entry("UUID-BLANK", "")
        },
        FixtureEntry {
            journal: Some(2),
            ..fixture_entry("UUID-TRASHED", "Deleted entry still in the trash journal.")
        },
    ]);

    let summary = import_day_one_database(&vault, &store, false).unwrap();

    assert_eq!(summary.entries_imported, 1);
    assert_eq!(summary.skipped_empty, 2);
    assert_eq!(summary.skipped_trashed, 1);
    let root = PathBuf::from(&summary.imported_root);
    assert!(root.join("journal/2023-01-01-keep-me.md").exists());

    let report = fs::read_to_string(summary.report_path.unwrap()).unwrap();
    assert!(report.contains("type: Import Report"));
    assert!(report.contains("source_app: day-one"));
    assert!(report.contains("local_only: true"));
    assert!(report.contains("Skipped (empty body): 2"));
    assert!(report.contains("Skipped (trashed): 1"));
}

#[test]
fn dry_run_reports_counts_journals_and_sample_titles_without_writing() {
    let (_workspace, vault, store) = workspace_with_store(&[
        FixtureEntry {
            journal: Some(1),
            ..fixture_entry("UUID-ONE", "# First Entry\n\none")
        },
        fixture_entry("UUID-TWO", "Second entry body"),
        FixtureEntry {
            markdown: None,
            ..fixture_entry("UUID-EMPTY", "")
        },
    ]);

    let summary = import_day_one_database(&vault, &store, true).unwrap();

    assert!(summary.dry_run);
    assert_eq!(summary.entries_imported, 2);
    assert_eq!(summary.skipped_empty, 1);
    assert_eq!(summary.report_path, None);
    assert!(summary.sample_titles.contains(&"First Entry".to_string()));
    assert!(summary
        .sample_titles
        .contains(&"Second entry body".to_string()));
    assert_eq!(
        summary.journals,
        vec!["Daily".to_string(), "journal".to_string()]
    );
    assert!(!vault.join("imports").exists());
}

#[test]
fn import_reads_a_snapshot_and_leaves_the_source_store_untouched() {
    let (_workspace, vault, store) =
        workspace_with_store(&[fixture_entry("UUID-SNAP", "Snapshot body")]);
    let wal = store.with_file_name("DayOne.sqlite-wal");
    fs::write(&wal, b"wal bytes").unwrap();
    let source_before = fs::read(&store).unwrap();
    let wal_before = fs::read(&wal).unwrap();

    let summary = import_day_one_database(&vault, &store, false).unwrap();

    assert_eq!(summary.entries_imported, 1);
    assert_eq!(fs::read(&store).unwrap(), source_before);
    assert_eq!(fs::read(&wal).unwrap(), wal_before);
}

#[test]
fn colliding_entry_titles_get_unique_filenames() {
    let (_workspace, vault, store) = workspace_with_store(&[
        fixture_entry("UUID-A", "Same headline"),
        fixture_entry("UUID-B", "Same headline"),
    ]);

    let summary = import_day_one_database(&vault, &store, false).unwrap();

    assert_eq!(summary.entries_imported, 2);
    let root = PathBuf::from(&summary.imported_root);
    assert!(root.join("journal/2023-01-01-same-headline.md").exists());
    assert!(root.join("journal/2023-01-01-same-headline-2.md").exists());
}

#[test]
fn missing_expected_column_fails_with_a_named_column() {
    let workspace = tempfile::tempdir().unwrap();
    let vault = workspace.path().join("vault");
    let store = workspace.path().join("day-one-data/DayOne.sqlite");
    fs::create_dir_all(&vault).unwrap();
    fs::create_dir_all(store.parent().unwrap()).unwrap();
    let connection = Connection::open(&store).unwrap();
    connection
        .execute_batch(
            "CREATE TABLE ZENTRY (Z_PK INTEGER PRIMARY KEY, ZUUID TEXT, ZMARKDOWNTEXT TEXT, ZCREATIONDATE REAL, ZMODIFIEDDATE REAL, ZTIMEZONE BLOB, ZISPINNED INTEGER, ZJOURNAL INTEGER, ZLOCATION INTEGER, ZWEATHER INTEGER);",
        )
        .unwrap();
    drop(connection);

    let error = import_day_one_database(&vault, &store, true).unwrap_err();

    assert!(error.contains("ZSTARRED"), "unexpected error: {error}");
}

#[test]
fn rejects_non_sqlite_store_paths_and_stores_inside_the_vault() {
    let workspace = tempfile::tempdir().unwrap();
    let vault = workspace.path().join("vault");
    fs::create_dir_all(&vault).unwrap();
    let not_sqlite = workspace.path().join("DayOne.db");
    fs::write(&not_sqlite, b"x").unwrap();
    assert!(import_day_one_database(&vault, &not_sqlite, true)
        .unwrap_err()
        .contains(".sqlite"));

    let inside = vault.join("DayOne.sqlite");
    create_day_one_store(&inside, &[]);
    assert!(import_day_one_database(&vault, &inside, true)
        .unwrap_err()
        .contains("outside the active vault"));
}

#[test]
fn minimal_store_without_support_tables_still_imports_entries() {
    let workspace = tempfile::tempdir().unwrap();
    let vault = workspace.path().join("vault");
    let store = workspace.path().join("day-one-data/DayOne.sqlite");
    fs::create_dir_all(&vault).unwrap();
    fs::create_dir_all(store.parent().unwrap()).unwrap();
    let connection = Connection::open(&store).unwrap();
    connection
        .execute_batch(
            "CREATE TABLE ZENTRY (Z_PK INTEGER PRIMARY KEY, ZUUID TEXT, ZMARKDOWNTEXT TEXT, ZCREATIONDATE REAL, ZMODIFIEDDATE REAL, ZTIMEZONE BLOB, ZISPINNED INTEGER, ZSTARRED INTEGER, ZJOURNAL INTEGER, ZLOCATION INTEGER, ZWEATHER INTEGER);
             INSERT INTO ZENTRY (Z_PK, ZUUID, ZMARKDOWNTEXT, ZCREATIONDATE, ZMODIFIEDDATE, ZISPINNED, ZSTARRED, ZJOURNAL) VALUES
                 (1, 'UUID-MIN', 'Minimal store entry.', 694224000.0, 694224000.0, 0, 0, 4);",
        )
        .unwrap();
    drop(connection);

    let summary = import_day_one_database(&vault, &store, false).unwrap();

    assert_eq!(summary.entries_imported, 1);
    let root = PathBuf::from(&summary.imported_root);
    let entry = fs::read_to_string(root.join("journal/2023-01-01-minimal-store-entry.md")).unwrap();
    assert!(entry.contains("type: Journal"));
    assert!(entry.contains("day_one_uuid: UUID-MIN"));
    assert!(!entry.contains("tags:"));
}
