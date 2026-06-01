use serde_json::Value;
use std::collections::BTreeMap;
use std::fs;
use std::path::Path;
use std::time::Duration;

use super::object_storage_azure_cli::{run_az_command, string_args, AzureCommandFailure};
use super::object_storage_azure_plan::{
    azure_remote_fingerprint_with_hash, protected_azure_blob_path, AzureRemoteBlob,
};
use super::object_storage_azure_target::{
    blob_name, prefix_for_list, relative_blob_name, ResolvedAzureProviderTarget,
};
use super::object_storage_signature::file_content_sha256;
use super::object_storage_sync_report::{
    operation, ObjectStorageSyncOperation, ObjectStorageSyncOperationKind,
};

const GRIMOIRE_SHA256_METADATA: &str = "grimoire_sha256";

pub(super) async fn list_azure_remote_files(
    target: &ResolvedAzureProviderTarget,
    operations: &mut Vec<ObjectStorageSyncOperation>,
    file_fingerprints: &mut Vec<String>,
) -> Result<BTreeMap<String, AzureRemoteBlob>, String> {
    let output = run_az_command(azure_blob_list_args(target), Duration::from_secs(20))
        .await
        .map_err(|error| azure_failure_message("list blobs", error))?;
    parse_blob_list(&output.stdout, target, operations, file_fingerprints)
}

pub(super) async fn apply_azure_operation(
    target: &ResolvedAzureProviderTarget,
    vault_root: &Path,
    operation: &ObjectStorageSyncOperation,
) -> Result<(), String> {
    match operation.kind {
        ObjectStorageSyncOperationKind::Upload => {
            upload_azure_file(target, vault_root, &operation.path).await
        }
        ObjectStorageSyncOperationKind::Download => {
            download_azure_file(target, vault_root, &operation.path).await
        }
        ObjectStorageSyncOperationKind::DeleteRemote => {
            delete_azure_blob(target, &operation.path).await
        }
        ObjectStorageSyncOperationKind::Conflict | ObjectStorageSyncOperationKind::Exclude => {
            Ok(())
        }
    }
}

fn parse_blob_list(
    stdout: &str,
    target: &ResolvedAzureProviderTarget,
    operations: &mut Vec<ObjectStorageSyncOperation>,
    file_fingerprints: &mut Vec<String>,
) -> Result<BTreeMap<String, AzureRemoteBlob>, String> {
    let blobs = serde_json::from_str::<Value>(stdout)
        .map_err(|_| "Azure provider preview returned unreadable blob list JSON.".to_string())?;
    let blobs = blobs
        .as_array()
        .ok_or_else(|| "Azure provider preview returned an unexpected blob list.".to_string())?;
    let mut files = BTreeMap::new();
    for blob in blobs {
        let Some(name) = blob.get("name").and_then(Value::as_str) else {
            continue;
        };
        if name.ends_with('/') {
            continue;
        }
        let Some(relative) = relative_blob_name(&target.prefix, name) else {
            continue;
        };
        let size = blob_size(blob);
        let etag = blob_etag(blob);
        if protected_azure_blob_path(&relative) {
            operations.push(operation(
                ObjectStorageSyncOperationKind::Exclude,
                &relative,
                "Protected or unsafe Azure Blob key",
            ));
            continue;
        }
        let content_sha256 = blob_content_sha256(blob);
        file_fingerprints.push(format!(
            "remote:{:016x}",
            azure_remote_fingerprint_with_hash(&relative, size, etag, content_sha256.as_deref())
        ));
        files.insert(
            relative,
            AzureRemoteBlob {
                name: name.to_string(),
                size,
                content_sha256,
            },
        );
    }
    Ok(files)
}

fn azure_blob_list_args(target: &ResolvedAzureProviderTarget) -> Vec<String> {
    let mut args = azure_base_args(target, ["storage", "blob", "list"]);
    args.push("--auth-mode".to_string());
    args.push("login".to_string());
    args.push("--only-show-errors".to_string());
    args.push("--include".to_string());
    args.push("m".to_string());
    args.push("--output".to_string());
    args.push("json".to_string());
    let prefix = prefix_for_list(&target.prefix);
    if !prefix.is_empty() {
        args.push("--prefix".to_string());
        args.push(prefix);
    }
    args
}

