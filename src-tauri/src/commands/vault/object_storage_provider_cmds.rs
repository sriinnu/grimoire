use crate::vault::{self, ObjectStorageSyncReport};
use std::path::PathBuf;

use super::boundary::with_boundary;

/// Previews a real S3 provider push using local AWS credentials and no local mirror.
#[tauri::command]
pub async fn storage_s3_provider_push_preview(
    vault_path: PathBuf,
    bucket: Option<String>,
    region: Option<String>,
    prefix: Option<String>,
) -> Result<ObjectStorageSyncReport, String> {
    preview_s3_provider_sync(vault_path, bucket, region, prefix, "push").await
}

/// Previews a real S3 provider pull using local AWS credentials and no local mirror.
#[tauri::command]
pub async fn storage_s3_provider_pull_preview(
    vault_path: PathBuf,
    bucket: Option<String>,
    region: Option<String>,
    prefix: Option<String>,
) -> Result<ObjectStorageSyncReport, String> {
    preview_s3_provider_sync(vault_path, bucket, region, prefix, "pull").await
}

/// Applies a real S3 provider sync after an exact preview-signature match.
#[tauri::command]
pub async fn storage_s3_provider_sync_apply(
    vault_path: PathBuf,
    bucket: Option<String>,
    region: Option<String>,
    prefix: Option<String>,
    direction: String,
    preview_signature: String,
) -> Result<ObjectStorageSyncReport, String> {
    let vault_root = requested_vault_root(vault_path)?;
    vault::apply_s3_provider_sync(
        vault_root.as_path(),
        vault::S3ProviderSyncInput {
            bucket,
            region,
            prefix,
            allow_env_fallback: Some(false),
        },
        direction.as_str(),
        preview_signature.as_str(),
    )
    .await
}

/// Previews a real Azure Blob provider push through local Azure CLI auth.
#[tauri::command]
pub async fn storage_azure_provider_push_preview(
    vault_path: PathBuf,
    account: Option<String>,
    container: Option<String>,
    prefix: Option<String>,
) -> Result<ObjectStorageSyncReport, String> {
    preview_azure_provider_sync(vault_path, account, container, prefix, "push").await
}

/// Previews a real Azure Blob provider pull through local Azure CLI auth.
#[tauri::command]
pub async fn storage_azure_provider_pull_preview(
    vault_path: PathBuf,
    account: Option<String>,
    container: Option<String>,
    prefix: Option<String>,
) -> Result<ObjectStorageSyncReport, String> {
    preview_azure_provider_sync(vault_path, account, container, prefix, "pull").await
}

/// Applies a real Azure Blob sync after an exact preview-signature match.
#[tauri::command]
pub async fn storage_azure_provider_sync_apply(
    vault_path: PathBuf,
    account: Option<String>,
    container: Option<String>,
    prefix: Option<String>,
    direction: String,
    preview_signature: String,
) -> Result<ObjectStorageSyncReport, String> {
    let vault_root = requested_vault_root(vault_path)?;
    vault::apply_azure_provider_sync(
        vault_root.as_path(),
        vault::AzureProviderSyncInput {
            account,
            container,
            prefix,
            allow_env_fallback: Some(false),
        },
        direction.as_str(),
        preview_signature.as_str(),
    )
    .await
}

async fn preview_s3_provider_sync(
    vault_path: PathBuf,
    bucket: Option<String>,
    region: Option<String>,
    prefix: Option<String>,
    direction: &str,
) -> Result<ObjectStorageSyncReport, String> {
    let vault_root = requested_vault_root(vault_path)?;
    vault::preview_s3_provider_sync(
        vault_root.as_path(),
        vault::S3ProviderSyncInput {
            bucket,
            region,
            prefix,
            allow_env_fallback: Some(false),
        },
        direction,
    )
    .await
}

async fn preview_azure_provider_sync(
    vault_path: PathBuf,
    account: Option<String>,
    container: Option<String>,
    prefix: Option<String>,
    direction: &str,
) -> Result<ObjectStorageSyncReport, String> {
    let vault_root = requested_vault_root(vault_path)?;
    vault::preview_azure_provider_sync(
        vault_root.as_path(),
        vault::AzureProviderSyncInput {
            account,
            container,
            prefix,
            allow_env_fallback: Some(false),
        },
        direction,
    )
    .await
}

fn requested_vault_root(vault_path: PathBuf) -> Result<PathBuf, String> {
    let raw_vault_path = vault_path.to_string_lossy();
    with_boundary(Some(raw_vault_path.as_ref()), |boundary| {
        Ok(boundary.requested_root().to_path_buf())
    })
}
