use crate::vault::{self, ObjectStorageSyncProgressEvent, ObjectStorageSyncReport};
use serde::Serialize;
use std::path::PathBuf;
use tauri::ipc::Channel;

use super::boundary::with_boundary;
use super::portability_progress::{
    operation_id_error, register_portability_operation, unregister_portability_operation,
};

#[derive(Debug, Clone, Serialize, PartialEq, Eq)]
pub struct ObjectStorageHealthCheck {
    pub provider_id: String,
    pub mirror_path: String,
    pub available: bool,
    pub message: String,
}

/// Validates the planned object-storage adapter target without moving files.
#[tauri::command]
pub fn storage_health_check(
    vault_path: PathBuf,
    mirror_path: PathBuf,
    provider_id: String,
) -> Result<ObjectStorageHealthCheck, String> {
    let raw_vault_path = vault_path.to_string_lossy();
    with_boundary(Some(raw_vault_path.as_ref()), |boundary| {
        let report = vault::preview_object_storage_sync(
            boundary.requested_root(),
            mirror_path.as_path(),
            provider_id.as_str(),
            "push",
        )?;
        Ok(ObjectStorageHealthCheck {
            provider_id: report.provider_id,
            mirror_path: report.mirror_path,
            available: true,
            message: "Object-storage adapter target is reachable as a local mirror.".to_string(),
        })
    })
}

/// Checks S3 reachability through read-only provider APIs without moving vault files.
#[tauri::command]
pub async fn storage_s3_live_preflight(
    bucket: Option<String>,
    region: Option<String>,
    prefix: Option<String>,
) -> Result<vault::S3LivePreflightReport, String> {
    vault::s3_live_preflight(vault::S3LivePreflightInput {
        bucket,
        region,
        prefix,
        allow_env_fallback: Some(false),
    })
    .await
}

/// Checks Azure Blob reachability through read-only local Azure CLI commands.
#[tauri::command]
pub async fn storage_azure_live_preflight(
    account: Option<String>,
    container: Option<String>,
    prefix: Option<String>,
) -> Result<vault::AzureLivePreflightReport, String> {
    vault::azure_live_preflight(vault::AzureLivePreflightInput {
        account,
        container,
        prefix,
        allow_env_fallback: Some(false),
    })
    .await
}

/// Previews local working-copy changes that would be pushed to object storage.
#[tauri::command]
pub fn storage_push_preview(
    vault_path: PathBuf,
    mirror_path: PathBuf,
    provider_id: String,
) -> Result<ObjectStorageSyncReport, String> {
    preview_sync(vault_path, mirror_path, provider_id, "push")
}

/// Previews local working-copy changes with progress and cancellation.
#[tauri::command]
pub async fn storage_push_preview_with_progress(
    vault_path: PathBuf,
    mirror_path: PathBuf,
    provider_id: String,
    operation_id: String,
    on_event: Channel<ObjectStorageSyncProgressEvent>,
) -> Result<(), String> {
    storage_sync_with_progress(
        vault_path,
        mirror_path,
        provider_id,
        "push".to_string(),
        None,
        operation_id,
        on_event,
    )
    .await
}

/// Previews object-storage mirror changes that would be pulled locally with progress.
#[tauri::command]
pub async fn storage_pull_preview_with_progress(
    vault_path: PathBuf,
    mirror_path: PathBuf,
    provider_id: String,
    operation_id: String,
    on_event: Channel<ObjectStorageSyncProgressEvent>,
) -> Result<(), String> {
    storage_sync_with_progress(
        vault_path,
        mirror_path,
        provider_id,
        "pull".to_string(),
        None,
        operation_id,
        on_event,
    )
    .await
}

/// Previews object-storage mirror changes that would be pulled locally.
#[tauri::command]
pub fn storage_pull_preview(
    vault_path: PathBuf,
    mirror_path: PathBuf,
    provider_id: String,
) -> Result<ObjectStorageSyncReport, String> {
    preview_sync(vault_path, mirror_path, provider_id, "pull")
}

/// Applies a previewable object-storage sync against the local mirror.
#[tauri::command]
pub fn storage_sync_apply(
    vault_path: PathBuf,
    mirror_path: PathBuf,
    provider_id: String,
    direction: String,
    preview_signature: String,
) -> Result<ObjectStorageSyncReport, String> {
    let raw_vault_path = vault_path.to_string_lossy();
    with_boundary(Some(raw_vault_path.as_ref()), |boundary| {
        vault::apply_object_storage_sync(
            boundary.requested_root(),
            mirror_path.as_path(),
            provider_id.as_str(),
            direction.as_str(),
            preview_signature.as_str(),
        )
    })
}

