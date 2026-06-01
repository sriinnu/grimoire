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
