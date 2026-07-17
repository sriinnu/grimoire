use rusqlite::Connection;
use std::fs;
use std::path::{Path, PathBuf};

use super::import_bear_database;

/// 2023-01-01T00:00:00Z expressed in Core Data seconds (since 2001-01-01).
const CORE_DATA_2023_01_01: f64 = 694_224_000.0;
/// 2023-06-15T12:30:45Z expressed in Core Data seconds.
const CORE_DATA_2023_06_15: f64 = 708_525_045.0;

struct FixtureNote {
    title: &'static str,
    text: &'static str,
    trashed: i64,
    encrypted: i64,
    archived: i64,
}

fn fixture_note(title: &'static str, text: &'static str) -> FixtureNote {
    FixtureNote {
        title,
        text,
        trashed: 0,
        encrypted: 0,
        archived: 0,
    }
}

fn create_bear_store(store: &Path, notes: &[FixtureNote]) {
    fs::create_dir_all(store.parent().unwrap()).unwrap();
    let connection = Connection::open(store).unwrap();
    connection
        .execute_batch(
            "CREATE TABLE ZSFNOTE (
                Z_PK INTEGER PRIMARY KEY,
                ZTITLE TEXT,
                ZTEXT TEXT,
                ZTRASHED INTEGER,
                ZENCRYPTED INTEGER,
                ZARCHIVED INTEGER,
                ZCREATIONDATE REAL,
                ZMODIFICATIONDATE REAL
            );",
        )
        .unwrap();
    for note in notes {
        connection
            .execute(
                "INSERT INTO ZSFNOTE (ZTITLE, ZTEXT, ZTRASHED, ZENCRYPTED, ZARCHIVED, ZCREATIONDATE, ZMODIFICATIONDATE)
                 VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
                rusqlite::params![
                    note.title,
                    note.text,
                    note.trashed,
                    note.encrypted,
                    note.archived,
                    CORE_DATA_2023_01_01,
                    CORE_DATA_2023_06_15,
                ],
            )
            .unwrap();
    }
}

fn workspace_with_store(notes: &[FixtureNote]) -> (tempfile::TempDir, PathBuf, PathBuf) {
    let workspace = tempfile::tempdir().unwrap();
    let vault = workspace.path().join("vault");
    let store = workspace.path().join("bear-data/database.sqlite");
    fs::create_dir_all(&vault).unwrap();
    create_bear_store(&store, notes);
    (workspace, vault, store)
}

#[test]
fn imports_notes_with_frontmatter_dates_tags_and_archived_flag() {
    let (_workspace, vault, store) = workspace_with_store(&[
        fixture_note(
            "Daily Plan",
            "# Daily Plan\n\nShip the #work/grimoire slice with #focus.\n",
        ),
        FixtureNote {
            archived: 1,
            ..fixture_note("Old Ritual", "Archived body\n")
        },
    ]);

    let summary = import_bear_database(&vault, &store, false).unwrap();

    assert_eq!(summary.notes_imported, 2);
    assert_eq!(summary.failed_notes, 0);
    assert!(!summary.dry_run);
    let root = PathBuf::from(&summary.imported_root);
    assert!(root.starts_with(vault.canonicalize().unwrap().join("imports")));
    assert!(root.to_string_lossy().contains("bear-database"));

    let daily = fs::read_to_string(root.join("daily-plan.md")).unwrap();
    assert!(daily.starts_with("---\n"));
    assert!(daily.contains("type: Note"));
    assert!(daily.contains("source_app: bear"));
    assert!(daily.contains("created: 2023-01-01T00:00:00Z"));
    assert!(daily.contains("modified: 2023-06-15T12:30:45Z"));
    assert!(daily.contains("tags:"));
    assert!(daily.contains("- work"));
    assert!(daily.contains("- focus"));
    assert!(!daily.contains("archived"));
    // The body keeps its inline tags untouched.
    assert!(daily.contains("Ship the #work/grimoire slice with #focus."));

    let archived = fs::read_to_string(root.join("old-ritual.md")).unwrap();
    assert!(archived.contains("archived: true"));
}

#[test]
fn skips_trashed_and_encrypted_notes_with_reason_counts() {
    let (_workspace, vault, store) = workspace_with_store(&[
        fixture_note("Keep Me", "Body\n"),
        FixtureNote {
            trashed: 1,
            ..fixture_note("Trashed", "gone\n")
        },
        FixtureNote {
            encrypted: 1,
            ..fixture_note("Locked", "secret\n")
        },
    ]);

    let summary = import_bear_database(&vault, &store, false).unwrap();

    assert_eq!(summary.notes_imported, 1);
    assert_eq!(summary.skipped_trashed, 1);
    assert_eq!(summary.skipped_encrypted, 1);
    let root = PathBuf::from(&summary.imported_root);
    assert!(root.join("keep-me.md").exists());
    assert!(!root.join("trashed.md").exists());
    assert!(!root.join("locked.md").exists());

    let report = fs::read_to_string(summary.report_path.unwrap()).unwrap();
    assert!(report.contains("type: Import Report"));
    assert!(report.contains("local_only: true"));
    assert!(report.contains("Skipped (trashed): 1"));
    assert!(report.contains("Skipped (encrypted): 1"));
}

