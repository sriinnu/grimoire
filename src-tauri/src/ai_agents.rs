mod args;
mod discovery;
mod events;

use serde::{Deserialize, Serialize};
use std::io::BufRead;
use std::process::{Command, Stdio};

use args::{build_chitragupta_args, build_codex_args, build_codex_prompt};
use discovery::{find_chitragupta_binary, find_codex_binary, version_for_binary};
use events::{
    dispatch_codex_event, format_chitragupta_error, format_codex_error, map_claude_event,
};

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

    let mut command = Command::new(binary);
    command
        .args(args)
        .arg(prompt)
        .current_dir(&request.vault_path)
        .stdout(Stdio::piped())
        .stderr(Stdio::piped());

    let mut child = command
        .spawn()
        .map_err(|error| format!("Failed to spawn codex: {error}"))?;

    let stdout = child.stdout.take().ok_or("No stdout handle")?;
    let reader = std::io::BufReader::new(stdout);

    let mut thread_id = String::new();

    for line in reader.lines() {
        let line = match line {
            Ok(line) => line,
            Err(error) => {
                emit(AiAgentStreamEvent::Error {
                    message: format!("Read error: {error}"),
                });
                break;
            }
        };

        if line.trim().is_empty() {
            continue;
        }

        let json = match serde_json::from_str::<serde_json::Value>(&line) {
            Ok(json) => json,
            Err(_) => continue,
        };

        if let Some(id) = json["thread_id"].as_str() {
            thread_id = id.to_string();
        }

        dispatch_codex_event(&json, &mut emit);
    }

    let stderr_output = child
        .stderr
        .take()
        .and_then(|stderr| std::io::read_to_string(stderr).ok())
        .unwrap_or_default();

    let status = child
        .wait()
        .map_err(|error| format!("Wait failed: {error}"))?;
    if !status.success() {
        emit(AiAgentStreamEvent::Error {
            message: format_codex_error(stderr_output, status.to_string()),
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

    let mut command = Command::new(binary);
    command.args(args);

    let mut child = command
        .current_dir(&request.vault_path)
        .env("CHITRAGUPTA_PRINT_LOGS", "0")
        .env("CHITRAGUPTA_PRINT_NIDRA", "0")
        .env("LOG_LEVEL", "fatal")
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .spawn()
        .map_err(|error| format!("Failed to spawn chitragupta: {error}"))?;

    let stdout = child.stdout.take().ok_or("No stdout handle")?;
    let reader = std::io::BufReader::new(stdout);

    for line in reader.lines() {
        match line {
            Ok(line) => emit(AiAgentStreamEvent::TextDelta {
                text: format!("{line}\n"),
            }),
            Err(error) => {
                emit(AiAgentStreamEvent::Error {
                    message: format!("Read error: {error}"),
                });
                break;
            }
        }
    }

    let stderr_output = child
        .stderr
        .take()
        .and_then(|stderr| std::io::read_to_string(stderr).ok())
        .unwrap_or_default();

    let status = child
        .wait()
        .map_err(|error| format!("Wait failed: {error}"))?;
    if !status.success() {
        emit(AiAgentStreamEvent::Error {
            message: format_chitragupta_error(stderr_output, status.to_string()),
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
