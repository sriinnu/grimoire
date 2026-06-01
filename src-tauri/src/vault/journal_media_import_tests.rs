use std::fs;
use std::path::Path;

use tempfile::TempDir;

use super::{import_journal_export, preview_journal_export};

fn write_file(path: &Path, content: &str) {
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).unwrap();
    }
    fs::write(path, content).unwrap();
}

#[test]
fn journal_import_keeps_duplicate_nested_media_basenames_distinct() {
    let workspace = TempDir::new().unwrap();
    let vault = workspace.path().join("vault");
    let source = workspace.path().join("day-one-export");
    fs::create_dir_all(&vault).unwrap();
    write_file(
        &source.join("export.json"),
        r##"{
          "entries": [
            {
              "uuid": "first",
              "creationDate": "2026-05-20T10:00:00Z",
              "text": "# First\nFirst photo.",
              "photos": [{ "path": "photos/first/photo.jpg" }]
            },
            {
              "uuid": "second",
              "creationDate": "2026-05-21T10:00:00Z",
              "text": "# Second\nSecond photo.",
              "photos": [{ "path": "photos/second/photo.jpg" }]
            }
          ]
        }"##,
    );
    write_file(&source.join("photos/first/photo.jpg"), "first-image");
    write_file(&source.join("photos/second/photo.jpg"), "second-image");

    let preview = preview_journal_export(&vault, &source, "day-one").unwrap();
    let mut planned_assets: Vec<_> = preview
        .manifest_rows
        .iter()
        .filter_map(|row| row.destination_path.as_deref())
        .filter(|path| path.contains("/attachments/"))
        .map(|path| path.rsplit('/').next().unwrap_or(path).to_string())
        .collect();
    planned_assets.sort();

    assert_eq!(preview.assets_to_copy, 2);
    assert_eq!(planned_assets, vec!["photo-2.jpg", "photo.jpg"]);

    let report = import_journal_export(&vault, &source, "day-one").unwrap();
    let root = Path::new(&report.imported_root);
    let first_note = fs::read_to_string(root.join("2026-05-20-first.md")).unwrap();
    let second_note = fs::read_to_string(root.join("2026-05-21-second.md")).unwrap();

    assert_eq!(report.assets_copied, 2);
    assert!(first_note.contains("attachments/photo.jpg"));
    assert!(second_note.contains("attachments/photo-2.jpg"));
    assert_eq!(
        fs::read_to_string(root.join("attachments/photo.jpg")).unwrap(),
        "first-image"
    );
    assert_eq!(
        fs::read_to_string(root.join("attachments/photo-2.jpg")).unwrap(),
        "second-image"
    );
}
