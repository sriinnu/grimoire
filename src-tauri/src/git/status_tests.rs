use super::git_command;
use super::*;
use crate::git::git_commit;
use crate::git::tests::setup_git_repo;
use std::fs;
use std::path::Path;

fn write_and_commit_markdown(vault: &Path, vp: &str, relative_path: &str, content: &str) {
    fs::write(vault.join(relative_path), content).unwrap();
    git_commit(vp, "initial").unwrap();
}

#[test]
fn test_get_modified_files() {
    let dir = setup_git_repo();
    let vault = dir.path();

    fs::write(vault.join("note.md"), "# Note\n").unwrap();
    git_command()
        .args(["add", "note.md"])
        .current_dir(vault)
        .output()
        .unwrap();
    git_command()
        .args(["commit", "-m", "Add note"])
        .current_dir(vault)
        .output()
        .unwrap();

    fs::write(vault.join("note.md"), "# Note\n\nUpdated.").unwrap();
    fs::write(vault.join("new.md"), "# New\n").unwrap();

    let modified = get_modified_files(vault.to_str().unwrap()).unwrap();

    assert!(modified.len() >= 2);
    let statuses: Vec<&str> = modified.iter().map(|f| f.status.as_str()).collect();
    assert!(statuses.contains(&"modified"));
    assert!(statuses.contains(&"untracked"));

    let modified_entry = modified
        .iter()
        .find(|file| file.relative_path == "note.md")
        .unwrap();
    assert!(modified_entry.added_lines.is_some());
    assert!(!modified_entry.binary);

    let untracked_entry = modified
        .iter()
        .find(|file| file.relative_path == "new.md")
        .unwrap();
    assert_eq!(untracked_entry.added_lines, Some(1));
    assert_eq!(untracked_entry.deleted_lines, None);
}

#[test]
fn test_get_modified_files_untracked_in_subdirectory() {
    let dir = setup_git_repo();
    let vault = dir.path();

    fs::write(vault.join("init.md"), "# Init\n").unwrap();
    git_command()
        .args(["add", "init.md"])
        .current_dir(vault)
        .output()
        .unwrap();
    git_command()
        .args(["commit", "-m", "Initial"])
        .current_dir(vault)
        .output()
        .unwrap();

    fs::create_dir_all(vault.join("note")).unwrap();
    fs::write(vault.join("note/brand-new.md"), "# Brand New\n").unwrap();

    let modified = get_modified_files(vault.to_str().unwrap()).unwrap();

    assert_eq!(modified.len(), 1);
    assert_eq!(modified[0].status, "untracked");
    assert_eq!(modified[0].relative_path, "note/brand-new.md");
    assert_eq!(modified[0].added_lines, Some(1));
    assert!(
        modified[0].path.ends_with("/note/brand-new.md"),
        "Full path should end with relative path: {}",
        modified[0].path
    );
}

#[test]
fn test_get_modified_files_hides_local_only_markdown() {
    let dir = setup_git_repo();
    let vault = dir.path();
    let vp = vault.to_str().unwrap();

    fs::write(vault.join("public.md"), "# Public\n").unwrap();
    fs::write(
        vault.join("journal.md"),
        "---\ntype: Journal\n---\n# Private\n",
    )
    .unwrap();

    let modified = get_modified_files(vp).unwrap();

    assert!(modified
        .iter()
        .any(|file| file.relative_path == "public.md"));
    assert!(!modified
        .iter()
        .any(|file| file.relative_path == "journal.md"));
}

#[test]
fn test_commit_flow_modified_files_then_commit_clears() {
    let dir = setup_git_repo();
    let vault = dir.path();
    let vp = vault.to_str().unwrap();

    fs::write(vault.join("flow.md"), "# Original\n").unwrap();
    git_commit(vp, "initial").unwrap();
    fs::write(vault.join("flow.md"), "# Modified\n").unwrap();

    let modified = get_modified_files(vp).unwrap();
    assert!(
        modified.iter().any(|f| f.relative_path == "flow.md"),
        "Modified file should be detected after write"
    );

    let result = git_commit(vp, "update flow").unwrap();
    assert!(
        result.contains("1 file changed") || result.contains("flow.md"),
        "Commit output should reference the changed file: {}",
        result
    );

    let after = get_modified_files(vp).unwrap();
    assert!(
        after.is_empty(),
        "No modified files should remain after commit, found: {:?}",
        after
    );
}

#[test]
fn test_discard_modified_file() {
    let dir = setup_git_repo();
    let vault = dir.path();
    let vp = vault.to_str().unwrap();

    write_and_commit_markdown(vault, vp, "note.md", "# Original\n");

    fs::write(vault.join("note.md"), "# Changed\n").unwrap();
    assert_eq!(get_modified_files(vp).unwrap().len(), 1);

    discard_file_changes(vp, "note.md").unwrap();

    let content = fs::read_to_string(vault.join("note.md")).unwrap();
    assert_eq!(content, "# Original\n");
    assert!(get_modified_files(vp).unwrap().is_empty());
}

#[test]
fn test_discard_untracked_file() {
    let dir = setup_git_repo();
    let vault = dir.path();
    let vp = vault.to_str().unwrap();

    write_and_commit_markdown(vault, vp, "init.md", "# Init\n");

    fs::write(vault.join("new.md"), "# New\n").unwrap();
    assert!(vault.join("new.md").exists());

    discard_file_changes(vp, "new.md").unwrap();

    assert!(!vault.join("new.md").exists());
    assert!(get_modified_files(vp).unwrap().is_empty());
}

#[test]
fn test_discard_deleted_file() {
    let dir = setup_git_repo();
    let vault = dir.path();
    let vp = vault.to_str().unwrap();

    write_and_commit_markdown(vault, vp, "note.md", "# Original\n");

    fs::remove_file(vault.join("note.md")).unwrap();
    assert!(!vault.join("note.md").exists());

    discard_file_changes(vp, "note.md").unwrap();

    assert!(vault.join("note.md").exists());
    let content = fs::read_to_string(vault.join("note.md")).unwrap();
    assert_eq!(content, "# Original\n");
}

#[test]
fn test_discard_rejects_path_outside_vault() {
    let dir = setup_git_repo();
    let vault = dir.path();
    let vp = vault.to_str().unwrap();

    write_and_commit_markdown(vault, vp, "init.md", "# Init\n");

    let result = discard_file_changes(vp, "../../../etc/passwd");
    assert!(
        result.is_err(),
        "Should reject path outside vault, got: {:?}",
        result
    );
    assert!(
        result.unwrap_err().contains("outside the vault"),
        "Error should mention 'outside the vault'"
    );
}
