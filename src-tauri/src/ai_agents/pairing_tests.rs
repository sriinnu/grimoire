use super::*;
use std::time::Instant;

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
fn connector_deadline_includes_inherited_pipe_completion() {
    for (script, input) in [
        // An exited wrapper's descendant retains stdout or unread stdin.
        (
            "sleep 2 & printf '{\"contractVersion\":1,\"ok\":true,\"data\":{}}'",
            json!({}),
        ),
        (
            "sleep 2 <&0 >&- & printf '{\"contractVersion\":1,\"ok\":true,\"data\":{}}'",
            json!({"message": "x".repeat(1024 * 1024)}),
        ),
        // A child that itself remains alive must obey the same deadline.
        ("sleep 2", json!({})),
    ] {
        let mut command = Command::new("/bin/sh");
        command.args(["-c", script]);
        let started = Instant::now();
        let result = run_connector(command, &input, Duration::from_millis(100));
        assert!(
            result.unwrap_err().contains("timed out"),
            "a receipt without pipe completion must not outlive the deadline"
        );
        assert!(started.elapsed() < Duration::from_secs(1));
    }
}

#[cfg(unix)]
#[test]
fn connector_refuses_oversized_output_before_child_exit() {
    let mut command = Command::new("/bin/sh");
    command.args(["-c", "head -c 16777217 /dev/zero; sleep 2"]);
    let started = Instant::now();
    let result = run_connector(command, &json!({}), Duration::from_secs(3));
    assert!(result.unwrap_err().contains("too large"));
    assert!(started.elapsed() < Duration::from_secs(2));
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
