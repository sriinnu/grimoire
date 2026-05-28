use super::{export_markdown_zip_with_progress, VaultExportProgressEvent};
use std::fs;
use std::path::Path;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Mutex;
use tempfile::TempDir;

#[test]
fn exports_markdown_zip_with_progress() {
    let vault = TempDir::new().unwrap();
    let target_dir = TempDir::new().unwrap();
    fs::write(vault.path().join("note.md"), "# Note\n").unwrap();
    fs::create_dir_all(vault.path().join("assets")).unwrap();
    fs::write(vault.path().join("assets/image.svg"), "<svg/>").unwrap();
    let events = Mutex::new(Vec::new());

    let report = export_markdown_zip_with_progress(
        vault.path(),
        &target_dir.path().join("vault.zip"),
        &AtomicBool::new(false),
        &|event| events.lock().unwrap().push(event),
    )
    .unwrap();

    assert_eq!(report.files_exported, 2);
    assert!(Path::new(&report.export_path).exists());
    assert!(events.lock().unwrap().iter().any(|event| matches!(
        event,
        VaultExportProgressEvent::Finished { result } if result.files_exported == 2
    )));
}

#[test]
fn cancelled_markdown_zip_export_keeps_previous_target_file() {
    let vault = TempDir::new().unwrap();
    let target_dir = TempDir::new().unwrap();
    fs::write(vault.path().join("one.md"), "# One\n").unwrap();
    fs::write(vault.path().join("two.md"), "# Two\n").unwrap();
    let target = target_dir.path().join("vault.zip");
    fs::write(&target, "previous export").unwrap();
    let cancelled = AtomicBool::new(false);
    let events = Mutex::new(Vec::new());

    let error = export_markdown_zip_with_progress(vault.path(), &target, &cancelled, &|event| {
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
    })
    .unwrap_err();

    assert_eq!(error, "Export cancelled");
    assert_eq!(fs::read_to_string(&target).unwrap(), "previous export");
    assert!(events
        .lock()
        .unwrap()
        .iter()
        .any(|event| matches!(event, VaultExportProgressEvent::Cancelled)));
}
