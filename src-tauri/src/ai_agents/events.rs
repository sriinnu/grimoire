use super::AiAgentStreamEvent;

pub(super) fn dispatch_codex_event<F>(json: &serde_json::Value, emit: &mut F)
where
    F: FnMut(AiAgentStreamEvent),
{
    match json["type"].as_str().unwrap_or_default() {
        "thread.started" => {
            if let Some(thread_id) = json["thread_id"].as_str() {
                emit(AiAgentStreamEvent::Init {
                    session_id: thread_id.to_string(),
                });
            }
        }
        "item.started" => emit_codex_item_event(json, false, emit),
        "item.completed" => emit_codex_item_event(json, true, emit),
        _ => {}
    }
}

pub(super) fn format_codex_error(stderr_output: String, status: String) -> String {
    let lower = stderr_output.to_ascii_lowercase();
    if is_codex_auth_error(&lower) {
        return "Codex CLI is not authenticated. Run `codex login` or launch `codex` in your terminal.".into();
    }

    if stderr_output.trim().is_empty() {
        format!("codex exited with status {status}")
    } else {
        stderr_output.lines().take(3).collect::<Vec<_>>().join("\n")
    }
}

pub(super) fn format_chitragupta_error(stderr_output: String, status: String) -> String {
    if stderr_output.trim().is_empty() {
        format!("chitragupta exited with status {status}")
    } else {
        stderr_output.lines().take(3).collect::<Vec<_>>().join("\n")
    }
}

pub(super) fn map_claude_event(
    event: crate::claude_cli::ClaudeStreamEvent,
) -> Option<AiAgentStreamEvent> {
    match event {
        crate::claude_cli::ClaudeStreamEvent::Init { session_id } => {
            Some(AiAgentStreamEvent::Init { session_id })
        }
        crate::claude_cli::ClaudeStreamEvent::TextDelta { text } => {
            Some(AiAgentStreamEvent::TextDelta { text })
        }
        crate::claude_cli::ClaudeStreamEvent::ThinkingDelta { text } => {
            Some(AiAgentStreamEvent::ThinkingDelta { text })
        }
        crate::claude_cli::ClaudeStreamEvent::ToolStart {
            tool_name,
            tool_id,
            input,
        } => Some(AiAgentStreamEvent::ToolStart {
            tool_name,
            tool_id,
            input,
        }),
        crate::claude_cli::ClaudeStreamEvent::ToolDone { tool_id, output } => {
            Some(AiAgentStreamEvent::ToolDone { tool_id, output })
        }
        crate::claude_cli::ClaudeStreamEvent::Error { message } => {
            Some(AiAgentStreamEvent::Error { message })
        }
        crate::claude_cli::ClaudeStreamEvent::Done => Some(AiAgentStreamEvent::Done),
        crate::claude_cli::ClaudeStreamEvent::Result { .. } => None,
    }
}

fn emit_codex_item_event<F>(json: &serde_json::Value, completed: bool, emit: &mut F)
where
    F: FnMut(AiAgentStreamEvent),
{
    let item = &json["item"];
    let item_type = item["type"].as_str().unwrap_or_default();
    let item_id = item["id"].as_str().unwrap_or_default();

    match item_type {
        "command_execution" => {
            if completed {
                emit(AiAgentStreamEvent::ToolDone {
                    tool_id: item_id.to_string(),
                    output: item["aggregated_output"]
                        .as_str()
                        .map(|output| output.to_string()),
                });
            } else {
                emit(AiAgentStreamEvent::ToolStart {
                    tool_name: "Bash".into(),
                    tool_id: item_id.to_string(),
                    input: item["command"]
                        .as_str()
                        .map(|command| serde_json::json!({ "command": command }).to_string()),
                });
            }
        }
        "agent_message" if completed => {
            if let Some(text) = item["text"].as_str() {
                emit(AiAgentStreamEvent::TextDelta {
                    text: text.to_string(),
                });
            }
        }
        _ => {}
    }
}

fn is_codex_auth_error(lower: &str) -> bool {
    ["auth", "login", "sign in"]
        .iter()
        .any(|pattern| lower.contains(pattern))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn dispatch_codex_command_events_maps_to_bash_events() {
        let mut events = Vec::new();
        let started = serde_json::json!({
            "type": "item.started",
            "item": {
                "id": "item_1",
                "type": "command_execution",
                "command": "/bin/zsh -lc pwd"
            }
        });
        let completed = serde_json::json!({
            "type": "item.completed",
            "item": {
                "id": "item_1",
                "type": "command_execution",
                "aggregated_output": "/private/tmp\n"
            }
        });

        dispatch_codex_event(&started, &mut |event| events.push(event));
        dispatch_codex_event(&completed, &mut |event| events.push(event));

        assert!(matches!(
            &events[0],
            AiAgentStreamEvent::ToolStart { tool_name, tool_id, .. }
                if tool_name == "Bash" && tool_id == "item_1"
        ));
        assert!(matches!(
            &events[1],
            AiAgentStreamEvent::ToolDone { tool_id, output }
                if tool_id == "item_1" && output.as_deref() == Some("/private/tmp\n")
        ));
    }

    #[test]
    fn dispatch_codex_agent_message_maps_to_text_delta() {
        let mut events = Vec::new();
        let completed = serde_json::json!({
            "type": "item.completed",
            "item": {
                "id": "item_2",
                "type": "agent_message",
                "text": "All set"
            }
        });

        dispatch_codex_event(&completed, &mut |event| events.push(event));

        assert!(matches!(
            &events[0],
            AiAgentStreamEvent::TextDelta { text } if text == "All set"
        ));
    }

    #[test]
    fn map_claude_done_event_preserves_completion_signal() {
        let mapped = map_claude_event(crate::claude_cli::ClaudeStreamEvent::Done);

        assert!(matches!(mapped, Some(AiAgentStreamEvent::Done)));
    }
}
