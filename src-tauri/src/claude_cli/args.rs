use super::types::{AgentStreamRequest, ChatStreamRequest};

/// Build CLI arguments for a chat stream request.
pub(crate) fn build_chat_args(req: &ChatStreamRequest) -> Vec<String> {
    let mut args: Vec<String> = vec![
        "-p".into(),
        req.message.clone(),
        "--output-format".into(),
        "stream-json".into(),
        "--verbose".into(),
        "--include-partial-messages".into(),
        "--tools".into(),
        String::new(),
    ];

    if let Some(ref sp) = req.system_prompt {
        if !sp.is_empty() {
            args.push("--system-prompt".into());
            args.push(sp.clone());
        }
    }

    if let Some(ref sid) = req.session_id {
        args.push("--resume".into());
        args.push(sid.clone());
    }

    args
}

/// Build CLI arguments for an agent stream request.
///
/// Native tools are enabled by default, so this intentionally does not pass
/// `--tools ""`.
pub(crate) fn build_agent_args(req: &AgentStreamRequest) -> Result<Vec<String>, String> {
    let mcp_config = build_mcp_config(&req.vault_path)?;

    let mut args: Vec<String> = vec![
        "-p".into(),
        req.message.clone(),
        "--output-format".into(),
        "stream-json".into(),
        "--verbose".into(),
        "--include-partial-messages".into(),
        "--mcp-config".into(),
        mcp_config,
        "--permission-mode".into(),
        "bypassPermissions".into(),
        "--dangerously-skip-permissions".into(),
        "--no-session-persistence".into(),
    ];

    if let Some(ref sp) = req.system_prompt {
        if !sp.is_empty() {
            args.push("--append-system-prompt".into());
            args.push(sp.clone());
        }
    }

    if let Some(model) = normalize_cli_model(req.model.as_deref()) {
        args.push("--model".into());
        args.push(model);
    }

    Ok(args)
}

fn normalize_cli_model(model: Option<&str>) -> Option<String> {
    let model = model?.trim();
    if model.is_empty() || model.chars().any(char::is_whitespace) {
        None
    } else {
        Some(model.to_string())
    }
}

fn build_mcp_config(vault_path: &str) -> Result<String, String> {
    let server_dir = crate::mcp::mcp_server_dir()?;
    let index_js = server_dir.join("index.js");
    let config = serde_json::json!({
        "mcpServers": {
            "grimoire": {
                "command": "node",
                "args": [index_js.to_string_lossy()],
                "env": { "VAULT_PATH": vault_path }
            }
        }
    });
    serde_json::to_string(&config).map_err(|e| format!("Failed to serialise MCP config: {e}"))
}

#[cfg(test)]
#[path = "args_tests.rs"]
mod args_tests;
