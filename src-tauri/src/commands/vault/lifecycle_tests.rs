use super::*;
use std::path::Path;

fn assert_paths_exist(root: &Path, paths: &[&str]) {
    for path in paths {
        assert!(root.join(path).exists(), "{path} should exist");
    }
}

fn assert_paths_absent(root: &Path, paths: &[&str]) {
    for path in paths {
        assert!(!root.join(path).exists(), "{path} should be absent");
    }
}

fn assert_seeded_guidance_content(vault_path: &Path) {
    let agents = std::fs::read_to_string(vault_path.join("AGENTS.md")).unwrap();
    let claude = std::fs::read_to_string(vault_path.join("CLAUDE.md")).unwrap();

    assert!(agents.contains("Legacy `title:` frontmatter is still read as a fallback"));
    assert!(agents.contains("views/*.yml"));
    assert!(claude.starts_with("---\ntype: Note\n_organized: true\n---"));
    assert!(claude.contains("@AGENTS.md"));
    assert!(claude.contains("only a Claude Code compatibility shim"));
    assert!(!claude.contains("# CLAUDE.md"));
}

fn assert_seeded_type_scaffolding(vault_path: &Path) {
    let type_definition = std::fs::read_to_string(vault_path.join("type.md")).unwrap();

    assert!(type_definition.contains("visible: false"));
    assert!(type_definition.contains("# Type"));
}

fn git_status_porcelain(vault_path: &Path) -> String {
    let output = crate::hidden_command("git")
        .args(["status", "--porcelain"])
        .current_dir(vault_path)
        .output()
        .unwrap();
    assert!(
        output.status.success(),
        "git status failed: {}",
        String::from_utf8_lossy(&output.stderr)
    );
    String::from_utf8_lossy(&output.stdout).to_string()
}

#[test]
fn test_create_empty_vault_seeds_agents_and_type_scaffolding() {
    let dir = tempfile::TempDir::new().unwrap();
    let vault_path = dir.path().join("fresh-vault");

    let result = create_empty_vault(vault_path.to_string_lossy().to_string(), None, None);
    assert!(result.is_ok());
    assert_paths_exist(
        &vault_path,
        &["AGENTS.md", "CLAUDE.md", "type.md", "note.md"],
    );
    assert_paths_absent(&vault_path, &[".git", "config.md"]);
    assert_seeded_guidance_content(&vault_path);
    assert_seeded_type_scaffolding(&vault_path);
}

#[test]
fn test_create_empty_vault_can_initialize_git_when_requested() {
    let dir = tempfile::TempDir::new().unwrap();
    let vault_path = dir.path().join("fresh-git-vault");

    let result = create_empty_vault(vault_path.to_string_lossy().to_string(), Some(true), None);
    assert!(result.is_ok());
    assert_paths_exist(
        &vault_path,
        &[
            ".git",
            ".gitignore",
            "AGENTS.md",
            "CLAUDE.md",
            "type.md",
            "note.md",
        ],
    );
    assert_paths_absent(&vault_path, &["config.md"]);
    assert_seeded_guidance_content(&vault_path);
    assert_seeded_type_scaffolding(&vault_path);
    assert_eq!(git_status_porcelain(&vault_path), "");
}

#[test]
fn test_create_empty_vault_rejects_nonempty_target() {
    let dir = tempfile::TempDir::new().unwrap();
    let vault_path = dir.path().join("existing-folder");
    std::fs::create_dir_all(&vault_path).unwrap();
    std::fs::write(vault_path.join("keep.txt"), "keep").unwrap();

    let result = create_empty_vault(vault_path.to_string_lossy().to_string(), None, None);
    let err = result.expect_err("expected non-empty folder to be rejected");

    assert_eq!(err, "Choose an empty folder to create a new notebook");
    assert_paths_exist(&vault_path, &["keep.txt"]);
    assert_paths_absent(&vault_path, &[".git", "AGENTS.md"]);
}

#[test]
fn test_create_empty_vault_rejects_windows_reserved_final_folder_name() {
    let dir = tempfile::TempDir::new().unwrap();
    let vault_path = dir.path().join("con");

    let result = create_empty_vault(vault_path.to_string_lossy().to_string(), None, None);
    let err = result.expect_err("expected Windows reserved folder name to be rejected");

    assert_eq!(err, "Invalid folder name");
    assert!(!vault_path.exists());
}

#[test]
fn test_create_empty_vault_rejects_trailing_dot_final_folder_name() {
    let dir = tempfile::TempDir::new().unwrap();
    let vault_path = dir.path().join("notes.");

    let result = create_empty_vault(vault_path.to_string_lossy().to_string(), None, None);
    let err = result.expect_err("expected trailing-dot folder name to be rejected");

    assert_eq!(err, "Invalid folder name");
    assert!(!vault_path.exists());
}

#[test]
fn test_create_empty_vault_can_seed_journal_template() {
    let dir = tempfile::TempDir::new().unwrap();
    let vault_path = dir.path().join("journal-vault");

    let result = create_empty_vault(
        vault_path.to_string_lossy().to_string(),
        None,
        Some("journal".to_string()),
    );
    assert!(result.is_ok());
    assert_paths_exist(&vault_path, &["journal.md", "type.md", "note.md"]);
    let content = std::fs::read_to_string(vault_path.join("journal.md")).unwrap();
    assert!(content.contains("sidebarLabel: Journals"));
    assert!(content.contains("## Check-in"));
}
