pub use super::object_storage_s3_target::S3ProviderSyncInput;
use std::path::Path;

use super::object_storage_s3_io::{apply_s3_operation, list_s3_remote_files, s3_client};
use super::object_storage_s3_plan::{add_s3_operations, build_s3_report, direction_label};
use super::object_storage_s3_target::ResolvedS3ProviderTarget;
use super::object_storage_sync::{canonical_dir, collect_sync_files, parse_direction};
use super::object_storage_sync_report::{write_sync_report, ObjectStorageSyncReport};

/// Builds a real S3 provider preview using local AWS credentials and no vault writes.
pub async fn preview_s3_provider_sync(
    vault_path: &Path,
    input: S3ProviderSyncInput,
    direction: &str,
) -> Result<ObjectStorageSyncReport, String> {
    let direction = parse_direction(direction)?;
    let vault_root = canonical_dir(vault_path, "Vault")?;
    let target = ResolvedS3ProviderTarget::from_input(input)?;
    let client = s3_client(&target).await;

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
        list_s3_remote_files(&client, &target, &mut operations, &mut file_fingerprints).await?;
    add_s3_operations(&direction, &local_files, &remote_files, &mut operations)?;
    Ok(build_s3_report(
        &target,
        &direction,
        false,
        operations,
        file_fingerprints,
        None,
    ))
}

/// Applies a previously previewed real S3 sync with the same preview signature gate.
pub async fn apply_s3_provider_sync(
    vault_path: &Path,
    input: S3ProviderSyncInput,
    direction: &str,
    expected_preview_signature: &str,
) -> Result<ObjectStorageSyncReport, String> {
    if expected_preview_signature.trim().is_empty() {
        return Err("Run S3 provider preview before applying sync".to_string());
    }
    let mut report = preview_s3_provider_sync(vault_path, input.clone(), direction).await?;
    if report.preview_signature != expected_preview_signature {
        return Err(
            "S3 provider preview changed; run preview again before applying sync".to_string(),
        );
    }
    if report.conflicts > 0 {
        return Err("Resolve S3 provider conflicts before applying sync".to_string());
    }

    let direction = parse_direction(direction)?;
    let vault_root = canonical_dir(vault_path, "Vault")?;
    let target = ResolvedS3ProviderTarget::from_input(input)?;
    let client = s3_client(&target).await;
    for operation in &report.operations {
        apply_s3_operation(&client, &target, &vault_root, operation).await?;
    }
    let report_path = write_sync_report(&vault_root, &report, &[])?;
    report.applied = true;
    report.sync_report_path = Some(report_path.to_string_lossy().into_owned());
    report.direction = direction_label(&direction).to_string();
    Ok(report)
}
