//! Chitragupta owns pairing credentials and workspace grants. Grimoire sends
//! requests over stdin and consumes only the versioned, redacted CLI contract.
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use std::process::{Command, Stdio};
use std::time::Duration;
use tokio::io::{AsyncReadExt, AsyncWriteExt};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct VerticalStatus {
    pub contract_version: u32,
    pub state: VerticalState,
    pub project_path: String,
    #[serde(skip_deserializing)]
    pub selected_vault_path: String,
    #[serde(skip_deserializing)]
    pub base_url: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub reason: Option<ConnectionReason>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub chat_ready: Option<bool>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub next_action: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub request_id: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum ConnectionReason {
    Pairing,
    Workspace,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum VerticalState {
    PairingRequired,
    ApprovalRequired,
    Ready,
    Denied,
    Revoked,
    Expired,
    Busy,
    RenewalIndeterminate,
}

pub fn vertical_status(
    project_path: &str,
    pairing_code: Option<&str>,
    pairing_invitation: Option<&str>,
    connect: bool,
    reconnect: bool,
    request_approval: bool,
) -> Result<VerticalStatus, String> {
    if pairing_code.is_some() && pairing_invitation.is_some() {
        return Err("Use either a pairing code or an invitation, not both.".into());
    }
    if pairing_invitation.is_some_and(|value| value.is_empty() || value.len() > 4096) {
        return Err("Use a pairing invitation of at most 4096 bytes.".into());
    }
    if let Some(code) = pairing_code {
        if code.len() != 6 || !code.bytes().all(|b| b.is_ascii_digit()) {
            return Err(
                "Enter the six-digit pairing code from Chitragupta Hub → Devices → Connect an app for grimoire.".into(),
            );
        }
    }
    let mut input = input_for_project(project_path)?;
    if connect {
        if let Some(invitation) = pairing_invitation {
            input["pairingInvitation"] = json!(invitation);
        }
        if reconnect {
            input["reconnect"] = json!(true);
        }
        if request_approval {
            input["requestApproval"] = json!(true);
        }
        if let Some(code) = pairing_code {
            input["pairingCode"] = json!(code);
        }
    }
    let data = connector(if connect { "connect" } else { "status" }, &input)?;
    let origin = validate_status_manifest(&data, &input)?;
    let mut status: VerticalStatus = serde_json::from_value(data)
        .map_err(|_| "Chitragupta returned an invalid connection status.".to_string())?;
    if status.contract_version != 1
        || Some(status.project_path.as_str()) != input["projectPath"].as_str()
    {
        return Err(
            "Chitragupta returned a connection status for a different contract or vault.".into(),
        );
    }
    status.selected_vault_path = project_path.to_string();
    status.base_url = origin;
    Ok(status)
}

fn validate_status_manifest(data: &Value, input: &Value) -> Result<String, String> {
    let origin = input["baseUrl"]
        .as_str()
        .and_then(|value| reqwest::Url::parse(value).ok())
        .map(|url| url.origin().ascii_serialization())
        .ok_or_else(|| "The configured Chitragupta server address is invalid.".to_string())?;
    let manifest = &data["manifest"];
    if manifest["contractVersion"] != json!(1)
        || manifest["verticalId"] != "grimoire"
        || manifest["runtimeProfileId"] != "app-consumer"
        || manifest["connection"]["transport"] != "cli-connector"
        || manifest["connection"]["httpBaseUrl"].as_str() != Some(origin.as_str())
        || manifest["attachment"]["consumer"] != "grimoire"
        || manifest["attachment"]["surface"] != "grimoire-native"
        || manifest["attachment"]["projectPath"] != input["projectPath"]
    {
        return Err(
            "STALE_RESPONSE: Chitragupta returned a connection for another app, server or vault."
                .into(),
        );
    }
    Ok(origin)
}

pub fn vertical_request(
    project_path: &str,
    operation: &str,
    params: Value,
) -> Result<Value, String> {
    let mut input = input_for_project(project_path)?;
    input["operation"] = json!(operation);
    input["params"] = params;
    connector("request", &input)
}

pub fn canonical_project_path(project_path: &str) -> Result<String, String> {
    if project_path.trim().is_empty() {
        return Err("PROJECT_REQUIRED: Select a vault before connecting Chitragupta.".into());
    }
    let canonical = std::fs::canonicalize(project_path)
        .map_err(|_| "PROJECT_REQUIRED: The selected vault is unavailable. Open an existing vault before connecting Chitragupta.")?;
    if !canonical.is_dir() {
        return Err(
            "PROJECT_REQUIRED: Select a vault folder before connecting Chitragupta.".into(),
        );
    }
    canonical
        .into_os_string()
        .into_string()
        .map_err(|_| "PROJECT_REQUIRED: The selected vault path cannot be represented.".into())
}

fn input_for_project(project_path: &str) -> Result<Value, String> {
    Ok(
        json!({"contractVersion": 1, "baseUrl": crate::chitragupta_socket::socket_base_url(), "projectPath": canonical_project_path(project_path)?}),
    )
}

fn connector(action: &str, input: &Value) -> Result<Value, String> {
    let binary = super::discovery::find_chitragupta_binary()?;
    let mut command = super::path_env::command_for_binary(&binary);
    command.args(["vertical", action, "grimoire", "--json"]);
    command
        .env("CHITRAGUPTA_PRINT_LOGS", "0")
        .env("CHITRAGUPTA_PRINT_NIDRA", "0")
        .env("LOG_LEVEL", "fatal");
    run_connector(
        command,
        input,
        Duration::from_secs(if action == "request" { 300 } else { 30 }),
    )
}

fn run_connector(command: Command, input: &Value, timeout: Duration) -> Result<Value, String> {
    let payload = serde_json::to_vec(input).map_err(|_| "Could not encode Chitragupta request.")?;
    // Native callers already use a blocking worker. Async pipes make the whole
    // exchange cancellable, including descriptors retained by a wrapper's child.
    let runtime = tokio::runtime::Builder::new_current_thread()
        .enable_all()
        .build()
        .map_err(|_| "Could not initialize the Chitragupta connector.")?;
    runtime.block_on(async move {
        tokio::time::timeout(timeout, async move {
            let mut child = tokio::process::Command::from(command)
                .stdin(Stdio::piped())
                .stdout(Stdio::piped())
                .stderr(Stdio::null())
                .kill_on_drop(true)
                .spawn()
                .map_err(|_| {
                    "Could not start the Chitragupta connector. Update the installed CLI."
                })?;
            let mut stdin = child
                .stdin
                .take()
                .ok_or("Chitragupta connector input unavailable.")?;
            let stdout = child
                .stdout
                .take()
                .ok_or("Chitragupta connector output unavailable.")?;
            let ((), output, status) = tokio::try_join!(
                async move {
                    stdin
                        .write_all(&payload)
                        .await
                        .map_err(|_| "Chitragupta connector input failed.")?;
                    stdin
                        .shutdown()
                        .await
                        .map_err(|_| "Chitragupta connector input failed.")
                },
                async move {
                    let mut output = Vec::new();
                    stdout
                        .take(16 * 1024 * 1024 + 1)
                        .read_to_end(&mut output)
                        .await
                        .map_err(|_| "Chitragupta connector output failed.")?;
                    if output.len() > 16 * 1024 * 1024 {
                        return Err("Chitragupta connector response is too large.");
                    }
                    Ok(output)
                },
                async {
                    child
                        .wait()
                        .await
                        .map_err(|_| "Chitragupta connector stopped.")
                },
            )?;
            decode_receipt(status.success(), &output)
        })
        .await
        .unwrap_or_else(|_| {
            Err(
                "Chitragupta connector timed out or stopped. Check its status before retrying."
                    .into(),
            )
        })
    })
}

fn decode_receipt(success: bool, output: &[u8]) -> Result<Value, String> {
    let receipt: Value = serde_json::from_slice(output).map_err(|_| {
        "Chitragupta connector returned an invalid receipt. Update the installed CLI."
    })?;
    if receipt.get("contractVersion") != Some(&json!(1)) {
        return Err(
            "Chitragupta connector contract is incompatible. Update the installed CLI.".into(),
        );
    }
    if !success || receipt.get("ok") != Some(&Value::Bool(true)) {
        // Never reflect CLI stdout/stderr or arbitrary error text into the UI.
        let message = match receipt.pointer("/error/code").and_then(Value::as_str) {
            Some("BUSY") => "BUSY: Chitragupta is busy. Check the connection again shortly; no request was retried automatically.",
            Some("RENEWAL_INDETERMINATE") => "RENEWAL_INDETERMINATE: Recover this connection to reconcile its existing renewal before requesting another code.",
            Some("PAIRING_REVOKED") => "PAIRING_REVOKED: This device pairing was revoked. Review it in Chitragupta Hub; another code cannot reactivate it.",
            Some("STALE_RESPONSE") => "STALE_RESPONSE: Connection authority changed. Review history before sending another message.",
            Some("CHAT_INDETERMINATE") => "CHAT_INDETERMINATE: The previous request may have completed. Open session history before trying again; Grimoire will not resend it automatically.",
            Some("PAIRING_REJECTED" | "PAIRING_REQUIRED" | "PAIRING_EXPIRED" | "REPAIR_REQUIRED") => "REPAIR_REQUIRED: Pair again with a fresh code from Chitragupta Hub → Devices → Connect an app for grimoire.",
            Some("ATTACHMENT_UNAVAILABLE") => "ATTACHMENT_UNAVAILABLE: Chitragupta workspace attachment is unavailable. Check Chitragupta Hub before retrying.",
            Some("PROJECT_REQUIRED") => "PROJECT_REQUIRED: Select an existing vault before connecting Chitragupta.",
            _ => "Chitragupta did not authorize this request. Check pairing and workspace approval in Chitragupta Hub.",
        };
        return Err(message.into());
    }
    receipt
        .get("data")
        .cloned()
        .ok_or_else(|| "Chitragupta connector receipt is missing data.".into())
}

#[cfg(test)]
#[path = "pairing_tests.rs"]
mod tests;
