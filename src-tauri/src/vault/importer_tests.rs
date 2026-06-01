use std::fs;
use std::path::{Path, PathBuf};

use tempfile::TempDir;

use super::import_manifest::ImportAutopsyManifestKind;
use super::importer::{import_markdown_folder, preview_markdown_folder_import};

#[derive(Debug, serde::Deserialize, PartialEq, Eq, PartialOrd, Ord)]
struct GoldenManifestRow {
    destination_path: Option<String>,
    detail: String,
    kind: String,
    source_path: String,
}

#[test]
fn imports_markdown_and_assets_into_imports_folder() {
    let vault = TempDir::new().unwrap();
    let source = TempDir::new().unwrap();
    fs::write(source.path().join("note.md"), "# Note\n").unwrap();
    fs::create_dir_all(source.path().join("assets")).unwrap();
    fs::write(source.path().join("assets/image.svg"), "<svg/>").unwrap();
    fs::write(source.path().join("script.ts"), "console.log('skip')").unwrap();

    let result = import_markdown_folder(vault.path(), source.path()).unwrap();

    assert_eq!(result.notes_copied, 1);
    assert_eq!(result.assets_copied, 1);
    assert_eq!(result.skipped_files, 1);
    assert!(Path::new(&result.imported_root).join("note.md").exists());
    assert!(Path::new(&result.imported_root)
        .join("assets/image.svg")
        .exists());
    assert!(Path::new(&result.report_path).exists());
}

#[test]
fn previews_markdown_import_without_writing_to_vault() {
    let vault = TempDir::new().unwrap();
    let source = TempDir::new().unwrap();
    fs::write(source.path().join("note.md"), "# Note\n").unwrap();
    fs::create_dir_all(source.path().join("assets")).unwrap();
    fs::write(source.path().join("assets/image.png"), "image").unwrap();
    fs::create_dir_all(source.path().join(".codex")).unwrap();
    fs::write(source.path().join(".mcp.json"), "{}").unwrap();
    fs::write(source.path().join(".codex/config.toml"), "local").unwrap();
    fs::write(source.path().join("tmp.bin"), "skip").unwrap();

    let result = preview_markdown_folder_import(vault.path(), source.path()).unwrap();

    assert_eq!(result.notes_to_copy, 1);
    assert_eq!(result.assets_to_copy, 1);
    assert_eq!(result.skipped_files, 3);
    assert!(result.writes_local_only_report);
    assert!(result.planned_import_root.contains("/imports/"));
    assert!(!Path::new(&result.planned_import_root).exists());
    assert!(result.manifest_rows.iter().any(|row| {
        row.kind == ImportAutopsyManifestKind::Note
            && row.source_path.ends_with("note.md")
            && row
                .destination_path
                .as_deref()
                .is_some_and(|path| path.ends_with("note.md"))
    }));
    assert!(result.manifest_rows.iter().any(|row| {
        row.kind == ImportAutopsyManifestKind::Asset
            && row.source_path.ends_with("assets/image.png")
            && row
                .destination_path
                .as_deref()
                .is_some_and(|path| path.ends_with("assets/image.png"))
    }));
    assert!(result.manifest_rows.iter().any(|row| {
        row.kind == ImportAutopsyManifestKind::Withheld
            && row.source_path.ends_with(".codex/config.toml")
            && row.destination_path.is_none()
    }));
}

#[test]
fn previews_sanitized_bear_textbundle_corpus_against_golden_manifest() {
    let vault = TempDir::new().unwrap();
    let source = import_corpus_path("bear-textbundle");
    let result = preview_markdown_folder_import(vault.path(), &source).unwrap();
    let import_root = Path::new(&result.planned_import_root);

    let mut actual: Vec<GoldenManifestRow> = result
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

    let expected_path = import_corpus_path("bear-textbundle.golden.json");
    let mut expected: Vec<GoldenManifestRow> =
        serde_json::from_str(&fs::read_to_string(expected_path).unwrap()).unwrap();
    expected.sort();

    assert_eq!(actual, expected);
    assert_eq!(result.notes_to_copy, 1);
    assert_eq!(result.assets_to_copy, 2);
    assert_eq!(result.skipped_files, 1);
}

#[test]
fn imports_count_files_inside_pruned_local_only_dirs_as_skipped() {
    let vault = TempDir::new().unwrap();
    let source = TempDir::new().unwrap();
    fs::write(source.path().join("note.md"), "# Note\n").unwrap();
    fs::create_dir_all(source.path().join("mockups")).unwrap();
    fs::create_dir_all(source.path().join(".grimoire-local/cache")).unwrap();
    fs::write(source.path().join("mockups/private.png"), "mock").unwrap();
    fs::write(source.path().join(".grimoire-local/cache/state.json"), "{}").unwrap();

    let result = import_markdown_folder(vault.path(), source.path()).unwrap();
    let root = Path::new(&result.imported_root);

    assert_eq!(result.notes_copied, 1);
    assert_eq!(result.skipped_files, 2);
    assert!(!root.join("mockups/private.png").exists());
    assert!(!root.join(".grimoire-local/cache/state.json").exists());
}

#[test]
fn rejects_sources_that_contain_the_active_vault() {
    let source = TempDir::new().unwrap();
    let vault = source.path().join("vault");
    fs::create_dir_all(&vault).unwrap();

    let error = import_markdown_folder(&vault, source.path()).unwrap_err();

    assert!(error.contains("must not contain each other"));
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
