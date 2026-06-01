mod args;
mod chitragupta_events;
mod discovery;
mod events;
mod path_env;
mod process_stream;

use serde::{Deserialize, Serialize};
use std::process::Stdio;

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
    }
}

fn availability_from_codex() -> AiAgentAvailability {
    let binary = match find_codex_binary() {
        Ok(binary) => binary,
        Err(_) => {
            return AiAgentAvailability {
                installed: false,
                version: None,
            }
        }
    };

    AiAgentAvailability {
        installed: true,
        version: version_for_binary(&binary),
    }
}

fn availability_from_chitragupta() -> AiAgentAvailability {
    let binary = match find_chitragupta_binary() {
        Ok(binary) => binary,
        Err(_) => {
            return AiAgentAvailability {
                installed: false,
                version: None,
            }
        }
    };

    AiAgentAvailability {
        installed: true,
        version: version_for_binary(&binary),
    }
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

fn run_chitragupta_agent_stream<F>(
    request: AiAgentStreamRequest,
    mut emit: F,
) -> Result<String, String>
where
    F: FnMut(AiAgentStreamEvent),
{
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
    fn normalize_status_contains_all_agents() {
        let status = get_ai_agents_status();
        assert!(matches!(status.claude_code.installed, true | false));
        assert!(matches!(status.codex.installed, true | false));
        assert!(matches!(status.chitragupta.installed, true | false));
    }
}
