use super::{
    apply_object_storage_sync_with_progress, preview_object_storage_sync,
    preview_object_storage_sync_with_progress, ObjectStorageSyncProgressEvent,
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
