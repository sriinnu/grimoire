use aws_sdk_s3::config::Region;
use aws_sdk_s3::primitives::ByteStream;
use std::collections::BTreeMap;
use std::fs;
use std::path::Path;

use super::object_storage_s3_plan::{
    is_protected_relative_path, remote_fingerprint, S3RemoteObject,
};
use super::object_storage_s3_target::{
    prefix_for_list, relative_remote_key, remote_key, ResolvedS3ProviderTarget,
};
use super::object_storage_signature::file_content_sha256;
use super::object_storage_sync_report::{
    operation, ObjectStorageSyncOperation, ObjectStorageSyncOperationKind,
};

const GRIMOIRE_SHA256_METADATA: &str = "grimoire-sha256";

pub(super) async fn s3_client(target: &ResolvedS3ProviderTarget) -> aws_sdk_s3::Client {
    let mut loader = aws_config::defaults(aws_config::BehaviorVersion::latest());
    if let Some(region) = target.region.clone() {
        loader = loader.region(Region::new(region));
    }
    aws_sdk_s3::Client::new(&loader.load().await)
}

pub(super) async fn list_s3_remote_files(
    client: &aws_sdk_s3::Client,
    target: &ResolvedS3ProviderTarget,
    operations: &mut Vec<ObjectStorageSyncOperation>,
    file_fingerprints: &mut Vec<String>,
) -> Result<BTreeMap<String, S3RemoteObject>, String> {
    let mut files = BTreeMap::new();
    let mut token = None;
    loop {
        let page = client
            .list_objects_v2()
            .bucket(&target.bucket)
            .prefix(prefix_for_list(&target.prefix))
            .set_continuation_token(token)
            .max_keys(1000)
            .send()
            .await
            .map_err(|_| "S3 provider preview could not list the configured prefix.".to_string())?;
        for object in page.contents() {
            let Some(key) = object.key() else { continue };
            if key.ends_with('/') {
                continue;
            }
            let Some(relative) = relative_remote_key(&target.prefix, key) else {
                continue;
            };
            let size = object.size().unwrap_or_default();
            let etag = object.e_tag().unwrap_or_default();
            if is_protected_relative_path(&relative) {
                operations.push(operation(
                    ObjectStorageSyncOperationKind::Exclude,
                    &relative,
                    "Protected or unsafe S3 object key",
                ));
                continue;
            }
            let content_sha256 = head_s3_content_sha256(client, target, key).await?;
            file_fingerprints.push(format!(
                "remote:{:016x}",
                remote_fingerprint(&relative, size, etag, content_sha256.as_deref())
            ));
            files.insert(
                relative,
                S3RemoteObject {
                    key: key.to_string(),
                    size,
                    content_sha256,
                },
            );
        }
        if page.is_truncated().unwrap_or(false) {
            token = page.next_continuation_token().map(ToString::to_string);
        } else {
            break;
        }
    }
    Ok(files)
}

async fn head_s3_content_sha256(
    client: &aws_sdk_s3::Client,
    target: &ResolvedS3ProviderTarget,
    key: &str,
) -> Result<Option<String>, String> {
    let object = client
        .head_object()
        .bucket(&target.bucket)
        .key(key)
        .send()
        .await
        .map_err(|_| "S3 provider preview could not inspect object metadata.".to_string())?;
    Ok(object
        .metadata()
        .and_then(|metadata| metadata.get(GRIMOIRE_SHA256_METADATA))
        .cloned())
}

pub(super) async fn apply_s3_operation(
    client: &aws_sdk_s3::Client,
    target: &ResolvedS3ProviderTarget,
    vault_root: &Path,
    operation: &ObjectStorageSyncOperation,
) -> Result<(), String> {
    match operation.kind {
        ObjectStorageSyncOperationKind::Upload => {
            upload_s3_file(client, target, vault_root, &operation.path).await
        }
        ObjectStorageSyncOperationKind::Download => {
            download_s3_file(client, target, vault_root, &operation.path).await
        }
        ObjectStorageSyncOperationKind::DeleteRemote => {
            client
                .delete_object()
                .bucket(&target.bucket)
                .key(remote_key(&target.prefix, &operation.path))
                .send()
                .await
                .map_err(|_| "S3 provider delete failed.".to_string())?;
            Ok(())
        }
        ObjectStorageSyncOperationKind::Conflict | ObjectStorageSyncOperationKind::Exclude => {
            Ok(())
        }
    }
}

async fn upload_s3_file(
    client: &aws_sdk_s3::Client,
    target: &ResolvedS3ProviderTarget,
    vault_root: &Path,
    relative: &str,
) -> Result<(), String> {
    let path = vault_root.join(relative);
    let bytes = fs::read(&path).map_err(|_| "S3 provider upload could not read a local file.")?;
    let content_sha256 = file_content_sha256(&path)
        .map_err(|_| "S3 provider upload could not hash a local file.".to_string())?;
    client
        .put_object()
        .bucket(&target.bucket)
        .key(remote_key(&target.prefix, relative))
        .metadata(GRIMOIRE_SHA256_METADATA, content_sha256)
        .body(ByteStream::from(bytes))
        .send()
        .await
        .map_err(|_| "S3 provider upload failed.".to_string())?;
    Ok(())
}

async fn download_s3_file(
    client: &aws_sdk_s3::Client,
    target: &ResolvedS3ProviderTarget,
    vault_root: &Path,
    relative: &str,
) -> Result<(), String> {
    let object = client
        .get_object()
        .bucket(&target.bucket)
        .key(remote_key(&target.prefix, relative))
        .send()
        .await
        .map_err(|_| "S3 provider download failed.".to_string())?;
    let bytes = object
        .body
        .collect()
        .await
        .map_err(|_| "S3 provider download body failed.".to_string())?
        .into_bytes();
    let target_path = vault_root.join(relative);
    if let Some(parent) = target_path.parent() {
        fs::create_dir_all(parent).map_err(|_| "S3 provider download could not create folders.")?;
    }
    fs::write(target_path, bytes).map_err(|_| "S3 provider download could not write file.")?;
    Ok(())
}
