use std::collections::{BTreeMap, BTreeSet};
use std::path::{Path, PathBuf};

use super::locality::is_local_only_relative_path;
use super::object_storage_s3_target::{target_label, ResolvedS3ProviderTarget};
use super::object_storage_signature::{build_preview_signature_for_target, file_content_sha256};
use super::object_storage_sync::{has_skipped_component, is_skipped_name, SyncDirection};
use super::object_storage_sync_report::{
    count_kind, operation, ObjectStorageSyncOperation, ObjectStorageSyncOperationKind,
    ObjectStorageSyncReport,
};

#[derive(Debug, Clone, PartialEq, Eq)]
pub(super) struct S3RemoteObject {
    pub(super) key: String,
    pub(super) size: i64,
    pub(super) content_sha256: Option<String>,
}

pub(super) fn add_s3_operations(
    direction: &SyncDirection,
    local_files: &BTreeMap<String, PathBuf>,
    remote_files: &BTreeMap<String, S3RemoteObject>,
    operations: &mut Vec<ObjectStorageSyncOperation>,
) -> Result<(), String> {
    let excluded = excluded_paths(operations);
    match direction {
        SyncDirection::Push => {
            add_s3_push_operations(local_files, remote_files, operations, &excluded)
        }
        SyncDirection::Pull => {
            add_s3_pull_operations(local_files, remote_files, operations, &excluded)
        }
    }
}

pub(super) fn build_s3_report(
    target: &ResolvedS3ProviderTarget,
    direction: &SyncDirection,
    applied: bool,
    operations: Vec<ObjectStorageSyncOperation>,
    file_fingerprints: Vec<String>,
    sync_report_path: Option<String>,
) -> ObjectStorageSyncReport {
    let direction = direction_label(direction).to_string();
    let target_label = target_label(target);
    let preview_signature = build_preview_signature_for_target(
        "s3",
        &direction,
        &target_label,
        &operations,
        &file_fingerprints,
    );
    ObjectStorageSyncReport {
        provider_id: "s3".to_string(),
        adapter_phase: "provider-sdk-adapter".to_string(),
        prototype_mode: "s3-live-provider".to_string(),
        direction,
        mirror_path: target_label,
        preview_signature,
        applied,
        files_to_upload: count_kind(&operations, ObjectStorageSyncOperationKind::Upload),
        files_to_download: count_kind(&operations, ObjectStorageSyncOperationKind::Download),
        files_to_delete: count_kind(&operations, ObjectStorageSyncOperationKind::DeleteRemote),
        conflicts: count_kind(&operations, ObjectStorageSyncOperationKind::Conflict),
        excluded_files: count_kind(&operations, ObjectStorageSyncOperationKind::Exclude),
        operations,
        sync_report_path,
        conflict_artifacts: Vec::new(),
    }
}

pub(super) fn is_protected_relative_path(path: &str) -> bool {
    let relative = Path::new(path);
    let name = relative
        .file_name()
        .map(|value| value.to_string_lossy().to_ascii_lowercase())
        .unwrap_or_default();
    name.starts_with(".env")
        || is_skipped_name(&name)
        || has_skipped_component(relative)
        || is_local_only_relative_path(relative)
}

pub(super) fn remote_fingerprint(
    relative: &str,
    size: i64,
    etag: &str,
    content_sha256: Option<&str>,
) -> u64 {
    let payload = format!(
        "{relative}\0{size}\0{etag}\0{}",
        content_sha256.unwrap_or("")
    );
    payload.bytes().fold(0xcbf29ce484222325u64, |hash, byte| {
        (hash ^ u64::from(byte)).wrapping_mul(0x100000001b3)
    })
}

pub(super) fn direction_label(direction: &SyncDirection) -> &'static str {
    match direction {
        SyncDirection::Push => "push",
        SyncDirection::Pull => "pull",
    }
}

fn add_s3_push_operations(
    local_files: &BTreeMap<String, PathBuf>,
    remote_files: &BTreeMap<String, S3RemoteObject>,
    operations: &mut Vec<ObjectStorageSyncOperation>,
    excluded: &BTreeSet<String>,
) -> Result<(), String> {
    for (path, local_file) in local_files {
        if excluded.contains(path) {
            continue;
        }
        match remote_files.get(path) {
            Some(remote) if !local_matches_remote(local_file, remote)? => {
                operations.push(conflict_operation(path));
            }
            None => operations.push(operation(
                ObjectStorageSyncOperationKind::Upload,
                path,
                "Missing from S3 provider target",
            )),
            _ => {}
        }
    }
    for path in remote_files.keys() {
        if !local_files.contains_key(path) && !excluded.contains(path) {
            operations.push(operation(
                ObjectStorageSyncOperationKind::DeleteRemote,
                path,
                "Missing from local working copy",
            ));
        }
    }
    Ok(())
}

