use super::types::ClaudeStreamEvent;
use std::collections::HashMap;
use std::io::{BufRead, Read};
use std::path::Path;
use std::process::{Command, ExitStatus, Stdio};
use std::sync::mpsc::{self, RecvTimeoutError};
use std::thread;
use std::time::Duration;

const DEFAULT_STREAM_IDLE_TIMEOUT: Duration = Duration::from_secs(300);
const STDERR_PREVIEW_BYTES: usize = 16 * 1024;

type StdoutLine = Result<Option<String>, String>;

struct StreamState {
    session_id: String,
    /// Accumulates `input_json_delta` chunks keyed by tool_use id.
    tool_inputs: HashMap<String, String>,
    /// The tool_use id of the block currently being streamed.
    current_tool_id: Option<String>,
}

/// Core subprocess runner shared by chat and agent modes.
/// When `cwd` is `Some`, the subprocess starts with that working directory.
pub(crate) fn run_claude_subprocess<F>(
    bin: &Path,
    args: &[String],
    cwd: Option<&str>,
    emit: &mut F,
) -> Result<String, String>
where
    F: FnMut(ClaudeStreamEvent),
{
    run_claude_subprocess_with_idle_timeout(bin, args, cwd, emit, stream_idle_timeout())
}

fn run_claude_subprocess_with_idle_timeout<F>(
    bin: &Path,
    args: &[String],
    cwd: Option<&str>,
    emit: &mut F,
    idle_timeout: Duration,
) -> Result<String, String>
where
    F: FnMut(ClaudeStreamEvent),
{
    let mut cmd = Command::new(bin);
    cmd.args(args)
        .env_remove("CLAUDECODE")
        .stdout(Stdio::piped())
        .stderr(Stdio::piped());
    if let Some(dir) = cwd {
        cmd.current_dir(dir);
    }
    let mut child = cmd
        .spawn()
        .map_err(|e| format!("Failed to spawn claude: {e}"))?;

    let stdout = child.stdout.take().ok_or("No stdout handle")?;
    let stderr_handle = child.stderr.take().map(spawn_stderr_reader);
    let (line_sender, line_receiver) = mpsc::channel::<StdoutLine>();
    thread::spawn(move || stream_stdout_lines(stdout, line_sender));

    let mut state = StreamState {
        session_id: String::new(),
        tool_inputs: HashMap::new(),
        current_tool_id: None,
    };
    let mut stream_error: Option<String> = None;

    loop {
        match line_receiver.recv_timeout(idle_timeout) {
            Ok(Ok(Some(line))) => handle_stdout_line(&line, &mut state, emit),
            Ok(Ok(None)) => break,
            Ok(Err(message)) => {
                emit(ClaudeStreamEvent::Error {
                    message: format!("Read error: {message}"),
                });
                stream_error = Some(format!("Claude CLI stdout read failed: {message}"));
                break;
            }
            Err(RecvTimeoutError::Timeout) => {
                let _ = child.kill();
                stream_error = Some(format!(
                    "Claude CLI produced no output for {:?}",
                    idle_timeout
                ));
                emit(ClaudeStreamEvent::Error {
                    message: stream_error.clone().unwrap_or_default(),
                });
                break;
            }
            Err(RecvTimeoutError::Disconnected) => break,
        }
    }

    let status = child.wait().map_err(|e| format!("Wait failed: {e}"))?;
    let stderr_output = stderr_handle
        .and_then(|handle| handle.join().ok())
        .unwrap_or_default();

    if let Some(message) = stream_error {
        emit(ClaudeStreamEvent::Done);
        return Err(message);
    }

    if !status.success() {
        let message = format_failed_claude_exit(&stderr_output, status);
        emit(ClaudeStreamEvent::Error {
            message: message.clone(),
        });
        emit(ClaudeStreamEvent::Done);
        return Err(message);
    }

    emit(ClaudeStreamEvent::Done);

    Ok(state.session_id)
}

