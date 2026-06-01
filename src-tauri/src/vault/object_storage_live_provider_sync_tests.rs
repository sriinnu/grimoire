use std::fs;
use std::path::Path;
use std::process::{Command, Stdio};
use std::time::{Duration, Instant, SystemTime, UNIX_EPOCH};

use aws_sdk_s3::config::Region;
use tempfile::TempDir;

use super::{
    apply_azure_provider_sync, apply_s3_provider_sync, preview_azure_provider_sync,
    preview_s3_provider_sync, AzureProviderSyncInput, ObjectStorageSyncReport, S3ProviderSyncInput,
};

#[tokio::test]
#[ignore = "requires GRIMOIRE_S3_LIVE_WRITE_PROOF=1 plus local AWS credentials and bucket"]
async fn s3_live_provider_sync_preview_apply_and_pull_is_explicitly_gated() {
    if !live_gate_enabled("GRIMOIRE_S3_LIVE_WRITE_PROOF") {
        return;
    }
    let bucket = required_env("GRIMOIRE_S3_BUCKET");
    let region = optional_env("GRIMOIRE_S3_REGION");
    let prefix = proof_prefix("GRIMOIRE_S3_PREFIX", "grimoire-provider-sync-proof");
    let input = S3ProviderSyncInput {
        bucket: Some(bucket.clone()),
        region: region.clone(),
        prefix: Some(prefix.clone()),
        allow_env_fallback: Some(false),
    };
    let client = s3_test_client(region.as_deref()).await;

    let proof = async {
        let source = provider_source_vault();
        let push_preview = preview_s3_provider_sync(source.path(), input.clone(), "push").await?;
        assert_provider_push_preview(&push_preview)?;
        apply_s3_provider_sync(
            source.path(),
            input.clone(),
            "push",
            &push_preview.preview_signature,
        )
        .await?;

        let restored =
            TempDir::new().map_err(|e| format!("Failed to create restore vault: {e}"))?;
        let pull_preview = preview_s3_provider_sync(restored.path(), input.clone(), "pull").await?;
        assert_provider_pull_preview(&pull_preview)?;
        apply_s3_provider_sync(
            restored.path(),
            input.clone(),
            "pull",
            &pull_preview.preview_signature,
        )
        .await?;
        assert_restored_public_only(restored.path())
    }
    .await;

    let _ = client
        .delete_object()
        .bucket(&bucket)
        .key(join_prefix(&prefix, "public.md"))
        .send()
        .await;
    proof.unwrap();
}

#[tokio::test]
#[ignore = "requires GRIMOIRE_AZURE_LIVE_WRITE_PROOF=1 plus az login, account, and container"]
async fn azure_live_provider_sync_preview_apply_and_pull_is_explicitly_gated() {
    if !live_gate_enabled("GRIMOIRE_AZURE_LIVE_WRITE_PROOF") {
        return;
    }
    let account = required_env("GRIMOIRE_AZURE_STORAGE_ACCOUNT");
    let container = required_env("GRIMOIRE_AZURE_CONTAINER");
    let prefix = proof_prefix("GRIMOIRE_AZURE_PREFIX", "grimoire-provider-sync-proof");
    let input = AzureProviderSyncInput {
        account: Some(account.clone()),
        container: Some(container.clone()),
        prefix: Some(prefix.clone()),
        allow_env_fallback: Some(false),
    };

    let proof = async {
        let source = provider_source_vault();
        let push_preview =
            preview_azure_provider_sync(source.path(), input.clone(), "push").await?;
        assert_provider_push_preview(&push_preview)?;
        apply_azure_provider_sync(
            source.path(),
            input.clone(),
            "push",
            &push_preview.preview_signature,
        )
        .await?;

        let restored =
            TempDir::new().map_err(|e| format!("Failed to create restore vault: {e}"))?;
        let pull_preview =
            preview_azure_provider_sync(restored.path(), input.clone(), "pull").await?;
        assert_provider_pull_preview(&pull_preview)?;
        apply_azure_provider_sync(
            restored.path(),
            input.clone(),
            "pull",
            &pull_preview.preview_signature,
        )
        .await?;
        assert_restored_public_only(restored.path())
    }
    .await;

    let public_blob = join_prefix(&prefix, "public.md");
    let _ = run_az(vec![
        "storage",
        "blob",
        "delete",
        "--account-name",
        &account,
        "--container-name",
        &container,
        "--name",
        &public_blob,
        "--auth-mode",
        "login",
        "--only-show-errors",
        "--output",
        "none",
    ]);
    proof.unwrap();
}

