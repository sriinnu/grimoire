use super::portability_capsule::{
    export_portability_capsule, preview_portability_capsule, PortabilityCapsuleFormat,
};
use serde_json::Value;
use std::fs;
use tempfile::TempDir;

#[test]
fn previews_capsule_with_locality_firewall_proof() {
    let vault = TempDir::new().unwrap();
    fs::write(vault.path().join("public.md"), "# Public\n").unwrap();
    fs::write(
        vault.path().join("journal.md"),
        "---\ntype: Journal\n---\n# Private\n",
    )
    .unwrap();
    fs::write(vault.path().join(".env.local"), "SECRET=1").unwrap();

    let preview = preview_portability_capsule(vault.path(), PortabilityCapsuleFormat::Json)
        .expect("preview should scan vault");

    assert_eq!(preview.files_exportable, 1);
    assert_eq!(preview.notes_exportable, 1);
    assert_eq!(preview.skipped_files, 2);
    assert!(preview.locality_proof.markdown_source_of_truth);
    assert!(preview.locality_proof.absolute_source_paths_redacted);
    assert!(preview
        .manifest_rows
        .iter()
        .all(|row| !row.path.contains(vault.path().to_string_lossy().as_ref())));
}

#[test]
fn exports_json_snapshot_with_text_and_withheld_manifest() {
    let vault = TempDir::new().unwrap();
    let target = TempDir::new().unwrap();
    fs::write(vault.path().join("public.md"), "# Public\n").unwrap();
    fs::write(
        vault.path().join("private.md"),
        "---\nlocal_only: true\n---\n# Private\n",
    )
    .unwrap();

    let report = export_portability_capsule(
        vault.path(),
        &target.path().join("vault-snapshot"),
        PortabilityCapsuleFormat::Json,
    )
    .expect("json snapshot should export");

    assert_eq!(report.files_exported, 1);
    assert_eq!(report.skipped_files, 1);
    let value: Value = serde_json::from_slice(&fs::read(report.export_path).unwrap()).unwrap();
    assert_eq!(value["schema"], "grimoire-portability-capsule/v1");
    assert_eq!(value["format"], "json-snapshot");
    assert_eq!(value["files"][0]["path"], "public.md");
    assert_eq!(value["files"][0]["encoding"], "utf-8");
    assert_eq!(value["withheld"][0]["path"], "private.md");
    assert_eq!(
        value["proof"]["absolute_source_paths_redacted"],
        Value::Bool(true)
    );
}

#[test]
fn exports_sqlite_snapshot_with_file_and_proof_tables() {
    let vault = TempDir::new().unwrap();
    let target = TempDir::new().unwrap();
    fs::write(vault.path().join("public.md"), "# Public\n").unwrap();
    fs::create_dir_all(vault.path().join("Dreams")).unwrap();
    fs::write(vault.path().join("Dreams/hidden.md"), "# Hidden\n").unwrap();

    let report = export_portability_capsule(
        vault.path(),
        &target.path().join("vault-snapshot.sqlite"),
        PortabilityCapsuleFormat::Sqlite,
    )
    .expect("sqlite snapshot should export");

    assert_eq!(report.files_exported, 1);
    assert_eq!(report.skipped_files, 1);
    let connection = rusqlite::Connection::open(report.export_path).unwrap();
    let files: i64 = connection
        .query_row("SELECT COUNT(*) FROM capsule_files", [], |row| row.get(0))
        .unwrap();
    let withheld: i64 = connection
        .query_row("SELECT COUNT(*) FROM withheld_files", [], |row| row.get(0))
        .unwrap();
    let proof: String = connection
        .query_row(
            "SELECT value FROM locality_proof WHERE key = 'markdown_source_of_truth'",
            [],
            |row| row.get(0),
        )
        .unwrap();

    assert_eq!(files, 1);
    assert_eq!(withheld, 1);
    assert_eq!(proof, "true");
}