fn stream_idle_timeout() -> Duration {
    std::env::var("GRIMOIRE_CLAUDE_STREAM_IDLE_TIMEOUT_SECS")
        .ok()
        .and_then(|value| value.parse::<u64>().ok())
        .filter(|seconds| *seconds > 0)
        .map(Duration::from_secs)
        .unwrap_or(DEFAULT_STREAM_IDLE_TIMEOUT)
}

fn stream_stdout_lines<R: Read>(stdout: R, sender: mpsc::Sender<StdoutLine>) {
    for line in std::io::BufReader::new(stdout).lines() {
        if sender
            .send(line.map(Some).map_err(|error| error.to_string()))
            .is_err()
        {
            return;
        }
    }
    let _ = sender.send(Ok(None));
}

fn spawn_stderr_reader<R: Read + Send + 'static>(mut stderr: R) -> thread::JoinHandle<String> {
    thread::spawn(move || {
        let mut buffer = Vec::new();
        let mut chunk = [0_u8; 1024];
        loop {
            let Ok(count) = stderr.read(&mut chunk) else {
                break;
            };
            if count == 0 {
                break;
            }
            if buffer.len() < STDERR_PREVIEW_BYTES {
                let remaining = STDERR_PREVIEW_BYTES - buffer.len();
                buffer.extend_from_slice(&chunk[..count.min(remaining)]);
            }
        }
        String::from_utf8_lossy(&buffer).to_string()
    })
}

fn handle_stdout_line<F>(line: &str, state: &mut StreamState, emit: &mut F)
where
    F: FnMut(ClaudeStreamEvent),
{
    if line.trim().is_empty() {
        return;
    }

    if let Ok(json) = serde_json::from_str::<serde_json::Value>(line) {
        dispatch_event(&json, state, emit);
    }
}

fn format_failed_claude_exit(stderr_output: &str, status: ExitStatus) -> String {
    if is_claude_auth_error(stderr_output) {
        return "Claude CLI is not authenticated. Run `claude auth login` in your terminal.".into();
    }

    if stderr_output.is_empty() {
        format!("claude exited with status {status}")
    } else {
        stderr_output.lines().take(3).collect::<Vec<_>>().join("\n")
    }
}

fn is_claude_auth_error(stderr_output: &str) -> bool {
    let lower = stderr_output.to_ascii_lowercase();
    ["not logged in", "authentication", "auth"]
        .iter()
        .any(|pattern| lower.contains(pattern))
}

fn dispatch_event<F>(json: &serde_json::Value, state: &mut StreamState, emit: &mut F)
where
    F: FnMut(ClaudeStreamEvent),
{
    match json["type"].as_str().unwrap_or("") {
        "system" if json["subtype"].as_str() == Some("init") => {
            if let Some(sid) = json["session_id"].as_str() {
                state.session_id = sid.to_string();
                emit(ClaudeStreamEvent::Init {
                    session_id: sid.to_string(),
                });
            }
        }
        "stream_event" => dispatch_stream_event(json, state, emit),
        "tool_progress" => dispatch_tool_progress(json, emit),
        "tool_result" => dispatch_tool_result(json, emit),
        "result" => dispatch_result(json, state, emit),
        "assistant" => dispatch_assistant_message(json, state, emit),
        _ => {}
    }
}

fn dispatch_tool_progress<F>(json: &serde_json::Value, emit: &mut F)
where
    F: FnMut(ClaudeStreamEvent),
{
    if let (Some(name), Some(id)) = (json["tool_name"].as_str(), json["tool_use_id"].as_str()) {
        emit(ClaudeStreamEvent::ToolStart {
            tool_name: name.to_string(),
            tool_id: id.to_string(),
            input: None,
        });
    }
}

fn dispatch_tool_result<F>(json: &serde_json::Value, emit: &mut F)
where
    F: FnMut(ClaudeStreamEvent),
{
    if let Some(id) = json["tool_use_id"].as_str() {
        emit(ClaudeStreamEvent::ToolDone {
            tool_id: id.to_string(),
            output: extract_tool_result_text(json),
        });
    }
}

