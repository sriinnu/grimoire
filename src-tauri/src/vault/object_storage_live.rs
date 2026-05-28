use aws_sdk_s3::config::Region;
use chrono::Utc;
use serde::{Deserialize, Serialize};
use std::fmt::Debug;
use std::time::Duration;

#[derive(Debug, Clone, Deserialize, PartialEq, Eq)]
pub struct S3LivePreflightInput {
    pub bucket: Option<String>,
    pub region: Option<String>,
    pub prefix: Option<String>,
    pub allow_env_fallback: Option<bool>,
}

#[derive(Debug, Clone, Serialize, PartialEq, Eq)]
pub struct S3LivePreflightReport {
    pub provider_id: String,
    pub proof_level: String,
    pub configured: bool,
    pub status: String,
    pub bucket_configured: bool,
    pub region_configured: bool,
    pub prefix_configured: bool,
    pub head_bucket_checked: bool,
    pub list_prefix_checked: bool,
    pub message: String,
    pub checked_at: String,
}

/// Runs a redacted, read-only S3 reachability check without moving vault files.
pub async fn s3_live_preflight(
    input: S3LivePreflightInput,
) -> Result<S3LivePreflightReport, String> {
    let request = ResolvedS3LivePreflight::from_input(input);
    if request.bucket.is_none() {
        return Ok(report(ReportParts {
            status: "missing_config",
            configured: false,
            bucket_configured: false,
            region_configured: request.region_configured,
            prefix_configured: request.prefix_configured,
            head_bucket_checked: false,
            list_prefix_checked: false,
            message: "Set an S3 bucket before running the live read-only preflight.",
        }));
    }

    let mut loader = aws_config::defaults(aws_config::BehaviorVersion::latest());
    if let Some(region) = request.region.clone() {
        loader = loader.region(Region::new(region));
    }
    let config = loader.load().await;
    let client = aws_sdk_s3::Client::new(&config);
    let bucket = request.bucket.expect("bucket checked above");

    let head_bucket = tokio::time::timeout(
        Duration::from_secs(8),
        client.head_bucket().bucket(&bucket).send(),
    )
    .await;
    if let Err(error) = timed_result(head_bucket) {
        let category = classify_s3_error(&error);
        return Ok(report_for_category(
            category,
            request.region_configured,
            request.prefix_configured,
            true,
            false,
        ));
    }

    let list_prefix = tokio::time::timeout(
        Duration::from_secs(8),
        client
            .list_objects_v2()
            .bucket(&bucket)
            .set_prefix(request.prefix)
            .max_keys(1)
            .send(),
    )
    .await;
    if let Err(error) = timed_result(list_prefix) {
        let category = classify_s3_error(&error);
        return Ok(report_for_category(
            category,
            request.region_configured,
            request.prefix_configured,
            true,
            true,
        ));
    }

    Ok(report(ReportParts {
        status: "reachable",
        configured: true,
        bucket_configured: true,
        region_configured: request.region_configured,
        prefix_configured: request.prefix_configured,
        head_bucket_checked: true,
        list_prefix_checked: true,
        message:
            "S3 bucket and prefix are reachable through read-only HeadBucket/ListObjectsV2 checks.",
    }))
}

#[derive(Debug, Clone, PartialEq, Eq)]
struct ResolvedS3LivePreflight {
    bucket: Option<String>,
    region: Option<String>,
    prefix: Option<String>,
    region_configured: bool,
    prefix_configured: bool,
}

impl ResolvedS3LivePreflight {
    fn from_input(input: S3LivePreflightInput) -> Self {
        let allow_env_fallback = input.allow_env_fallback.unwrap_or(true);
        let bucket = clean_or_env(input.bucket, "GRIMOIRE_S3_BUCKET", allow_env_fallback);
        let region = clean_or_env(input.region, "GRIMOIRE_S3_REGION", allow_env_fallback);
        let prefix = clean_or_env(input.prefix, "GRIMOIRE_S3_PREFIX", allow_env_fallback);
        Self {
            bucket,
            region_configured: region.is_some(),
            prefix_configured: prefix.is_some(),
            region,
            prefix,
        }
    }
}

fn clean_or_env(value: Option<String>, env_key: &str, allow_env_fallback: bool) -> Option<String> {
    match value {
        Some(value) => clean(Some(value)),
        None if allow_env_fallback => clean(std::env::var(env_key).ok()),
        None => None,
    }
}

fn clean(value: Option<String>) -> Option<String> {
    value
        .map(|v| v.trim().to_string())
        .filter(|v| !v.is_empty())
}

