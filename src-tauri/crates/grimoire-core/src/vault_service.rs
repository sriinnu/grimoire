use crate::vault::{VaultRoot, VaultSnapshotV1, VAULT_SERVICE_VERSION};
use serde::{Deserialize, Serialize};

#[derive(Debug, Deserialize)]
#[serde(tag = "operation", rename_all = "camelCase")]
pub enum VaultRequestV1 {
    Scan {
        version: u8,
        root: String,
    },
    Read {
        version: u8,
        root: String,
        path: String,
    },
    Create {
        version: u8,
        root: String,
        path: String,
        content: String,
    },
    Save {
        version: u8,
        root: String,
        path: String,
        content: String,
    },
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct VaultResponseV1 {
    pub version: u8,
    pub ok: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub payload: Option<VaultPayloadV1>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub error: Option<String>,
}

#[derive(Debug, Serialize)]
#[serde(tag = "kind", rename_all = "camelCase")]
pub enum VaultPayloadV1 {
    Snapshot { snapshot: VaultSnapshotV1 },
    Document { content: String },
    Acknowledged,
}

pub fn execute_vault_request_v1(input: &str) -> String {
    let result = parse_and_execute(input);
    let response = match result {
        Ok(payload) => VaultResponseV1 {
            version: VAULT_SERVICE_VERSION,
            ok: true,
            payload: Some(payload),
            error: None,
        },
        Err(error) => VaultResponseV1 {
            version: VAULT_SERVICE_VERSION,
            ok: false,
            payload: None,
            error: Some(error),
        },
    };
    serde_json::to_string(&response).unwrap_or_else(|_| {
        "{\"version\":1,\"ok\":false,\"error\":\"Failed to serialize vault response\"}".to_string()
    })
}

fn parse_and_execute(input: &str) -> Result<VaultPayloadV1, String> {
    let request: VaultRequestV1 =
        serde_json::from_str(input).map_err(|error| format!("Invalid vault request: {error}"))?;
    match request {
        VaultRequestV1::Scan { version, root } => {
            verify_version(version)?;
            let snapshot = VaultRoot::open(root)?.scan()?;
            Ok(VaultPayloadV1::Snapshot { snapshot })
        }
        VaultRequestV1::Read {
            version,
            root,
            path,
        } => {
            verify_version(version)?;
            let content = VaultRoot::open(root)?.read(&path)?;
            Ok(VaultPayloadV1::Document { content })
        }
        VaultRequestV1::Create {
            version,
            root,
            path,
            content,
        } => {
            verify_version(version)?;
            VaultRoot::open(root)?.create(&path, &content)?;
            Ok(VaultPayloadV1::Acknowledged)
        }
        VaultRequestV1::Save {
            version,
            root,
            path,
            content,
        } => {
            verify_version(version)?;
            VaultRoot::open(root)?.save(&path, &content)?;
            Ok(VaultPayloadV1::Acknowledged)
        }
    }
}

fn verify_version(version: u8) -> Result<(), String> {
    if version == VAULT_SERVICE_VERSION {
        Ok(())
    } else {
        Err(format!(
            "Unsupported vault service version {version}; expected {VAULT_SERVICE_VERSION}"
        ))
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::{json, Value};
    use std::fs;

    #[test]
    fn executes_the_versioned_scan_and_read_boundary() {
        let directory = tempfile::tempdir().unwrap();
        fs::write(directory.path().join("Welcome.md"), "# Welcome\n").unwrap();
        let root = directory.path().to_string_lossy();

        let scan = execute_vault_request_v1(
            &json!({"operation": "scan", "version": 1, "root": root}).to_string(),
        );
        let scan: Value = serde_json::from_str(&scan).unwrap();
        assert_eq!(scan["ok"], true);
        assert_eq!(
            scan["payload"]["snapshot"]["documents"][0]["title"],
            "Welcome"
        );

        let read = execute_vault_request_v1(
            &json!({
                "operation": "read",
                "version": 1,
                "root": root,
                "path": "Welcome.md"
            })
            .to_string(),
        );
        let read: Value = serde_json::from_str(&read).unwrap();
        assert_eq!(read["payload"]["content"], "# Welcome\n");
    }

    #[test]
    fn rejects_unknown_versions_without_touching_disk() {
        let response = execute_vault_request_v1(
            &json!({"operation": "scan", "version": 2, "root": "/tmp"}).to_string(),
        );
        let response: Value = serde_json::from_str(&response).unwrap();
        assert_eq!(response["ok"], false);
        assert!(response["error"]
            .as_str()
            .unwrap()
            .contains("Unsupported vault service version"));
    }
}
