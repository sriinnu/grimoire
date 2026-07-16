#[cfg(desktop)]
use crate::ai_agents::{AiAgentStreamRequest, AiAgentsStatus};
use crate::ai_provider_keys::AiProviderKeyStatus;
use crate::claude_cli::{AgentStreamRequest, ChatStreamRequest, ClaudeCliStatus};
use crate::vault::VaultAiGuidanceStatus;

use super::expand_tilde;

#[cfg(desktop)]
type StreamEmitter<Event> = Box<dyn Fn(Event) + Send>;

#[cfg(desktop)]
async fn run_desktop_stream<Event, Request, Runner>(
    app_handle: tauri::AppHandle,
    event_name: &'static str,
    request: Request,
    runner: Runner,
) -> Result<String, String>
where
    Event: serde::Serialize + Send + 'static,
    Request: Send + 'static,
    Runner: FnOnce(Request, StreamEmitter<Event>) -> Result<String, String> + Send + 'static,
{
    use tauri::Emitter;

    tokio::task::spawn_blocking(move || {
        runner(
            request,
            Box::new(move |event| {
                let _ = app_handle.emit(event_name, &event);
            }),
        )
    })
    .await
    .map_err(|e| format!("Task failed: {e}"))?
}

#[cfg(desktop)]
macro_rules! define_desktop_stream_command {
    ($name:ident, $request:ty, $event_name:literal, $runner:path) => {
        #[tauri::command]
        pub async fn $name(
            app_handle: tauri::AppHandle,
            request: $request,
        ) -> Result<String, String> {
            run_desktop_stream(app_handle, $event_name, request, $runner).await
        }
    };
}

// ── Claude CLI commands (desktop) ───────────────────────────────────────────

#[cfg(desktop)]
#[tauri::command]
pub fn check_claude_cli() -> ClaudeCliStatus {
    crate::claude_cli::check_cli()
}

#[cfg(desktop)]
#[tauri::command]
pub fn get_ai_agents_status() -> AiAgentsStatus {
    crate::ai_agents::get_ai_agents_status()
}

#[cfg(desktop)]
#[tauri::command]
pub async fn build_chitragupta_context(
    request: crate::ai_agents::ChitraguptaContextBuildRequest,
) -> Result<serde_json::Value, String> {
    tokio::task::spawn_blocking(move || crate::ai_agents::build_chitragupta_context(request))
        .await
        .map_err(|error| format!("Context build task failed: {error}"))?
}

#[tauri::command]
pub fn get_ai_provider_key_statuses() -> Vec<AiProviderKeyStatus> {
    crate::ai_provider_keys::get_ai_provider_key_statuses()
}

#[tauri::command]
pub fn save_ai_provider_api_key(
    provider_id: String,
    api_key: String,
) -> Result<Vec<AiProviderKeyStatus>, String> {
    crate::ai_provider_keys::save_ai_provider_api_key(&provider_id, &api_key)
}

#[tauri::command]
pub fn clear_ai_provider_api_key(provider_id: String) -> Result<Vec<AiProviderKeyStatus>, String> {
    crate::ai_provider_keys::clear_ai_provider_api_key(&provider_id)
}

// ── Chitragupta daemon socket ────────────────────────────────────────────────

/// Redacted socket readiness. Never carries the token value.
#[derive(Debug, Clone, serde::Serialize)]
pub struct ChitraguptaSocketStatus {
    pub healthy: bool,
    pub version: Option<String>,
    pub token_present: bool,
    pub token_source: crate::ai_provider_keys::AiProviderKeySource,
    pub base_url: String,
}

/// Redacted daemon-token readiness returned by save/clear.
#[derive(Debug, Clone, serde::Serialize)]
pub struct ChitraguptaSocketTokenStatus {
    pub token_present: bool,
    pub token_source: crate::ai_provider_keys::AiProviderKeySource,
}

