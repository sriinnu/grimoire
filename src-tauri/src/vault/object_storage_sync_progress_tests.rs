use super::{
    apply_object_storage_sync_with_progress, preview_object_storage_sync,
    preview_object_storage_sync_with_progress, ObjectStorageSyncOperationKind,
    ObjectStorageSyncProgressEvent, ObjectStorageSyncReport,
};
use std::fs;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Mutex;
use tempfile::TempDir;

#[test]
fn object_storage_preview_reports_progress_and_finishes() {
    let vault = TempDir::new().unwrap();
    let mirror = TempDir::new().unwrap();
    fs::write(vault.path().join("note.md"), "# Note\n").unwrap();
    fs::write(mirror.path().join("remote.md"), "# Remote\n").unwrap();
    let events = Mutex::new(Vec::new());

    let report = preview_object_storage_sync_with_progress(
        vault.path(),
        mirror.path(),
        "s3",
        "push",
        &AtomicBool::new(false),
        &|event| events.lock().unwrap().push(event),
    )
    .unwrap();

    assert_eq!(report.files_to_upload, 1);
    assert_eq!(report.files_to_delete, 1);
    assert!(events.lock().unwrap().iter().any(|event| matches!(
        event,
        ObjectStorageSyncProgressEvent::Started { total_files: 2 }
    )));
    assert!(events.lock().unwrap().iter().any(|event| matches!(
        event,
        ObjectStorageSyncProgressEvent::Finished { result } if result.files_to_upload == 1
    )));
}

#[test]
fn object_storage_progress_preview_reports_pruned_files_like_normal_preview() {
    let vault = TempDir::new().unwrap();
    let mirror = TempDir::new().unwrap();
    fs::write(vault.path().join("public.md"), "# Public\n").unwrap();
    fs::create_dir_all(vault.path().join(".grimoire-local/cache")).unwrap();
    fs::create_dir_all(vault.path().join("mockups")).unwrap();
    fs::write(vault.path().join(".mcp.json"), "{}").unwrap();
    fs::write(vault.path().join(".env.local"), "secret").unwrap();
    fs::write(vault.path().join(".grimoire-local/cache/state.json"), "{}").unwrap();
    fs::write(vault.path().join("mockups/private.png"), "mock").unwrap();

    let report = preview_object_storage_sync_with_progress(
        vault.path(),
        mirror.path(),
        "s3",
        "push",
        &AtomicBool::new(false),
        &|_| {},
    )
    .unwrap();

    let mut excluded = operation_paths(&report, ObjectStorageSyncOperationKind::Exclude);
    excluded.sort();
    assert_eq!(
        excluded,
        vec![
            ".env.local",
            ".grimoire-local/cache/state.json",
            ".mcp.json",
            "mockups/private.png",
        ]
    );
    assert_eq!(
        operation_paths(&report, ObjectStorageSyncOperationKind::Upload),
        vec!["public.md"]
    );
}

#[test]
fn object_storage_apply_reports_progress_and_finishes() {
    let vault = TempDir::new().unwrap();
    let mirror = TempDir::new().unwrap();
    fs::write(vault.path().join("note.md"), "# Note\n").unwrap();
    let preview = preview_object_storage_sync(vault.path(), mirror.path(), "s3", "push").unwrap();
    let events = Mutex::new(Vec::new());

    let report = apply_object_storage_sync_with_progress(
        vault.path(),
        mirror.path(),
        "s3",
        "push",
        &preview.preview_signature,
        &AtomicBool::new(false),
        &|event| events.lock().unwrap().push(event),
    )
    .unwrap();

    assert!(report.applied);
    assert!(mirror.path().join("note.md").exists());
    assert!(events.lock().unwrap().iter().any(|event| matches!(
        event,
        ObjectStorageSyncProgressEvent::Progress {
            processed_files: 1,
            total_files: 1,
            current_path
        } if current_path == "note.md"
    )));
}

#[test]
fn cancelled_object_storage_apply_emits_cancelled_without_report() {
    let vault = TempDir::new().unwrap();
    let mirror = TempDir::new().unwrap();
    fs::write(vault.path().join("one.md"), "# One\n").unwrap();
    fs::write(vault.path().join("two.md"), "# Two\n").unwrap();
    let preview = preview_object_storage_sync(vault.path(), mirror.path(), "s3", "push").unwrap();
    let cancelled = AtomicBool::new(false);
    let events = Mutex::new(Vec::new());

    let error = apply_object_storage_sync_with_progress(
        vault.path(),
        mirror.path(),
        "s3",
        "push",
        &preview.preview_signature,
        &cancelled,
        &|event| {
            if matches!(
                event,
                ObjectStorageSyncProgressEvent::Progress {
                    processed_files: 1,
                    ..
                }
            ) {
                cancelled.store(true, Ordering::SeqCst);
            }
            events.lock().unwrap().push(event);
        },
    )
    .unwrap_err();

    assert_eq!(error, "Storage sync cancelled");
    assert!(!vault
        .path()
        .join(".grimoire/sync-reports/s3-push-report.md")
        .exists());
    assert!(events
        .lock()
        .unwrap()
        .iter()
        .any(|event| matches!(event, ObjectStorageSyncProgressEvent::Cancelled)));
}

#[test]
fn object_storage_apply_with_progress_blocks_conflicts_before_copying() {
    let vault = TempDir::new().unwrap();
    let mirror = TempDir::new().unwrap();
    fs::write(vault.path().join("note.md"), "# Local\n").unwrap();
    fs::write(mirror.path().join("note.md"), "# Remote\n").unwrap();
    let preview = preview_object_storage_sync(vault.path(), mirror.path(), "s3", "push").unwrap();

    let error = apply_object_storage_sync_with_progress(
        vault.path(),
        mirror.path(),
        "s3",
        "push",
        &preview.preview_signature,
        &AtomicBool::new(false),
        &|_| {},
    )
    .unwrap_err();

    assert_eq!(
        error,
        "Resolve object-storage conflicts before applying sync"
    );
    assert_eq!(
        fs::read_to_string(mirror.path().join("note.md")).unwrap(),
        "# Remote\n"
    );
}

fn operation_paths(
    report: &ObjectStorageSyncReport,
    kind: ObjectStorageSyncOperationKind,
) -> Vec<String> {
    report
        .operations
        .iter()
        .filter(|operation| operation.kind == kind)
        .map(|operation| operation.path.clone())
        .collect()
}
