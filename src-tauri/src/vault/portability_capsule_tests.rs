use super::portability_capsule::{
    export_portability_capsule, preview_portability_capsule, sha256_hex, PortabilityCapsuleFormat,
};
use super::portability_capsule_import::{
    import_portability_capsule, preview_portability_capsule_import,
};
use serde_json::{json, Value};
use std::fs;
use std::path::Path;
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
    assert!(preview.preview_signature.starts_with("capsule-preview-v1:"));
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

    let report = export_after_preview(
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

    let report = export_after_preview(
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

#[test]
fn previews_and_imports_json_snapshot_without_recreating_withheld_files() {
    let source = TempDir::new().unwrap();
    let target = TempDir::new().unwrap();
    let vault = TempDir::new().unwrap();
    fs::write(source.path().join("public.md"), "# Public\n").unwrap();
    fs::write(
        source.path().join("private.md"),
        "---\nlocal_only: true\n---\n# Private\n",
    )
    .unwrap();

    let export = export_after_preview(
        source.path(),
        &target.path().join("vault-snapshot.json"),
        PortabilityCapsuleFormat::Json,
    )
    .unwrap();
    let capsule_path = std::path::Path::new(&export.export_path);
    let preview = preview_portability_capsule_import(
        vault.path(),
        capsule_path,
        PortabilityCapsuleFormat::Json,
    )
    .unwrap();

    assert_eq!(preview.notes_to_copy, 1);
    assert_eq!(preview.skipped_files, 1);
    assert!(preview
        .preview_signature
        .as_deref()
        .unwrap()
        .starts_with("capsule-import-preview-v1:"));
    assert!(!vault.path().join("imports").exists());

    let report = import_portability_capsule(
        vault.path(),
        capsule_path,
        PortabilityCapsuleFormat::Json,
        preview.preview_signature.as_deref().unwrap(),
    )
    .unwrap();
    let root = std::path::Path::new(&report.imported_root);
    assert_eq!(
        fs::read_to_string(root.join("public.md")).unwrap(),
        "# Public\n"
    );
    assert!(!root.join("private.md").exists());
    assert!(fs::read_to_string(report.report_path)
        .unwrap()
        .contains("local_only: true"));
}

#[test]
fn imports_sqlite_snapshot_preserving_binary_assets() {
    let source = TempDir::new().unwrap();
    let target = TempDir::new().unwrap();
    let vault = TempDir::new().unwrap();
    fs::create_dir_all(source.path().join("attachments")).unwrap();
    fs::write(
        source.path().join("note.md"),
        "# Note\n![asset](attachments/pixel.bin)\n",
    )
    .unwrap();
    fs::write(source.path().join("attachments/pixel.bin"), [0, 1, 2, 255]).unwrap();

    let export = export_after_preview(
        source.path(),
        &target.path().join("vault-snapshot.sqlite"),
        PortabilityCapsuleFormat::Sqlite,
    )
    .unwrap();
    let capsule_path = std::path::Path::new(&export.export_path);
    let preview = preview_portability_capsule_import(
        vault.path(),
        capsule_path,
        PortabilityCapsuleFormat::Sqlite,
    )
    .unwrap();

    assert_eq!(preview.notes_to_copy, 1);
    assert_eq!(preview.assets_to_copy, 1);

    let report = import_portability_capsule(
        vault.path(),
        capsule_path,
        PortabilityCapsuleFormat::Sqlite,
        preview.preview_signature.as_deref().unwrap(),
    )
    .unwrap();
    let root = std::path::Path::new(&report.imported_root);
    assert_eq!(
        fs::read(root.join("attachments/pixel.bin")).unwrap(),
        [0, 1, 2, 255]
    );
}

#[test]
fn inbound_capsule_firewall_withholds_local_only_notes_and_referenced_assets() {
    let capsule_dir = TempDir::new().unwrap();
    let vault = TempDir::new().unwrap();
    let private = "---\nlocality: local\n---\n# Private\n![audio](attachments/audio.m4a)\n```grimoire-canvas\nsource: attachments/sketch.json\npreview: attachments/sketch.png\n```\n";
    let audio = b"secret audio";
    let canvas = br#"{"version":1,"images":[{"src":"attachments/placed.png"}],"strokes":[]}"#;
    let capsule = json!({
        "schema": "grimoire-portability-capsule/v1",
        "format": "json-snapshot",
        "vault_label": "untrusted",
        "proof": {
            "markdown_source_of_truth": true,
            "absolute_source_paths_redacted": true,
            "local_only_files_withheld": 0
        },
        "files": [
            json_file("private.md", "markdown", private.as_bytes()),
            json_file("attachments/audio.m4a", "asset", audio),
            json_file("attachments/sketch.json", "text", canvas),
            json_file("attachments/sketch.png", "asset", b"preview"),
            json_file("attachments/placed.png", "asset", b"placed")
        ],
        "withheld": []
    });
    let capsule_path = capsule_dir.path().join("untrusted.json");
    fs::write(&capsule_path, serde_json::to_vec_pretty(&capsule).unwrap()).unwrap();

    let preview = preview_portability_capsule_import(
        vault.path(),
        &capsule_path,
        PortabilityCapsuleFormat::Json,
    )
    .unwrap();

    assert_eq!(preview.notes_to_copy, 0);
    assert_eq!(preview.assets_to_copy, 0);
    assert_eq!(preview.skipped_files, 5);
    assert!(preview.manifest_rows.iter().any(|row| row.kind
        == super::import_manifest::ImportAutopsyManifestKind::Withheld
        && row.source_path.ends_with("attachments/audio.m4a")));
    assert!(preview.manifest_rows.iter().any(|row| row.kind
        == super::import_manifest::ImportAutopsyManifestKind::Withheld
        && row.source_path.ends_with("attachments/placed.png")));
}

#[test]
fn rejects_json_capsule_with_invalid_locality_proof() {
    let capsule_dir = TempDir::new().unwrap();
    let vault = TempDir::new().unwrap();
    let capsule = json!({
        "schema": "grimoire-portability-capsule/v1",
        "format": "json-snapshot",
        "vault_label": "untrusted",
        "proof": {
            "markdown_source_of_truth": false,
            "absolute_source_paths_redacted": true,
            "local_only_files_withheld": 0
        },
        "files": [json_file("public.md", "markdown", b"# Public\n")],
        "withheld": []
    });
    let capsule_path = capsule_dir.path().join("bad-proof.json");
    fs::write(&capsule_path, serde_json::to_vec_pretty(&capsule).unwrap()).unwrap();

    let error = preview_portability_capsule_import(
        vault.path(),
        &capsule_path,
        PortabilityCapsuleFormat::Json,
    )
    .unwrap_err();

    assert!(error.contains("Capsule locality proof"));
}

#[test]
fn rejects_sqlite_capsule_when_proof_does_not_match_withheld_rows() {
    let capsule_dir = TempDir::new().unwrap();
    let vault = TempDir::new().unwrap();
    let capsule_path = capsule_dir.path().join("bad-proof.sqlite");
    let connection = rusqlite::Connection::open(&capsule_path).unwrap();
    connection
        .execute_batch(
            "CREATE TABLE capsule_meta(key TEXT PRIMARY KEY, value TEXT NOT NULL);
             CREATE TABLE capsule_files(path TEXT PRIMARY KEY, kind TEXT NOT NULL, bytes INTEGER NOT NULL, sha256 TEXT NOT NULL, content_text TEXT, content_blob BLOB NOT NULL);
             CREATE TABLE withheld_files(path TEXT PRIMARY KEY, reason TEXT NOT NULL);
             CREATE TABLE locality_proof(key TEXT PRIMARY KEY, value TEXT NOT NULL);
             INSERT INTO capsule_meta(key, value) VALUES
               ('schema', 'grimoire-portability-capsule/v1'),
               ('format', 'sqlite-snapshot'),
               ('vault_label', 'untrusted');
             INSERT INTO withheld_files(path, reason) VALUES
               ('private.md', 'Protected by Locality Firewall');
             INSERT INTO locality_proof(key, value) VALUES
               ('markdown_source_of_truth', 'true'),
               ('absolute_source_paths_redacted', 'true'),
               ('local_only_files_withheld', '0');",
        )
        .unwrap();

    let error = preview_portability_capsule_import(
        vault.path(),
        &capsule_path,
        PortabilityCapsuleFormat::Sqlite,
    )
    .unwrap_err();

    assert!(error.contains("withheld manifest rows"));
}

#[test]
fn rejects_capsules_with_traversal_paths_or_sources_inside_vault() {
    let capsule_dir = TempDir::new().unwrap();
    let vault = TempDir::new().unwrap();
    let capsule = json!({
        "schema": "grimoire-portability-capsule/v1",
        "format": "json-snapshot",
        "vault_label": "untrusted",
        "proof": {
            "markdown_source_of_truth": true,
            "absolute_source_paths_redacted": true,
            "local_only_files_withheld": 0
        },
        "files": [json_file("../escape.md", "markdown", b"# Escape\n")],
        "withheld": []
    });
    let capsule_path = capsule_dir.path().join("escape.json");
    fs::write(&capsule_path, serde_json::to_vec_pretty(&capsule).unwrap()).unwrap();

    let error = preview_portability_capsule_import(
        vault.path(),
        &capsule_path,
        PortabilityCapsuleFormat::Json,
    )
    .unwrap_err();
    assert!(error.contains("Unsafe capsule path"));

    let inside_vault = vault.path().join("snapshot.json");
    fs::write(
        &inside_vault,
        serde_json::to_vec_pretty(&json!({})).unwrap(),
    )
    .unwrap();
    let error = preview_portability_capsule_import(
        vault.path(),
        &inside_vault,
        PortabilityCapsuleFormat::Json,
    )
    .unwrap_err();
    assert!(error.contains("outside the active vault"));
}

fn json_file(path: &str, kind: &str, bytes: &[u8]) -> Value {
    json!({
        "path": path,
        "kind": kind,
        "bytes": bytes.len(),
        "sha256": sha256_hex(bytes),
        "encoding": "utf-8",
        "content": std::str::from_utf8(bytes).unwrap()
    })
}

fn export_after_preview(
    vault_path: &Path,
    target_path: &Path,
    format: PortabilityCapsuleFormat,
) -> Result<super::VaultExportReport, String> {
    let preview = preview_portability_capsule(vault_path, format).unwrap();
    export_portability_capsule(vault_path, target_path, format, &preview.preview_signature)
}
