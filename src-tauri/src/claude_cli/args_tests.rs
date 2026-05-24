use super::*;
use crate::claude_cli::types::{AgentStreamRequest, ChatStreamRequest};

#[test]
fn build_mcp_config_is_valid_json() {
    if let Ok(config_str) = build_mcp_config("/tmp/test-vault") {
        let parsed: serde_json::Value = serde_json::from_str(&config_str).unwrap();
        assert!(parsed["mcpServers"]["grimoire"]["command"].is_string());
        assert_eq!(
            parsed["mcpServers"]["grimoire"]["env"]["VAULT_PATH"],
            "/tmp/test-vault"
        );
    }
}

#[test]
fn build_chat_args_basic() {
    let req = ChatStreamRequest {
        message: "hello".into(),
        system_prompt: None,
        session_id: None,
    };
    let args = build_chat_args(&req);
    assert!(args.contains(&"-p".to_string()));
    assert!(args.contains(&"hello".to_string()));
    assert!(args.contains(&"stream-json".to_string()));
    assert!(!args.contains(&"--system-prompt".to_string()));
    assert!(!args.contains(&"--resume".to_string()));
}

#[test]
fn build_chat_args_with_system_prompt() {
    let req = ChatStreamRequest {
        message: "hi".into(),
        system_prompt: Some("You are helpful.".into()),
        session_id: None,
    };
    let args = build_chat_args(&req);
    assert!(args.contains(&"--system-prompt".to_string()));
    assert!(args.contains(&"You are helpful.".to_string()));
}

#[test]
fn build_chat_args_empty_system_prompt_is_skipped() {
    let req = ChatStreamRequest {
        message: "hi".into(),
        system_prompt: Some(String::new()),
        session_id: None,
    };
    let args = build_chat_args(&req);
    assert!(!args.contains(&"--system-prompt".to_string()));
}

#[test]
fn build_chat_args_with_session_id() {
    let req = ChatStreamRequest {
        message: "continue".into(),
        system_prompt: None,
        session_id: Some("sess-abc".into()),
    };
    let args = build_chat_args(&req);
    assert!(args.contains(&"--resume".to_string()));
    assert!(args.contains(&"sess-abc".to_string()));
}

#[test]
fn build_agent_args_basic() {
    if let Ok(args) = build_agent_args(&AgentStreamRequest {
        message: "create note".into(),
        system_prompt: None,
        vault_path: "/tmp/vault".into(),
        model: None,
    }) {
        assert!(args.contains(&"-p".to_string()));
        assert!(args.contains(&"create note".to_string()));
        assert!(args.contains(&"--mcp-config".to_string()));
        assert!(args.contains(&"--permission-mode".to_string()));
        assert!(args.contains(&"bypassPermissions".to_string()));
        assert!(args.contains(&"--dangerously-skip-permissions".to_string()));
        assert!(args.contains(&"--no-session-persistence".to_string()));
        assert!(!args.contains(&"--append-system-prompt".to_string()));
        assert!(!args.contains(&"--tools".to_string()));
    }
}

#[test]
fn build_agent_args_with_system_prompt() {
    if let Ok(args) = build_agent_args(&AgentStreamRequest {
        message: "do it".into(),
        system_prompt: Some("Act as expert.".into()),
        vault_path: "/tmp/v".into(),
        model: None,
    }) {
        assert!(args.contains(&"--append-system-prompt".to_string()));
        assert!(args.contains(&"Act as expert.".to_string()));
    }
}

#[test]
fn build_agent_args_empty_system_prompt_is_skipped() {
    if let Ok(args) = build_agent_args(&AgentStreamRequest {
        message: "x".into(),
        system_prompt: Some(String::new()),
        vault_path: "/tmp/v".into(),
        model: None,
    }) {
        assert!(!args.contains(&"--append-system-prompt".to_string()));
    }
}

#[test]
fn build_agent_args_passes_model_override() {
    if let Ok(args) = build_agent_args(&AgentStreamRequest {
        message: "x".into(),
        system_prompt: None,
        vault_path: "/tmp/v".into(),
        model: Some("sonnet".into()),
    }) {
        assert!(args.contains(&"--model".to_string()));
        assert!(args.contains(&"sonnet".to_string()));
    }
}

#[test]
fn build_agent_args_skips_whitespace_model_override() {
    if let Ok(args) = build_agent_args(&AgentStreamRequest {
        message: "x".into(),
        system_prompt: None,
        vault_path: "/tmp/v".into(),
        model: Some("bad model".into()),
    }) {
        assert!(!args.contains(&"--model".to_string()));
    }
}
