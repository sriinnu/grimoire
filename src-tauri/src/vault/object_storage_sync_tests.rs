use super::{
    apply_object_storage_sync, preview_object_storage_sync, ObjectStorageSyncOperationKind,
};
use std::fs;
use tempfile::TempDir;

#[test]
fn push_preview_reports_upload_delete_conflict_and_exclusions() {
    let vault = TempDir::new().unwrap();
    let mirror = TempDir::new().unwrap();
    fs::write(vault.path().join("new.md"), "# New\n").unwrap();
    fs::write(vault.path().join("same.md"), "# Same\n").unwrap();
    fs::write(vault.path().join("changed.md"), "# Local\n").unwrap();
    fs::write(mirror.path().join("same.md"), "# Same\n").unwrap();
    fs::write(mirror.path().join("changed.md"), "# Remote\n").unwrap();
    fs::write(mirror.path().join("stale.md"), "# Stale\n").unwrap();
    fs::create_dir_all(vault.path().join("Journal")).unwrap();
    fs::write(vault.path().join("Journal/private.md"), "# Private\n").unwrap();

    let report = preview_object_storage_sync(vault.path(), mirror.path(), "s3", "push").unwrap();

    assert!(!report.applied);
    assert_eq!(report.files_to_upload, 1);
    assert_eq!(report.files_to_delete, 1);
    assert_eq!(report.conflicts, 1);
    assert_eq!(report.excluded_files, 1);
    assert_eq!(
        operation_paths(&report, ObjectStorageSyncOperationKind::Upload),
        vec!["new.md"]
    );
    assert_eq!(
        operation_paths(&report, ObjectStorageSyncOperationKind::DeleteRemote),
        vec!["stale.md"]
    );
}

#[test]
fn apply_push_copies_public_files_and_leaves_local_only_lanes_local() {
    let vault = TempDir::new().unwrap();
    let mirror = TempDir::new().unwrap();
    fs::write(vault.path().join("public.md"), "# Public\n").unwrap();
    fs::write(
        vault.path().join("journal.md"),
        "---\ntype: Journal\n---\n# Private\n",
    )
    .unwrap();

    let preview =
        preview_object_storage_sync(vault.path(), mirror.path(), "azure-blob", "push").unwrap();
    let report = apply_object_storage_sync(
        vault.path(),
        mirror.path(),
        "azure-blob",
        "push",
        &preview.preview_signature,
    )
    .unwrap();

    assert!(report.applied);
    assert_eq!(report.files_to_upload, 1);
    assert_eq!(report.excluded_files, 1);
    assert!(mirror.path().join("public.md").exists());
    assert!(!mirror.path().join("journal.md").exists());
    assert!(vault
        .path()
        .join(".grimoire/sync-reports/azure-blob-push-report.md")
        .exists());
}

#[test]
fn pull_preview_does_not_download_remote_local_only_lanes() {
    let vault = TempDir::new().unwrap();
    let mirror = TempDir::new().unwrap();
    fs::write(mirror.path().join("remote.md"), "# Remote\n").unwrap();
    fs::create_dir_all(mirror.path().join("Private")).unwrap();
    fs::write(mirror.path().join("Private/secret.md"), "# Secret\n").unwrap();

    let report = preview_object_storage_sync(vault.path(), mirror.path(), "s3", "pull").unwrap();

    assert_eq!(report.files_to_download, 1);
    assert_eq!(report.excluded_files, 1);
    assert_eq!(
        operation_paths(&report, ObjectStorageSyncOperationKind::Download),
        vec!["remote.md"]
    );
}

#[test]
fn push_preview_does_not_delete_or_overwrite_remote_protected_paths() {
    let vault = TempDir::new().unwrap();
    let mirror = TempDir::new().unwrap();
    fs::write(vault.path().join("public.md"), "# Local public\n").unwrap();
    fs::create_dir_all(mirror.path().join("Private")).unwrap();
    fs::write(mirror.path().join("Private/secret.md"), "# Remote secret\n").unwrap();
    fs::write(
        mirror.path().join("public.md"),
        "---\nlocality: local\n---\n# Remote protected\n",
    )
    .unwrap();

    let report = preview_object_storage_sync(vault.path(), mirror.path(), "s3", "push").unwrap();

    assert_eq!(report.files_to_delete, 0);
    assert_eq!(report.files_to_upload, 0);
    assert_eq!(report.conflicts, 0);
    assert_eq!(report.excluded_files, 2);
}

