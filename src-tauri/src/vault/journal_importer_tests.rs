use super::import_manifest::ImportAutopsyManifestKind;
use super::{import_journal_export, preview_journal_export};
use std::fs;
use std::path::{Path, PathBuf};
use tempfile::TempDir;

#[derive(Debug, serde::Deserialize, PartialEq, Eq, PartialOrd, Ord)]
struct GoldenManifestRow {
    destination_path: Option<String>,
    detail: String,
    kind: String,
    source_path: String,
}

fn write_file(path: &Path, content: &str) {
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).unwrap();
    }
    fs::write(path, content).unwrap();
}

#[test]
fn imports_day_one_json_entries_as_markdown() {
    let vault = TempDir::new().unwrap();
    let source = TempDir::new().unwrap();
    fs::write(
        source.path().join("export.json"),
        r##"{
          "entries": [{
            "uuid": "abc",
            "creationDate": "2026-05-09T10:00:00Z",
            "text": "# Morning\nGood coffee.",
            "tags": ["journal", "home"],
            "photos": [{ "md5": "photo-1" }]
          }]
        }"##,
    )
    .unwrap();
    fs::create_dir_all(source.path().join("photos")).unwrap();
    fs::write(source.path().join("photos/photo-1.jpg"), "image").unwrap();

    let result = import_journal_export(vault.path(), source.path(), "day-one").unwrap();
    let root = Path::new(&result.imported_root);

    assert_eq!(result.notes_copied, 1);
    assert_eq!(result.assets_copied, 1);
    assert!(root.join("2026-05-09-morning.md").exists());
    assert!(root.join("attachments/photo-1.jpg").exists());
}

#[test]
fn previews_day_one_json_entries_without_writing_to_vault() {
    let workspace = TempDir::new().unwrap();
    let vault = workspace.path().join("vault");
    let source = workspace.path().join("day-one-export");
    fs::create_dir_all(&vault).unwrap();
    write_file(
        &source.join("export.json"),
        r##"{
          "entries": [{
            "uuid": "abc",
            "creationDate": "2026-05-09T10:00:00Z",
            "text": "# Morning\nGood coffee.",
            "photos": [{ "md5": "photo-1" }]
          }]
        }"##,
    );
    write_file(&source.join("photos/photo-1.jpg"), "image");

    let preview = preview_journal_export(&vault, &source, "day-one").unwrap();

    assert_eq!(preview.notes_to_copy, 1);
    assert_eq!(preview.assets_to_copy, 1);
    assert!(preview
        .planned_import_root
        .contains("/imports/day-one-day-one-export"));
    assert!(preview.writes_local_only_report);
    assert!(!vault.join("imports").exists());
    assert!(preview.manifest_rows.iter().any(|row| {
        row.kind == ImportAutopsyManifestKind::Note
            && row.source_path.ends_with("export.json")
            && row
                .destination_path
                .as_deref()
                .is_some_and(|path| path.ends_with("2026-05-09-morning.md"))
    }));
    assert!(preview.manifest_rows.iter().any(|row| {
        row.kind == ImportAutopsyManifestKind::Asset
            && row.source_path.ends_with("photos/photo-1.jpg")
            && row
                .destination_path
                .as_deref()
                .is_some_and(|path| path.ends_with("attachments/photo-1.jpg"))
    }));
}

#[test]
fn journal_import_report_is_local_only() {
    let vault = TempDir::new().unwrap();
    let source = TempDir::new().unwrap();
    fs::write(
        source.path().join("export.json"),
        r##"{"entries":[{"uuid":"abc","creationDate":"2026-05-09T10:00:00Z","text":"# Morning"}]}"##,
    )
    .unwrap();

    let result = import_journal_export(vault.path(), source.path(), "day-one").unwrap();
    let report = fs::read_to_string(result.report_path).unwrap();

    assert!(report.contains("type: Import Report"));
    assert!(report.contains("locality: local"));
    assert!(report.contains("local_only: true"));
}

