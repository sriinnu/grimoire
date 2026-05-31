use super::portability_capsule::PortabilityCapsuleFormat;
use super::portability_capsule_loop::run_portability_capsule_loop_proof;
use std::fs;
use tempfile::TempDir;

#[test]
fn proves_generated_json_capsule_can_be_previewed_for_import() {
    let vault = TempDir::new().unwrap();
    fs::write(vault.path().join("public.md"), "# Public\n").unwrap();
    fs::write(
        vault.path().join("private.md"),
        "---\nlocal_only: true\n---\n# Private\n",
    )
    .unwrap();

    let proof = run_portability_capsule_loop_proof(vault.path(), PortabilityCapsuleFormat::Json)
        .expect("json capsule loop proof should run locally");

    assert_eq!(proof.status, "passed");
    assert_eq!(proof.proof_level, "local-artifact-loop");
    assert_eq!(proof.files_exported, 1);
    assert_eq!(proof.notes_exported, proof.notes_previewed_for_import);
    assert_eq!(proof.assets_exported, proof.assets_previewed_for_import);
    assert_eq!(
        proof.local_only_files_withheld,
        proof.local_only_rows_previewed
    );
    assert!(proof.export_signature_captured);
    assert!(proof.import_signature_captured);
    assert!(proof.markdown_source_of_truth);
    assert!(proof.absolute_source_paths_redacted);
    assert!(proof.local_only_report_planned);
    assert!(!proof.artifact_path_stored);
}

#[test]
fn proves_generated_sqlite_capsule_can_be_previewed_for_import() {
    let vault = TempDir::new().unwrap();
    fs::write(vault.path().join("public.md"), "# Public\n").unwrap();
    fs::write(vault.path().join("asset.bin"), [1_u8, 2, 3]).unwrap();

    let proof = run_portability_capsule_loop_proof(vault.path(), PortabilityCapsuleFormat::Sqlite)
        .expect("sqlite capsule loop proof should run locally");

    assert_eq!(proof.status, "passed");
    assert_eq!(proof.files_exported, 2);
    assert_eq!(proof.notes_exported, 1);
    assert_eq!(proof.assets_exported, 1);
    assert_eq!(proof.notes_previewed_for_import, 1);
    assert_eq!(proof.assets_previewed_for_import, 1);
    assert_eq!(proof.local_only_files_withheld, 0);
    assert!(!proof.artifact_path_stored);
}
