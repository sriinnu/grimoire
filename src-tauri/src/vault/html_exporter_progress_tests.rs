use super::{export_static_html_archive_with_progress, VaultExportProgressEvent};
use std::fs;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Mutex;
use tempfile::TempDir;

#[test]
fn exports_static_html_with_progress() {
    let vault = TempDir::new().unwrap();
    let target = TempDir::new().unwrap();
    fs::write(vault.path().join("note.md"), "# Public\n").unwrap();
    fs::write(vault.path().join("asset.png"), "image").unwrap();
    let cancelled = AtomicBool::new(false);
    let events = Mutex::new(Vec::new());

    let report = export_static_html_archive_with_progress(
        vault.path(),
        &target.path().join("site"),
        &cancelled,
        &|event| events.lock().unwrap().push(event),
    )
    .unwrap();

    assert_eq!(report.files_exported, 2);
    assert!(events.lock().unwrap().first().is_some_and(|event| matches!(
        event,
        VaultExportProgressEvent::Started { total_files: 2 }
    )));
    assert!(events.lock().unwrap().iter().any(|event| matches!(
        event,
        VaultExportProgressEvent::Progress {
            processed_files: 2,
            total_files: 2,
            ..
        }
    )));
    assert!(events.lock().unwrap().iter().any(|event| matches!(
        event,
        VaultExportProgressEvent::Finished { result } if result.files_exported == 2
    )));
}

#[test]
fn cancelled_static_html_export_removes_target_folder() {
    let vault = TempDir::new().unwrap();
    let target = TempDir::new().unwrap();
    fs::write(vault.path().join("first.md"), "# First\n").unwrap();
    fs::write(vault.path().join("second.md"), "# Second\n").unwrap();
    let target_path = target.path().join("site");
    let cancelled = AtomicBool::new(false);
    let events = Mutex::new(Vec::new());

    let error = export_static_html_archive_with_progress(
        vault.path(),
        &target_path,
        &cancelled,
        &|event| {
            if matches!(
                event,
                VaultExportProgressEvent::Progress {
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

    assert!(error.contains("cancelled"));
    assert!(!target_path.exists());
    assert!(events
        .lock()
        .unwrap()
        .iter()
        .any(|event| matches!(event, VaultExportProgressEvent::Cancelled)));
}
