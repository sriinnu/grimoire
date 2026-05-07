use super::*;
use std::collections::HashMap;
use std::path::Path;

fn entry_filenames(entries: &[VaultEntry]) -> Vec<&str> {
    entries
        .iter()
        .map(|entry| entry.filename.as_str())
        .collect()
}

fn assert_filenames_include(entries: &[VaultEntry], expected: &[&str]) {
    let filenames = entry_filenames(entries);
    for filename in expected {
        assert!(filenames.contains(filename), "missing {filename}");
    }
}

#[test]
fn test_scan_vault_root_and_protected_folders() {
    let dir = TempDir::new().unwrap();
    create_test_file(dir.path(), "root.md", "# Root Note\n");
    create_test_file(
        dir.path(),
        "project.md",
        "---\ntype: Type\n---\n# Project\n",
    );
    create_test_file(dir.path(), "attachments/notes.md", "# Attachment note\n");
    create_test_file(
        dir.path(),
        "not-markdown.txt",
        "This should be included as text",
    );

    let entries = scan_vault(dir.path(), &HashMap::new()).unwrap();
    assert_eq!(entries.len(), 4);
    assert_filenames_include(
        &entries,
        &["root.md", "project.md", "notes.md", "not-markdown.txt"],
    );

    let txt_entry = entries
        .iter()
        .find(|entry| entry.filename == "not-markdown.txt")
        .unwrap();
    assert_eq!(txt_entry.file_kind, "text");
    assert_eq!(txt_entry.title, "not-markdown.txt");
}

#[test]
fn test_scan_vault_includes_subdirectory_notes() {
    let dir = TempDir::new().unwrap();
    create_test_file(dir.path(), "root.md", "# Root Note\n");
    create_test_file(
        dir.path(),
        "random-folder/nested.md",
        "---\ntype: Note\n---\n# Nested\n",
    );
    create_test_file(
        dir.path(),
        "project/old-project.md",
        "---\ntype: Project\n---\n# Old\n",
    );

    let entries = scan_vault(dir.path(), &HashMap::new()).unwrap();
    assert_eq!(
        entries.len(),
        3,
        "all .md files including subdirs should be scanned"
    );
    assert_filenames_include(&entries, &["root.md", "nested.md", "old-project.md"]);
}

#[test]
fn test_scan_vault_recognizes_markdown_extension_variants() {
    let dir = TempDir::new().unwrap();
    create_test_file(dir.path(), "README.markdown", "# Readme\n");
    create_test_file(dir.path(), "UPPER.MD", "# Upper\n");

    let entries = scan_vault(dir.path(), &HashMap::new()).unwrap();

    assert_eq!(entries.len(), 2);
    assert!(entries.iter().all(|entry| entry.file_kind == "markdown"));
    assert_filenames_include(&entries, &["README.markdown", "UPPER.MD"]);
}

#[test]
fn test_scan_vault_includes_all_protected_folders() {
    let dir = TempDir::new().unwrap();
    create_test_file(dir.path(), "root.md", "# Root\n");
    create_test_file(dir.path(), "attachments/notes.md", "# Attachment note\n");
    create_test_file(dir.path(), "assets/image.md", "# Asset\n");

    let entries = scan_vault(dir.path(), &HashMap::new()).unwrap();
    assert_eq!(entries.len(), 3);
}

#[cfg(unix)]
#[test]
fn test_scan_vault_does_not_follow_symlinks_outside_vault() {
    let dir = TempDir::new().unwrap();
    let outside = TempDir::new().unwrap();
    create_test_file(dir.path(), "root.md", "# Root\n");
    std::fs::write(outside.path().join("outside.md"), "# Outside\n").unwrap();
    std::os::unix::fs::symlink(
        outside.path().join("outside.md"),
        dir.path().join("linked-outside.md"),
    )
    .unwrap();

    let entries = scan_vault(dir.path(), &HashMap::new()).unwrap();

    assert_eq!(entries.len(), 1);
    assert_eq!(entries[0].filename, "root.md");
}

#[test]
fn test_scan_vault_skips_hidden_folders() {
    let dir = TempDir::new().unwrap();
    create_test_file(dir.path(), "root.md", "# Root\n");
    create_test_file(dir.path(), ".grimoire/cache.md", "# Cache\n");
    create_test_file(dir.path(), ".git/objects.md", "# Git\n");

    let entries = scan_vault(dir.path(), &HashMap::new()).unwrap();
    assert_eq!(entries.len(), 1);
    assert_eq!(entries[0].filename, "root.md");
}

#[test]
fn test_scan_vault_skips_dependency_and_build_folders() {
    let dir = TempDir::new().unwrap();
    create_test_file(dir.path(), "root.md", "# Root\n");
    create_test_file(dir.path(), "node_modules/pkg/readme.md", "# Dependency\n");
    create_test_file(dir.path(), "dist/generated.md", "# Generated\n");
    create_test_file(dir.path(), "target/debug/artifact.md", "# Artifact\n");

    let entries = scan_vault(dir.path(), &HashMap::new()).unwrap();

    assert_eq!(entries.len(), 1);
    assert_eq!(entries[0].filename, "root.md");
}

#[test]
fn test_scan_vault_nonexistent_path() {
    let result = scan_vault(
        Path::new("/nonexistent/path/that/does/not/exist"),
        &HashMap::new(),
    );
    assert!(result.is_err());
}

#[test]
fn test_get_note_content() {
    let dir = TempDir::new().unwrap();
    let content = "---\nIs A: Note\n---\n# Test Note\n\nHello, world!";
    create_test_file(dir.path(), "test.md", content);

    let path = dir.path().join("test.md");
    let result = get_note_content(&path);
    assert!(result.is_ok());
    assert_eq!(result.unwrap(), content);
}

#[test]
fn test_get_note_content_nonexistent() {
    let result = get_note_content(Path::new("/nonexistent/path/file.md"));
    assert!(result.is_err());
}

#[test]
fn test_get_note_content_invalid_utf8() {
    let dir = TempDir::new().unwrap();
    let path = dir.path().join("invalid.csv");
    std::fs::write(&path, [0x66, 0x6f, 0x80]).unwrap();

    let result = get_note_content(&path);

    assert_eq!(
        result.unwrap_err(),
        format!("File is not valid UTF-8 text: {}", path.display())
    );
}
