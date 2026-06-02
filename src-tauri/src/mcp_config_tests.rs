use super::*;

fn read_config(config_path: &Path) -> serde_json::Value {
    let raw = std::fs::read_to_string(config_path).unwrap();
    serde_json::from_str(&raw).unwrap()
}

fn temp_config_path(file_name: &str) -> (tempfile::TempDir, PathBuf) {
    let tmp = tempfile::tempdir().unwrap();
    let config_path = tmp.path().join(file_name);
    (tmp, config_path)
}

fn write_config_json(config_path: &Path, config: serde_json::Value) {
    std::fs::write(config_path, serde_json::to_string(&config).unwrap()).unwrap();
}

fn write_mcp_servers_config(config_path: &Path, servers: Vec<(&str, serde_json::Value)>) {
    let servers = servers
        .into_iter()
        .map(|(name, server)| (name.to_string(), server))
        .collect::<serde_json::Map<_, _>>();
    write_config_json(config_path, serde_json::json!({ "mcpServers": servers }));
}

#[test]
fn build_mcp_entry_produces_correct_json() {
    let entry = build_mcp_entry("/path/to/index.js", "/my/vault");
    assert_eq!(entry["command"], "node");
    assert_eq!(entry["args"][0], "/path/to/index.js");
    assert_eq!(entry["env"]["VAULT_PATH"], "/my/vault");
}

#[test]
fn upsert_creates_new_config() {
    let tmp = tempfile::tempdir().unwrap();
    let config_path = tmp.path().join("mcp.json");
    let entry = build_mcp_entry("/test/index.js", "/test/vault");

    let was_update = upsert_mcp_config(&config_path, &entry).unwrap();
    assert!(!was_update);

    let config = read_config(&config_path);
    assert_eq!(
        config["mcpServers"][MCP_SERVER_NAME]["args"][0],
        "/test/index.js"
    );
    assert_eq!(
        config["mcpServers"][MCP_SERVER_NAME]["env"]["VAULT_PATH"],
        "/test/vault"
    );
}

#[test]
fn upsert_updates_existing_config() {
    let tmp = tempfile::tempdir().unwrap();
    let config_path = tmp.path().join("mcp.json");

    let entry1 = build_mcp_entry("/test/index.js", "/vault/v1");
    upsert_mcp_config(&config_path, &entry1).unwrap();

    let entry2 = build_mcp_entry("/test/index.js", "/vault/v2");
    let was_update = upsert_mcp_config(&config_path, &entry2).unwrap();
    assert!(was_update);

    let config = read_config(&config_path);
    assert_eq!(
        config["mcpServers"][MCP_SERVER_NAME]["env"]["VAULT_PATH"],
        "/vault/v2"
    );
}

#[test]
fn upsert_migrates_legacy_server_name() {
    let tmp = tempfile::tempdir().unwrap();
    let config_path = tmp.path().join("mcp.json");

    let existing = serde_json::json!({
        "mcpServers": {
            LEGACY_MCP_SERVER_NAME: {
                "command": "node",
                "args": ["/old/index.js"],
                "env": { "VAULT_PATH": "/old" }
            }
        }
    });
    std::fs::write(&config_path, serde_json::to_string(&existing).unwrap()).unwrap();

    let entry = build_mcp_entry("/test/index.js", "/vault");
    let was_update = upsert_mcp_config(&config_path, &entry).unwrap();
    assert!(was_update);

    let config = read_config(&config_path);
    assert!(config["mcpServers"][LEGACY_MCP_SERVER_NAME].is_null());
    assert_eq!(
        config["mcpServers"][MCP_SERVER_NAME]["args"][0],
        "/test/index.js"
    );
}

#[test]
fn upsert_preserves_other_servers() {
    let (_tmp, config_path) = temp_config_path("mcp.json");
    write_mcp_servers_config(
        &config_path,
        vec![(
            "other-server",
            serde_json::json!({ "command": "other", "args": [] }),
        )],
    );

    let entry = build_mcp_entry("/test/index.js", "/vault");
    upsert_mcp_config(&config_path, &entry).unwrap();

    let config = read_config(&config_path);
    assert!(config["mcpServers"]["other-server"].is_object());
    assert!(config["mcpServers"][MCP_SERVER_NAME].is_object());
}

