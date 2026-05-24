mod args;
mod discovery;
mod process;
mod stream;
mod types;

use process::output_with_timeout;
use std::process::Command;
use std::time::Duration;

pub(crate) use discovery::find_claude_binary;
pub use types::{AgentStreamRequest, ChatStreamRequest, ClaudeCliStatus, ClaudeStreamEvent};

/// Check whether the `claude` CLI is installed and return its version.
pub fn check_cli() -> ClaudeCliStatus {
    let bin = match find_claude_binary() {
        Ok(b) => b,
        Err(_) => {
            return ClaudeCliStatus {
                installed: false,
                version: None,
            }
        }
    };

    let mut command = Command::new(&bin);
    command.arg("--version");

    let version = output_with_timeout(command, Duration::from_secs(2))
        .ok()
        .filter(|o| o.status.success())
        .map(|o| String::from_utf8_lossy(&o.stdout).trim().to_string());

    ClaudeCliStatus {
        installed: true,
        version,
    }
}

/// Spawn `claude -p` for a simple chat (no tools) and stream events via the
/// provided callback. Returns the session ID for future `--resume` calls.
pub fn run_chat_stream<F>(req: ChatStreamRequest, mut emit: F) -> Result<String, String>
where
    F: FnMut(ClaudeStreamEvent),
{
    let bin = find_claude_binary()?;
    let args = args::build_chat_args(&req);
    stream::run_claude_subprocess(&bin, &args, None, &mut emit)
}

/// Spawn `claude -p` with full tool access and MCP vault tools for an agent task.
pub fn run_agent_stream<F>(req: AgentStreamRequest, mut emit: F) -> Result<String, String>
where
    F: FnMut(ClaudeStreamEvent),
{
    let bin = find_claude_binary()?;
    let args = args::build_agent_args(&req)?;
    stream::run_claude_subprocess(&bin, &args, Some(&req.vault_path), &mut emit)
}

#[cfg(test)]
mod status_tests;
