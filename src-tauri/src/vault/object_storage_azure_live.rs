use chrono::Utc;
use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::time::Duration;

use super::object_storage_azure_cli::{
    run_az_command, string_args, AzureCommandFailure, AzureCommandOutput,
};

#[derive(Debug, Clone, Deserialize, PartialEq, Eq)]
pub struct AzureLivePreflightInput {
    pub account: Option<String>,
    pub container: Option<String>,
    pub prefix: Option<String>,
    pub allow_env_fallback: Option<bool>,
}

#[derive(Debug, Clone, Serialize, PartialEq, Eq)]
pub struct AzureLivePreflightReport {
    pub provider_id: String,
    pub proof_level: String,
    pub configured: bool,
    pub status: String,
    pub account_configured: bool,
    pub container_configured: bool,
    pub prefix_configured: bool,
    pub container_checked: bool,
    pub list_prefix_checked: bool,
    pub message: String,
    pub checked_at: String,
}

/// Runs a redacted Azure Blob reachability check through the local Azure CLI login.
pub async fn azure_live_preflight(
    input: AzureLivePreflightInput,
) -> Result<AzureLivePreflightReport, String> {
    let request = ResolvedAzureLivePreflight::from_input(input);
    if request.account.is_none() || request.container.is_none() {
        return Ok(report(ReportParts {
            status: "missing_config",
            configured: false,
            account_configured: request.account.is_some(),
            container_configured: request.container.is_some(),
            prefix_configured: request.prefix.is_some(),
            container_checked: false,
            list_prefix_checked: false,
            message: "Set an Azure storage account and container before running the live read-only preflight.",
        }));
    }

    let account = request.account.expect("account checked above");
    let container = request.container.expect("container checked above");
    let exists_args = azure_container_exists_args(&account, &container);
    let exists = run_az_readonly(exists_args).await;
    let exists_stdout = match exists {
        Ok(output) => output.stdout,
        Err(error) => {
            let status = classify_azure_error(&error);
            return Ok(report_for_status(
                status,
                true,
                true,
                request.prefix.is_some(),
                false,
                false,
            ));
        }
    };

    if !container_exists(&exists_stdout) {
        return Ok(report_for_status(
            "container_missing",
            true,
            true,
            request.prefix.is_some(),
            true,
            false,
        ));
    }

    let list_args = azure_blob_list_args(&account, &container, request.prefix.as_deref());
    if let Err(error) = run_az_readonly(list_args).await {
        let status = classify_azure_error(&error);
        return Ok(report_for_status(
            status,
            true,
            true,
            request.prefix.is_some(),
            true,
            true,
        ));
    }

    Ok(report(ReportParts {
        status: "reachable",
        configured: true,
        account_configured: true,
        container_configured: true,
        prefix_configured: request.prefix.is_some(),
        container_checked: true,
        list_prefix_checked: true,
        message:
            "Azure container and prefix are reachable through read-only CLI container/list checks.",
    }))
}

#[derive(Debug, Clone, PartialEq, Eq)]
struct ResolvedAzureLivePreflight {
    account: Option<String>,
    container: Option<String>,
    prefix: Option<String>,
}

impl ResolvedAzureLivePreflight {
    fn from_input(input: AzureLivePreflightInput) -> Self {
        let allow_env_fallback = input.allow_env_fallback.unwrap_or(true);
        Self {
            account: clean_or_env(
                input.account,
                "GRIMOIRE_AZURE_STORAGE_ACCOUNT",
                allow_env_fallback,
            ),
            container: clean_or_env(
                input.container,
                "GRIMOIRE_AZURE_CONTAINER",
                allow_env_fallback,
            ),
            prefix: clean_or_env(input.prefix, "GRIMOIRE_AZURE_PREFIX", allow_env_fallback),
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

fn azure_container_exists_args(account: &str, container: &str) -> Vec<String> {
    string_args([
        "storage",
        "container",
        "exists",
        "--account-name",
        account,
        "--name",
        container,
        "--auth-mode",
        "login",
        "--only-show-errors",
        "--output",
        "json",
    ])
}

fn azure_blob_list_args(account: &str, container: &str, prefix: Option<&str>) -> Vec<String> {
    let mut args = string_args([
        "storage",
        "blob",
        "list",
        "--account-name",
        account,
        "--container-name",
        container,
        "--auth-mode",
        "login",
        "--num-results",
        "1",
        "--only-show-errors",
        "--output",
        "json",
    ]);
    if let Some(prefix) = prefix {
        args.push("--prefix".to_string());
        args.push(prefix.to_string());
    }
    args
}

async fn run_az_readonly(args: Vec<String>) -> Result<AzureCommandOutput, AzureCommandFailure> {
    run_az_command(args, Duration::from_secs(8)).await
}

fn container_exists(stdout: &str) -> bool {
    serde_json::from_str::<Value>(stdout)
        .ok()
        .and_then(|value| value.get("exists").and_then(Value::as_bool))
        .unwrap_or(false)
}

fn classify_azure_error(error: &AzureCommandFailure) -> &'static str {
    match error {
        AzureCommandFailure::MissingCli => "missing_cli",
        AzureCommandFailure::TimedOut => "network",
        AzureCommandFailure::Failed(message) => classify_azure_message(message),
    }
}

fn classify_azure_message(message: &str) -> &'static str {
    let lower = message.to_ascii_lowercase();
    if lower.contains("az login")
        || lower.contains("not logged")
        || lower.contains("login required")
        || lower.contains("authentication")
    {
        return "missing_credentials";
    }
    if lower.contains("authorization")
        || lower.contains("permission")
        || lower.contains("forbidden")
        || lower.contains("403")
    {
        return "auth_denied";
    }
    if lower.contains("containernotfound") || lower.contains("not found") || lower.contains("404") {
        return "container_missing";
    }
    if lower.contains("timeout")
        || lower.contains("dns")
        || lower.contains("network")
        || lower.contains("connection")
    {
        return "network";
    }
    if lower.contains("throttl") || lower.contains("toomanyrequests") || lower.contains("429") {
        return "throttled";
    }
    "failed"
}

fn report_for_status(
    status: &'static str,
    account_configured: bool,
    container_configured: bool,
    prefix_configured: bool,
    container_checked: bool,
    list_prefix_checked: bool,
) -> AzureLivePreflightReport {
    let message = match status {
        "missing_cli" => "Azure CLI was not found on this Mac.",
        "missing_credentials" => {
            "Azure CLI is installed, but no usable local Azure login was found."
        }
        "auth_denied" => "Azure denied the read-only Blob preflight for the local login.",
        "container_missing" => "Azure did not find the configured Blob container.",
        "network" => "Azure Blob preflight could not reach Azure before the timeout.",
        "throttled" => "Azure throttled the read-only Blob preflight.",
        _ => "Azure Blob preflight failed before Grimoire could prove reachability.",
    };
    report(ReportParts {
        status,
        configured: account_configured && container_configured,
        account_configured,
        container_configured,
        prefix_configured,
        container_checked,
        list_prefix_checked,
        message,
    })
}

struct ReportParts<'a> {
    status: &'a str,
    configured: bool,
    account_configured: bool,
    container_configured: bool,
    prefix_configured: bool,
    container_checked: bool,
    list_prefix_checked: bool,
    message: &'a str,
}

