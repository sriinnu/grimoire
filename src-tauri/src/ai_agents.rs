mod args;
mod chitragupta_events;
mod discovery;
mod events;
mod pairing;
mod path_env;
mod process_stream;

#[cfg(desktop)]
pub use pairing::rotate_chitragupta_socket_secret;

use serde::{Deserialize, Serialize};
use std::path::Path;
use std::process::Stdio;
#[cfg(desktop)]
use std::time::Duration;

use args::{build_chitragupta_args, build_codex_args, build_codex_prompt};
use chitragupta_events::dispatch_chitragupta_event;
use discovery::{find_chitragupta_binary, find_codex_binary, version_for_binary};
use events::{
    dispatch_codex_event, format_chitragupta_error, format_codex_error, map_claude_event,
};
use path_env::command_for_binary;
use process_stream::{agent_stream_idle_timeout, run_command_line_stream};

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum AiAgentId {
    ClaudeCode,
    Codex,
    Chitragupta,
}

#[derive(Debug, Clone, Serialize)]
pub struct AiAgentAvailability {
    pub installed: bool,
    pub version: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub detail: Option<String>,
}

#[derive(Debug, Clone, Serialize)]
pub struct AiAgentsStatus {
    pub claude_code: AiAgentAvailability,
    pub codex: AiAgentAvailability,
    pub chitragupta: AiAgentAvailability,
}

#[derive(Debug, Clone, Serialize)]
#[serde(tag = "kind")]
pub enum AiAgentStreamEvent {
    Init {
        session_id: String,
    },
    TextDelta {
        text: String,
    },
    ThinkingDelta {
        text: String,
    },
    ToolStart {
        tool_name: String,
        tool_id: String,
        #[serde(skip_serializing_if = "Option::is_none")]
        input: Option<String>,
    },
    ToolDone {
        tool_id: String,
        #[serde(skip_serializing_if = "Option::is_none")]
        output: Option<String>,
    },
    RouteResolved {
        #[serde(skip_serializing_if = "Option::is_none")]
        provider: Option<String>,
        #[serde(skip_serializing_if = "Option::is_none")]
        model: Option<String>,
        source: String,
    },
    Error {
        message: String,
    },
    Done,
}

#[derive(Debug, Clone, Deserialize)]
pub struct AiAgentStreamRequest {
    pub agent: AiAgentId,
    pub message: String,
    pub system_prompt: Option<String>,
    pub vault_path: String,
    pub provider: Option<String>,
    pub model: Option<String>,
    /// Vault-relative path of the active note. Used as the Chitragupta socket
    /// session lineage key so conversations thread per note.
    #[serde(default)]
    pub note_path: Option<String>,
}

/** A deliberately narrow request for Chitragupta-owned recall assembly. */
#[derive(Debug, Clone, Deserialize)]
pub struct ChitraguptaContextBuildRequest {
    pub query: String,
    pub project: String,
    pub request_id: Option<String>,
    pub intent: Option<String>,
    pub limit: Option<u8>,
}

/**
 * Run the reviewed `context.build` seam through the installed Chitragupta CLI.
 *
 * Grimoire passes an explicit user question and vault path only. It does not
 * add note bodies, selections, or Git content to this invocation.
 */
