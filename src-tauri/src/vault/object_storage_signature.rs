use std::fs;
use std::path::Path;

use super::object_storage_sync_report::{
    ObjectStorageSyncOperation, ObjectStorageSyncOperationKind,
};

/// Builds the opaque apply token for an object-storage dry run.
pub(crate) fn build_preview_signature(
    provider_id: &str,
    direction: &str,
    mirror_path: &Path,
    operations: &[ObjectStorageSyncOperation],
    file_fingerprints: &[String],
) -> String {
    let mut lines = vec![
        "object-storage-preview-v1".to_string(),
        format!("provider={provider_id}"),
        format!("direction={direction}"),
        format!("mirror={}", mirror_path.display()),
    ];

    let mut operation_lines = operations
        .iter()
        .map(|operation| {
            format!(
                "op={}:{}:{}",
                operation_kind_label(&operation.kind),
                operation.path,
                operation.reason
            )
        })
        .collect::<Vec<_>>();
    operation_lines.sort();
    lines.extend(operation_lines);

    let mut fingerprints = file_fingerprints.to_vec();
    fingerprints.sort();
    lines.extend(
        fingerprints
            .into_iter()
            .map(|fingerprint| format!("file={fingerprint}")),
    );

    format!("sync-v1-{:016x}", fnv1a64(lines.join("\n").as_bytes()))
}

/// Hashes file content plus its sync role without exposing raw content.
pub(crate) fn file_fingerprint(
    role: &str,
    relative_path: &str,
    path: &Path,
) -> Result<String, String> {
    let bytes = fs::read(path).map_err(|e| format!("Failed to read {}: {e}", path.display()))?;
    let mut payload = Vec::with_capacity(role.len() + relative_path.len() + bytes.len() + 2);
    payload.extend_from_slice(role.as_bytes());
    payload.push(0);
    payload.extend_from_slice(relative_path.as_bytes());
    payload.push(0);
    payload.extend_from_slice(&bytes);
    Ok(format!("{role}:{:016x}", fnv1a64(&payload)))
}

fn operation_kind_label(kind: &ObjectStorageSyncOperationKind) -> &'static str {
    match kind {
        ObjectStorageSyncOperationKind::Upload => "upload",
        ObjectStorageSyncOperationKind::Download => "download",
        ObjectStorageSyncOperationKind::DeleteRemote => "delete_remote",
        ObjectStorageSyncOperationKind::Conflict => "conflict",
        ObjectStorageSyncOperationKind::Exclude => "exclude",
    }
}

fn fnv1a64(bytes: &[u8]) -> u64 {
    let mut hash = 0xcbf29ce484222325u64;
    for byte in bytes {
        hash ^= u64::from(*byte);
        hash = hash.wrapping_mul(0x100000001b3);
    }
    hash
}