async fn upload_azure_file(
    target: &ResolvedAzureProviderTarget,
    vault_root: &Path,
    relative: &str,
) -> Result<(), String> {
    let path = vault_root.join(relative);
    if !path.is_file() {
        return Err("Azure provider upload could not read a local file.".to_string());
    }
    let content_sha256 = file_content_sha256(&path)
        .map_err(|_| "Azure provider upload could not hash a local file.".to_string())?;
    let mut args = azure_blob_name_args(target, "upload", relative);
    args.push("--file".to_string());
    args.push(path.to_string_lossy().into_owned());
    args.push("--metadata".to_string());
    args.push(format!("{GRIMOIRE_SHA256_METADATA}={content_sha256}"));
    args.push("--overwrite".to_string());
    args.push("true".to_string());
    run_az_command(args, Duration::from_secs(30))
        .await
        .map_err(|error| azure_failure_message("upload blob", error))?;
    Ok(())
}

async fn download_azure_file(
    target: &ResolvedAzureProviderTarget,
    vault_root: &Path,
    relative: &str,
) -> Result<(), String> {
    let target_path = vault_root.join(relative);
    if let Some(parent) = target_path.parent() {
        fs::create_dir_all(parent)
            .map_err(|_| "Azure provider download could not create folders.")?;
    }
    let mut args = azure_blob_name_args(target, "download", relative);
    args.push("--file".to_string());
    args.push(target_path.to_string_lossy().into_owned());
    run_az_command(args, Duration::from_secs(30))
        .await
        .map_err(|error| azure_failure_message("download blob", error))?;
    Ok(())
}

async fn delete_azure_blob(
    target: &ResolvedAzureProviderTarget,
    relative: &str,
) -> Result<(), String> {
    run_az_command(
        azure_blob_name_args(target, "delete", relative),
        Duration::from_secs(20),
    )
    .await
    .map_err(|error| azure_failure_message("delete blob", error))?;
    Ok(())
}

fn azure_blob_name_args(
    target: &ResolvedAzureProviderTarget,
    command: &str,
    relative: &str,
) -> Vec<String> {
    let mut args = azure_base_args(target, ["storage", "blob", command]);
    args.push("--name".to_string());
    args.push(blob_name(&target.prefix, relative));
    args.push("--auth-mode".to_string());
    args.push("login".to_string());
    args.push("--only-show-errors".to_string());
    args.push("--output".to_string());
    args.push("none".to_string());
    args
}

fn azure_base_args<const N: usize>(
    target: &ResolvedAzureProviderTarget,
    command: [&str; N],
) -> Vec<String> {
    let mut args = string_args(command);
    args.push("--account-name".to_string());
    args.push(target.account.clone());
    args.push("--container-name".to_string());
    args.push(target.container.clone());
    args
}

fn blob_size(blob: &Value) -> i64 {
    blob.pointer("/properties/contentLength")
        .and_then(Value::as_i64)
        .unwrap_or_default()
}

fn blob_etag(blob: &Value) -> &str {
    blob.pointer("/properties/etag")
        .and_then(Value::as_str)
        .unwrap_or_default()
}

fn blob_content_sha256(blob: &Value) -> Option<String> {
    blob.get("metadata")
        .and_then(|metadata| metadata.get(GRIMOIRE_SHA256_METADATA))
        .and_then(Value::as_str)
        .map(ToString::to_string)
}

fn azure_failure_message(operation: &str, error: AzureCommandFailure) -> String {
    match error {
        AzureCommandFailure::MissingCli => {
            "Azure provider sync requires the local Azure CLI.".to_string()
        }
        AzureCommandFailure::TimedOut => {
            format!("Azure provider sync timed out while trying to {operation}.")
        }
        AzureCommandFailure::Failed(_) => format!("Azure provider sync could not {operation}."),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parses_blob_list_without_exposing_local_paths() {
        let target = ResolvedAzureProviderTarget {
            account: "acct".to_string(),
            container: "vaults".to_string(),
            prefix: "notes".to_string(),
        };
        let mut operations = Vec::new();
        let mut fingerprints = Vec::new();
        let files = parse_blob_list(
            r#"[{"name":"notes/public.md","properties":{"contentLength":7,"etag":"abc"},"metadata":{"grimoire_sha256":"abc123"}},{"name":"notes/Journal/private.md","properties":{"contentLength":4}}]"#,
            &target,
            &mut operations,
            &mut fingerprints,
        )
        .unwrap();

        assert_eq!(files.get("public.md").unwrap().size, 7);
        assert_eq!(
            files.get("public.md").unwrap().content_sha256.as_deref(),
            Some("abc123")
        );
        assert_eq!(operations[0].kind, ObjectStorageSyncOperationKind::Exclude);
        assert_eq!(operations[0].path, "Journal/private.md");
        assert_eq!(fingerprints.len(), 1);
    }
}
