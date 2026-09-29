//! Chitragupta owns pairing credentials and workspace grants. Grimoire sends
//! requests over stdin and consumes only the versioned, redacted CLI contract.
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use std::io::{Read, Write};
use std::process::{Command, Stdio};
use std::time::{Duration, Instant};

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

fn run_connector(mut command: Command, input: &Value, timeout: Duration) -> Result<Value, String> {
    let payload = serde_json::to_vec(input).map_err(|_| "Could not encode Chitragupta request.")?;
    let mut child = command
        .stdin(Stdio::piped())
        .stdout(Stdio::piped())
        .stderr(Stdio::null())
        .spawn()
        .map_err(|_| "Could not start the Chitragupta connector. Update the installed CLI.")?;
    let mut stdin = child
        .stdin
        .take()
        .ok_or("Chitragupta connector input unavailable.")?;
    let stdout = child
        .stdout
        .take()
        .ok_or("Chitragupta connector output unavailable.")?;
    let writer = std::thread::spawn(move || stdin.write_all(&payload));
    // Drain stdout concurrently so large session transcripts cannot fill the pipe.
    let reader = std::thread::spawn(move || {
        let mut data = Vec::new();
        stdout
            .take(16 * 1024 * 1024 + 1)
            .read_to_end(&mut data)
            .map(|_| data)
    });
    let deadline = Instant::now() + timeout;
    let status = loop {
        match child.try_wait() {
            Ok(Some(status)) => break status,
            Ok(None) if Instant::now() < deadline => std::thread::sleep(Duration::from_millis(25)),
            _ => {
                let _ = child.kill();
                let _ = child.wait();
                return Err(
                    "Chitragupta connector timed out or stopped. Check its status before retrying."
                        .into(),
                );
            }
        }
    };
    writer
        .join()
        .map_err(|_| "Chitragupta connector input failed.")?
        .map_err(|_| "Chitragupta connector input failed.")?;
    let output = reader
        .join()
        .map_err(|_| "Chitragupta connector output failed.")?
        .map_err(|_| "Chitragupta connector output failed.")?;
    if output.len() > 16 * 1024 * 1024 {
        return Err("Chitragupta connector response is too large.".into());
    }
    decode_receipt(status.success(), &output)
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
mod tests {
    use super::*;

    #[cfg(unix)]
    #[test]
    fn selected_vault_aliases_use_one_canonical_workspace() {
        let directory = tempfile::tempdir().unwrap();
        let vault = directory.path().join("vault");
        std::fs::create_dir(&vault).unwrap();
        let alias = directory.path().join("alias");
        std::os::unix::fs::symlink(&vault, &alias).unwrap();
        let selected = format!("{}/", alias.display());
        let input = input_for_project(&selected).unwrap();
        assert_eq!(
            input["projectPath"],
            json!(std::fs::canonicalize(&vault).unwrap())
        );
        assert!(input_for_project("")
            .unwrap_err()
            .starts_with("PROJECT_REQUIRED:"));
        assert!(
            input_for_project(directory.path().join("missing").to_str().unwrap())
                .unwrap_err()
                .starts_with("PROJECT_REQUIRED:")
        );
    }

    #[test]
    fn status_manifest_binds_the_exact_app_origin_and_workspace() {
        let input = json!({"baseUrl":"http://localhost:3141/", "projectPath":"/vault"});
        let receipt = json!({"manifest": {
            "contractVersion":1, "verticalId":"grimoire", "runtimeProfileId":"app-consumer",
            "connection":{"transport":"cli-connector", "httpBaseUrl":"http://localhost:3141"},
            "attachment":{"consumer":"grimoire", "surface":"grimoire-native", "projectPath":"/vault"}
        }});
        assert_eq!(
            validate_status_manifest(&receipt, &input).unwrap(),
            "http://localhost:3141"
        );
        assert!(validate_status_manifest(&json!({"manifest":{}}), &input)
            .unwrap_err()
            .starts_with("STALE_RESPONSE:"));
        for (pointer, replacement) in [
            ("/manifest/contractVersion", json!(2)),
            ("/manifest/verticalId", json!("other-app")),
            ("/manifest/runtimeProfileId", json!("hub-browser")),
            ("/manifest/connection/transport", json!("daemon-rpc")),
            (
                "/manifest/connection/httpBaseUrl",
                json!("http://127.0.0.1:3141"),
            ),
            ("/manifest/attachment/consumer", json!("other-app")),
            ("/manifest/attachment/surface", json!("grimoire-web")),
            ("/manifest/attachment/projectPath", json!("/other-vault")),
        ] {
            let mut wrong = receipt.clone();
            *wrong.pointer_mut(pointer).unwrap() = replacement;
            assert!(
                validate_status_manifest(&wrong, &input)
                    .unwrap_err()
                    .starts_with("STALE_RESPONSE:"),
                "{pointer}"
            );
        }
    }

    #[test]
    fn receipts_fail_closed_without_exposing_cli_output() {
        for (success, receipt) in [
            (false, r#"{"contractVersion":1,"ok":true,"data":{}}"#),
            (
                true,
                r#"{"contractVersion":1,"ok":false,"error":{"message":"private-material"}}"#,
            ),
            (true, "private-material"),
            (true, r#"{"ok":true,"data":{}}"#),
            (true, r#"{"contractVersion":1,"ok":true}"#),
        ] {
            let error = decode_receipt(success, receipt.as_bytes()).unwrap_err();
            assert!(!error.contains("private-material"));
        }
        for code in [
            "PAIRING_REJECTED",
            "PAIRING_REQUIRED",
            "PAIRING_EXPIRED",
            "REPAIR_REQUIRED",
        ] {
            let receipt = json!({"contractVersion": 1, "ok": false, "error": {"code": code, "message": "private-material"}});
            let error = decode_receipt(false, &serde_json::to_vec(&receipt).unwrap()).unwrap_err();
            assert!(
                error.starts_with("REPAIR_REQUIRED:"),
                "{code} must offer explicit re-pairing"
            );
            assert!(!error.contains("private-material"));
        }
        assert_eq!(
            decode_receipt(
                true,
                br#"{"contractVersion":1,"ok":true,"data":{"text":"reply"}}"#
            )
            .unwrap(),
            json!({"text":"reply"})
        );
    }

    #[cfg(unix)]
    #[test]
    fn connector_supplies_input_privately_and_drains_large_output() {
        let mut command = Command::new("/bin/sh");
        command.args(["-c", "read payload; test \"$payload\" = '{\"pairingCode\":\"123456\"}' || exit 2; printf '{\"contractVersion\":1,\"ok\":true,\"data\":\"'; head -c 100000 /dev/zero | tr '\\0' x; printf '\"}'"]);
        let result = run_connector(
            command,
            &json!({"pairingCode":"123456"}),
            Duration::from_secs(3),
        );
        assert_eq!(result.unwrap().as_str().unwrap().len(), 100000);
    }
}
