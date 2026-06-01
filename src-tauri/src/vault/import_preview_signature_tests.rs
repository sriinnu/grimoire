use std::fs::{self, File};
use std::io;
use std::path::Path;

use tempfile::TempDir;
use zip::write::FileOptions;

use super::app_importer_preview::preview_app_export;
use super::import_preview_signature::{
    import_reviewed_app_export, import_reviewed_journal_export, import_reviewed_markdown_folder,
    import_reviewed_markdown_zip,
};
use super::importer::preview_markdown_folder_import;
use super::journal_importer_preview::preview_journal_export;
use super::zip_importer::preview_markdown_zip_import;

#[test]
fn rejects_markdown_folder_when_reviewed_source_changed() {
    let vault = TempDir::new().unwrap();
    let source = TempDir::new().unwrap();
    fs::write(source.path().join("note.md"), "# Note\n").unwrap();
    let preview = preview_markdown_folder_import(vault.path(), source.path()).unwrap();

    fs::write(source.path().join("note.md"), "# Edited\n").unwrap();
    let error = import_reviewed_markdown_folder(
        vault.path(),
        source.path(),
        preview.preview_signature.as_deref().unwrap(),
    )
    .unwrap_err();

    assert!(error.contains("preview is stale"));
    assert!(!vault.path().join("imports").exists());
}

#[test]
fn rejects_markdown_folder_when_private_source_shape_changed() {
    let vault = TempDir::new().unwrap();
    let source = TempDir::new().unwrap();
    fs::write(source.path().join("note.md"), "# Note\n").unwrap();
    let preview = preview_markdown_folder_import(vault.path(), source.path()).unwrap();

    let private_dir = source.path().join(".obsidian");
    fs::create_dir_all(&private_dir).unwrap();
    fs::write(private_dir.join("workspace.json"), "{}").unwrap();
    let error = import_reviewed_markdown_folder(
        vault.path(),
        source.path(),
        preview.preview_signature.as_deref().unwrap(),
    )
    .unwrap_err();

    assert!(error.contains("preview is stale"));
    assert!(!vault.path().join("imports").exists());
}

#[test]
fn allows_markdown_folder_when_only_private_source_content_changed() {
    let vault = TempDir::new().unwrap();
    let source = TempDir::new().unwrap();
    let private_dir = source.path().join(".obsidian");
    fs::create_dir_all(&private_dir).unwrap();
    fs::write(source.path().join("note.md"), "# Note\n").unwrap();
    fs::write(private_dir.join("workspace.json"), r#"{"pane":1}"#).unwrap();
    let preview = preview_markdown_folder_import(vault.path(), source.path()).unwrap();

    fs::write(private_dir.join("workspace.json"), r#"{"pane":2}"#).unwrap();
    let report = import_reviewed_markdown_folder(
        vault.path(),
        source.path(),
        preview.preview_signature.as_deref().unwrap(),
    )
    .unwrap();

    assert_eq!(report.notes_copied, 1);
    assert!(!Path::new(&report.imported_root).join(".obsidian").exists());
}

#[test]
fn rejects_markdown_zip_when_reviewed_archive_changed() {
    let vault = TempDir::new().unwrap();
    let source = TempDir::new().unwrap();
    let zip_path = source.path().join("notes.zip");
    write_zip(&zip_path, &[("note.md", b"# Note\n".as_slice())]);
    let preview = preview_markdown_zip_import(vault.path(), &zip_path).unwrap();

    write_zip(&zip_path, &[("note.md", b"# Edited\n".as_slice())]);
    let error = import_reviewed_markdown_zip(
        vault.path(),
        &zip_path,
        preview.preview_signature.as_deref().unwrap(),
    )
    .unwrap_err();

    assert!(error.contains("preview is stale"));
    assert!(!vault.path().join("imports").exists());
}

#[test]
fn rejects_journal_import_when_reviewed_export_changed() {
    let vault = TempDir::new().unwrap();
    let source = TempDir::new().unwrap();
    write_day_one_export(source.path().join("export.json").as_path(), "# Morning");
    let preview = preview_journal_export(vault.path(), source.path(), "day-one").unwrap();

    write_day_one_export(source.path().join("export.json").as_path(), "# Night");
    let error = import_reviewed_journal_export(
        vault.path(),
        source.path(),
        "day-one",
        preview.preview_signature.as_deref().unwrap(),
    )
    .unwrap_err();

    assert!(error.contains("preview is stale"));
    assert!(!vault.path().join("imports").exists());
}

#[test]
fn rejects_app_import_when_reviewed_export_changed() {
    let vault = TempDir::new().unwrap();
    let source = TempDir::new().unwrap();
    fs::write(source.path().join("Daily.md"), "# Daily\n").unwrap();
    let preview = preview_app_export(vault.path(), source.path(), "obsidian").unwrap();

    fs::write(source.path().join("Daily.md"), "# Daily edited\n").unwrap();
    let error = import_reviewed_app_export(
        vault.path(),
        source.path(),
        "obsidian",
        preview.preview_signature.as_deref().unwrap(),
    )
    .unwrap_err();

    assert!(error.contains("preview is stale"));
    assert!(!vault.path().join("imports").exists());
}

fn write_day_one_export(path: &Path, text: &str) {
    fs::write(
        path,
        format!(
            r#"{{"entries":[{{"uuid":"abc","creationDate":"2026-05-09T10:00:00Z","text":"{text}"}}]}}"#
        ),
    )
    .unwrap();
}

fn write_zip(path: &Path, entries: &[(&str, &[u8])]) {
    let file = File::create(path).unwrap();
    let mut zip = zip::ZipWriter::new(file);
    let options = FileOptions::default()
        .compression_method(zip::CompressionMethod::Deflated)
        .unix_permissions(0o644);
    for (name, body) in entries {
        zip.start_file(*name, options).unwrap();
        let mut reader = *body;
        io::copy(&mut reader, &mut zip).unwrap();
    }
    zip.finish().unwrap();
}
