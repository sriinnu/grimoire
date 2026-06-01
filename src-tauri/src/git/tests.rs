use super::*;
use std::fs;
use tempfile::TempDir;

fn assert_repo_path(url: &str, expected: Option<&str>) {
    assert_eq!(
        parse_github_repo_path(url),
        expected.map(ToString::to_string)
    );
}

pub(crate) fn setup_git_repo() -> TempDir {
    let dir = TempDir::new().unwrap();
    let path = dir.path();

    git_command()
        .args(["init", "--initial-branch=main"])
        .current_dir(path)
        .output()
        .unwrap();

    git_command()
        .args(["config", "user.email", "test@test.com"])
        .current_dir(path)
        .output()
        .unwrap();

    git_command()
        .args(["config", "user.name", "Test User"])
        .current_dir(path)
        .output()
        .unwrap();

    dir
}

/// Set up a bare "remote" and a clone that acts as the working vault.
pub(crate) fn setup_remote_pair() -> (TempDir, TempDir, TempDir) {
    let bare_dir = TempDir::new().unwrap();
    let bare = bare_dir.path();

    git_command()
        .args(["init", "--bare"])
        .current_dir(bare)
        .output()
        .unwrap();

    let clone_a_dir = TempDir::new().unwrap();
    git_command()
        .args(["clone", bare.to_str().unwrap(), "."])
        .current_dir(clone_a_dir.path())
        .output()
        .unwrap();
    for cmd in &[
        &["config", "user.email", "a@test.com"][..],
        &["config", "user.name", "User A"][..],
    ] {
        git_command()
            .args(*cmd)
            .current_dir(clone_a_dir.path())
            .output()
            .unwrap();
    }

    let clone_b_dir = TempDir::new().unwrap();
    git_command()
        .args(["clone", bare.to_str().unwrap(), "."])
        .current_dir(clone_b_dir.path())
        .output()
        .unwrap();
    for cmd in &[
        &["config", "user.email", "b@test.com"][..],
        &["config", "user.name", "User B"][..],
    ] {
        git_command()
            .args(*cmd)
            .current_dir(clone_b_dir.path())
            .output()
            .unwrap();
    }

    (bare_dir, clone_a_dir, clone_b_dir)
}

#[test]
fn test_ensure_gitignore_creates_file() {
    let dir = TempDir::new().unwrap();
    let path = dir.path().to_str().unwrap();

    ensure_gitignore(path).unwrap();

    let content = fs::read_to_string(dir.path().join(".gitignore")).unwrap();
    assert!(content.contains(".DS_Store"));
    assert!(content.contains(".grimoire/settings.json"));
}

#[test]
fn test_ensure_gitignore_preserves_existing() {
    let dir = TempDir::new().unwrap();
    fs::write(dir.path().join(".gitignore"), "my-rule\n").unwrap();

    ensure_gitignore(dir.path().to_str().unwrap()).unwrap();

    let content = fs::read_to_string(dir.path().join(".gitignore")).unwrap();
    assert_eq!(content, "my-rule\n");
}

#[test]
fn test_init_repo_creates_git_directory() {
    let dir = TempDir::new().unwrap();
    let vault = dir.path().join("new-vault");
    fs::create_dir_all(&vault).unwrap();
    fs::write(vault.join("note.md"), "# Test\n").unwrap();

    init_repo(vault.to_str().unwrap()).unwrap();

    assert!(vault.join(".git").exists());
}

#[test]
fn test_init_repo_creates_initial_commit() {
    let dir = TempDir::new().unwrap();
    let vault = dir.path().join("new-vault");
    fs::create_dir_all(&vault).unwrap();
    fs::write(vault.join("note.md"), "# Test\n").unwrap();

    init_repo(vault.to_str().unwrap()).unwrap();

    let log = git_command()
        .args(["log", "--oneline"])
        .current_dir(&vault)
        .output()
        .unwrap();
    let log_str = String::from_utf8_lossy(&log.stdout);
    assert!(log_str.contains("Initial vault setup"));
}

#[test]
fn test_init_repo_succeeds_when_everything_is_ignored() {
    let dir = TempDir::new().unwrap();
    let vault = dir.path().join("ignored-vault");
    fs::create_dir_all(&vault).unwrap();
    fs::write(vault.join(".gitignore"), "*\n").unwrap();
    fs::write(vault.join("local-only.md"), "# Local only\n").unwrap();

    init_repo(vault.to_str().unwrap()).unwrap();

    let log = git_command()
        .args(["log", "--oneline"])
        .current_dir(&vault)
        .output()
        .unwrap();
    assert!(!log.status.success());
}

