use std::fs;
use std::path::Path;

use sha2::{Digest, Sha256};

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
    build_preview_signature_for_target(
        provider_id,
        direction,
        &mirror_path.display().to_string(),
        operations,
        file_fingerprints,
    )
}

/// Builds an opaque apply token for a provider target label.
pub(crate) fn build_preview_signature_for_target(
    provider_id: &str,
    direction: &str,
    target_label: &str,
    operations: &[ObjectStorageSyncOperation],
    file_fingerprints: &[String],
) -> String {
    let mut lines = vec![
        "object-storage-preview-v1".to_string(),
        format!("provider={provider_id}"),
        format!("direction={direction}"),
        format!("target={target_label}"),
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
    let content_hash = file_content_sha256(path)?;
    let mut payload = Vec::with_capacity(role.len() + relative_path.len() + content_hash.len() + 2);
    payload.extend_from_slice(role.as_bytes());
    payload.push(0);
    payload.extend_from_slice(relative_path.as_bytes());
    payload.push(0);
    payload.extend_from_slice(content_hash.as_bytes());
    Ok(format!("{role}:{:016x}", fnv1a64(&payload)))
}

/// Hashes a local sync candidate for provider-side content comparison.
pub(crate) fn file_content_sha256(path: &Path) -> Result<String, String> {
    let bytes = fs::read(path)
        .map_err(|_| "Object-storage preview could not read a local sync candidate.".to_string())?;
    Ok(hex_sha256(&bytes))
}

fn hex_sha256(bytes: &[u8]) -> String {
    Sha256::digest(bytes)
        .iter()
        .map(|byte| format!("{byte:02x}"))
        .collect()
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
