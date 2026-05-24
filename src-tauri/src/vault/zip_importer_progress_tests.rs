use super::{import_markdown_zip_with_progress, MarkdownFolderImportProgressEvent};
use std::fs::File;
use std::io;
use std::path::Path;
use std::sync::atomic::AtomicBool;
use std::sync::Mutex;
use tempfile::TempDir;
use zip::write::FileOptions;

#[test]
fn imports_markdown_zip_with_progress_and_adjusted_skip_count() {
    let vault = TempDir::new().unwrap();
    let zip_dir = TempDir::new().unwrap();
    let zip_path = zip_dir.path().join("portable.zip");
    write_zip(
        &zip_path,
        &[
            ("safe.md", b"# Safe\n".as_slice()),
            ("../escape.md", b"# Escape\n".as_slice()),
        ],
    );
    let events = Mutex::new(Vec::new());

    let result = import_markdown_zip_with_progress(
        vault.path(),
        &zip_path,
        &AtomicBool::new(false),
        &|event| events.lock().unwrap().push(event),
    )
    .unwrap();

    assert_eq!(result.notes_copied, 1);
    assert_eq!(result.skipped_files, 1);
    assert!(events.lock().unwrap().iter().any(|event| matches!(
        event,
        MarkdownFolderImportProgressEvent::Finished { result } if result.skipped_files == 1
    )));
}

#[test]
fn cancels_markdown_zip_before_writing_to_vault() {
    let vault = TempDir::new().unwrap();
    let zip_dir = TempDir::new().unwrap();
    let zip_path = zip_dir.path().join("portable.zip");
    write_zip(&zip_path, &[("safe.md", b"# Safe\n".as_slice())]);
    let cancelled = AtomicBool::new(true);
    let events = Mutex::new(Vec::new());

    let error = import_markdown_zip_with_progress(vault.path(), &zip_path, &cancelled, &|event| {
        events.lock().unwrap().push(event)
    })
    .unwrap_err();

    assert_eq!(error, "Import cancelled");
    assert!(!vault.path().join("imports").exists());
    assert!(events
        .lock()
        .unwrap()
        .iter()
        .any(|event| matches!(event, MarkdownFolderImportProgressEvent::Cancelled)));
}

fn write_zip(path: &Path, entries: &[(&str, &[u8])]) {
    let file = File::create(path).unwrap();
    let mut zip = zip::ZipWriter::new(file);
    let options = FileOptions::default()
        .compression_method(zip::CompressionMethod::Deflated)
        .unix_permissions(0o644);

    for (name, body) in entries {
        zip.start_file(*name, options).unwrap();
        let mut reader = *body;
        io::copy(&mut reader, &mut zip).unwrap();
    }
    zip.finish().unwrap();
}
