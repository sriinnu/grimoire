use std::path::{Path, PathBuf};

use super::git_command;
use crate::vault::locality::{
    is_local_only_export_file, is_local_only_markdown_content, is_local_only_relative_path,
};
use crate::vault::locality_attachments::local_only_referenced_attachments;

/// Stages every non-protected vault change and removes local-only paths from the index.
pub(crate) fn stage_non_local_changes(vault: &Path) -> Result<(), String> {
    let add = git_command()
        .args(["add", "-A"])
        .current_dir(vault)
        .output()
        .map_err(|e| format!("Failed to run git add: {e}"))?;
    if !add.status.success() {
        return Err(format!(
            "git add failed: {}",
            String::from_utf8_lossy(&add.stderr).trim()
        ));
    }

    unstage_local_only_changes(vault)
}

/// Returns true when a relative path must never be committed or shown as syncable.
pub(crate) fn should_keep_out_of_git(vault: &Path, relative_path: &Path) -> bool {
    let local_only_attachments = local_only_referenced_attachments(vault).unwrap_or_default();
    should_keep_out_of_git_with_attachments(vault, relative_path, &local_only_attachments)
}

fn should_keep_out_of_git_with_attachments(
    vault: &Path,
    relative_path: &Path,
    local_only_attachments: &std::collections::BTreeSet<String>,
) -> bool {
    if is_local_only_relative_path(relative_path) {
        return true;
    }
    if local_only_attachments.contains(&relative_path.to_string_lossy().replace('\\', "/")) {
        return true;
    }

    let full_path = vault.join(relative_path);
    if is_local_only_export_file(vault, &full_path) {
        return true;
    }

    is_deleted_local_only_markdown(vault, relative_path)
}

fn unstage_local_only_changes(vault: &Path) -> Result<(), String> {
    let local_only_attachments = local_only_referenced_attachments(vault)?;
    for relative_path in staged_paths(vault)? {
        if should_keep_out_of_git_with_attachments(vault, &relative_path, &local_only_attachments) {
            unstage_path(vault, &relative_path)?;
        }
    }
    Ok(())
}

fn staged_paths(vault: &Path) -> Result<Vec<PathBuf>, String> {
    let output = git_command()
        .args(["diff", "--cached", "--name-only", "-z"])
        .current_dir(vault)
        .output()
        .map_err(|e| format!("Failed to inspect staged files: {e}"))?;
    if !output.status.success() {
        return Err(format!(
            "git diff --cached failed: {}",
            String::from_utf8_lossy(&output.stderr).trim()
        ));
    }

    Ok(output
        .stdout
        .split(|byte| *byte == 0)
        .filter(|bytes| !bytes.is_empty())
        .map(|bytes| PathBuf::from(String::from_utf8_lossy(bytes).into_owned()))
        .collect())
}

fn unstage_path(vault: &Path, relative_path: &Path) -> Result<(), String> {
    if repo_has_head(vault) {
        return run_unstage(vault, &["reset", "-q", "HEAD", "--"], relative_path);
    }
    run_unstage(
        vault,
        &["rm", "--cached", "--ignore-unmatch", "-q", "--"],
        relative_path,
    )
}

fn run_unstage(vault: &Path, args: &[&str], relative_path: &Path) -> Result<(), String> {
    let output = git_command()
        .args(args)
        .arg(relative_path)
        .current_dir(vault)
        .output()
        .map_err(|e| format!("Failed to unstage local-only file: {e}"))?;
    if output.status.success() {
        return Ok(());
    }
    Err(format!(
        "Failed to unstage {}: {}",
        relative_path.display(),
        String::from_utf8_lossy(&output.stderr).trim()
    ))
}

fn repo_has_head(vault: &Path) -> bool {
    git_command()
        .args(["rev-parse", "--verify", "HEAD"])
        .current_dir(vault)
        .output()
        .is_ok_and(|output| output.status.success())
}

fn is_deleted_local_only_markdown(vault: &Path, relative_path: &Path) -> bool {
    if !is_markdown_path(relative_path) || vault.join(relative_path).exists() {
        return false;
    }

    let revision_path = format!(
        "HEAD:{}",
        relative_path.to_string_lossy().replace('\\', "/")
    );
    let output = git_command()
        .args(["show"])
        .arg(revision_path)
        .current_dir(vault)
        .output();

    output.is_ok_and(|output| {
        output.status.success()
            && is_local_only_markdown_content(&String::from_utf8_lossy(&output.stdout))
    })
}

fn is_markdown_path(path: &Path) -> bool {
    path.extension()
        .map(|extension| extension.to_string_lossy().to_ascii_lowercase())
        .is_some_and(|extension| matches!(extension.as_str(), "md" | "markdown" | "mdown" | "mkd"))
}