#[cfg(desktop)]
pub fn build_chitragupta_context(
    request: ChitraguptaContextBuildRequest,
) -> Result<serde_json::Value, String> {
    let query = request.query.trim();
    if query.is_empty() {
        return Err("A recall question is required.".into());
    }
    let project = request.project.trim();
    if project.is_empty() {
        return Err("A vault path is required.".into());
    }
    let limit = request.limit.unwrap_or(5);
    if !(1..=20).contains(&limit) {
        return Err("Recall limit must be between 1 and 20.".into());
    }

    let binary = find_chitragupta_binary()?;
    let mut command = command_for_binary(&binary);
    command
        .arg("context")
        .arg("build")
        .arg(query)
        .arg("--project")
        .arg(project)
        .arg("--limit")
        .arg(limit.to_string())
        .arg("--json");
    if let Some(request_id) = request.request_id.filter(|value| !value.trim().is_empty()) {
        command.arg("--request-id").arg(request_id);
    }
    if let Some(intent) = request.intent.filter(|value| !value.trim().is_empty()) {
        command.arg("--intent").arg(intent);
    }

    let output = discovery::output_with_timeout(command, Duration::from_secs(12))?;
    if !output.status.success() {
        let detail = String::from_utf8_lossy(&output.stderr).trim().to_string();
        return Err(if detail.is_empty() {
            format!(
                "Chitragupta context build exited with status {}.",
                output.status
            )
        } else {
            format!(
                "Chitragupta context build failed: {}",
                detail.chars().take(360).collect::<String>()
            )
        });
    }

    serde_json::from_slice(&output.stdout)
        .map_err(|_| "Chitragupta returned an unreadable context packet.".to_string())
}

pub fn get_ai_agents_status() -> AiAgentsStatus {
    AiAgentsStatus {
        claude_code: availability_from_claude(),
        codex: availability_from_codex(),
        chitragupta: availability_from_chitragupta(),
    }
}

pub fn run_ai_agent_stream<F>(request: AiAgentStreamRequest, mut emit: F) -> Result<String, String>
where
    F: FnMut(AiAgentStreamEvent),
{
    match request.agent {
        AiAgentId::ClaudeCode => {
            let mapped = crate::claude_cli::AgentStreamRequest {
                message: request.message,
                system_prompt: request.system_prompt,
                vault_path: request.vault_path,
                model: request.model,
            };
            crate::claude_cli::run_agent_stream(mapped, |event| {
                if let Some(mapped_event) = map_claude_event(event) {
                    emit(mapped_event);
                }
            })
        }
        AiAgentId::Codex => run_codex_agent_stream(request, emit),
        AiAgentId::Chitragupta => run_chitragupta_agent_stream(request, emit),
    }
}

fn availability_from_claude() -> AiAgentAvailability {
    let status = crate::claude_cli::check_cli();
    AiAgentAvailability {
        installed: status.installed,
        version: status.version,
        detail: status.detail,
    }
}

fn availability_from_codex() -> AiAgentAvailability {
    let binary = match find_codex_binary() {
        Ok(binary) => binary,
        Err(error) => {
            return AiAgentAvailability {
                installed: false,
                version: None,
                detail: Some(error),
            }
        }
    };
    let version = version_for_binary(&binary);
    let detail = version
        .is_none()
        .then(|| "Codex CLI found; version command did not return a value.".to_string());

    AiAgentAvailability {
        installed: true,
        version,
        detail,
    }
}

fn availability_from_chitragupta() -> AiAgentAvailability {
    let binary = match find_chitragupta_binary() {
        Ok(binary) => binary,
        Err(error) => {
            return AiAgentAvailability {
                installed: false,
                version: None,
                detail: Some(chitragupta_missing_detail(error)),
            }
        }
    };

    AiAgentAvailability {
        installed: true,
        version: version_for_binary(&binary),
        detail: Some("Chitragupta CLI chat route found. MCP memory, recall, wiki, graph, and diagnostics are separate readiness checks.".into()),
    }
}

fn chitragupta_missing_detail(error: String) -> String {
    if cfg!(target_os = "macos") && Path::new("/Applications/Chitragupta.app").exists() {
        return "Chitragupta app found, but the local `chitragupta` CLI route was not found. Install or link the CLI for Grimoire chat.".into();
    }
    error
}