async fn s3_test_client(region: Option<&str>) -> aws_sdk_s3::Client {
    let mut loader = aws_config::defaults(aws_config::BehaviorVersion::latest());
    if let Some(region) = region {
        loader = loader.region(Region::new(region.to_string()));
    }
    aws_sdk_s3::Client::new(&loader.load().await)
}

fn provider_source_vault() -> TempDir {
    let vault = TempDir::new().unwrap();
    fs::write(vault.path().join("public.md"), "# Provider proof\n").unwrap();
    fs::create_dir_all(vault.path().join("Journal")).unwrap();
    fs::write(
        vault.path().join("Journal/private.md"),
        "---\ntype: Journal\n---\n# Keep local\n",
    )
    .unwrap();
    vault
}

fn assert_provider_push_preview(report: &ObjectStorageSyncReport) -> Result<(), String> {
    if report.files_to_upload != 1 || report.excluded_files != 1 || report.conflicts != 0 {
        return Err(format!(
            "Provider push preview expected one public upload, one local-only exclusion, and zero conflicts; got uploads={}, excluded={}, conflicts={}",
            report.files_to_upload, report.excluded_files, report.conflicts
        ));
    }
    Ok(())
}

fn assert_provider_pull_preview(report: &ObjectStorageSyncReport) -> Result<(), String> {
    if report.files_to_download != 1 || report.conflicts != 0 {
        return Err(format!(
            "Provider pull preview expected one public download and zero conflicts; got downloads={}, conflicts={}",
            report.files_to_download, report.conflicts
        ));
    }
    Ok(())
}

fn assert_restored_public_only(vault_root: &Path) -> Result<(), String> {
    let public = fs::read_to_string(vault_root.join("public.md"))
        .map_err(|_| "Provider pull did not restore the public note".to_string())?;
    if public != "# Provider proof\n" {
        return Err("Provider pull restored different public note bytes".to_string());
    }
    if vault_root.join("Journal/private.md").exists() {
        return Err("Provider pull restored a local-only journal note".to_string());
    }
    Ok(())
}

fn run_az(args: Vec<&str>) -> Result<String, String> {
    let mut child = Command::new("az")
        .args(args)
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .spawn()
        .map_err(|_| "Azure live provider proof requires the local az CLI".to_string())?;
    let started = Instant::now();
    loop {
        match child.try_wait() {
            Ok(Some(status)) => {
                let output = child
                    .wait_with_output()
                    .map_err(|_| "Azure live provider proof could not read command output")?;
                if status.success() {
                    return Ok(String::from_utf8_lossy(&output.stdout).to_string());
                }
                return Err("Azure live provider proof command failed".to_string());
            }
            Ok(None) if started.elapsed() >= Duration::from_secs(12) => {
                let _ = child.kill();
                let _ = child.wait();
                return Err("Azure live provider proof timed out".to_string());
            }
            Ok(None) => std::thread::sleep(Duration::from_millis(50)),
            Err(_) => return Err("Azure live provider proof command failed".to_string()),
        }
    }
}

fn proof_prefix(prefix_env: &str, proof_folder: &str) -> String {
    let run_id = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap()
        .as_nanos();
    join_prefix(
        optional_env(prefix_env)
            .unwrap_or_default()
            .trim_matches('/'),
        &format!("{proof_folder}/{run_id}"),
    )
}

fn join_prefix(prefix: &str, leaf: &str) -> String {
    let prefix = prefix.trim_matches('/');
    let leaf = leaf.trim_start_matches('/');
    if prefix.is_empty() {
        leaf.to_string()
    } else {
        format!("{prefix}/{leaf}")
    }
}

fn live_gate_enabled(key: &str) -> bool {
    std::env::var(key).ok().as_deref() == Some("1")
}

fn optional_env(key: &str) -> Option<String> {
    std::env::var(key)
        .ok()
        .map(|value| value.trim().to_string())
        .filter(|value| !value.is_empty())
}

fn required_env(key: &str) -> String {
    optional_env(key).unwrap_or_else(|| panic!("{key} must be set for the live provider proof"))
}