#[test]
fn previews_apple_journal_html_entries_without_writing_to_vault() {
    let workspace = TempDir::new().unwrap();
    let vault = workspace.path().join("vault");
    let source = workspace.path().join("apple-journal-export");
    fs::create_dir_all(&vault).unwrap();
    write_file(
        &source.join("2026-05-11-evening.html"),
        r#"
        <!doctype html>
        <html>
          <body>
            <article>
              <time datetime="2026-05-11T19:20:00Z"></time>
              <h1>Evening Walk</h1>
              <p>Moon over the lake.</p>
              <img src="Media/lake.jpg">
              <a href="Media/voice.m4a">voice</a>
            </article>
          </body>
        </html>
        "#,
    );
    write_file(&source.join("Media/lake.jpg"), "image");
    write_file(&source.join("Media/voice.m4a"), "audio");

    let preview = preview_journal_export(&vault, &source, "apple-journal").unwrap();

    assert_eq!(preview.notes_to_copy, 1);
    assert_eq!(preview.assets_to_copy, 2);
    assert!(preview
        .planned_import_root
        .contains("/imports/apple-journal-apple-journal-export"));
    assert!(!vault.join("imports").exists());
}

#[test]
fn previews_sanitized_day_one_corpus_against_golden_manifest() {
    assert_golden_manifest(
        "day-one-json",
        "day-one-json.golden.json",
        "day-one",
        2,
        2,
        0,
    );
}

#[test]
fn previews_sanitized_day_one_media_categories_against_golden_manifest() {
    assert_golden_manifest(
        "day-one-media-categories",
        "day-one-media-categories.golden.json",
        "day-one",
        1,
        4,
        0,
    );
}

#[test]
fn previews_sanitized_apple_journal_corpus_against_golden_manifest() {
    assert_golden_manifest(
        "apple-journal-html",
        "apple-journal-html.golden.json",
        "apple-journal",
        1,
        2,
        0,
    );
}

#[test]
fn previews_sanitized_journey_corpus_against_golden_manifest() {
    assert_golden_manifest(
        "journey-json",
        "journey-json.golden.json",
        "journey",
        2,
        2,
        0,
    );
}

fn assert_golden_manifest(
    corpus_name: &str,
    golden_name: &str,
    source_kind: &str,
    expected_notes: usize,
    expected_assets: usize,
    expected_skipped: usize,
) {
    let vault = TempDir::new().unwrap();
    let source = import_corpus_path(corpus_name);
    let preview = preview_journal_export(vault.path(), &source, source_kind).unwrap();
    let import_root = Path::new(&preview.planned_import_root);

    let mut actual: Vec<GoldenManifestRow> = preview
        .manifest_rows
        .iter()
        .map(|row| GoldenManifestRow {
            destination_path: row
                .destination_path
                .as_deref()
                .map(|path| normalize_path(import_root, Path::new(path))),
            detail: row.detail.clone(),
            kind: manifest_kind_name(&row.kind).to_string(),
            source_path: normalize_path(&source, Path::new(&row.source_path)),
        })
        .collect();
    actual.sort();

    let expected_path = import_corpus_path(golden_name);
    let mut expected: Vec<GoldenManifestRow> =
        serde_json::from_str(&fs::read_to_string(expected_path).unwrap()).unwrap();
    expected.sort();

    assert_eq!(actual, expected);
    assert_eq!(preview.notes_to_copy, expected_notes);
    assert_eq!(preview.assets_to_copy, expected_assets);
    assert_eq!(preview.skipped_files, expected_skipped);
    assert!(!vault.path().join("imports").exists());
}