fn run_codex_agent_stream<F>(request: AiAgentStreamRequest, mut emit: F) -> Result<String, String>
where
    F: FnMut(AiAgentStreamEvent),
{
    let binary = find_codex_binary()?;
    let args = build_codex_args(&request)?;
    let prompt = build_codex_prompt(&request);

    let mut command = command_for_binary(&binary);
    command
        .args(args)
        .arg(prompt)
        .current_dir(&request.vault_path)
        .stdin(Stdio::null())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped());
    crate::ai_provider_keys::apply_provider_keys_to_command(&mut command, AiAgentId::Codex);

    let mut thread_id = String::new();
    let outcome = match run_command_line_stream(
        command,
        agent_stream_idle_timeout("GRIMOIRE_CODEX_STREAM_IDLE_TIMEOUT_SECS"),
        "codex",
        |line| {
            if line.trim().is_empty() {
                return;
            }

            let json = match serde_json::from_str::<serde_json::Value>(line) {
                Ok(json) => json,
                Err(_) => return,
            };

            if let Some(id) = json["thread_id"].as_str() {
                thread_id = id.to_string();
            }

            dispatch_codex_event(&json, &mut emit);
        },
    ) {
        Ok(outcome) => outcome,
        Err(message) => {
            emit(AiAgentStreamEvent::Error {
                message: message.clone(),
            });
            emit(AiAgentStreamEvent::Done);
            return Err(message);
        }
    };

    if !outcome.status.success() {
        emit(AiAgentStreamEvent::Error {
            message: format_codex_error(outcome.stderr_output, outcome.status.to_string()),
        });
    }

    emit(AiAgentStreamEvent::Done);

    Ok(thread_id)
}

/// Prefer the local Chitragupta daemon socket when it is healthy and a token
/// exists; otherwise fall through to the CLI. Returns `None` when the socket
/// route is unavailable (caller should run the CLI path), and `Some(result)`
/// when the socket handled — or definitively failed — this message.
fn run_chitragupta_socket_stream<F>(
    request: &AiAgentStreamRequest,
    emit: &mut F,
) -> Option<Result<String, String>>
where
    F: FnMut(AiAgentStreamEvent),
{
    use crate::chitragupta_socket as socket;

    let base = socket::socket_base_url();
    if !socket::cached_health(&base).healthy {
        return None;
    }
    let token = socket::SocketToken::new(crate::ai_provider_keys::chitragupta_socket_token()?);

    let note_path = request
        .note_path
        .as_deref()
        .map(str::trim)
        .filter(|path| !path.is_empty())
        .unwrap_or("");
    let chat_request = socket::SocketChatRequest {
        message: build_codex_prompt(request),
        session_id: socket::remembered_session_id(&request.vault_path, note_path),
        project_path: Some(request.vault_path.clone()),
        title: Some(chitragupta_socket_title(note_path)),
        provider: normalized_route_override(request.provider.as_deref()),
        model: normalized_route_override(request.model.as_deref()),
        consumer: "grimoire".into(),
        surface: "grimoire-app".into(),
        channel: "editor".into(),
        session_lineage_key: (!note_path.is_empty()).then(|| note_path.to_string()),
    };

    match socket::chat(&base, &token, &chat_request) {
        Ok(reply) => {
            let session_id = reply.session_id.clone().unwrap_or_default();
            if !session_id.is_empty() {
                socket::remember_session_id(&request.vault_path, note_path, &session_id);
                emit(AiAgentStreamEvent::Init {
                    session_id: session_id.clone(),
                });
            }
            emit(AiAgentStreamEvent::RouteResolved {
                provider: reply.provider,
                model: reply.model,
                source: "chitragupta-socket".to_string(),
            });
            match reply.text {
                Some(text) => {
                    emit(AiAgentStreamEvent::TextDelta { text });
                    emit(AiAgentStreamEvent::Done);
                    Some(Ok(session_id))
                }
                None => {
                    // The daemon answered but with a shape we don't recognize.
                    // Do not resend anywhere: the message may already be
                    // processed on the daemon side.
                    let message =
                        "Chitragupta daemon accepted the message but returned no readable reply."
                            .to_string();
                    emit(AiAgentStreamEvent::Error {
                        message: message.clone(),
                    });
                    emit(AiAgentStreamEvent::Done);
                    Some(Err(message))
                }
            }
        }
        Err(error) => {
            // Mark unhealthy so the NEXT message routes through the CLI.
            // Never auto-retry this one — a chat message must not double-send.
            socket::mark_socket_unhealthy(&base);
            let message = format!("{error} The next message will use the Chitragupta CLI instead.");
            emit(AiAgentStreamEvent::Error {
                message: message.clone(),
            });
            emit(AiAgentStreamEvent::Done);
            Some(Err(message))
        }
    }
}

