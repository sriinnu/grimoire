use super::*;
use std::fs;
use tempfile::TempDir;

fn vault_path(dir: &TempDir) -> String {
    dir.path().to_string_lossy().into_owned()
}

fn note_path(dir: &TempDir, name: &str) -> String {
    dir.path().join(name).to_string_lossy().into_owned()
}

async fn create_initialized_vault() -> (TempDir, String) {
    let dir = TempDir::new().unwrap();
    fs::write(dir.path().join("note.md"), "# Note\n").unwrap();
    let vault = vault_path(&dir);
    init_git_repo(vault.clone()).await.unwrap();
    (dir, vault)
}

#[tokio::test]
async fn desktop_git_commands_route_to_git_backend() {
    let (dir, vault) = create_initialized_vault().await;
    let note = note_path(&dir, "note.md");

    assert!(is_git_repo(vault.clone()));

    fs::write(dir.path().join("note.md"), "# Updated\n").unwrap();
    let modified = get_modified_files(vault.clone()).unwrap();
    assert!(modified.iter().any(|file| file.relative_path == "note.md"));

    let diff = get_file_diff(vault.clone(), note.clone()).unwrap();
    assert!(diff.contains("# Updated"));

    git_commit(vault.clone(), "Update note".to_string()).unwrap();
    let history = get_file_history(vault.clone(), note.clone()).unwrap();
    assert!(history.iter().any(|commit| commit.message == "Update note"));

    let last_commit = get_last_commit_info(vault.clone()).unwrap().unwrap();
    assert!(!last_commit.short_hash.is_empty());

    let commit_diff = get_file_diff_at_commit(
        vault.clone(),
        note.clone(),
        history.first().unwrap().hash.clone(),
    )
    .unwrap();
    assert!(commit_diff.contains("# Updated"));

    let pulse = get_vault_pulse(vault.clone(), Some(5), Some(0)).unwrap();
    assert!(!pulse.is_empty());

    fs::write(dir.path().join("note.md"), "# Discard me\n").unwrap();
    git_discard_file(vault.clone(), "note.md".to_string()).unwrap();
    assert_eq!(
        fs::read_to_string(dir.path().join("note.md")).unwrap(),
        "# Updated\n"
    );

    assert!(get_conflict_files(vault.clone()).unwrap().is_empty());
    assert_eq!(get_conflict_mode(vault.clone()), "none");
    assert!(
        git_resolve_conflict(vault.clone(), "note.md".to_string(), "invalid".to_string(),).is_err()
    );
}

#[test]
fn is_git_repo_accepts_worktree_git_file() {
    let dir = TempDir::new().unwrap();
    fs::write(dir.path().join(".git"), "gitdir: /tmp/worktrees/example\n").unwrap();
    assert!(is_git_repo(vault_path(&dir)));
}

#[tokio::test]
async fn desktop_remote_commands_report_no_remote() {
    let (_dir, vault) = create_initialized_vault().await;
    let pull = git_pull(vault.clone()).await.unwrap();
    assert_eq!(pull.status, "no_remote");
    let push = git_push(vault.clone()).await.unwrap();
    assert_eq!(push.status, "error");
    let status = git_remote_status(vault.clone()).await.unwrap();
    assert!(!status.has_remote);
    assert_eq!((status.ahead, status.behind), (0, 0));
}
