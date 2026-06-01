use std::fs;
use std::path::{Path, PathBuf};

use tempfile::TempDir;

use super::import_manifest::ImportAutopsyManifestKind;
use super::{import_app_export, preview_app_export};

#[derive(Debug, serde::Deserialize, PartialEq, Eq, PartialOrd, Ord)]
struct GoldenManifestRow {
    destination_path: Option<String>,
    detail: String,
    kind: String,
    source_path: String,
}

#[test]
fn previews_sanitized_obsidian_corpus_against_golden_manifest() {
    assert_golden_manifest(
        "obsidian-vault",
        "obsidian-vault.golden.json",
        "obsidian",
        2,
        1,
        2,
    );
}

#[test]
fn previews_sanitized_obsidian_link_styles_against_golden_manifest() {
    assert_golden_manifest(
        "obsidian-link-styles",
        "obsidian-link-styles.golden.json",
        "obsidian",
        2,
        3,
        1,
    );
}

#[test]
fn imports_sanitized_obsidian_link_styles_without_rewriting_or_leaking_runtime_config() {
    let vault = TempDir::new().unwrap();
    let source = import_corpus_path("obsidian-link-styles");

    let report = import_app_export(vault.path(), &source, "obsidian").unwrap();
    let import_root = PathBuf::from(&report.imported_root);

    assert_eq!(report.notes_copied, 2);
    assert_eq!(report.assets_copied, 3);
    assert_eq!(report.skipped_files, 1);
    assert_eq!(report.failed_files, 0);

    let daily = fs::read_to_string(import_root.join("Daily.md")).unwrap();
    let project = fs::read_to_string(import_root.join("Projects/Grimoire.md")).unwrap();

    assert!(daily.contains("[[Projects/Grimoire]]"));
    assert!(daily.contains("![[assets/sigil.png]]"));
    assert!(daily.contains("![[attachments/sketch.canvas]]"));
    assert!(daily.contains("[Project note](Projects/Grimoire.md)"));
    assert!(daily.contains("![Field photo](attachments/photo.jpg)"));
    assert!(project.contains("[Daily](../Daily.md)"));
    assert!(project.contains("![Photo](../attachments/photo.jpg)"));
    assert!(project.contains("[[Daily]]"));

    assert!(import_root.join("assets/sigil.png").exists());
    assert!(import_root.join("attachments/photo.jpg").exists());
    assert!(import_root.join("attachments/sketch.canvas").exists());
    assert!(!import_root.join(".obsidian/app.json").exists());
}

#[test]
fn previews_sanitized_notion_corpus_against_golden_manifest() {
    assert_golden_manifest(
        "notion-markdown",
        "notion-markdown.golden.json",
        "notion-markdown",
        2,
        1,
        1,
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
    let preview = preview_app_export(vault.path(), &source, source_kind).unwrap();
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
