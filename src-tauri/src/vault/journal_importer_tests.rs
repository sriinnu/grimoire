use super::{import_journal_export, preview_journal_export};
use std::fs;
use std::path::Path;
use tempfile::TempDir;

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
