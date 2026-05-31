mod clone;
mod command_timeout;
mod commit;
mod conflict;
mod connect;
mod dates;
mod history;
mod locality;
mod pulse;
mod remote;
mod status;

use std::path::Path;
use std::process::Command;

pub use clone::clone_repo;
pub use commit::git_commit;
pub use conflict::{
    get_conflict_files, get_conflict_mode, git_commit_conflict_resolution, git_resolve_conflict,
    is_merge_in_progress, is_rebase_in_progress,
};
pub use connect::{disconnect_all_remotes, git_add_remote, GitAddRemoteResult};
pub use dates::{get_all_file_dates, GitDates};
pub use history::{get_file_diff, get_file_diff_at_commit, get_file_history};
pub use pulse::{get_last_commit_info, get_vault_pulse, LastCommitInfo, PulseCommit, PulseFile};
pub use remote::{
    git_pull, git_push, git_remote_status, has_remote, GitPullResult, GitPushResult,
    GitRemoteStatus,
};
pub use status::{discard_file_changes, get_modified_files, ModifiedFile};

use serde::Serialize;

#[derive(Debug, Serialize, Clone)]
pub struct GitCommit {
    pub hash: String,
    #[serde(rename = "shortHash")]
    pub short_hash: String,
    pub message: String,
    pub author: String,
    pub date: i64,
}

const DEFAULT_GITIGNORE: &str = "# Grimoire app files (machine-specific, never commit)\n\
.grimoire/settings.json\n\
\n\
# macOS\n\
.DS_Store\n\
.AppleDouble\n\
.LSOverride\n\
\n\
# Thumbnails\n\
._*\n\
\n\
# Editors\n\
.vscode/\n\
.idea/\n\
*.swp\n\
*.swo\n";

fn git_command() -> Command {
    let mut command = crate::hidden_command("git");
    configure_test_git_command(&mut command);
    command
}

#[cfg(test)]
fn configure_test_git_command(command: &mut Command) {
    command
        .env("GIT_CONFIG_NOSYSTEM", "1")
        .env("GIT_CONFIG_GLOBAL", "/dev/null")
        .env("GIT_AUTHOR_NAME", "Test User")
        .env("GIT_AUTHOR_EMAIL", "test@test.com")
        .env("GIT_COMMITTER_NAME", "Test User")
        .env("GIT_COMMITTER_EMAIL", "test@test.com");
}

#[cfg(not(test))]
fn configure_test_git_command(_command: &mut Command) {}

/// Ensure a `.gitignore` with sensible defaults exists in the vault directory.
/// Creates the file if missing; leaves existing `.gitignore` files untouched.
pub fn ensure_gitignore(path: &str) -> Result<(), String> {
    let gitignore_path = Path::new(path).join(".gitignore");
    if !gitignore_path.exists() {
        std::fs::write(&gitignore_path, DEFAULT_GITIGNORE)
            .map_err(|e| format!("Failed to write .gitignore: {}", e))?;
    }
    Ok(())
}

/// Initialize a new git repository, stage all files, and create an initial commit.
pub fn init_repo(path: &str) -> Result<(), String> {
    let dir = Path::new(path);

    run_git(dir, &["init"])?;
    ensure_author_config(dir)?;

    // Write .gitignore before the first commit so machine-specific and
    // macOS metadata files are never tracked and don't cause conflicts.
    ensure_gitignore(path)?;

    locality::stage_non_local_changes(dir)?;
    if has_changes_to_commit(dir)? {
        commit_initial_vault_setup(dir)?;
    }

    Ok(())
}

fn commit_initial_vault_setup(dir: &Path) -> Result<(), String> {
    run_git(
        dir,
        &[
            "-c",
            "commit.gpgsign=false",
            "commit",
            "-m",
            "Initial vault setup",
        ],
    )
}

/// Run a git command in the given directory, returning an error on failure.
fn run_git(dir: &Path, args: &[&str]) -> Result<(), String> {
    let output = git_command()
        .args(args)
        .current_dir(dir)
        .output()
        .map_err(|e| format!("Failed to run git {}: {e}", git_command_label(args)))?;

    if output.status.success() {
        return Ok(());
    }

    Err(format!(
        "git {} failed: {}",
        git_command_label(args),
        String::from_utf8_lossy(&output.stderr)
    ))
}

fn has_changes_to_commit(dir: &Path) -> Result<bool, String> {
    let output = git_command()
        .args(["diff", "--cached", "--quiet", "--exit-code", "--"])
        .current_dir(dir)
        .output()
        .map_err(|e| format!("Failed to run git diff --cached: {e}"))?;

    if output.status.success() {
        return Ok(false);
    }
    if output.status.code() == Some(1) {
        return Ok(true);
    }

    Err(format!(
        "git diff --cached failed: {}",
        String::from_utf8_lossy(&output.stderr).trim()
    ))
}

fn git_command_label<'a>(args: &'a [&'a str]) -> &'a str {
    if args.first() == Some(&"-c") {
        return args.get(2).copied().unwrap_or(args[0]);
    }

    args[0]
}

/// Set local user.name and user.email if not already configured.
fn ensure_author_config(dir: &Path) -> Result<(), String> {
    for (key, fallback) in [
        ("user.name", "Grimoire"),
        ("user.email", "vault@grimoire.app"),
    ] {
        let check = git_command()
            .args(["config", key])
            .current_dir(dir)
            .output()
            .map_err(|e| format!("Failed to check git config: {}", e))?;

        let value = String::from_utf8_lossy(&check.stdout);
        if !check.status.success() || value.trim().is_empty() {
            run_git(dir, &["config", key, fallback])?;
        }
    }
    Ok(())
}

/// Extract "owner/repo" from a GitHub remote URL.
/// Supports HTTPS (https://github.com/owner/repo.git) and
/// SSH (git@github.com:owner/repo.git) formats.
fn normalize_github_repo_path(repo_path: &str) -> Option<String> {
    let repo_path = repo_path.strip_suffix(".git").unwrap_or(repo_path);
    repo_path.contains('/').then(|| repo_path.to_string())
}

fn github_remote_suffix(url: &str) -> Option<&str> {
    const GITHUB_PREFIXES: [&str; 4] = [
        "git@github.com:",
        "https://github.com/",
        "http://github.com/",
        "ssh://git@github.com/",
    ];

    GITHUB_PREFIXES
        .iter()
        .find_map(|prefix| url.strip_prefix(prefix))
        .or_else(|| url.split_once("@github.com/").map(|(_, suffix)| suffix))
}

fn parse_github_repo_path(url: &str) -> Option<String> {
    github_remote_suffix(url.trim()).and_then(normalize_github_repo_path)
}

#[cfg(test)]
mod tests;