fn chitragupta_socket_token_status() -> ChitraguptaSocketTokenStatus {
    let token_source = crate::ai_provider_keys::chitragupta_socket_token_source();
    ChitraguptaSocketTokenStatus {
        token_present: token_source != crate::ai_provider_keys::AiProviderKeySource::Missing,
        token_source,
    }
}

#[tauri::command]
pub fn save_chitragupta_socket_token(token: String) -> Result<ChitraguptaSocketTokenStatus, String> {
    crate::ai_provider_keys::save_chitragupta_socket_token(&token)?;
    Ok(chitragupta_socket_token_status())
}

#[tauri::command]
pub fn clear_chitragupta_socket_token() -> Result<ChitraguptaSocketTokenStatus, String> {
    crate::ai_provider_keys::clear_chitragupta_socket_token()?;
    Ok(chitragupta_socket_token_status())
}

#[cfg(desktop)]
#[tauri::command]
pub async fn get_chitragupta_socket_status() -> Result<ChitraguptaSocketStatus, String> {
    tokio::task::spawn_blocking(|| {
        let base_url = crate::chitragupta_socket::socket_base_url();
        let health = crate::chitragupta_socket::probe_health(&base_url);
        let token = chitragupta_socket_token_status();
        ChitraguptaSocketStatus {
            healthy: health.healthy,
            version: health.version,
            token_present: token.token_present,
            token_source: token.token_source,
            base_url,
        }
    })
    .await
    .map_err(|error| format!("Socket status task failed: {error}"))
}

#[cfg(desktop)]
#[tauri::command]
pub async fn list_chitragupta_note_sessions(
    vault_path: String,
    note_path: String,
) -> Result<Vec<crate::chitragupta_socket::TrimmedChitraguptaSession>, String> {
    tokio::task::spawn_blocking(move || {
        use crate::chitragupta_socket as socket;
        let token = socket::SocketToken::new(
            crate::ai_provider_keys::chitragupta_socket_token()
                .ok_or("Chitragupta daemon token is not configured.")?,
        );
        let base = socket::socket_base_url();
        let sessions = socket::list_sessions(&base, &token, &vault_path, "grimoire")?;
        Ok(sessions
            .iter()
            .filter(|summary| socket::session_matches_note(summary, &vault_path, &note_path))
            .filter_map(socket::trim_session_summary)
            .collect())
    })
    .await
    .map_err(|error| format!("Session list task failed: {error}"))?
}

#[cfg(desktop)]
#[tauri::command]
pub async fn get_chitragupta_session(id: String) -> Result<serde_json::Value, String> {
    tokio::task::spawn_blocking(move || {
        use crate::chitragupta_socket as socket;
        let token = socket::SocketToken::new(
            crate::ai_provider_keys::chitragupta_socket_token()
                .ok_or("Chitragupta daemon token is not configured.")?,
        );
        socket::get_session(&socket::socket_base_url(), &token, &id)
    })
    .await
    .map_err(|error| format!("Session fetch task failed: {error}"))?
}

#[cfg(mobile)]
#[tauri::command]
pub async fn get_chitragupta_socket_status() -> Result<ChitraguptaSocketStatus, String> {
    Ok(ChitraguptaSocketStatus {
        healthy: false,
        version: None,
        token_present: false,
        token_source: crate::ai_provider_keys::AiProviderKeySource::Missing,
        base_url: crate::chitragupta_socket::socket_base_url(),
    })
}

#[cfg(mobile)]
#[tauri::command]
pub async fn list_chitragupta_note_sessions(
    _vault_path: String,
    _note_path: String,
) -> Result<Vec<crate::chitragupta_socket::TrimmedChitraguptaSession>, String> {
    Err("Chitragupta daemon sessions are not available on mobile.".into())
}

#[cfg(mobile)]
#[tauri::command]
pub async fn get_chitragupta_session(_id: String) -> Result<serde_json::Value, String> {
    Err("Chitragupta daemon sessions are not available on mobile.".into())
}

#[tauri::command]
pub fn get_vault_ai_guidance_status(vault_path: String) -> Result<VaultAiGuidanceStatus, String> {
    let vault_path = expand_tilde(&vault_path);
    crate::vault::get_ai_guidance_status(vault_path.as_ref())
}