#[test]
fn upsert_preserves_other_top_level_settings() {
    let (_tmp, config_path) = temp_config_path(".claude.json");
    write_config_json(
        &config_path,
        serde_json::json!({
            "model": "sonnet",
            "theme": "dark",
            "mcpServers": {
                "other-server": { "command": "other", "args": [] }
            }
        }),
    );

    let entry = build_mcp_entry("/test/index.js", "/vault");
    upsert_mcp_config(&config_path, &entry).unwrap();

    let config = read_config(&config_path);
    assert_eq!(config["model"], "sonnet");
    assert_eq!(config["theme"], "dark");
    assert!(config["mcpServers"]["other-server"].is_object());
    assert!(config["mcpServers"][MCP_SERVER_NAME].is_object());
}

#[test]
fn upsert_creates_parent_dirs() {
    let tmp = tempfile::tempdir().unwrap();
    let config_path = tmp.path().join("nested").join("dir").join("mcp.json");
    let entry = build_mcp_entry("/test/index.js", "/vault");

    upsert_mcp_config(&config_path, &entry).unwrap();
    assert!(config_path.exists());
}

#[test]
fn register_mcp_to_configs_returns_registered_for_new() {
    let tmp = tempfile::tempdir().unwrap();
    let config = tmp.path().join("claude").join("mcp.json");
    let entry = build_mcp_entry("/test/index.js", "/vault");

    let status = register_mcp_to_configs(&entry, &[config]);
    assert_eq!(status, "registered");
}

#[test]
fn register_mcp_to_configs_returns_updated_for_existing() {
    let tmp = tempfile::tempdir().unwrap();
    let config = tmp.path().join("mcp.json");
    let entry = build_mcp_entry("/test/index.js", "/vault");

    register_mcp_to_configs(&entry, std::slice::from_ref(&config));
    let status = register_mcp_to_configs(&entry, &[config]);
    assert_eq!(status, "updated");
}

#[test]
fn register_mcp_to_configs_writes_multiple_configs() {
    let tmp = tempfile::tempdir().unwrap();
    let claude_user_cfg = tmp.path().join(".claude.json");
    let claude_cfg = tmp.path().join("claude").join("mcp.json");
    let cursor_cfg = tmp.path().join("cursor").join("mcp.json");
    let generic_cfg = tmp.path().join(".config").join("mcp").join("mcp.json");
    let entry = build_mcp_entry("/test/index.js", "/vault");

    register_mcp_to_configs(
        &entry,
        &[
            claude_user_cfg.clone(),
            claude_cfg.clone(),
            cursor_cfg.clone(),
            generic_cfg.clone(),
        ],
    );

    assert!(claude_user_cfg.exists());
    assert!(claude_cfg.exists());
    assert!(cursor_cfg.exists());
    assert!(generic_cfg.exists());

    let config = read_config(&claude_user_cfg);
    assert_eq!(
        config["mcpServers"][MCP_SERVER_NAME]["args"][0],
        "/test/index.js"
    );
}

#[test]
fn mcp_config_paths_for_home_includes_all_supported_config_paths() {
    let home = Path::new("/Users/tester");
    let paths = mcp_config_paths_for_home(home);

    assert_eq!(
        paths,
        vec![
            home.join(".claude.json"),
            home.join(".claude").join("mcp.json"),
            home.join(".cursor").join("mcp.json"),
            home.join(".config").join("mcp").join("mcp.json"),
        ]
    );
}

#[test]
fn upsert_returns_error_for_invalid_json() {
    let tmp = tempfile::tempdir().unwrap();
    let config_path = tmp.path().join("mcp.json");
    std::fs::write(&config_path, "not valid json{{{{").unwrap();
    let entry = build_mcp_entry("/test/index.js", "/vault");
    let result = upsert_mcp_config(&config_path, &entry);
    assert!(result.is_err());
}

#[test]
fn register_mcp_to_configs_handles_empty_list() {
    let entry = build_mcp_entry("/test/index.js", "/vault");
    let status = register_mcp_to_configs(&entry, &[]);
    assert_eq!(status, "registered");
}