fn add_s3_pull_operations(
    local_files: &BTreeMap<String, PathBuf>,
    remote_files: &BTreeMap<String, S3RemoteObject>,
    operations: &mut Vec<ObjectStorageSyncOperation>,
    excluded: &BTreeSet<String>,
) -> Result<(), String> {
    for (path, remote) in remote_files {
        if excluded.contains(path) {
            continue;
        }
        match local_files.get(path) {
            Some(local_file) if !local_matches_remote(local_file, remote)? => {
                operations.push(conflict_operation(path));
            }
            None => operations.push(operation(
                ObjectStorageSyncOperationKind::Download,
                path,
                "Missing from local working copy",
            )),
            _ => {}
        }
    }
    Ok(())
}

fn excluded_paths(operations: &[ObjectStorageSyncOperation]) -> BTreeSet<String> {
    operations
        .iter()
        .filter(|operation| operation.kind == ObjectStorageSyncOperationKind::Exclude)
        .map(|operation| operation.path.clone())
        .collect()
}

fn conflict_operation(path: &str) -> ObjectStorageSyncOperation {
    operation(
        ObjectStorageSyncOperationKind::Conflict,
        path,
        "Local and S3 provider content differ",
    )
}

fn local_matches_remote(path: &Path, remote: &S3RemoteObject) -> Result<bool, String> {
    let Some(remote_hash) = remote.content_sha256.as_deref() else {
        return Ok(false);
    };
    let local_hash = file_content_sha256(path)
        .map_err(|_| "S3 provider preview could not hash local file content.".to_string())?;
    Ok(local_hash == remote_hash)
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;

    #[test]
    fn excludes_remote_local_only_paths_from_provider_operations() {
        assert!(is_protected_relative_path(".env.local"));
        assert!(is_protected_relative_path(".grimoire-local/cache.json"));
        assert!(is_protected_relative_path("Journal/dream.md"));
        assert!(!is_protected_relative_path("Projects/public.md"));
    }

    #[test]
    fn builds_provider_report_without_local_mirror_phase() {
        let target = ResolvedS3ProviderTarget {
            bucket: "bucket".to_string(),
            region: None,
            prefix: "vault".to_string(),
        };
        let report = build_s3_report(
            &target,
            &SyncDirection::Push,
            false,
            vec![operation(
                ObjectStorageSyncOperationKind::Upload,
                "note.md",
                "Missing from S3 provider target",
            )],
            Vec::new(),
            None,
        );

        assert_eq!(report.adapter_phase, "provider-sdk-adapter");
        assert_eq!(report.prototype_mode, "s3-live-provider");
        assert_eq!(report.mirror_path, "s3://bucket/vault");
        assert_eq!(report.files_to_upload, 1);
    }

    #[test]
    fn same_size_remote_without_grimoire_hash_is_a_conflict() {
        let temp = tempfile::tempdir().unwrap();
        let local_file = temp.path().join("note.md");
        fs::write(&local_file, "local").unwrap();
        let mut local_files = BTreeMap::new();
        local_files.insert("note.md".to_string(), local_file);
        let mut remote_files = BTreeMap::new();
        remote_files.insert(
            "note.md".to_string(),
            S3RemoteObject {
                key: "vault/note.md".to_string(),
                size: 5,
                content_sha256: None,
            },
        );
        let mut operations = Vec::new();

        add_s3_operations(
            &SyncDirection::Push,
            &local_files,
            &remote_files,
            &mut operations,
        )
        .unwrap();

        assert_eq!(operations[0].kind, ObjectStorageSyncOperationKind::Conflict);
    }

    #[test]
    fn matching_grimoire_hash_skips_provider_conflict() {
        let temp = tempfile::tempdir().unwrap();
        let local_file = temp.path().join("note.md");
        fs::write(&local_file, "local").unwrap();
        let hash = file_content_sha256(&local_file).unwrap();
        let mut local_files = BTreeMap::new();
        local_files.insert("note.md".to_string(), local_file);
        let mut remote_files = BTreeMap::new();
        remote_files.insert(
            "note.md".to_string(),
            S3RemoteObject {
                key: "vault/note.md".to_string(),
                size: 99,
                content_sha256: Some(hash),
            },
        );
        let mut operations = Vec::new();

        add_s3_operations(
            &SyncDirection::Push,
            &local_files,
            &remote_files,
            &mut operations,
        )
        .unwrap();

        assert!(operations.is_empty());
    }
}
