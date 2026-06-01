use std::fs::{self, File};
use std::io::Write;
use std::path::{Path, PathBuf};

use tempfile::TempDir;
use zip::write::FileOptions;

use super::import_manifest::ImportAutopsyManifestKind;
use super::{import_markdown_zip, preview_markdown_zip_import};

#[derive(Debug, serde::Deserialize, PartialEq, Eq, PartialOrd, Ord)]
struct GoldenManifestRow {
    destination_path: Option<String>,
    detail: String,
    kind: String,
    source_path: String,
}

#[test]
fn previews_sanitized_mixed_markdown_zip_against_golden_manifest() {
    let vault = TempDir::new().unwrap();
    let zip_dir = TempDir::new().unwrap();
    let zip_path = zip_dir.path().join("mixed-markdown.zip");
    write_fixture_zip(&zip_path, &import_corpus_path("mixed-markdown-folder"));

    let preview = preview_markdown_zip_import(vault.path(), &zip_path).unwrap();
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
            source_path: normalize_zip_source(&row.source_path),
        })
        .collect();
    actual.sort();

    let mut expected: Vec<GoldenManifestRow> = serde_json::from_str(
        &fs::read_to_string(import_corpus_path("mixed-markdown-zip.golden.json")).unwrap(),
    )
    .unwrap();
    expected.sort();

    assert_eq!(actual, expected);
    assert_eq!(preview.notes_to_copy, 1);
    assert_eq!(preview.assets_to_copy, 1);
    assert_eq!(preview.skipped_files, 4);
    assert!(preview.source_path.ends_with("mixed-markdown.zip"));
    assert!(!vault.path().join("imports").exists());
}

#[test]
fn imports_large_mixed_markdown_zip_without_copying_unsupported_binaries() {
    let vault = TempDir::new().unwrap();
    let zip_dir = TempDir::new().unwrap();
    let zip_path = zip_dir.path().join("large-mixed-markdown.zip");
    let large_note = format!(
        "# Long Note\n\n{}",
        "A proof line for import scale.\n".repeat(18_000)
    );
    write_zip_entries(
        &zip_path,
        &[
            ("notes/Long Note.md", large_note.as_bytes()),
            ("attachments/chart.png", b"image".as_slice()),
            ("data/archive.bin", b"unsupported".as_slice()),
            ("../escape.md", b"# should never extract\n".as_slice()),
        ],
    );

    let preview = preview_markdown_zip_import(vault.path(), &zip_path).unwrap();
    assert_eq!(preview.notes_to_copy, 1);
    assert_eq!(preview.assets_to_copy, 1);
    assert_eq!(preview.skipped_files, 2);
    assert!(preview.manifest_rows.iter().any(|row| {
        row.kind == ImportAutopsyManifestKind::Withheld
            && row.source_path.ends_with("data/archive.bin")
            && row.destination_path.is_none()
    }));
    assert!(preview.manifest_rows.iter().any(|row| {
        row.kind == ImportAutopsyManifestKind::Withheld
            && row
                .source_path
                .ends_with("large-mixed-markdown.zip!/../escape.md")
            && row.destination_path.is_none()
    }));
    assert!(!vault.path().join("imports").exists());

    let report = import_markdown_zip(vault.path(), &zip_path).unwrap();
    let import_root = Path::new(&report.imported_root);
    let imported_note = fs::read_to_string(import_root.join("notes/Long Note.md")).unwrap();

    assert_eq!(report.notes_copied, 1);
    assert_eq!(report.assets_copied, 1);
    assert_eq!(report.skipped_files, 2);
    assert_eq!(imported_note, large_note);
    assert!(import_root.join("attachments/chart.png").exists());
    assert!(!import_root.join("data/archive.bin").exists());
    assert!(!vault.path().join("escape.md").exists());
    assert!(zip_path.exists());
}

fn write_fixture_zip(zip_path: &Path, fixture_root: &Path) {
    let file = File::create(zip_path).unwrap();
    let mut zip = zip::ZipWriter::new(file);
    let options = FileOptions::default()
        .compression_method(zip::CompressionMethod::Deflated)
        .unix_permissions(0o644);

    for entry in [
        "notes/Readme.md",
        "attachments/chart.png",
        ".codex/session.json",
        ".env",
        "src/app.ts",
    ] {
        zip.start_file(entry, options).unwrap();
        zip.write_all(&fs::read(fixture_root.join(entry)).unwrap())
            .unwrap();
    }
    zip.start_file("../escape.md", options).unwrap();
    zip.write_all(b"# should never leave the archive root\n")
        .unwrap();
    zip.finish().unwrap();
}

fn write_zip_entries(zip_path: &Path, entries: &[(&str, &[u8])]) {
    let file = File::create(zip_path).unwrap();
    let mut zip = zip::ZipWriter::new(file);
    let options = FileOptions::default()
        .compression_method(zip::CompressionMethod::Deflated)
        .unix_permissions(0o644);

    for (entry, body) in entries {
        zip.start_file(*entry, options).unwrap();
        zip.write_all(body).unwrap();
    }
    zip.finish().unwrap();
}

fn import_corpus_path(name: &str) -> PathBuf {
    PathBuf::from(env!("CARGO_MANIFEST_DIR"))
        .join("fixtures/import-corpora")
        .join(name)
}

fn normalize_zip_source(path: &str) -> String {
    if path.contains("mixed-markdown.zip!/") {
        return path.replace('\\', "/");
    }
    path.split("/mixed-markdown/")
        .nth(1)
        .unwrap_or(path)
        .replace('\\', "/")
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
