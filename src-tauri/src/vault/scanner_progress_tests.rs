use super::{scan_vault_with_progress, VaultRebuildProgressEvent};
use std::collections::HashMap;
use std::fs;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Mutex;
use tempfile::TempDir;

#[test]
fn scans_vault_with_progress_events() {
    let vault = TempDir::new().unwrap();
    fs::write(vault.path().join("one.md"), "# One\n").unwrap();
    fs::write(vault.path().join("notes.txt"), "plain text").unwrap();
    fs::create_dir_all(vault.path().join(".hidden")).unwrap();
    fs::write(vault.path().join(".hidden/skip.md"), "# Skip\n").unwrap();
    let events = Mutex::new(Vec::new());

    let entries = scan_vault_with_progress(
        vault.path(),
        &HashMap::new(),
        &AtomicBool::new(false),
        &|event| events.lock().unwrap().push(event),
    )
    .unwrap();

    assert_eq!(entries.len(), 2);
    let events = events.lock().unwrap();
    assert!(matches!(
        events.first(),
        Some(VaultRebuildProgressEvent::Started { total_files: 2 })
    ));
    assert!(events.iter().any(|event| matches!(
        event,
        VaultRebuildProgressEvent::Progress {
            processed_files: 2,
            total_files: 2,
            ..
        }
    )));
    assert!(events.iter().any(|event| matches!(
        event,
        VaultRebuildProgressEvent::Finished { result } if result.len() == 2
    )));
}

#[test]
fn cancels_vault_scan_after_progress_checkpoint() {
    let vault = TempDir::new().unwrap();
    fs::write(vault.path().join("one.md"), "# One\n").unwrap();
    fs::write(vault.path().join("two.md"), "# Two\n").unwrap();
    let cancelled = AtomicBool::new(false);
    let events = Mutex::new(Vec::new());

    let error = scan_vault_with_progress(vault.path(), &HashMap::new(), &cancelled, &|event| {
        if matches!(
            event,
            VaultRebuildProgressEvent::Progress {
                processed_files: 1,
                ..
            }
        ) {
            cancelled.store(true, Ordering::SeqCst);
        }
        events.lock().unwrap().push(event);
    })
    .unwrap_err();

    assert_eq!(error, "Vault rebuild cancelled");
    assert!(events
        .lock()
        .unwrap()
        .iter()
        .any(|event| matches!(event, VaultRebuildProgressEvent::Cancelled)));
}
