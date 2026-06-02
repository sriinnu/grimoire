use super::*;

#[test]
fn find_node_returns_valid_path() {
    let node = find_node().unwrap();
    assert!(node.exists(), "node binary should exist at {node:?}");
    assert!(
        node.to_string_lossy().contains("node"),
        "path should contain 'node': {node:?}"
    );
}

#[test]
fn node_lookup_stdout_uses_first_non_empty_path() {
    let stdout = b"\r\nC:\\Program Files\\nodejs\\node.exe\r\nC:\\Tools\\node.exe\r\n";

    let path = first_node_lookup_path(stdout).unwrap();

    assert_eq!(
        path,
        std::path::PathBuf::from("C:\\Program Files\\nodejs\\node.exe")
    );
}

#[test]
fn node_lookup_stdout_rejects_empty_output() {
    assert!(first_node_lookup_path(b"\r\n\n").is_none());
}

#[test]
fn fallback_node_candidates_include_common_windows_locations() {
    let home = std::path::PathBuf::from("C:\\Users\\grimoire");
    let candidates = fallback_node_candidates_for(Some(&home), |key| match key {
        "NVM_SYMLINK" => Some(std::ffi::OsString::from("C:\\Program Files\\nodejs")),
        "LOCALAPPDATA" => Some(std::ffi::OsString::from(
            "C:\\Users\\grimoire\\AppData\\Local",
        )),
        "ProgramFiles" => Some(std::ffi::OsString::from("C:\\Program Files")),
        "ProgramFiles(x86)" => Some(std::ffi::OsString::from("C:\\Program Files (x86)")),
        _ => None,
    });

    assert!(candidates
        .contains(&std::path::PathBuf::from("C:\\Program Files\\nodejs").join("node.exe")));
    assert!(
        candidates.contains(&std::path::PathBuf::from("C:\\Program Files").join("nodejs/node.exe"))
    );
    assert!(candidates.contains(
        &std::path::PathBuf::from("C:\\Users\\grimoire\\AppData\\Local")
            .join("Programs/nodejs/node.exe")
    ));
    assert!(candidates.contains(&home.join("AppData/Local/Volta/bin/node.exe")));
    assert!(candidates.contains(&home.join("scoop/apps/nodejs-lts/current/node.exe")));
}

#[test]
fn mcp_server_dir_resolves_in_dev() {
    let dir = mcp_server_dir().unwrap();
    assert!(dir.join("ws-bridge.js").exists());
    assert!(dir.join("index.js").exists());
    assert!(dir.join("vault.js").exists());
}

#[test]
fn spawn_ws_bridge_starts_and_can_be_killed() {
    let tmp = tempfile::tempdir().unwrap();
    let vault_path = tmp.path().to_str().unwrap();

    let mut child = spawn_ws_bridge(vault_path).unwrap();
    assert!(child.id() > 0, "child process should have a valid PID");

    child.kill().unwrap();
    child.wait().unwrap();
}

#[test]
fn mcp_status_serializes_to_snake_case() {
    let json = serde_json::to_string(&McpStatus::Installed).unwrap();
    assert_eq!(json, r#""installed""#);
    let json = serde_json::to_string(&McpStatus::NotInstalled).unwrap();
    assert_eq!(json, r#""not_installed""#);
}
