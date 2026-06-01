use super::{import_journal_export_with_progress, MarkdownFolderImportProgressEvent};
use std::fs;
use std::path::Path;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Mutex;
use tempfile::TempDir;

fn write_file(path: &Path, content: &str) {
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).unwrap();
    }
    fs::write(path, content).unwrap();
}

#[test]
fn day_one_import_reports_progress_and_finishes() {
    let vault = TempDir::new().unwrap();
    let source = TempDir::new().unwrap();
    write_file(
        &source.path().join("export.json"),
        r##"{"entries":[{"uuid":"abc","creationDate":"2026-05-09T10:00:00Z","text":"# Morning"}]}"##,
    );
    let events = Mutex::new(Vec::new());

    let report = import_journal_export_with_progress(
        vault.path(),
        source.path(),
        "day-one",
        &AtomicBool::new(false),
        &|event| events.lock().unwrap().push(event),
    )
    .unwrap();

    assert_eq!(report.notes_copied, 1);
    assert!(events.lock().unwrap().iter().any(|event| matches!(
        event,
        MarkdownFolderImportProgressEvent::Finished { result } if result.notes_copied == 1
    )));
}

#[test]
fn day_one_import_cancel_removes_partial_folder() {
    let vault = TempDir::new().unwrap();
    let source = TempDir::new().unwrap();
    write_file(
        &source.path().join("export.json"),
        r##"{"entries":[
          {"uuid":"one","creationDate":"2026-05-09T10:00:00Z","text":"# One"},
          {"uuid":"two","creationDate":"2026-05-10T10:00:00Z","text":"# Two"}
        ]}"##,
    );
    let cancelled = AtomicBool::new(false);
    let events = Mutex::new(Vec::new());

    let error = import_journal_export_with_progress(
        vault.path(),
        source.path(),
        "day-one",
        &cancelled,
        &|event| {
            if matches!(
                event,
                MarkdownFolderImportProgressEvent::Progress {
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

    assert_eq!(error, "Import cancelled");
    let imports_empty = fs::read_dir(vault.path().join("imports"))
        .map(|mut entries| entries.next().is_none())
        .unwrap_or(true);
    assert!(imports_empty);
    assert!(events
        .lock()
        .unwrap()
        .iter()
        .any(|event| matches!(event, MarkdownFolderImportProgressEvent::Cancelled)));
}
