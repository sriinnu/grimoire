use std::collections::{BTreeMap, BTreeSet};
use std::path::{Path, PathBuf};

use super::object_storage_azure_target::{target_label, ResolvedAzureProviderTarget};
use super::object_storage_s3_plan::{is_protected_relative_path, remote_fingerprint};
use super::object_storage_signature::{build_preview_signature_for_target, file_content_sha256};
use super::object_storage_sync::SyncDirection;
use super::object_storage_sync_report::{
    count_kind, operation, ObjectStorageSyncOperation, ObjectStorageSyncOperationKind,
    ObjectStorageSyncReport, REDACTED_PROVIDER_TARGET,
};

#[derive(Debug, Clone, PartialEq, Eq)]
pub(super) struct AzureRemoteBlob {
    pub(super) name: String,
    pub(super) size: i64,
    pub(super) content_sha256: Option<String>,
}

pub(super) fn add_azure_operations(
    direction: &SyncDirection,
    local_files: &BTreeMap<String, PathBuf>,
    remote_files: &BTreeMap<String, AzureRemoteBlob>,
    operations: &mut Vec<ObjectStorageSyncOperation>,
) -> Result<(), String> {
    let excluded = excluded_paths(operations);
    match direction {
        SyncDirection::Push => {
            add_push_operations(local_files, remote_files, operations, &excluded)
        }
        SyncDirection::Pull => {
            add_pull_operations(local_files, remote_files, operations, &excluded)
        }
    }
}

pub(super) fn build_azure_report(
    target: &ResolvedAzureProviderTarget,
    direction: &SyncDirection,
    applied: bool,
    operations: Vec<ObjectStorageSyncOperation>,
    file_fingerprints: Vec<String>,
    sync_report_path: Option<String>,
) -> ObjectStorageSyncReport {
    let direction = direction_label(direction).to_string();
    let target_label = target_label(target);
    let preview_signature = build_preview_signature_for_target(
        "azure-blob",
        &direction,
        &target_label,
        &operations,
        &file_fingerprints,
    );
    ObjectStorageSyncReport {
        provider_id: "azure-blob".to_string(),
        adapter_phase: "provider-sdk-adapter".to_string(),
        prototype_mode: "azure-live-provider".to_string(),
        direction,
        mirror_path: REDACTED_PROVIDER_TARGET.to_string(),
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

pub(super) fn direction_label(direction: &SyncDirection) -> &'static str {
    match direction {
        SyncDirection::Push => "push",
        SyncDirection::Pull => "pull",
    }
}

pub(super) fn azure_remote_fingerprint_with_hash(
    relative: &str,
    size: i64,
    etag: &str,
    content_sha256: Option<&str>,
) -> u64 {
    remote_fingerprint(relative, size, etag, content_sha256)
}

pub(super) fn protected_azure_blob_path(relative: &str) -> bool {
    is_protected_relative_path(relative)
}

fn add_push_operations(
    local_files: &BTreeMap<String, PathBuf>,
    remote_files: &BTreeMap<String, AzureRemoteBlob>,
    operations: &mut Vec<ObjectStorageSyncOperation>,
    excluded: &BTreeSet<String>,
) -> Result<(), String> {
    for (path, local_file) in local_files {
        if excluded.contains(path) {
            continue;
        }
        match remote_files.get(path) {
            Some(remote) if !local_matches_remote(local_file, remote)? => {
                operations.push(conflict_operation(path))
            }
            None => operations.push(operation(
                ObjectStorageSyncOperationKind::Upload,
                path,
                "Missing from Azure Blob provider target",
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

fn add_pull_operations(
    local_files: &BTreeMap<String, PathBuf>,
    remote_files: &BTreeMap<String, AzureRemoteBlob>,
    operations: &mut Vec<ObjectStorageSyncOperation>,
    excluded: &BTreeSet<String>,
) -> Result<(), String> {
    for (path, remote) in remote_files {
        if excluded.contains(path) {
            continue;
        }
        match local_files.get(path) {
            Some(local_file) if !local_matches_remote(local_file, remote)? => {
                operations.push(conflict_operation(path))
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
        "Local and Azure Blob provider content differ",
    )
}

fn local_matches_remote(path: &Path, remote: &AzureRemoteBlob) -> Result<bool, String> {
    let Some(remote_hash) = remote.content_sha256.as_deref() else {
        return Ok(false);
    };
    let local_hash = file_content_sha256(path)
        .map_err(|_| "Azure provider preview could not hash local file content.".to_string())?;
    Ok(local_hash == remote_hash)
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;

    #[test]
    fn redacts_provider_report_target_without_weakening_signature_gate() {
        let target = ResolvedAzureProviderTarget {
            account: "acct".to_string(),
            container: "vaults".to_string(),
            prefix: "notes".to_string(),
        };
        let report = build_azure_report(
            &target,
            &SyncDirection::Push,
            false,
            vec![operation(
                ObjectStorageSyncOperationKind::Upload,
                "note.md",
                "Missing from Azure Blob provider target",
            )],
            Vec::new(),
            None,
        );

        assert_eq!(report.adapter_phase, "provider-sdk-adapter");
        assert_eq!(report.prototype_mode, "azure-live-provider");
        assert_eq!(report.mirror_path, REDACTED_PROVIDER_TARGET);
        assert!(!report.mirror_path.contains("acct"));
        assert!(!report.mirror_path.contains("vaults"));
        assert!(!report.mirror_path.contains("notes"));
        assert_eq!(report.files_to_upload, 1);

        let other_target = ResolvedAzureProviderTarget {
            account: "other-acct".to_string(),
            container: "vaults".to_string(),
            prefix: "notes".to_string(),
        };
        let other_report = build_azure_report(
            &other_target,
            &SyncDirection::Push,
            false,
            report.operations.clone(),
            Vec::new(),
            None,
        );
        assert_eq!(other_report.mirror_path, REDACTED_PROVIDER_TARGET);
        assert_ne!(report.preview_signature, other_report.preview_signature);
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
            AzureRemoteBlob {
                name: "vault/note.md".to_string(),
                size: 5,
                content_sha256: None,
            },
        );
        let mut operations = Vec::new();

        add_azure_operations(
            &SyncDirection::Pull,
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
            AzureRemoteBlob {
                name: "vault/note.md".to_string(),
                size: 99,
                content_sha256: Some(hash),
            },
        );
        let mut operations = Vec::new();

        add_azure_operations(
            &SyncDirection::Pull,
            &local_files,
            &remote_files,
            &mut operations,
        )
        .unwrap();

        assert!(operations.is_empty());
    }
}