#[tauri::command]
pub fn restore_vault_ai_guidance(vault_path: String) -> Result<VaultAiGuidanceStatus, String> {
    let vault_path = expand_tilde(&vault_path);
    crate::vault::restore_ai_guidance_files(vault_path.as_ref())
}

#[cfg(desktop)]
define_desktop_stream_command!(
    stream_claude_chat,
    ChatStreamRequest,
    "claude-stream",
    crate::claude_cli::run_chat_stream
);

#[cfg(desktop)]
define_desktop_stream_command!(
    stream_claude_agent,
    AgentStreamRequest,
    "claude-agent-stream",
    crate::claude_cli::run_agent_stream
);

#[cfg(desktop)]
define_desktop_stream_command!(
    stream_ai_agent,
    AiAgentStreamRequest,
    "ai-agent-stream",
    crate::ai_agents::run_ai_agent_stream
);

// ── Claude CLI (mobile stubs) ───────────────────────────────────────────────

#[cfg(mobile)]
#[tauri::command]
pub fn check_claude_cli() -> ClaudeCliStatus {
    ClaudeCliStatus {
        installed: false,
        version: None,
        detail: Some("Claude CLI is not available on mobile.".into()),
    }
}

#[cfg(mobile)]
#[tauri::command]
pub fn get_ai_agents_status() -> AiAgentsStatus {
    AiAgentsStatus {
        claude_code: crate::ai_agents::AiAgentAvailability {
            installed: false,
            version: None,
            detail: Some("Claude Code CLI is not available on mobile.".into()),
        },
        codex: crate::ai_agents::AiAgentAvailability {
            installed: false,
            version: None,
            detail: Some("Codex CLI is not available on mobile.".into()),
        },
        chitragupta: crate::ai_agents::AiAgentAvailability {
            installed: false,
            version: None,
            detail: Some("Chitragupta CLI is not available on mobile.".into()),
        },
    }
}

#[cfg(mobile)]
#[tauri::command]
pub async fn build_chitragupta_context(
    _request: crate::ai_agents::ChitraguptaContextBuildRequest,
) -> Result<serde_json::Value, String> {
    Err("Chitragupta CLI context recall is not available on mobile yet.".into())
}

#[cfg(mobile)]
#[tauri::command]
pub async fn stream_claude_chat(
    _app_handle: tauri::AppHandle,
    _request: ChatStreamRequest,
) -> Result<String, String> {
    Err("Claude CLI is not available on mobile".into())
}

#[cfg(mobile)]
#[tauri::command]
pub async fn stream_claude_agent(
    _app_handle: tauri::AppHandle,
    _request: AgentStreamRequest,
) -> Result<String, String> {
    Err("Claude CLI is not available on mobile".into())
}

#[cfg(mobile)]
#[tauri::command]
pub async fn stream_ai_agent(
    _app_handle: tauri::AppHandle,
    _request: AiAgentStreamRequest,
) -> Result<String, String> {
    Err("CLI AI agents are not available on mobile".into())
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::vault::AiGuidanceFileState;

    #[test]
    fn guidance_commands_report_and_restore_vault_guidance_files() {
        let dir = tempfile::TempDir::new().unwrap();
        let vault_path = dir.path().to_string_lossy().to_string();

        let initial = get_vault_ai_guidance_status(vault_path.clone()).unwrap();
        assert_eq!(initial.agents_state, AiGuidanceFileState::Missing);
        assert_eq!(initial.claude_state, AiGuidanceFileState::Missing);
        assert!(initial.can_restore);

        let restored = restore_vault_ai_guidance(vault_path.clone()).unwrap();
        assert_eq!(restored.agents_state, AiGuidanceFileState::Managed);
        assert_eq!(restored.claude_state, AiGuidanceFileState::Managed);
        assert!(!restored.can_restore);

        assert!(dir.path().join("AGENTS.md").exists());
        assert!(dir.path().join("CLAUDE.md").exists());
    }
}
