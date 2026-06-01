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
fn obsidian_progress_report_counts_pruned_local_only_files() {
    let workspace = tempfile::tempdir().unwrap();
    let vault = workspace.path().join("vault");
    let source = workspace.path().join("obsidian");
    fs::create_dir_all(&vault).unwrap();
    write_file(&source.join("Daily.md"), "# Daily\n");
    write_file(&source.join("assets/sigil.png"), "image");
    write_file(&source.join(".obsidian/workspace.json"), "{}");
    write_file(&source.join(".vscode/settings.json"), "{}");
    write_file(&source.join(".env"), "TOKEN=secret");

    let report = import_app_export_with_progress(
        &vault,
        &source,
        "obsidian",
        &AtomicBool::new(false),
        &|_| {},
    )
    .unwrap();
    let imported_root = Path::new(&report.imported_root);

    assert_eq!(report.notes_copied, 1);
    assert_eq!(report.assets_copied, 1);
    assert_eq!(report.skipped_files, 3);
    assert!(!imported_root.join(".obsidian/workspace.json").exists());
    assert!(!imported_root.join(".vscode/settings.json").exists());
    assert!(!imported_root.join(".env").exists());
}

#[test]
fn notion_zip_progress_report_counts_unsafe_zip_entries() {
    let workspace = tempfile::tempdir().unwrap();
    let vault = workspace.path().join("vault");
    let zip_path = workspace.path().join("notion.zip");
    fs::create_dir_all(&vault).unwrap();
    write_zip_entries(
        &zip_path,
        &[
            ("Project.md", b"# Project\n".as_slice()),
            ("../escape.md", b"# Escape\n".as_slice()),
        ],
    );

    let report = import_app_export_with_progress(
        &vault,
        &zip_path,
        "notion-markdown",
        &AtomicBool::new(false),
        &|_| {},
    )
    .unwrap();

    assert_eq!(report.notes_copied, 1);
    assert_eq!(report.skipped_files, 1);
    assert!(!vault.join("escape.md").exists());
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

fn write_zip_entries(zip_path: &Path, entries: &[(&str, &[u8])]) {
    let file = fs::File::create(zip_path).unwrap();
    let mut zip = zip::ZipWriter::new(file);
    let options = zip::write::FileOptions::default();
    for (name, body) in entries {
        zip.start_file(*name, options).unwrap();
        let mut reader = *body;
        std::io::copy(&mut reader, &mut zip).unwrap();
    }
    zip.finish().unwrap();
}
