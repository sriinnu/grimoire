use super::{import_app_export_with_progress, MarkdownFolderImportProgressEvent};
use std::fs;
use std::path::Path;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Mutex;

fn write_file(path: &Path, content: &str) {
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).unwrap();
    }
    fs::write(path, content).unwrap();
}

#[test]
fn obsidian_import_reports_progress_and_finishes() {
    let workspace = tempfile::tempdir().unwrap();
    let vault = workspace.path().join("vault");
    let source = workspace.path().join("obsidian");
    fs::create_dir_all(&vault).unwrap();
    write_file(&source.join("Daily.md"), "# Daily\n");
    write_file(&source.join("assets/sigil.png"), "image");
    let events = Mutex::new(Vec::new());

    let report = import_app_export_with_progress(
        &vault,
        &source,
        "obsidian",
        &AtomicBool::new(false),
        &|event| events.lock().unwrap().push(event),
    )
    .unwrap();

    assert_eq!(report.notes_copied, 1);
    assert_eq!(report.assets_copied, 1);
    assert!(events.lock().unwrap().iter().any(|event| matches!(
        event,
        MarkdownFolderImportProgressEvent::Finished { result } if result.notes_copied == 1
    )));
}

#[test]
fn obsidian_import_cancel_removes_partial_folder() {
    let workspace = tempfile::tempdir().unwrap();
    let vault = workspace.path().join("vault");
    let source = workspace.path().join("obsidian");
    fs::create_dir_all(&vault).unwrap();
    write_file(&source.join("one.md"), "# One\n");
    write_file(&source.join("two.md"), "# Two\n");
    let cancelled = AtomicBool::new(false);
    let events = Mutex::new(Vec::new());

    let error =
        import_app_export_with_progress(&vault, &source, "obsidian", &cancelled, &|event| {
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
        })
        .unwrap_err();

    assert_eq!(error, "Import cancelled");
    assert!(!vault.join("imports/obsidian-obsidian").exists());
    assert!(events
        .lock()
        .unwrap()
        .iter()
        .any(|event| matches!(event, MarkdownFolderImportProgressEvent::Cancelled)));
}

#[test]
fn spanda_import_reports_progress_and_finishes() {
    let workspace = tempfile::tempdir().unwrap();
    let vault = workspace.path().join("vault");
    let source = workspace.path().join("spanda");
    fs::create_dir_all(&vault).unwrap();
    write_file(
        &source.join("spanda.json"),
        r#"{"sessions":[{"practice":"Japa","startedAt":"2026-05-19","notes":"108"}]}"#,
    );
    let events = Mutex::new(Vec::new());

    let report = import_app_export_with_progress(
        &vault,
        &source,
        "spanda",
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