fn chitragupta_socket_title(note_path: &str) -> String {
    let stem = Path::new(note_path)
        .file_stem()
        .and_then(|stem| stem.to_str())
        .map(str::trim)
        .filter(|stem| !stem.is_empty());
    match stem {
        Some(stem) => format!("Grimoire · {stem}"),
        None => "Grimoire chat".to_string(),
    }
}

fn normalized_route_override(value: Option<&str>) -> Option<String> {
    value
        .map(str::trim)
        .filter(|value| !value.is_empty())
        .map(ToString::to_string)
}

fn run_chitragupta_agent_stream<F>(
    request: AiAgentStreamRequest,
    mut emit: F,
) -> Result<String, String>
where
    F: FnMut(AiAgentStreamEvent),
{
    if let Some(outcome) = run_chitragupta_socket_stream(&request, &mut emit) {
        return outcome;
    }

    let binary = find_chitragupta_binary()?;
    let args = build_chitragupta_args(&request);

    let mut command = command_for_binary(&binary);
    command
        .args(args)
        .current_dir(&request.vault_path)
        .env("CHITRAGUPTA_PRINT_LOGS", "0")
        .env("CHITRAGUPTA_PRINT_NIDRA", "0")
        .env("LOG_LEVEL", "fatal")
        .stdin(Stdio::null())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped());
    crate::ai_provider_keys::apply_provider_keys_to_command(&mut command, AiAgentId::Chitragupta);

    let idle_timeout = agent_stream_idle_timeout("GRIMOIRE_CHITRAGUPTA_STREAM_IDLE_TIMEOUT_SECS");
    let outcome = match run_command_line_stream(command, idle_timeout, "chitragupta", |line| {
        dispatch_chitragupta_event(line, &mut emit);
    }) {
        Ok(outcome) => outcome,
        Err(message) => {
            emit(AiAgentStreamEvent::Error {
                message: message.clone(),
            });
            emit(AiAgentStreamEvent::Done);
            return Err(message);
        }
    };

    if !outcome.status.success() {
        emit(AiAgentStreamEvent::Error {
            message: format_chitragupta_error(outcome.stderr_output, outcome.status.to_string()),
        });
    }

    emit(AiAgentStreamEvent::Done);

    Ok(String::new())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn socket_title_derives_from_note_stem_with_a_default() {
        assert_eq!(
            chitragupta_socket_title("notes/alpha-plan.md"),
            "Grimoire · alpha-plan"
        );
        assert_eq!(chitragupta_socket_title(""), "Grimoire chat");
    }

    #[test]
    fn socket_route_overrides_drop_blank_values() {
        assert_eq!(normalized_route_override(Some("  ")), None);
        assert_eq!(normalized_route_override(None), None);
        assert_eq!(
            normalized_route_override(Some(" openai ")).as_deref(),
            Some("openai")
        );
    }

    #[test]
    fn normalize_status_contains_all_agents() {
        let status = get_ai_agents_status();
        assert!(matches!(status.claude_code.installed, true | false));
        assert!(matches!(status.codex.installed, true | false));
        assert!(matches!(status.chitragupta.installed, true | false));
    }
}
