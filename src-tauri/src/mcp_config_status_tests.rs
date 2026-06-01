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

fn managed_server(index_js: &str, vault_path: &str) -> serde_json::Value {
    serde_json::json!({
        "command": "node",
        "args": [index_js],
        "env": { "VAULT_PATH": vault_path }
    })
}

fn write_mcp_servers_config(config_path: &Path, servers: Vec<(&str, serde_json::Value)>) {
    let servers = servers
        .into_iter()
        .map(|(name, server)| (name.to_string(), server))
        .collect::<serde_json::Map<_, _>>();
    write_config_json(config_path, serde_json::json!({ "mcpServers": servers }));
}

fn write_index_js(dir: &Path) -> PathBuf {
    let index_js = dir.join("index.js");
    std::fs::write(&index_js, "console.log('ok');").unwrap();
    index_js
}

#[test]
fn read_registered_mcp_entry_prefers_primary_server_name() {
    let (_tmp, config_path) = temp_config_path("mcp.json");
    write_mcp_servers_config(
        &config_path,
        vec![
            (
                MCP_SERVER_NAME,
                managed_server("/primary/index.js", "/primary"),
            ),
            (
                LEGACY_MCP_SERVER_NAME,
                managed_server("/legacy/index.js", "/legacy"),
            ),
        ],
    );

    let entry = read_registered_mcp_entry(&config_path).unwrap();
    assert_eq!(entry["env"]["VAULT_PATH"], "/primary");
}

#[test]
fn read_registered_mcp_entry_uses_legacy_server_name() {
    let (_tmp, config_path) = temp_config_path("mcp.json");
    write_mcp_servers_config(
        &config_path,
        vec![(
            LEGACY_MCP_SERVER_NAME,
            managed_server("/legacy/index.js", "/legacy"),
        )],
    );

    let entry = read_registered_mcp_entry(&config_path).unwrap();
    assert_eq!(entry["env"]["VAULT_PATH"], "/legacy");
}

#[test]
fn read_registered_mcp_entry_returns_none_for_invalid_or_missing_servers() {
    let tmp = tempfile::tempdir().unwrap();
    let invalid_path = tmp.path().join("invalid.json");
    std::fs::write(&invalid_path, "{not json").unwrap();
    assert!(read_registered_mcp_entry(&invalid_path).is_none());

    let empty_path = tmp.path().join("empty.json");
    let empty_config = serde_json::json!({ "other": {} });
    std::fs::write(&empty_path, serde_json::to_string(&empty_config).unwrap()).unwrap();
    assert!(read_registered_mcp_entry(&empty_path).is_none());

    let missing_path = tmp.path().join("missing.json");
    assert!(read_registered_mcp_entry(&missing_path).is_none());
}

#[test]
fn entry_index_js_exists_requires_existing_first_arg() {
    let tmp = tempfile::tempdir().unwrap();
    let index_js = write_index_js(tmp.path());

    let existing = serde_json::json!({
        "args": [index_js.to_string_lossy()]
    });
    assert!(entry_index_js_exists(&existing));

    let missing = serde_json::json!({
        "args": [tmp.path().join("missing.js").to_string_lossy()]
    });
    assert!(!entry_index_js_exists(&missing));

    let no_args = serde_json::json!({});
    assert!(!entry_index_js_exists(&no_args));
}

#[test]
fn upsert_returns_error_for_non_object_config() {
    let tmp = tempfile::tempdir().unwrap();
    let config_path = tmp.path().join("mcp.json");
    std::fs::write(&config_path, "[]").unwrap();

    let entry = build_mcp_entry("/test/index.js", "/vault");
    let result = upsert_mcp_config(&config_path, &entry);
    assert!(matches!(result, Err(ref error) if error.contains("Config is not a JSON object")));
}

#[test]
fn upsert_returns_error_for_non_object_mcp_servers() {
    let tmp = tempfile::tempdir().unwrap();
    let config_path = tmp.path().join("mcp.json");
    let config = serde_json::json!({
        "mcpServers": []
    });
    std::fs::write(&config_path, serde_json::to_string(&config).unwrap()).unwrap();

    let entry = build_mcp_entry("/test/index.js", "/vault");
    let result = upsert_mcp_config(&config_path, &entry);
    assert!(matches!(result, Err(ref error) if error.contains("mcpServers is not a JSON object")));
}

#[test]
fn remove_mcp_from_config_removes_primary_and_legacy_entries() {
    let tmp = tempfile::tempdir().unwrap();
    let config_path = tmp.path().join("mcp.json");
    let config = serde_json::json!({
        "mcpServers": {
            MCP_SERVER_NAME: { "command": "node", "args": ["/index.js"] },
            LEGACY_MCP_SERVER_NAME: { "command": "node", "args": ["/legacy.js"] },
            "other-server": { "command": "other", "args": [] }
        }
    });
    std::fs::write(&config_path, serde_json::to_string(&config).unwrap()).unwrap();

    let removed = remove_mcp_from_config(&config_path).unwrap();
    assert!(removed);

    let updated = read_config(&config_path);
    assert!(updated["mcpServers"][MCP_SERVER_NAME].is_null());
    assert!(updated["mcpServers"][LEGACY_MCP_SERVER_NAME].is_null());
    assert!(updated["mcpServers"]["other-server"].is_object());
}

#[test]
fn remove_mcp_from_config_returns_false_when_entry_missing() {
    let tmp = tempfile::tempdir().unwrap();
    let config_path = tmp.path().join("mcp.json");
    let config = serde_json::json!({
        "mcpServers": {
            "other-server": { "command": "other", "args": [] }
        }
    });
    std::fs::write(&config_path, serde_json::to_string(&config).unwrap()).unwrap();

    let removed = remove_mcp_from_config(&config_path).unwrap();
    assert!(!removed);
}

#[test]
fn check_mcp_status_returns_installed_for_matching_vault() {
    let tmp = tempfile::tempdir().unwrap();
    let vault_path = tmp.path().join("vault");
    std::fs::create_dir_all(&vault_path).unwrap();
    let index_js = write_index_js(tmp.path());
    let config_path = tmp.path().join("mcp.json");
    let config = serde_json::json!({
        "mcpServers": {
            MCP_SERVER_NAME: {
                "command": "node",
                "args": [index_js.to_string_lossy()],
                "env": { "VAULT_PATH": vault_path.to_string_lossy() }
            }
        }
    });
    std::fs::write(&config_path, serde_json::to_string(&config).unwrap()).unwrap();

    let entry = read_registered_mcp_entry(&config_path).unwrap();
    assert!(entry_targets_vault(&entry, &vault_path));
    assert!(entry_index_js_exists(&entry));
}

#[test]
fn entry_targets_vault_requires_matching_existing_directory() {
    let tmp = tempfile::tempdir().unwrap();
    let first_vault = tmp.path().join("vault-a");
    let second_vault = tmp.path().join("vault-b");
    std::fs::create_dir_all(&first_vault).unwrap();
    std::fs::create_dir_all(&second_vault).unwrap();

    let entry = serde_json::json!({
        "env": { "VAULT_PATH": first_vault.to_string_lossy() }
    });

    assert!(entry_targets_vault(&entry, &first_vault));
    assert!(!entry_targets_vault(&entry, &second_vault));
}