fn report_for_category(
    status: &'static str,
    region_configured: bool,
    prefix_configured: bool,
    head_bucket_checked: bool,
    list_prefix_checked: bool,
) -> S3LivePreflightReport {
    let message = match status {
        "missing_credentials" => {
            "AWS credentials were not available through the standard credential chain."
        }
        "auth_denied" => "AWS credentials were found, but S3 denied the read-only preflight.",
        "bucket_missing" => "S3 did not find the configured bucket.",
        "network" => "S3 preflight could not reach AWS over the network.",
        "throttled" => "S3 throttled the read-only preflight.",
        _ => "S3 preflight failed before Grimoire could prove reachability.",
    };
    report(ReportParts {
        status,
        configured: true,
        bucket_configured: true,
        region_configured,
        prefix_configured,
        head_bucket_checked,
        list_prefix_checked,
        message,
    })
}

struct ReportParts<'a> {
    status: &'a str,
    configured: bool,
    bucket_configured: bool,
    region_configured: bool,
    prefix_configured: bool,
    head_bucket_checked: bool,
    list_prefix_checked: bool,
    message: &'a str,
}

fn report(parts: ReportParts<'_>) -> S3LivePreflightReport {
    S3LivePreflightReport {
        provider_id: "s3".to_string(),
        proof_level: "live-read-only-preflight".to_string(),
        configured: parts.configured,
        status: parts.status.to_string(),
        bucket_configured: parts.bucket_configured,
        region_configured: parts.region_configured,
        prefix_configured: parts.prefix_configured,
        head_bucket_checked: parts.head_bucket_checked,
        list_prefix_checked: parts.list_prefix_checked,
        message: parts.message.to_string(),
        checked_at: Utc::now().to_rfc3339(),
    }
}

fn classify_s3_error(message: &str) -> &'static str {
    let lower = message.to_ascii_lowercase();
    if lower.contains("nocredential")
        || lower.contains("credentials")
        || lower.contains("credential")
    {
        return "missing_credentials";
    }
    if lower.contains("accessdenied") || lower.contains("forbidden") || lower.contains("403") {
        return "auth_denied";
    }
    if lower.contains("nosuchbucket") || lower.contains("notfound") || lower.contains("404") {
        return "bucket_missing";
    }
    if lower.contains("slowdown") || lower.contains("throttl") || lower.contains("toomanyrequests")
    {
        return "throttled";
    }
    if lower.contains("dispatchfailure")
        || lower.contains("timeout")
        || lower.contains("dns")
        || lower.contains("connection")
    {
        return "network";
    }
    "failed"
}

fn timed_result<T, E: Debug>(
    result: Result<Result<T, E>, tokio::time::error::Elapsed>,
) -> Result<(), String> {
    result
        .map_err(|_| "timeout".to_string())?
        .map(|_| ())
        .map_err(|error| format!("{error:?}"))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn missing_bucket_returns_redacted_missing_config() {
        let resolved = ResolvedS3LivePreflight::from_input(S3LivePreflightInput {
            bucket: Some("  ".to_string()),
            region: Some("us-east-1".to_string()),
            prefix: Some("notes/".to_string()),
            allow_env_fallback: None,
        });

        assert_eq!(resolved.bucket, None);
        assert!(resolved.region_configured);
        assert!(resolved.prefix_configured);
    }

    #[test]
    fn categorizes_provider_errors_without_leaking_raw_messages() {
        assert_eq!(
            classify_s3_error("NoCredentialsError"),
            "missing_credentials"
        );
        assert_eq!(
            classify_s3_error("AccessDenied: forbidden 403"),
            "auth_denied"
        );
        assert_eq!(classify_s3_error("NoSuchBucket: 404"), "bucket_missing");
        assert_eq!(classify_s3_error("dispatch failure: dns"), "network");
        assert_eq!(classify_s3_error("SlowDown throttling"), "throttled");
    }

    #[tokio::test]
    #[ignore = "requires real AWS credentials and GRIMOIRE_S3_BUCKET"]
    async fn s3_live_preflight_ignored_live_probe() {
        if std::env::var("GRIMOIRE_S3_LIVE_PROOF").ok().as_deref() != Some("1") {
            return;
        }
        let result = s3_live_preflight(S3LivePreflightInput {
            bucket: None,
            region: None,
            prefix: None,
            allow_env_fallback: None,
        })
        .await
        .unwrap();
        assert!(!result.message.contains('/'));
        assert_eq!(result.provider_id, "s3");
    }
}
