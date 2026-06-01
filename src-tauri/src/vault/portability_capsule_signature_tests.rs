use super::portability_capsule::{
    export_portability_capsule, preview_portability_capsule, PortabilityCapsuleFormat,
};
use super::portability_capsule_import::{
    import_portability_capsule, preview_portability_capsule_import,
};
use std::fs;
use std::path::Path;
use tempfile::TempDir;

#[test]
fn rejects_export_when_capsule_preview_signature_is_stale() {
    let vault = TempDir::new().unwrap();
    let target = TempDir::new().unwrap();
    let target_path = target.path().join("vault-snapshot.json");
    fs::write(vault.path().join("public.md"), "# Public\n").unwrap();

    let preview = preview_portability_capsule(vault.path(), PortabilityCapsuleFormat::Json)
        .expect("preview should scan vault");
    fs::write(vault.path().join("new.md"), "# New\n").unwrap();

    let error = export_portability_capsule(
        vault.path(),
        &target_path,
        PortabilityCapsuleFormat::Json,
        &preview.preview_signature,
    )
    .unwrap_err();

    assert!(error.contains("preview is stale"));
    assert!(!target_path.exists());
}

#[test]
fn rejects_import_when_capsule_preview_signature_is_stale() {
    let source = TempDir::new().unwrap();
    let target = TempDir::new().unwrap();
    let vault = TempDir::new().unwrap();
    let capsule_path = target.path().join("vault-snapshot.json");
    fs::write(source.path().join("public.md"), "# Public\n").unwrap();

    export_after_preview(source.path(), &capsule_path, PortabilityCapsuleFormat::Json);
    let preview = preview_portability_capsule_import(
        vault.path(),
        &capsule_path,
        PortabilityCapsuleFormat::Json,
    )
    .unwrap();
    fs::write(source.path().join("public.md"), "# Changed\n").unwrap();
    fs::remove_file(&capsule_path).unwrap();
    export_after_preview(source.path(), &capsule_path, PortabilityCapsuleFormat::Json);

    let error = import_portability_capsule(
        vault.path(),
        &capsule_path,
        PortabilityCapsuleFormat::Json,
        preview.preview_signature.as_deref().unwrap(),
    )
    .unwrap_err();

    assert!(error.contains("preview is stale"));
    assert!(!vault.path().join("imports").exists());
}

fn export_after_preview(vault_path: &Path, target_path: &Path, format: PortabilityCapsuleFormat) {
    let preview = preview_portability_capsule(vault_path, format).unwrap();
    export_portability_capsule(vault_path, target_path, format, &preview.preview_signature)
        .unwrap();
}
