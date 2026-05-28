use std::fs;
use std::path::{Path, PathBuf};
use std::process::{Command, Output, Stdio};
use std::thread;
use std::time::{Duration, Instant};

use super::path_env::command_for_binary;

pub(super) fn find_codex_binary() -> Result<PathBuf, String> {
    if let Some(binary) = find_binary_on_path("codex") {
        return Ok(binary);
    }
    if let Some(binary) = find_binary_in_user_shell("codex") {
        return Ok(binary);
    }
    if let Some(binary) = find_existing_binary(codex_binary_candidates()) {
        return Ok(binary);
    }

    Err("Codex CLI not found. Install it: https://developers.openai.com/codex/cli".into())
}

pub(super) fn find_chitragupta_binary() -> Result<PathBuf, String> {
    if let Some(binary) = find_binary_on_path("chitragupta") {
        return Ok(binary);
    }
    if let Some(binary) = find_binary_in_user_shell("chitragupta") {
        return Ok(binary);
    }
    if let Some(binary) = find_existing_binary(chitragupta_binary_candidates()) {
        return Ok(binary);
    }

    Err("Chitragupta CLI not found. Install it from https://github.com/sriinnu/chitragupta or use a local repo launcher.".into())
}

pub(super) fn version_for_binary(binary: &Path) -> Option<String> {
    let mut command = command_for_binary(binary);
    command.arg("--version");

    output_with_timeout(command, Duration::from_secs(2))
        .ok()
        .filter(|output| output.status.success())
        .map(|output| String::from_utf8_lossy(&output.stdout).trim().to_string())
}

fn output_with_timeout(mut command: Command, timeout: Duration) -> Result<Output, String> {
    let mut child = command
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .spawn()
        .map_err(|error| error.to_string())?;
    let deadline = Instant::now() + timeout;

    loop {
        match child.try_wait() {
            Ok(Some(_)) => return child.wait_with_output().map_err(|error| error.to_string()),
            Ok(None) if Instant::now() >= deadline => {
                let _ = child.kill();
                let _ = child.wait();
                return Err("command timed out".into());
            }
            Ok(None) => thread::sleep(Duration::from_millis(25)),
            Err(error) => return Err(error.to_string()),
        }
    }
}

fn find_binary_on_path(command: &str) -> Option<PathBuf> {
    Command::new("which")
        .arg(command)
        .output()
        .ok()
        .and_then(|output| path_from_successful_output(&output))
}

fn find_binary_in_user_shell(command: &str) -> Option<PathBuf> {
    user_shell_candidates()
        .into_iter()
        .filter(|shell| shell.exists())
        .find_map(|shell| command_path_from_shell(&shell, command))
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
    Command::new(shell)
        .arg("-lc")
        .arg(format!("command -v {command}"))
        .output()
        .ok()
        .and_then(|output| path_from_successful_output(&output))
}