#[test]
fn imports_apple_journal_html_entries_as_local_markdown() {
    let vault = TempDir::new().unwrap();
    let source = TempDir::new().unwrap();
    fs::create_dir_all(source.path().join("Media")).unwrap();
    fs::write(
        source.path().join("2026-05-11-evening.html"),
        r#"
        <!doctype html>
        <html>
          <head><title>Evening Walk</title></head>
          <body>
            <article>
              <time datetime="2026-05-11T19:20:00Z"></time>
              <h1>Evening Walk</h1>
              <p>Moon over the lake &amp; quiet trees.</p>
              <img src="Media/lake.jpg">
              <a href="Media/voice.m4a">voice</a>
            </article>
          </body>
        </html>
        "#,
    )
    .unwrap();
    fs::write(source.path().join("Media/lake.jpg"), "image").unwrap();
    fs::write(source.path().join("Media/voice.m4a"), "audio").unwrap();

    let result = import_journal_export(vault.path(), source.path(), "apple-journal").unwrap();
    let root = Path::new(&result.imported_root);
    let note = fs::read_to_string(root.join("2026-05-11-evening-walk.md")).unwrap();

    assert_eq!(result.notes_copied, 1);
    assert_eq!(result.assets_copied, 2);
    assert!(note.contains("source_app: apple-journal"));
    assert!(note.contains("type: Journal"));
    assert!(note.contains("Moon over the lake & quiet trees."));
    assert!(root.join("attachments/lake.jpg").exists());
    assert!(root.join("attachments/voice.m4a").exists());
}

#[test]
fn previews_journey_json_entries_without_writing_to_vault() {
    let workspace = TempDir::new().unwrap();
    let vault = workspace.path().join("vault");
    let source = workspace.path().join("journey-export");
    fs::create_dir_all(&vault).unwrap();
    write_file(
        &source.join("journey.json"),
        r##"[{
          "id": "j1",
          "created": "2026-05-13T07:00:00Z",
          "title": "Temple",
          "content": "Quiet morning.",
          "media": [{ "filename": "bell.m4a" }]
        }]"##,
    );
    write_file(&source.join("bell.m4a"), "audio");

    let preview = preview_journal_export(&vault, &source, "journey").unwrap();

    assert_eq!(preview.notes_to_copy, 1);
    assert_eq!(preview.assets_to_copy, 1);
    assert!(preview
        .planned_import_root
        .contains("/imports/journey-journey-export"));
    assert!(!vault.join("imports").exists());
}

#[test]
fn imports_apple_journal_json_entries_with_media() {
    let vault = TempDir::new().unwrap();
    let source = TempDir::new().unwrap();
    fs::write(
        source.path().join("Entries.json"),
        r##"{
          "entries": [{
            "id": "apple-1",
            "createdDate": "2026-05-12T06:30:00Z",
            "title": "Morning Pages",
            "content": "Woke up clear.",
            "attachments": [{ "filename": "sunrise.heic" }]
          }]
        }"##,
    )
    .unwrap();
    fs::write(source.path().join("sunrise.heic"), "image").unwrap();

    let result = import_journal_export(vault.path(), source.path(), "apple-journal").unwrap();
    let root = Path::new(&result.imported_root);

    assert_eq!(result.notes_copied, 1);
    assert_eq!(result.assets_copied, 1);
    assert!(root.join("2026-05-12-morning-pages.md").exists());
    assert!(root.join("attachments/sunrise.heic").exists());
}

#[test]
fn rejects_journal_source_inside_vault() {
    let vault = TempDir::new().unwrap();
    let source = vault.path().join("export.json");
    fs::write(&source, "{}").unwrap();

    let error = import_journal_export(vault.path(), &source, "journey").unwrap_err();

    assert!(error.contains("outside the active vault"));
}

fn import_corpus_path(name: &str) -> PathBuf {
    PathBuf::from(env!("CARGO_MANIFEST_DIR"))
        .join("fixtures/import-corpora")
        .join(name)
}

fn normalize_path(root: &Path, path: &Path) -> String {
    path.strip_prefix(root)
        .unwrap_or(path)
        .to_string_lossy()
        .replace('\\', "/")
}

fn manifest_kind_name(kind: &ImportAutopsyManifestKind) -> &'static str {
    match kind {
        ImportAutopsyManifestKind::Asset => "asset",
        ImportAutopsyManifestKind::Metadata => "metadata",
        ImportAutopsyManifestKind::Note => "note",
        ImportAutopsyManifestKind::Withheld => "withheld",
    }
}