#[test]
fn dry_run_reports_counts_and_sample_titles_without_writing() {
    let (_workspace, vault, store) = workspace_with_store(&[
        fixture_note("First Note", "one\n"),
        fixture_note("Second Note", "two\n"),
        FixtureNote {
            trashed: 1,
            ..fixture_note("Trashed", "gone\n")
        },
    ]);

    let summary = import_bear_database(&vault, &store, true).unwrap();

    assert!(summary.dry_run);
    assert_eq!(summary.notes_imported, 2);
    assert_eq!(summary.skipped_trashed, 1);
    assert_eq!(summary.report_path, None);
    assert!(summary.sample_titles.contains(&"First Note".to_string()));
    assert!(summary.sample_titles.contains(&"Second Note".to_string()));
    assert!(!vault.join("imports").exists());
}

#[test]
fn import_reads_a_snapshot_and_leaves_the_source_store_untouched() {
    let (_workspace, vault, store) = workspace_with_store(&[fixture_note("Note", "body\n")]);
    let wal = store.with_file_name("database.sqlite-wal");
    fs::write(&wal, b"wal bytes").unwrap();
    let source_before = fs::read(&store).unwrap();
    let wal_before = fs::read(&wal).unwrap();

    let summary = import_bear_database(&vault, &store, false).unwrap();

    assert_eq!(summary.notes_imported, 1);
    assert_eq!(fs::read(&store).unwrap(), source_before);
    assert_eq!(fs::read(&wal).unwrap(), wal_before);
}

#[test]
fn colliding_titles_get_unique_filenames() {
    let (_workspace, vault, store) = workspace_with_store(&[
        fixture_note("Same Title", "first\n"),
        fixture_note("Same Title", "second\n"),
    ]);

    let summary = import_bear_database(&vault, &store, false).unwrap();

    assert_eq!(summary.notes_imported, 2);
    let root = PathBuf::from(&summary.imported_root);
    assert!(root.join("same-title.md").exists());
    assert!(root.join("same-title-2.md").exists());
}

#[test]
fn missing_expected_column_fails_with_a_named_column() {
    let workspace = tempfile::tempdir().unwrap();
    let vault = workspace.path().join("vault");
    let store = workspace.path().join("bear-data/database.sqlite");
    fs::create_dir_all(&vault).unwrap();
    fs::create_dir_all(store.parent().unwrap()).unwrap();
    let connection = Connection::open(&store).unwrap();
    connection
        .execute_batch(
            "CREATE TABLE ZSFNOTE (Z_PK INTEGER PRIMARY KEY, ZTITLE TEXT, ZTEXT TEXT, ZTRASHED INTEGER, ZENCRYPTED INTEGER);",
        )
        .unwrap();
    drop(connection);

    let error = import_bear_database(&vault, &store, true).unwrap_err();

    assert!(error.contains("ZARCHIVED"), "unexpected error: {error}");
}

#[test]
fn rejects_non_sqlite_store_paths_and_stores_inside_the_vault() {
    let workspace = tempfile::tempdir().unwrap();
    let vault = workspace.path().join("vault");
    fs::create_dir_all(&vault).unwrap();
    let not_sqlite = workspace.path().join("database.db");
    fs::write(&not_sqlite, b"x").unwrap();
    assert!(import_bear_database(&vault, &not_sqlite, true)
        .unwrap_err()
        .contains(".sqlite"));

    let inside = vault.join("database.sqlite");
    create_bear_store(&inside, &[]);
    assert!(import_bear_database(&vault, &inside, true)
        .unwrap_err()
        .contains("outside the active vault"));
}

#[test]
fn untitled_notes_fall_back_to_first_line_titles() {
    let (_workspace, vault, store) = workspace_with_store(&[FixtureNote {
        title: "",
        text: "# Morning pages\n\ncontent\n",
        trashed: 0,
        encrypted: 0,
        archived: 0,
    }]);

    let summary = import_bear_database(&vault, &store, false).unwrap();

    assert_eq!(summary.sample_titles, vec!["Morning pages".to_string()]);
    let root = PathBuf::from(&summary.imported_root);
    assert!(root.join("morning-pages.md").exists());
}
