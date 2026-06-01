use serde::Serialize;
use std::collections::BTreeMap;
use std::fs;
use std::path::{Path, PathBuf};
use std::sync::atomic::{AtomicBool, Ordering};
use walkdir::WalkDir;

use super::locality::{is_local_only_export_file, is_local_only_relative_path};
use super::locality_attachments::local_only_referenced_attachments;
use super::object_storage_signature::file_fingerprint;
use super::object_storage_sync::{
    add_pull_operations, add_push_operations, build_report, canonical_dir, copy_relative_file,
    has_skipped_component, parse_direction, path_to_string, relative_path, remove_relative_file,
    resolve_mirror_root, should_enter, should_skip_file, validate_mirror_outside_vault,
    validate_provider_id, SyncDirection, SyncReportExtras,
};
use super::object_storage_sync_report::{
    write_conflict_artifact, write_sync_report, ObjectStorageSyncOperation,
    ObjectStorageSyncOperationKind, ObjectStorageSyncReport,
};

#[derive(Debug, Clone, Serialize, PartialEq, Eq)]
#[serde(tag = "event", content = "data")]
pub enum ObjectStorageSyncProgressEvent {
    #[serde(rename_all = "camelCase")]
    Started {
        total_files: usize,
    },
    #[serde(rename_all = "camelCase")]
    Progress {
        processed_files: usize,
        total_files: usize,
        current_path: String,
    },
    Cancelled,
    #[serde(rename_all = "camelCase")]
    Finished {
        result: Box<ObjectStorageSyncReport>,
    },
}

struct ProgressCounter {
    processed: usize,
    total: usize,
}

struct SyncCollectionContext<'a, F: Fn(ObjectStorageSyncProgressEvent) + ?Sized> {
    operations: &'a mut Vec<ObjectStorageSyncOperation>,
    file_fingerprints: &'a mut Vec<String>,
    counter: &'a mut ProgressCounter,
    cancelled: &'a AtomicBool,
    on_progress: &'a F,
}

/// Builds a cancellable dry-run object-storage sync report against a local mirror folder.
pub fn preview_object_storage_sync_with_progress<F>(
    vault_path: &Path,
    mirror_path: &Path,
    provider_id: &str,
    direction: &str,
    cancelled: &AtomicBool,
    on_progress: &F,
) -> Result<ObjectStorageSyncReport, String>
where
    F: Fn(ObjectStorageSyncProgressEvent) + ?Sized,
{
    let direction = parse_direction(direction)?;
    let provider_id = validate_provider_id(provider_id)?;
    let vault_root = canonical_dir(vault_path, "Vault")?;
    let mirror_root = resolve_mirror_root(mirror_path)?;
    validate_mirror_outside_vault(&vault_root, &mirror_root)?;
    let total_files = count_sync_candidates(&vault_root)? + count_sync_candidates(&mirror_root)?;
    on_progress(ObjectStorageSyncProgressEvent::Started { total_files });
    check_cancelled(cancelled, on_progress)?;

    let mut operations = Vec::new();
    let mut file_fingerprints = Vec::new();
    let mut counter = ProgressCounter {
        processed: 0,
        total: total_files,
    };
    let local_files = {
        let mut context = SyncCollectionContext {
            operations: &mut operations,
            file_fingerprints: &mut file_fingerprints,
            counter: &mut counter,
            cancelled,
            on_progress,
        };
        collect_sync_files_with_progress(&vault_root, &vault_root, "local", &mut context)?
    };
    let remote_files = {
        let mut context = SyncCollectionContext {
            operations: &mut operations,
            file_fingerprints: &mut file_fingerprints,
            counter: &mut counter,
            cancelled,
            on_progress,
        };
        collect_sync_files_with_progress(&mirror_root, &mirror_root, "remote", &mut context)?
    };

    match direction {
        SyncDirection::Push => add_push_operations(&local_files, &remote_files, &mut operations)?,
        SyncDirection::Pull => add_pull_operations(&local_files, &remote_files, &mut operations)?,
    }
    let report = build_report(
        provider_id,
        &direction,
        &mirror_root,
        false,
        operations,
        file_fingerprints,
        SyncReportExtras {
            sync_report_path: None,
            conflict_artifacts: Vec::new(),
        },
    );
    on_progress(ObjectStorageSyncProgressEvent::Finished {
        result: Box::new(report.clone()),
    });
    Ok(report)
}

