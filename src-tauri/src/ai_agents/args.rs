use super::AiAgentStreamRequest;

pub(super) fn build_codex_args(request: &AiAgentStreamRequest) -> Result<Vec<String>, String> {
    let mcp_server = crate::mcp::mcp_server_dir()?.join("index.js");
    let mcp_server_path = mcp_server
        .to_str()
        .ok_or("Invalid MCP server path")?
        .to_string();

    let mut args = vec![
        "exec".into(),
        "--json".into(),
        "-C".into(),
        request.vault_path.clone(),
        "-c".into(),
        r#"mcp_servers.grimoire.command="node""#.into(),
        "-c".into(),
        format!(r#"mcp_servers.grimoire.args=["{}"]"#, mcp_server_path),
        "-c".into(),
        format!(
            r#"mcp_servers.grimoire.env={{VAULT_PATH="{}"}}"#,
            request.vault_path
        ),
        "--sandbox".into(),
        "workspace-write".into(),
        "--skip-git-repo-check".into(),
        "-c".into(),
        r#"approval_policy="never""#.into(),
    ];

    if let Some(model) = normalize_cli_model(request.model.as_deref()) {
        args.push("--model".into());
        args.push(model);
    }

    Ok(args)
}

pub(super) fn build_codex_prompt(request: &AiAgentStreamRequest) -> String {
    match request
        .system_prompt
        .as_ref()
        .map(|prompt| prompt.trim())
        .filter(|prompt| !prompt.is_empty())
    {
        Some(system_prompt) => format!(
            "System instructions:\n{system_prompt}\n\nUser request:\n{}",
            request.message
        ),
        None => request.message.clone(),
    }
}

fn normalize_cli_model(model: Option<&str>) -> Option<String> {
    let model = model?.trim();
    if model.is_empty() || model.chars().any(char::is_whitespace) {
        None
    } else {
        Some(model.to_string())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::ai_agents::AiAgentId;

    #[test]
    fn build_codex_prompt_keeps_system_prompt_first() {
        let prompt = build_codex_prompt(&AiAgentStreamRequest {
            agent: AiAgentId::Codex,
            message: "Rename the note".into(),
            system_prompt: Some("Be concise".into()),
            vault_path: "/tmp/vault".into(),
            provider: None,
            model: None,
            note_path: None,
        });

        assert!(prompt.starts_with("System instructions:\nBe concise"));
        assert!(prompt.contains("User request:\nRename the note"));
    }

    #[test]
    fn build_codex_args_uses_workspace_write_without_full_access() {
        if let Ok(args) = build_codex_args(&AiAgentStreamRequest {
            agent: AiAgentId::Codex,
            message: "Rename the note".into(),
            system_prompt: None,
            vault_path: "/tmp/vault".into(),
            provider: None,
            model: None,
            note_path: None,
        }) {
            assert!(!args.contains(&"--dangerously-bypass-approvals-and-sandbox".to_string()));
            assert!(args.contains(&"--sandbox".to_string()));
            assert!(args.contains(&"workspace-write".to_string()));
            assert!(args.contains(&"--skip-git-repo-check".to_string()));
            assert!(args.contains(&r#"approval_policy="never""#.to_string()));
            assert!(args.contains(&"--json".to_string()));
            assert!(args.contains(&"-C".to_string()));
        }
    }

    #[test]
    fn build_codex_args_passes_model_override() {
        if let Ok(args) = build_codex_args(&AiAgentStreamRequest {
            agent: AiAgentId::Codex,
            message: "Rename the note".into(),
            system_prompt: None,
            vault_path: "/tmp/vault".into(),
            provider: None,
            model: Some("gpt-5.2".into()),
            note_path: None,
        }) {
            assert!(args.contains(&"--model".to_string()));
            assert!(args.contains(&"gpt-5.2".to_string()));
        }
    }
}