/// Applies a previewable object-storage sync with progress and cancellation.
#[tauri::command]
pub async fn storage_sync_apply_with_progress(
    vault_path: PathBuf,
    mirror_path: PathBuf,
    provider_id: String,
    direction: String,
    preview_signature: String,
    operation_id: String,
    on_event: Channel<ObjectStorageSyncProgressEvent>,
) -> Result<(), String> {
    storage_sync_with_progress(
        vault_path,
        mirror_path,
        provider_id,
        direction,
        Some(preview_signature),
        operation_id,
        on_event,
    )
    .await
}

fn preview_sync(
    vault_path: PathBuf,
    mirror_path: PathBuf,
    provider_id: String,
    direction: &str,
) -> Result<ObjectStorageSyncReport, String> {
    let raw_vault_path = vault_path.to_string_lossy();
    with_boundary(Some(raw_vault_path.as_ref()), |boundary| {
        vault::preview_object_storage_sync(
            boundary.requested_root(),
            mirror_path.as_path(),
            provider_id.as_str(),
            direction,
        )
    })
}

async fn storage_sync_with_progress(
    vault_path: PathBuf,
    mirror_path: PathBuf,
    provider_id: String,
    direction: String,
    preview_signature: Option<String>,
    operation_id: String,
    on_event: Channel<ObjectStorageSyncProgressEvent>,
) -> Result<(), String> {
    if let Some(error) = operation_id_error(&operation_id) {
        return Err(error);
    }

    let cancellation = register_portability_operation(&operation_id)?;
    let cleanup_operation_id = operation_id.clone();
    let raw_vault_path = vault_path.to_string_lossy().into_owned();
    let task_result = tauri::async_runtime::spawn_blocking(move || {
        with_boundary(Some(raw_vault_path.as_str()), |boundary| {
            let send_event = |event| {
                let _ = on_event.send(event);
            };
            match preview_signature {
                Some(signature) => vault::apply_object_storage_sync_with_progress(
                    boundary.requested_root(),
                    mirror_path.as_path(),
                    provider_id.as_str(),
                    direction.as_str(),
                    signature.as_str(),
                    cancellation.as_ref(),
                    &send_event,
                ),
                None => vault::preview_object_storage_sync_with_progress(
                    boundary.requested_root(),
                    mirror_path.as_path(),
                    provider_id.as_str(),
                    direction.as_str(),
                    cancellation.as_ref(),
                    &send_event,
                ),
            }
        })
    })
    .await;

    unregister_portability_operation(&cleanup_operation_id);
    let result = task_result.map_err(|e| format!("Object-storage sync task failed: {e}"))?;
    result.map(|_| ())
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::vault::ObjectStorageSyncOperationKind;
    use tempfile::TempDir;

    #[test]
    fn command_preview_uses_active_vault_boundary() {
        let vault = TempDir::new().unwrap();
        let mirror = TempDir::new().unwrap();
        std::fs::write(vault.path().join("note.md"), "# Note\n").unwrap();

        let report = storage_push_preview(
            vault.path().to_path_buf(),
            mirror.path().to_path_buf(),
            "s3".to_string(),
        )
        .unwrap();

        assert_eq!(report.provider_id, "s3");
        assert_eq!(report.files_to_upload, 1);
        assert_eq!(
            report.operations[0].kind,
            ObjectStorageSyncOperationKind::Upload
        );
    }

    #[test]
    fn command_apply_writes_sync_report_locally() {
        let vault = TempDir::new().unwrap();
        let mirror = TempDir::new().unwrap();
        std::fs::write(vault.path().join("note.md"), "# Note\n").unwrap();

        let preview = storage_push_preview(
            vault.path().to_path_buf(),
            mirror.path().to_path_buf(),
            "azure-blob".to_string(),
        )
        .unwrap();
        let report = storage_sync_apply(
            vault.path().to_path_buf(),
            mirror.path().to_path_buf(),
            "azure-blob".to_string(),
            "push".to_string(),
            preview.preview_signature,
        )
        .unwrap();

        assert!(report.applied);
        assert!(mirror.path().join("note.md").exists());
        assert!(report.sync_report_path.is_some());
    }
}