fn report(parts: ReportParts<'_>) -> AzureLivePreflightReport {
    AzureLivePreflightReport {
        provider_id: "azure-blob".to_string(),
        proof_level: "live-read-only-preflight".to_string(),
        configured: parts.configured,
        status: parts.status.to_string(),
        account_configured: parts.account_configured,
        container_configured: parts.container_configured,
        prefix_configured: parts.prefix_configured,
        container_checked: parts.container_checked,
        list_prefix_checked: parts.list_prefix_checked,
        message: parts.message.to_string(),
        checked_at: Utc::now().to_rfc3339(),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn trims_request_values_and_env_fallbacks() {
        let resolved = ResolvedAzureLivePreflight::from_input(AzureLivePreflightInput {
            account: Some(" account ".to_string()),
            container: Some(" ".to_string()),
            prefix: Some(" notes/ ".to_string()),
            allow_env_fallback: None,
        });
        assert_eq!(resolved.account.as_deref(), Some("account"));
        assert_eq!(resolved.container, None);
        assert_eq!(resolved.prefix.as_deref(), Some("notes/"));
    }

    #[test]
    fn parses_container_exists_json() {
        assert!(container_exists(r#"{"exists": true}"#));
        assert!(!container_exists(r#"{"exists": false}"#));
        assert!(!container_exists("not json"));
    }

    #[test]
    fn categorizes_provider_errors_without_returning_raw_output() {
        assert_eq!(
            classify_azure_error(&AzureCommandFailure::MissingCli),
            "missing_cli"
        );
        assert_eq!(
            classify_azure_error(&AzureCommandFailure::TimedOut),
            "network"
        );
        assert_eq!(
            classify_azure_message("az login required"),
            "missing_credentials"
        );
        assert_eq!(
            classify_azure_message("AuthorizationPermissionMismatch 403"),
            "auth_denied"
        );
        assert_eq!(
            classify_azure_message("ContainerNotFound 404"),
            "container_missing"
        );
        assert_eq!(classify_azure_message("connection timeout"), "network");
        assert_eq!(classify_azure_message("TooManyRequests 429"), "throttled");
    }

    #[tokio::test]
    async fn settings_style_preflight_ignores_hidden_azure_env_fallback() {
        let old_account = std::env::var("GRIMOIRE_AZURE_STORAGE_ACCOUNT").ok();
        let old_container = std::env::var("GRIMOIRE_AZURE_CONTAINER").ok();
        let old_prefix = std::env::var("GRIMOIRE_AZURE_PREFIX").ok();
        std::env::set_var("GRIMOIRE_AZURE_STORAGE_ACCOUNT", "hidden-account");
        std::env::set_var("GRIMOIRE_AZURE_CONTAINER", "hidden-container");
        std::env::set_var("GRIMOIRE_AZURE_PREFIX", "hidden-prefix");

        let result = azure_live_preflight(AzureLivePreflightInput {
            account: None,
            container: None,
            prefix: None,
            allow_env_fallback: Some(false),
        })
        .await
        .unwrap();

        restore_env("GRIMOIRE_AZURE_STORAGE_ACCOUNT", old_account);
        restore_env("GRIMOIRE_AZURE_CONTAINER", old_container);
        restore_env("GRIMOIRE_AZURE_PREFIX", old_prefix);
        assert_eq!(result.status, "missing_config");
        assert!(!result.configured);
        assert!(!result.account_configured);
        assert!(!result.container_configured);
        assert!(!result.prefix_configured);
        assert!(!result.container_checked);
        assert!(!result.list_prefix_checked);
    }

    fn restore_env(key: &str, old: Option<String>) {
        if let Some(value) = old {
            std::env::set_var(key, value);
        } else {
            std::env::remove_var(key);
        }
    }
}