fn dispatch_result<F>(json: &serde_json::Value, state: &mut StreamState, emit: &mut F)
where
    F: FnMut(ClaudeStreamEvent),
{
    let sid = json["session_id"].as_str().unwrap_or("").to_string();
    if !sid.is_empty() {
        state.session_id = sid.clone();
    }
    emit(ClaudeStreamEvent::Result {
        text: json["result"].as_str().unwrap_or("").to_string(),
        session_id: sid,
    });
}

fn dispatch_assistant_message<F>(json: &serde_json::Value, state: &StreamState, emit: &mut F)
where
    F: FnMut(ClaudeStreamEvent),
{
    if let Some(content) = json["message"]["content"].as_array() {
        for block in content {
            if block["type"].as_str() != Some("tool_use") {
                continue;
            }
            if let (Some(id), Some(name)) = (block["id"].as_str(), block["name"].as_str()) {
                emit(ClaudeStreamEvent::ToolStart {
                    tool_name: name.to_string(),
                    tool_id: id.to_string(),
                    input: format_tool_input(&block["input"], state, id),
                });
            }
        }
    }
}

fn dispatch_stream_event<F>(json: &serde_json::Value, state: &mut StreamState, emit: &mut F)
where
    F: FnMut(ClaudeStreamEvent),
{
    let event = &json["event"];
    match event["type"].as_str().unwrap_or("") {
        "content_block_delta" => dispatch_content_block_delta(&event["delta"], state, emit),
        "content_block_start" => dispatch_content_block_start(&event["content_block"], state, emit),
        "content_block_stop" => state.current_tool_id = None,
        _ => {}
    }
}

fn dispatch_content_block_delta<F>(delta: &serde_json::Value, state: &mut StreamState, emit: &mut F)
where
    F: FnMut(ClaudeStreamEvent),
{
    match delta["type"].as_str() {
        Some("text_delta") => {
            if let Some(text) = delta["text"].as_str() {
                emit(ClaudeStreamEvent::TextDelta {
                    text: text.to_string(),
                });
            }
        }
        Some("thinking_delta") => {
            if let Some(text) = delta["thinking"].as_str() {
                emit(ClaudeStreamEvent::ThinkingDelta {
                    text: text.to_string(),
                });
            }
        }
        Some("input_json_delta") => {
            if let (Some(partial), Some(ref tid)) =
                (delta["partial_json"].as_str(), &state.current_tool_id)
            {
                state
                    .tool_inputs
                    .entry(tid.clone())
                    .or_default()
                    .push_str(partial);
            }
        }
        _ => {}
    }
}

fn dispatch_content_block_start<F>(block: &serde_json::Value, state: &mut StreamState, emit: &mut F)
where
    F: FnMut(ClaudeStreamEvent),
{
    if block["type"].as_str() == Some("tool_use") {
        if let (Some(id), Some(name)) = (block["id"].as_str(), block["name"].as_str()) {
            state.current_tool_id = Some(id.to_string());
            state.tool_inputs.entry(id.to_string()).or_default();
            emit(ClaudeStreamEvent::ToolStart {
                tool_name: name.to_string(),
                tool_id: id.to_string(),
                input: None,
            });
        }
    }
}

fn format_tool_input(
    block_input: &serde_json::Value,
    state: &StreamState,
    tool_id: &str,
) -> Option<String> {
    if let Some(accumulated) = state.tool_inputs.get(tool_id) {
        if !accumulated.is_empty() {
            return Some(accumulated.clone());
        }
    }
    if !block_input.is_null() && block_input.as_object().is_some_and(|o| !o.is_empty()) {
        return Some(block_input.to_string());
    }
    None
}

fn extract_tool_result_text(json: &serde_json::Value) -> Option<String> {
    if let Some(s) = json["content"].as_str() {
        return Some(s.to_string());
    }
    if let Some(arr) = json["content"].as_array() {
        let texts: Vec<&str> = arr.iter().filter_map(|b| b["text"].as_str()).collect();
        if !texts.is_empty() {
            return Some(texts.join("\n"));
        }
    }
    json["output"].as_str().map(|s| s.to_string())
}

#[cfg(test)]
#[path = "stream_subprocess_tests.rs"]
mod stream_subprocess_tests;
#[cfg(test)]
#[path = "stream_tests.rs"]
mod stream_tests;