#[test]
fn test_init_repo_creates_initial_commit_when_signing_is_misconfigured() {
    let dir = TempDir::new().unwrap();
    let vault = dir.path().join("new-vault");
    fs::create_dir_all(&vault).unwrap();
    fs::write(vault.join("note.md"), "# Test\n").unwrap();

    git_command()
        .args(["init"])
        .current_dir(&vault)
        .output()
        .unwrap();
    git_command()
        .args(["config", "commit.gpgsign", "true"])
        .current_dir(&vault)
        .output()
        .unwrap();
    git_command()
        .args(["config", "gpg.program", "/missing/grimoire-test-gpg"])
        .current_dir(&vault)
        .output()
        .unwrap();

    init_repo(vault.to_str().unwrap()).unwrap();

    let log = git_command()
        .args(["log", "--oneline"])
        .current_dir(&vault)
        .output()
        .unwrap();
    assert!(String::from_utf8_lossy(&log.stdout).contains("Initial vault setup"));
}

#[test]
fn test_init_repo_stages_all_files() {
    let dir = TempDir::new().unwrap();
    let vault = dir.path().join("new-vault");
    fs::create_dir_all(vault.join("sub")).unwrap();
    fs::write(vault.join("note.md"), "# Test\n").unwrap();
    fs::write(vault.join("sub/nested.md"), "# Nested\n").unwrap();

    init_repo(vault.to_str().unwrap()).unwrap();

    let status = git_command()
        .args(["status", "--porcelain"])
        .current_dir(&vault)
        .output()
        .unwrap();
    assert!(
        String::from_utf8_lossy(&status.stdout).trim().is_empty(),
        "All files should be committed"
    );
}

#[test]
fn test_init_repo_keeps_local_only_files_untracked() {
    let dir = TempDir::new().unwrap();
    let vault = dir.path().join("new-vault");
    fs::create_dir_all(vault.join("attachments")).unwrap();
    fs::create_dir_all(vault.join("imports/spanda-export/attachments")).unwrap();
    fs::write(vault.join("note.md"), "# Public\n").unwrap();
    fs::write(
        vault.join("journal.md"),
        "---\ntype: Journal\nsource_audio: attachments/private-audio.m4a\n---\n# Private\n",
    )
    .unwrap();
    fs::write(vault.join("attachments/private-audio.m4a"), "audio").unwrap();
    fs::write(
        vault.join("imports/spanda-export/practice.md"),
        "---\ntype: Sadhana\nlocality: local\n---\n# Practice\n",
    )
    .unwrap();
    fs::write(
        vault.join("imports/spanda-export/attachments/audio.m4a"),
        "audio",
    )
    .unwrap();

    init_repo(vault.to_str().unwrap()).unwrap();

    let files = git_command()
        .args(["ls-files", "-z"])
        .current_dir(&vault)
        .output()
        .unwrap();
    let tracked = String::from_utf8_lossy(&files.stdout);
    assert!(tracked.contains("note.md"));
    assert!(!tracked.contains("journal.md"));
    assert!(!tracked.contains("practice.md"));
    assert!(!tracked.contains("audio.m4a"));
    assert!(!tracked.contains("private-audio.m4a"));
}

#[test]
fn test_init_repo_creates_gitignore() {
    let dir = TempDir::new().unwrap();
    let vault = dir.path().join("new-vault");
    fs::create_dir_all(&vault).unwrap();
    fs::write(vault.join("note.md"), "# Test\n").unwrap();

    init_repo(vault.to_str().unwrap()).unwrap();

    let gitignore = vault.join(".gitignore");
    assert!(
        gitignore.exists(),
        ".gitignore should be created by init_repo"
    );
    let content = fs::read_to_string(&gitignore).unwrap();
    assert!(
        content.contains(".DS_Store"),
        ".gitignore should exclude .DS_Store"
    );
    assert!(
        content.contains(".grimoire/settings.json"),
        ".gitignore should exclude settings.json"
    );
    assert!(
        !content.contains(".grimoire-cache.json"),
        ".gitignore should NOT contain .grimoire-cache.json"
    );
}

#[test]
fn test_init_repo_does_not_overwrite_existing_gitignore() {
    let dir = TempDir::new().unwrap();
    let vault = dir.path().join("new-vault");
    fs::create_dir_all(&vault).unwrap();
    fs::write(vault.join("note.md"), "# Test\n").unwrap();
    fs::write(vault.join(".gitignore"), "custom-rule\n").unwrap();

    init_repo(vault.to_str().unwrap()).unwrap();

    let content = fs::read_to_string(vault.join(".gitignore")).unwrap();
    assert_eq!(
        content, "custom-rule\n",
        "existing .gitignore should not be overwritten"
    );
}

#[test]
fn test_parse_github_repo_path_variants() {
    for url in [
        "https://github.com/owner/repo.git",
        "https://github.com/owner/repo",
        "http://github.com/owner/repo.git",
        "git@github.com:owner/repo.git",
        "git@github.com:owner/repo",
        "ssh://git@github.com/owner/repo.git",
        "https://gho_abc123@github.com/owner/repo.git",
    ] {
        assert_repo_path(url, Some("owner/repo"));
    }
}

#[test]
fn test_parse_github_repo_path_non_github() {
    assert_repo_path("https://gitlab.com/owner/repo.git", None);
    assert_repo_path("owner/repo", None);
}