#[test]
fn push_preview_excludes_attachments_referenced_by_local_only_notes() {
    let vault = TempDir::new().unwrap();
    let mirror = TempDir::new().unwrap();
    fs::create_dir_all(vault.path().join("attachments")).unwrap();
    fs::write(
        vault.path().join("private-transcript.md"),
        "---\nlocality: local\nsource_audio: attachments/private-audio.m4a\n---\n# Transcript\n\n![wave](attachments/private-wave.png)\n```grimoire-canvas\ntype: handwriting\nsource: attachments/private-canvas.grimoire-canvas.json\npreview: attachments/private-canvas.png\n```\n",
    )
    .unwrap();
    fs::write(
        vault.path().join("public-note.md"),
        "---\ntype: Project\n---\n# Public\n\n![diagram](attachments/public-diagram.png)\n",
    )
    .unwrap();
    fs::write(vault.path().join("attachments/private-audio.m4a"), "audio").unwrap();
    fs::write(vault.path().join("attachments/private-wave.png"), "wave").unwrap();
    fs::write(vault.path().join("attachments/private-photo.png"), "photo").unwrap();
    fs::write(
        vault
            .path()
            .join("attachments/private-canvas.grimoire-canvas.json"),
        r#"{"version":1,"images":[{"src":"attachments/private-photo.png"}],"strokes":[]}"#,
    )
    .unwrap();
    fs::write(vault.path().join("attachments/private-canvas.png"), "image").unwrap();
    fs::write(
        vault.path().join("attachments/public-diagram.png"),
        "diagram",
    )
    .unwrap();

    let report = preview_object_storage_sync(vault.path(), mirror.path(), "s3", "push").unwrap();

    assert_eq!(
        operation_paths(&report, ObjectStorageSyncOperationKind::Upload),
        vec!["attachments/public-diagram.png", "public-note.md"]
    );
    assert_eq!(report.excluded_files, 6);
}

#[test]
fn apply_writes_local_markdown_conflict_artifacts_without_overwriting_remote() {
    let vault = TempDir::new().unwrap();
    let mirror = TempDir::new().unwrap();
    fs::write(vault.path().join("note.md"), "# Local\n").unwrap();
    fs::write(mirror.path().join("note.md"), "# Remote\n").unwrap();

    let preview = preview_object_storage_sync(vault.path(), mirror.path(), "s3", "push").unwrap();
    let report = apply_object_storage_sync(
        vault.path(),
        mirror.path(),
        "s3",
        "push",
        &preview.preview_signature,
    )
    .unwrap();

    assert_eq!(report.conflicts, 1);
    assert_eq!(
        fs::read_to_string(mirror.path().join("note.md")).unwrap(),
        "# Remote\n"
    );
    let artifact_path = report.conflict_artifacts.first().expect("artifact path");
    let artifact = fs::read_to_string(artifact_path).unwrap();
    assert!(artifact.contains("type: Sync Conflict"));
    assert!(artifact.contains("locality: local"));
}

#[test]
fn rejects_recursive_mirror_relationships() {
    let parent = TempDir::new().unwrap();
    let vault = parent.path().join("vault");
    fs::create_dir_all(&vault).unwrap();
    let mirror_in_vault = vault.join("mirror");

    let inside_error =
        preview_object_storage_sync(&vault, &mirror_in_vault, "s3", "push").unwrap_err();
    let parent_error =
        preview_object_storage_sync(&vault, parent.path(), "s3", "push").unwrap_err();

    assert!(inside_error.contains("must not contain or live inside"));
    assert!(parent_error.contains("must not contain or live inside"));
}

#[test]
fn apply_rejects_stale_object_storage_previews() {
    let vault = TempDir::new().unwrap();
    let mirror = TempDir::new().unwrap();
    fs::write(vault.path().join("note.md"), "# Original\n").unwrap();

    let preview = preview_object_storage_sync(vault.path(), mirror.path(), "s3", "push").unwrap();
    fs::write(vault.path().join("note.md"), "# Changed after preview\n").unwrap();

    let error = apply_object_storage_sync(
        vault.path(),
        mirror.path(),
        "s3",
        "push",
        &preview.preview_signature,
    )
    .unwrap_err();

    assert!(error.contains("preview changed"));
    assert!(!mirror.path().join("note.md").exists());
}

#[test]
fn preview_signature_changes_when_sync_inputs_change() {
    let vault = TempDir::new().unwrap();
    let mirror = TempDir::new().unwrap();
    fs::write(vault.path().join("note.md"), "# Original\n").unwrap();

    let first = preview_object_storage_sync(vault.path(), mirror.path(), "s3", "push").unwrap();
    fs::write(vault.path().join("note.md"), "# Changed\n").unwrap();
    let second = preview_object_storage_sync(vault.path(), mirror.path(), "s3", "push").unwrap();

    assert_ne!(first.preview_signature, second.preview_signature);
}

fn operation_paths(
    report: &super::ObjectStorageSyncReport,
    kind: ObjectStorageSyncOperationKind,
) -> Vec<String> {
    report
        .operations
        .iter()
        .filter(|operation| operation.kind == kind)
        .map(|operation| operation.path.clone())
        .collect()
}
