use super::process::output_with_timeout;
use std::fs;
use std::path::{Path, PathBuf};
use std::process::{Command, Output};
use std::time::Duration;

const PATH_LOOKUP_TIMEOUT: Duration = Duration::from_secs(2);

pub(crate) fn find_claude_binary() -> Result<PathBuf, String> {
    if let Some(binary) = find_claude_binary_on_path() {
        return Ok(binary);
    }

    if let Some(binary) = find_claude_binary_in_user_shell() {
        return Ok(binary);
    }

    if let Some(binary) = find_existing_binary(claude_binary_candidates()) {
        return Ok(binary);
    }

    Err("Claude CLI not found. Install it: https://docs.anthropic.com/en/docs/claude-code".into())
}

fn find_claude_binary_on_path() -> Option<PathBuf> {
    let mut command = Command::new(claude_path_lookup_command());
    command.arg("claude");
    output_with_timeout(command, PATH_LOOKUP_TIMEOUT)
        .ok()
        .and_then(|output| path_from_successful_output(&output))
}

fn claude_path_lookup_command() -> &'static str {
    if cfg!(windows) {
        "where"
    } else {
        "which"
    }
}

fn find_claude_binary_in_user_shell() -> Option<PathBuf> {
    user_shell_candidates()
        .into_iter()
        .filter(|shell| shell.exists())
        .find_map(|shell| command_path_from_shell(&shell, "claude"))
}

fn user_shell_candidates() -> Vec<PathBuf> {
    let mut shells = Vec::new();
    if let Some(shell) = std::env::var_os("SHELL") {
        if !shell.is_empty() {
            shells.push(PathBuf::from(shell));
        }
    }
    shells.push(PathBuf::from("/bin/zsh"));
    shells.push(PathBuf::from("/bin/bash"));
    shells
}

fn command_path_from_shell(shell: &Path, command: &str) -> Option<PathBuf> {
    let mut shell_command = Command::new(shell);
    shell_command
        .arg("-lc")
        .arg(format!("command -v {command}"));
    output_with_timeout(shell_command, PATH_LOOKUP_TIMEOUT)
        .ok()
        .and_then(|output| path_from_successful_output(&output))
}

fn path_from_successful_output(output: &Output) -> Option<PathBuf> {
    if output.status.success() {
        first_existing_path(&String::from_utf8_lossy(&output.stdout))
    } else {
        None
    }
}

fn first_existing_path(stdout: &str) -> Option<PathBuf> {
    stdout.lines().find_map(|line| {
        let trimmed = line.trim();
        if trimmed.is_empty() {
            return None;
        }
        let candidate = PathBuf::from(trimmed);
        candidate.exists().then_some(candidate)
    })
}

fn claude_binary_candidates() -> Vec<PathBuf> {
    dirs::home_dir()
        .map(|home| claude_binary_candidates_for_home(&home))
        .unwrap_or_default()
}

fn claude_binary_candidates_for_home(home: &Path) -> Vec<PathBuf> {
    let mut candidates = vec![
        home.join(".local/bin/claude"),
        home.join(".local/bin/claude.exe"),
        home.join(".claude/local/claude"),
        home.join(".claude/local/claude.exe"),
        home.join(".local/share/mise/shims/claude"),
        home.join(".local/share/mise/shims/claude.exe"),
        home.join(".asdf/shims/claude"),
        home.join(".asdf/shims/claude.exe"),
        home.join(".npm-global/bin/claude"),
        home.join(".npm-global/bin/claude.cmd"),
        home.join(".npm-global/bin/claude.exe"),
        home.join(".npm/bin/claude"),
        home.join(".npm/bin/claude.cmd"),
        home.join(".npm/bin/claude.exe"),
        home.join(".volta/bin/claude"),
        home.join(".volta/bin/claude.cmd"),
        home.join(".volta/bin/claude.exe"),
        home.join(".local/share/pnpm/claude"),
        home.join(".local/share/pnpm/claude.cmd"),
        home.join(".local/share/pnpm/claude.exe"),
        home.join("AppData/Roaming/npm/claude.cmd"),
        home.join("AppData/Roaming/npm/claude.exe"),
        home.join("AppData/Local/pnpm/claude.cmd"),
        home.join("AppData/Local/pnpm/claude.exe"),
        home.join("scoop/shims/claude.exe"),
        PathBuf::from("/opt/homebrew/bin/claude"),
        PathBuf::from("/usr/local/bin/claude"),
    ];
    candidates.extend(node_version_manager_binary_candidates(home, "claude"));
    candidates
}

fn find_existing_binary(candidates: Vec<PathBuf>) -> Option<PathBuf> {
    candidates.into_iter().find(|candidate| candidate.exists())
}

fn node_version_manager_binary_candidates(home: &Path, binary_name: &str) -> Vec<PathBuf> {
    let mut candidates = Vec::new();
    candidates.extend(versioned_child_binary_candidates(
        &home.join(".nvm/versions/node"),
        &["bin"],
        binary_name,
    ));
    candidates.extend(versioned_child_binary_candidates(
        &home.join(".fnm/node-versions"),
        &["installation", "bin"],
        binary_name,
    ));
    candidates
}

fn versioned_child_binary_candidates(
    root: &Path,
    child_segments: &[&str],
    binary_name: &str,
) -> Vec<PathBuf> {
    let Ok(entries) = fs::read_dir(root) else {
        return Vec::new();
    };

    entries
        .filter_map(Result::ok)
        .map(|entry| {
            let mut path = entry.path();
            for segment in child_segments {
                path.push(segment);
            }
            path.push(binary_name);
            path
        })
        .collect()
}

#[cfg(test)]
#[path = "discovery_tests.rs"]
mod discovery_tests;
