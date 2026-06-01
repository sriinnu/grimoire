use std::fs;
use std::process::{Command, Stdio};
use std::time::{Duration, Instant, SystemTime, UNIX_EPOCH};

use aws_sdk_s3::config::Region;
use aws_sdk_s3::primitives::ByteStream;
use tempfile::TempDir;

#[tokio::test]
#[ignore = "requires GRIMOIRE_S3_LIVE_WRITE_PROOF=1 plus local AWS credentials and bucket"]
async fn s3_live_apply_and_pull_round_trip_is_explicitly_gated() {
    if !live_gate_enabled("GRIMOIRE_S3_LIVE_WRITE_PROOF") {
        return;
    }
    let bucket = required_env("GRIMOIRE_S3_BUCKET");
    let key = object_key(
        "GRIMOIRE_S3_PREFIX",
        "grimoire-live-proof",
        "s3-roundtrip.md",
    );
    let payload = b"# Grimoire S3 live proof\n\nprovider: s3\n";

    let mut loader = aws_config::defaults(aws_config::BehaviorVersion::latest());
    if let Some(region) = optional_env("GRIMOIRE_S3_REGION") {
        loader = loader.region(Region::new(region));
    }
    let config = loader.load().await;
    let client = aws_sdk_s3::Client::new(&config);

    let proof = async {
        client
            .put_object()
            .bucket(&bucket)
            .key(&key)
            .body(ByteStream::from_static(payload))
            .send()
            .await
            .map_err(|_| "S3 live write proof failed".to_string())?;
        let listed = client
            .list_objects_v2()
            .bucket(&bucket)
            .prefix(&key)
            .max_keys(1)
            .send()
            .await
            .map_err(|_| "S3 live list proof failed".to_string())?;
        let saw_key = listed
            .contents()
            .iter()
            .any(|object| object.key() == Some(key.as_str()));
        if !saw_key {
            return Err("S3 live list proof did not find the generated object".to_string());
        }
        let downloaded = client
            .get_object()
            .bucket(&bucket)
            .key(&key)
            .send()
            .await
            .map_err(|_| "S3 live pull proof failed".to_string())?
            .body
            .collect()
            .await
            .map_err(|_| "S3 live pull body read failed".to_string())?
            .into_bytes();
        if downloaded.as_ref() != payload {
            return Err("S3 live pull proof returned different bytes".to_string());
        }
        Ok(())
    }
    .await;

    let _ = client
        .delete_object()
        .bucket(&bucket)
        .key(&key)
        .send()
        .await;
    proof.unwrap();
}

#[test]
#[ignore = "requires GRIMOIRE_AZURE_LIVE_WRITE_PROOF=1 plus az login, account, and container"]
fn azure_live_apply_and_pull_round_trip_is_explicitly_gated() {
    if !live_gate_enabled("GRIMOIRE_AZURE_LIVE_WRITE_PROOF") {
        return;
    }
    let account = required_env("GRIMOIRE_AZURE_STORAGE_ACCOUNT");
    let container = required_env("GRIMOIRE_AZURE_CONTAINER");
    let blob = object_key(
        "GRIMOIRE_AZURE_PREFIX",
        "grimoire-live-proof",
        "azure-roundtrip.md",
    );
    let temp = TempDir::new().unwrap();
    let upload = temp.path().join("upload.md");
    let download = temp.path().join("download.md");
    let payload = "# Grimoire Azure live proof\n\nprovider: azure-blob\n";
    fs::write(&upload, payload).unwrap();

    let proof = (|| -> Result<(), String> {
        run_az([
            "storage",
            "blob",
            "upload",
            "--account-name",
            &account,
            "--container-name",
            &container,
            "--name",
            &blob,
            "--file",
            &upload.to_string_lossy(),
            "--auth-mode",
            "login",
            "--overwrite",
            "true",
            "--only-show-errors",
            "--output",
            "none",
        ])?;
        let list_output = run_az([
            "storage",
            "blob",
            "list",
            "--account-name",
            &account,
            "--container-name",
            &container,
            "--prefix",
            &blob,
            "--auth-mode",
            "login",
            "--num-results",
            "1",
            "--only-show-errors",
            "--output",
            "json",
        ])?;
        if !list_output.contains("\"name\"") {
            return Err("Azure live list proof did not return a generated blob".to_string());
        }
        run_az([
            "storage",
            "blob",
            "download",
            "--account-name",
            &account,
            "--container-name",
            &container,
            "--name",
            &blob,
            "--file",
            &download.to_string_lossy(),
            "--auth-mode",
            "login",
            "--only-show-errors",
            "--output",
            "none",
        ])?;
        if fs::read_to_string(&download).unwrap() != payload {
            return Err("Azure live pull proof returned different bytes".to_string());
        }
        Ok(())
    })();

    let _ = run_az([
        "storage",
        "blob",
        "delete",
        "--account-name",
        &account,
        "--container-name",
        &container,
        "--name",
        &blob,
        "--auth-mode",
        "login",
        "--only-show-errors",
        "--output",
        "none",
    ]);
    proof.unwrap();
}

fn run_az<const N: usize>(args: [&str; N]) -> Result<String, String> {
    let mut child = Command::new("az")
        .args(args)
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .spawn()
        .map_err(|_| "Azure live write proof requires the local az CLI".to_string())?;
    let started = Instant::now();
    loop {
        match child.try_wait() {
            Ok(Some(status)) => {
                let output = child
                    .wait_with_output()
                    .map_err(|_| "Azure live write proof could not read command output")?;
                if status.success() {
                    return Ok(String::from_utf8_lossy(&output.stdout).to_string());
                }
                return Err("Azure live write proof command failed".to_string());
            }
            Ok(None) if started.elapsed() >= Duration::from_secs(12) => {
                let _ = child.kill();
                let _ = child.wait();
                return Err("Azure live write proof timed out".to_string());
            }
            Ok(None) => std::thread::sleep(Duration::from_millis(50)),
            Err(_) => return Err("Azure live write proof command failed".to_string()),
        }
    }
}

fn object_key(prefix_env: &str, proof_folder: &str, leaf: &str) -> String {
    let run_id = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap()
        .as_nanos();
    let prefix = optional_env(prefix_env).unwrap_or_default();
    let prefix = prefix.trim_matches('/');
    if prefix.is_empty() {
        return format!("{proof_folder}/{run_id}/{leaf}");
    }
    format!("{prefix}/{proof_folder}/{run_id}/{leaf}")
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
    optional_env(key).unwrap_or_else(|| panic!("{key} must be set for the live write proof"))
}