/// Applies a previewed object-storage sync while reporting progress and honoring cancellation.
pub fn apply_object_storage_sync_with_progress<F>(
    vault_path: &Path,
    mirror_path: &Path,
    provider_id: &str,
    direction: &str,
    expected_preview_signature: &str,
    cancelled: &AtomicBool,
    on_progress: &F,
) -> Result<ObjectStorageSyncReport, String>
where
    F: Fn(ObjectStorageSyncProgressEvent) + ?Sized,
{
    if expected_preview_signature.trim().is_empty() {
        return Err("Run object-storage preview before applying sync".to_string());
    }
    let mut report = super::object_storage_sync::preview_object_storage_sync(
        vault_path,
        mirror_path,
        provider_id,
        direction,
    )?;
    if report.preview_signature != expected_preview_signature {
        return Err(
            "Object-storage preview changed; run preview again before applying sync".to_string(),
        );
    }
    if report.conflicts > 0 {
        return Err("Resolve object-storage conflicts before applying sync".to_string());
    }

    let vault_root = canonical_dir(vault_path, "Vault")?;
    let mirror_root = resolve_mirror_root(mirror_path)?;
    fs::create_dir_all(&mirror_root)
        .map_err(|e| format!("Failed to create object-storage mirror: {e}"))?;
    let total_files = report.operations.len();
    on_progress(ObjectStorageSyncProgressEvent::Started { total_files });
    check_cancelled(cancelled, on_progress)?;

    let mut conflict_artifacts = Vec::new();
    for (index, operation) in report.operations.iter().enumerate() {
        check_cancelled(cancelled, on_progress)?;
        apply_sync_operation(
            &vault_root,
            &mirror_root,
            &report,
            operation,
            &mut conflict_artifacts,
        )?;
        on_progress(ObjectStorageSyncProgressEvent::Progress {
            processed_files: index + 1,
            total_files,
            current_path: operation.path.clone(),
        });
    }
    check_cancelled(cancelled, on_progress)?;

    let report_path = write_sync_report(&vault_root, &report, &conflict_artifacts)?;
    report.applied = true;
    report.sync_report_path = Some(path_to_string(&report_path));
    report.conflict_artifacts = conflict_artifacts;
    on_progress(ObjectStorageSyncProgressEvent::Finished {
        result: Box::new(report.clone()),
    });
    Ok(report)
}

fn collect_sync_files_with_progress<F>(
    root: &Path,
    locality_root: &Path,
    role: &str,
    context: &mut SyncCollectionContext<'_, F>,
) -> Result<BTreeMap<String, PathBuf>, String>
where
    F: Fn(ObjectStorageSyncProgressEvent) + ?Sized,
{
    let mut files = BTreeMap::new();
    if !root.exists() {
        return Ok(files);
    }
    let local_only_attachments = local_only_referenced_attachments(locality_root)?;
    for entry in WalkDir::new(root)
        .follow_links(false)
        .into_iter()
        .filter_entry(should_enter)
    {
        let entry = entry.map_err(|e| format!("Failed to inspect sync folder: {e}"))?;
        if !entry.file_type().is_file() {
            continue;
        }
        check_cancelled(context.cancelled, context.on_progress)?;
        let relative = relative_path(root, entry.path())?;
        if should_skip_file(&entry)
            || has_skipped_component(Path::new(&relative))
            || local_only_attachments.contains(&relative)
            || is_local_only_export_file(locality_root, entry.path())
            || is_local_only_relative_path(Path::new(&relative))
        {
            context.operations.push(ObjectStorageSyncOperation {
                kind: ObjectStorageSyncOperationKind::Exclude,
                path: relative.clone(),
                reason: "Protected by local-only policy".to_string(),
            });
        } else {
            context
                .file_fingerprints
                .push(file_fingerprint(role, &relative, entry.path())?);
            files.insert(relative.clone(), entry.path().to_path_buf());
        }
        context.counter.processed += 1;
        (context.on_progress)(ObjectStorageSyncProgressEvent::Progress {
            processed_files: context.counter.processed,
            total_files: context.counter.total,
            current_path: format!("{role}:{relative}"),
        });
    }
    Ok(files)
}

fn count_sync_candidates(root: &Path) -> Result<usize, String> {
    if !root.exists() {
        return Ok(0);
    }
    WalkDir::new(root)
        .follow_links(false)
        .into_iter()
        .filter_entry(should_enter)
        .try_fold(0usize, |count, entry| {
            let entry = entry.map_err(|e| format!("Failed to inspect sync folder: {e}"))?;
            Ok(count + usize::from(entry.file_type().is_file()))
        })
}

fn apply_sync_operation(
    vault_root: &Path,
    mirror_root: &Path,
    report: &ObjectStorageSyncReport,
    operation: &ObjectStorageSyncOperation,
    conflict_artifacts: &mut Vec<String>,
) -> Result<(), String> {
    match operation.kind {
        ObjectStorageSyncOperationKind::Upload => {
            copy_relative_file(vault_root, mirror_root, &operation.path)
        }
        ObjectStorageSyncOperationKind::Download => {
            copy_relative_file(mirror_root, vault_root, &operation.path)
        }
        ObjectStorageSyncOperationKind::DeleteRemote => {
            remove_relative_file(mirror_root, &operation.path)
        }
        ObjectStorageSyncOperationKind::Conflict => {
            let artifact =
                write_conflict_artifact(vault_root, mirror_root, report, &operation.path)?;
            conflict_artifacts.push(path_to_string(&artifact));
            Ok(())
        }
        ObjectStorageSyncOperationKind::Exclude => Ok(()),
    }
}

fn check_cancelled<F>(cancelled: &AtomicBool, on_progress: &F) -> Result<(), String>
where
    F: Fn(ObjectStorageSyncProgressEvent) + ?Sized,
{
    if !cancelled.load(Ordering::SeqCst) {
        return Ok(());
    }
    on_progress(ObjectStorageSyncProgressEvent::Cancelled);
    Err("Storage sync cancelled".to_string())
}
