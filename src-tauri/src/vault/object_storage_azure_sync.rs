pub use super::object_storage_azure_target::AzureProviderSyncInput;
use std::path::Path;

use super::object_storage_azure_io::{apply_azure_operation, list_azure_remote_files};
use super::object_storage_azure_plan::{add_azure_operations, build_azure_report, direction_label};
use super::object_storage_azure_target::ResolvedAzureProviderTarget;
use super::object_storage_sync::{canonical_dir, collect_sync_files, parse_direction};
use super::object_storage_sync_report::{write_sync_report, ObjectStorageSyncReport};

/// Builds a real Azure Blob provider preview through local Azure CLI auth and no vault writes.
pub async fn preview_azure_provider_sync(
    vault_path: &Path,
    input: AzureProviderSyncInput,
    direction: &str,
) -> Result<ObjectStorageSyncReport, String> {
    let direction = parse_direction(direction)?;
    let vault_root = canonical_dir(vault_path, "Vault")?;
    let target = ResolvedAzureProviderTarget::from_input(input)?;

    let mut operations = Vec::new();
    let mut file_fingerprints = Vec::new();
    let local_files = collect_sync_files(
        &vault_root,
        &vault_root,
        "local",
        &mut operations,
        &mut file_fingerprints,
    )?;
    let remote_files =
        list_azure_remote_files(&target, &mut operations, &mut file_fingerprints).await?;
    add_azure_operations(&direction, &local_files, &remote_files, &mut operations)?;
    Ok(build_azure_report(
        &target,
        &direction,
        false,
        operations,
        file_fingerprints,
        None,
    ))
}

/// Applies a previously previewed Azure Blob sync with the same exact-preview gate.
pub async fn apply_azure_provider_sync(
    vault_path: &Path,
    input: AzureProviderSyncInput,
    direction: &str,
    expected_preview_signature: &str,
) -> Result<ObjectStorageSyncReport, String> {
    if expected_preview_signature.trim().is_empty() {
        return Err("Run Azure provider preview before applying sync".to_string());
    }
    let mut report = preview_azure_provider_sync(vault_path, input.clone(), direction).await?;
    if report.preview_signature != expected_preview_signature {
        return Err(
            "Azure provider preview changed; run preview again before applying sync".to_string(),
        );
    }
    if report.conflicts > 0 {
        return Err("Resolve Azure provider conflicts before applying sync".to_string());
    }

    let direction = parse_direction(direction)?;
    let vault_root = canonical_dir(vault_path, "Vault")?;
    let target = ResolvedAzureProviderTarget::from_input(input)?;
    for operation in &report.operations {
        apply_azure_operation(&target, &vault_root, operation).await?;
    }
    let report_path = write_sync_report(&vault_root, &report, &[])?;
    report.applied = true;
    report.sync_report_path = Some(report_path.to_string_lossy().into_owned());
    report.direction = direction_label(&direction).to_string();
    Ok(report)
}