fn path_from_successful_output(output: &std::process::Output) -> Option<PathBuf> {
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

fn codex_binary_candidates() -> Vec<PathBuf> {
    dirs::home_dir()
        .map(|home| codex_binary_candidates_for_home(&home))
        .unwrap_or_default()
}

fn codex_binary_candidates_for_home(home: &Path) -> Vec<PathBuf> {
    let mut candidates = vec![
        home.join(".local/bin/codex"),
        home.join(".codex/bin/codex"),
        home.join(".local/share/mise/shims/codex"),
        home.join(".asdf/shims/codex"),
        home.join(".npm-global/bin/codex"),
        home.join(".npm/bin/codex"),
        home.join(".bun/bin/codex"),
        home.join(".volta/bin/codex"),
        home.join(".local/share/pnpm/codex"),
        PathBuf::from("/usr/local/bin/codex"),
        PathBuf::from("/opt/homebrew/bin/codex"),
        PathBuf::from("/Applications/Codex.app/Contents/Resources/codex"),
    ];
    candidates.extend(node_version_manager_binary_candidates(home, "codex"));
    candidates
}

fn chitragupta_binary_candidates() -> Vec<PathBuf> {
    dirs::home_dir()
        .map(|home| chitragupta_binary_candidates_for_home(&home))
        .unwrap_or_default()
}

fn chitragupta_binary_candidates_for_home(home: &Path) -> Vec<PathBuf> {
    let mut candidates = vec![
        home.join(".local/bin/chitragupta"),
        home.join(".npm-global/bin/chitragupta"),
        home.join(".npm/bin/chitragupta"),
        home.join(".bun/bin/chitragupta"),
        home.join(".volta/bin/chitragupta"),
        home.join(".local/share/pnpm/chitragupta"),
        PathBuf::from("/usr/local/bin/chitragupta"),
        PathBuf::from("/opt/homebrew/bin/chitragupta"),
        PathBuf::from("/Applications/Chitragupta.app/Contents/Resources/chitragupta"),
        PathBuf::from("/Applications/Chitragupta.app/Contents/MacOS/chitragupta"),
    ];
    candidates.extend(node_version_manager_binary_candidates(home, "chitragupta"));
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
mod tests {
    use super::*;

    #[test]
    fn codex_binary_candidates_include_supported_macos_installs() {
        let home = PathBuf::from("/Users/alex");
        let candidates = codex_binary_candidates_for_home(&home);
        let expected = [
            home.join(".local/bin/codex"),
            home.join(".codex/bin/codex"),
            home.join(".local/share/mise/shims/codex"),
            home.join(".asdf/shims/codex"),
            home.join(".npm-global/bin/codex"),
            home.join(".bun/bin/codex"),
            PathBuf::from("/Applications/Codex.app/Contents/Resources/codex"),
        ];

        for candidate in expected {
            assert!(
                candidates.contains(&candidate),
                "missing {}",
                candidate.display()
            );
        }
    }

    #[test]
    fn chitragupta_binary_candidates_include_supported_installs() {
        let home = PathBuf::from("/Users/alex");
        let candidates = chitragupta_binary_candidates_for_home(&home);
        let expected = [
            home.join(".local/bin/chitragupta"),
            home.join(".npm-global/bin/chitragupta"),
            home.join(".bun/bin/chitragupta"),
            home.join(".volta/bin/chitragupta"),
            home.join(".local/share/pnpm/chitragupta"),
            PathBuf::from("/Applications/Chitragupta.app/Contents/MacOS/chitragupta"),
        ];

        for candidate in expected {
            assert!(
                candidates.contains(&candidate),
                "missing {}",
                candidate.display()
            );
        }
    }

    #[test]
    fn node_version_manager_candidates_include_nvm_installs() {
        let dir = tempfile::tempdir().unwrap();
        let nvm_bin = dir
            .path()
            .join(".nvm/versions/node/v22.22.0/bin/chitragupta");
        std::fs::create_dir_all(nvm_bin.parent().unwrap()).unwrap();
        std::fs::write(&nvm_bin, "#!/bin/sh\n").unwrap();

        let candidates = chitragupta_binary_candidates_for_home(dir.path());

        assert!(
            candidates.contains(&nvm_bin),
            "missing {}",
            nvm_bin.display()
        );
    }

    #[cfg(unix)]
    #[test]
    fn version_probe_times_out_for_hung_cli() {
        use std::os::unix::fs::PermissionsExt;

        let dir = tempfile::tempdir().unwrap();
        let hung_cli = dir.path().join("hung-cli");
        std::fs::write(&hung_cli, "#!/bin/sh\nsleep 5\n").unwrap();
        std::fs::set_permissions(&hung_cli, std::fs::Permissions::from_mode(0o755)).unwrap();
        let started = Instant::now();

        assert_eq!(version_for_binary(&hung_cli), None);
        assert!(started.elapsed() < Duration::from_secs(3));
    }

    #[test]
    fn first_existing_path_skips_empty_and_missing_lines() {
        let dir = tempfile::tempdir().unwrap();
        let missing = dir.path().join("missing-codex");
        let codex = dir.path().join("codex");
        std::fs::write(&codex, "#!/bin/sh\n").unwrap();
        let stdout = format!("\n{}\n{}\n", missing.display(), codex.display());

        assert_eq!(first_existing_path(&stdout), Some(codex));
    }

    #[cfg(unix)]
    #[test]
    fn command_path_from_shell_finds_codex_from_login_shell() {
        use std::os::unix::fs::PermissionsExt;

        let dir = tempfile::tempdir().unwrap();
        let codex = dir.path().join("codex");
        std::fs::write(&codex, "#!/bin/sh\n").unwrap();
        std::fs::set_permissions(&codex, std::fs::Permissions::from_mode(0o755)).unwrap();
        let shell = dir.path().join("shell");
        std::fs::write(
            &shell,
            format!(
                "#!/bin/sh\nif [ \"$1\" = \"-lc\" ]; then echo '{}'; fi\n",
                codex.display()
            ),
        )
        .unwrap();
        std::fs::set_permissions(&shell, std::fs::Permissions::from_mode(0o755)).unwrap();

        assert_eq!(command_path_from_shell(&shell, "codex"), Some(codex));
    }
}
