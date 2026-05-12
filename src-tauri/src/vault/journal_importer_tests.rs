use super::journal_importer::import_journal_export;
use std::fs;
use std::path::Path;
use tempfile::TempDir;

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
fn rejects_journal_source_inside_vault() {
    let vault = TempDir::new().unwrap();
    let source = vault.path().join("export.json");
    fs::write(&source, "{}").unwrap();

    let error = import_journal_export(vault.path(), &source, "journey").unwrap_err();

    assert!(error.contains("outside the active vault"));
}
