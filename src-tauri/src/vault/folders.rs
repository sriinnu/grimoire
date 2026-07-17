use serde::{Deserialize, Serialize};
use std::fs;
use std::path::{Component, Path, PathBuf};
use walkdir::WalkDir;

use super::filename_rules::validate_folder_name;
use super::rename::{update_wikilinks_for_renames, DetectedRename};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct FolderRenameResult {
    pub old_path: String,
    pub new_path: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct FolderMoveResult {
    pub old_path: String,
    pub new_path: String,
    /// Number of other notes whose wiki links were rewritten after the move.
    pub updated_files: usize,
}

fn normalize_folder_name(next_name: &str) -> Result<String, String> {
    let trimmed = next_name.trim();
    if trimmed.is_empty() {
        return Err("Folder name cannot be empty".to_string());
    }
    validate_folder_name(trimmed)?;
    Ok(trimmed.to_string())
}

fn ensure_relative_folder_path(folder_path: &str) -> Result<PathBuf, String> {
    let trimmed = folder_path.trim();
    if trimmed.is_empty() {
        return Err("Folder path cannot be empty".to_string());
    }

    let relative = Path::new(trimmed);
    if relative.is_absolute() {
        return Err("Folder path must be relative to the vault root".to_string());
    }
    if relative
        .components()
        .any(|component| matches!(component, Component::ParentDir))
    {
        return Err("Folder path cannot escape the vault root".to_string());
    }

    Ok(relative.to_path_buf())
}

fn display_relative_path(path: &Path) -> String {
    path.to_string_lossy().replace('\\', "/")
}

pub fn rename_folder(
    vault_path: &Path,
    folder_path: &str,
    next_name: &str,
) -> Result<FolderRenameResult, String> {
    let relative_path = ensure_relative_folder_path(folder_path)?;
    let normalized_name = normalize_folder_name(next_name)?;
    let source_path = vault_path.join(&relative_path);

    if !source_path.exists() {
        return Err(format!("Folder does not exist: {}", folder_path));
    }
    if !source_path.is_dir() {
        return Err(format!("Not a folder: {}", folder_path));
    }

    let current_name = source_path
        .file_name()
        .map(|name| name.to_string_lossy().to_string())
        .ok_or_else(|| "Folder path cannot target the vault root".to_string())?;

    if current_name == normalized_name {
        return Ok(FolderRenameResult {
            old_path: display_relative_path(&relative_path),
            new_path: display_relative_path(&relative_path),
        });
    }

    let parent_relative = relative_path
        .parent()
        .map(Path::to_path_buf)
        .unwrap_or_default();
    let destination_relative = parent_relative.join(&normalized_name);
    let destination_path = vault_path.join(&destination_relative);

    if destination_path.exists() {
        return Err(format!(
            "Folder '{}' already exists",
            display_relative_path(&destination_relative)
        ));
    }

    fs::rename(&source_path, &destination_path)
        .map_err(|error| format!("Failed to rename folder: {}", error))?;

    Ok(FolderRenameResult {
        old_path: display_relative_path(&relative_path),
        new_path: display_relative_path(&destination_relative),
    })
}

/// Parse the destination folder path for a move. Empty or "." targets the vault root.
fn ensure_destination_folder_path(destination_path: &str) -> Result<PathBuf, String> {
    let trimmed = destination_path.trim();
    if trimmed.is_empty() || trimmed == "." {
        return Ok(PathBuf::new());
    }
    ensure_relative_folder_path(trimmed)
}

/// Collect vault-relative rename records for every markdown note under a moved folder.
fn collect_moved_note_renames(
    moved_folder: &Path,
    old_relative: &Path,
    new_relative: &Path,
) -> Vec<DetectedRename> {
    WalkDir::new(moved_folder)
        .follow_links(false)
        .into_iter()
        .filter_map(|entry| entry.ok())
        .filter(|entry| {
            entry.file_type().is_file() && entry.path().extension().is_some_and(|ext| ext == "md")
        })
        .filter_map(|entry| {
            let inner = entry.path().strip_prefix(moved_folder).ok()?.to_path_buf();
            Some(DetectedRename {
                old_path: display_relative_path(&old_relative.join(&inner)),
                new_path: display_relative_path(&new_relative.join(&inner)),
            })
        })
        .collect()
}

/// Move a folder (and everything under it) into another vault folder, then
/// rewrite wiki links across the vault so references to the moved notes stay intact.
pub fn move_folder(
    vault_path: &Path,
    folder_path: &str,
    destination_path: &str,
) -> Result<FolderMoveResult, String> {
    let relative_path = ensure_relative_folder_path(folder_path)?;
    let destination_relative = ensure_destination_folder_path(destination_path)?;
    let source_path = vault_path.join(&relative_path);

    if !source_path.exists() {
        return Err(format!("Folder does not exist: {}", folder_path));
    }
    if !source_path.is_dir() {
        return Err(format!("Not a folder: {}", folder_path));
    }

    let folder_name = source_path
        .file_name()
        .map(|name| name.to_os_string())
        .ok_or_else(|| "Folder path cannot target the vault root".to_string())?;

    let destination_dir = vault_path.join(&destination_relative);
    if !destination_dir.exists() {
        return Err(format!(
            "Destination folder does not exist: {}",
            display_relative_path(&destination_relative)
        ));
    }
    if !destination_dir.is_dir() {
        return Err(format!(
            "Destination is not a folder: {}",
            display_relative_path(&destination_relative)
        ));
    }
    if destination_relative == relative_path || destination_relative.starts_with(&relative_path) {
        return Err("Cannot move a folder into itself or its own subfolder".to_string());
    }

    let new_relative = destination_relative.join(&folder_name);
    if new_relative == relative_path {
        let unchanged = display_relative_path(&relative_path);
        return Ok(FolderMoveResult {
            old_path: unchanged.clone(),
            new_path: unchanged,
            updated_files: 0,
        });
    }

    let new_path = vault_path.join(&new_relative);
    if new_path.exists() {
        return Err(format!(
            "Folder '{}' already exists",
            display_relative_path(&new_relative)
        ));
    }

    fs::rename(&source_path, &new_path)
        .map_err(|error| format!("Failed to move folder: {}", error))?;

    let renames = collect_moved_note_renames(&new_path, &relative_path, &new_relative);
    let updated_files = update_wikilinks_for_renames(vault_path, &renames)?;

    Ok(FolderMoveResult {
        old_path: display_relative_path(&relative_path),
        new_path: display_relative_path(&new_relative),
        updated_files,
    })
}

pub fn delete_folder(vault_path: &Path, folder_path: &str) -> Result<String, String> {
    let relative_path = ensure_relative_folder_path(folder_path)?;
    let target_path = vault_path.join(&relative_path);

    if !target_path.exists() {
        return Err(format!("Folder does not exist: {}", folder_path));
    }
    if !target_path.is_dir() {
        return Err(format!("Not a folder: {}", folder_path));
    }

    fs::remove_dir_all(&target_path)
        .map_err(|error| format!("Failed to delete folder: {}", error))?;
    Ok(display_relative_path(&relative_path))
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::TempDir;

    fn make_folder(dir: &TempDir, relative: &str) -> PathBuf {
        let path = dir.path().join(relative);
        fs::create_dir_all(&path).unwrap();
        path
    }

    #[test]
    fn rename_folder_updates_relative_destination() {
        let dir = TempDir::new().unwrap();
        make_folder(&dir, "projects/grimoire");

        let result = rename_folder(dir.path(), "projects", "work").unwrap();

        assert_eq!(
            result,
            FolderRenameResult {
                old_path: "projects".to_string(),
                new_path: "work".to_string(),
            }
        );
        assert!(dir.path().join("work/grimoire").is_dir());
        assert!(!dir.path().join("projects").exists());
    }

    #[test]
    fn rename_folder_rejects_duplicate_sibling() {
        let dir = TempDir::new().unwrap();
        make_folder(&dir, "projects");
        make_folder(&dir, "areas");

        let error = rename_folder(dir.path(), "projects", "areas").unwrap_err();

        assert_eq!(error, "Folder 'areas' already exists");
    }

    #[test]
    fn rename_folder_rejects_invalid_names() {
        let dir = TempDir::new().unwrap();
        make_folder(&dir, "projects");

        let error = rename_folder(dir.path(), "projects", "../areas").unwrap_err();

        assert_eq!(error, "Invalid folder name");
    }

    #[test]
    fn rename_folder_rejects_windows_invalid_names() {
        let dir = TempDir::new().unwrap();
        make_folder(&dir, "projects");

        let error = rename_folder(dir.path(), "projects", "LPT1").unwrap_err();

        assert_eq!(error, "Invalid folder name");
    }

    #[test]
    fn delete_folder_removes_nested_contents() {
        let dir = TempDir::new().unwrap();
        let nested = make_folder(&dir, "projects/grimoire");
        fs::write(nested.join("note.md"), "# Note\n").unwrap();

        let deleted_path = delete_folder(dir.path(), "projects").unwrap();

        assert_eq!(deleted_path, "projects");
        assert!(!dir.path().join("projects").exists());
    }

    #[test]
    fn delete_folder_rejects_missing_folder() {
        let dir = TempDir::new().unwrap();

        let error = delete_folder(dir.path(), "projects").unwrap_err();

        assert_eq!(error, "Folder does not exist: projects");
    }

    fn write_note(dir: &TempDir, relative: &str, content: &str) {
        let path = dir.path().join(relative);
        fs::create_dir_all(path.parent().unwrap()).unwrap();
        fs::write(path, content).unwrap();
    }

    #[test]
    fn move_folder_moves_into_destination_and_updates_wikilinks() {
        let dir = TempDir::new().unwrap();
        make_folder(&dir, "archive");
        write_note(&dir, "projects/weekly-review.md", "# Weekly Review\n");
        write_note(
            &dir,
            "areas/linked.md",
            "See [[projects/weekly-review]] and [[Weekly Review]].\n",
        );

        let result = move_folder(dir.path(), "projects", "archive").unwrap();

        assert_eq!(result.old_path, "projects");
        assert_eq!(result.new_path, "archive/projects");
        assert_eq!(result.updated_files, 1);
        assert!(dir
            .path()
            .join("archive/projects/weekly-review.md")
            .exists());
        assert!(!dir.path().join("projects").exists());

        let linked = fs::read_to_string(dir.path().join("areas/linked.md")).unwrap();
        assert!(linked.contains("[[archive/projects/weekly-review]]"));
        assert!(!linked.contains("[[projects/weekly-review]]"));
        assert!(!linked.contains("[[Weekly Review]]"));
    }

    #[test]
    fn move_folder_updates_frontmatter_relationship_references() {
        let dir = TempDir::new().unwrap();
        make_folder(&dir, "archive");
        write_note(&dir, "projects/weekly-review.md", "# Weekly Review\n");
        write_note(
            &dir,
            "areas/plan.md",
            "---\nIs A: Project\nRelated to:\n  - \"[[projects/weekly-review]]\"\n---\n# Plan\n",
        );

        let result = move_folder(dir.path(), "projects", "archive").unwrap();

        assert_eq!(result.updated_files, 1);
        let plan = fs::read_to_string(dir.path().join("areas/plan.md")).unwrap();
        assert!(plan.contains("- \"[[archive/projects/weekly-review]]\""));
    }

    #[test]
    fn move_folder_updates_links_between_moved_notes() {
        let dir = TempDir::new().unwrap();
        make_folder(&dir, "archive");
        write_note(&dir, "projects/alpha.md", "See [[projects/beta]].\n");
        write_note(&dir, "projects/beta.md", "# Beta\n");

        move_folder(dir.path(), "projects", "archive").unwrap();

        let alpha = fs::read_to_string(dir.path().join("archive/projects/alpha.md")).unwrap();
        assert!(alpha.contains("[[archive/projects/beta]]"));
    }

    #[test]
    fn move_folder_to_vault_root() {
        for root in ["", "."] {
            let dir = TempDir::new().unwrap();
            write_note(&dir, "areas/projects/note.md", "# Note\n");

            let result = move_folder(dir.path(), "areas/projects", root).unwrap();

            assert_eq!(result.old_path, "areas/projects");
            assert_eq!(result.new_path, "projects");
            assert!(dir.path().join("projects/note.md").exists());
        }
    }

    #[test]
    fn move_folder_rejects_own_descendant_and_itself() {
        let dir = TempDir::new().unwrap();
        make_folder(&dir, "projects/nested/deep");

        for destination in ["projects", "projects/nested", "projects/nested/deep"] {
            let error = move_folder(dir.path(), "projects", destination).unwrap_err();
            assert_eq!(
                error,
                "Cannot move a folder into itself or its own subfolder"
            );
        }
        assert!(dir.path().join("projects/nested/deep").is_dir());
    }

    #[test]
    fn move_folder_rejects_collision() {
        let dir = TempDir::new().unwrap();
        make_folder(&dir, "projects");
        make_folder(&dir, "archive/projects");

        let error = move_folder(dir.path(), "projects", "archive").unwrap_err();

        assert_eq!(error, "Folder 'archive/projects' already exists");
        assert!(dir.path().join("projects").is_dir());
    }

    #[test]
    fn move_folder_rejects_vault_boundary_escape() {
        let dir = TempDir::new().unwrap();
        make_folder(&dir, "projects");

        let source_escape = move_folder(dir.path(), "../projects", "archive").unwrap_err();
        assert_eq!(source_escape, "Folder path cannot escape the vault root");

        let destination_escape = move_folder(dir.path(), "projects", "../outside").unwrap_err();
        assert_eq!(
            destination_escape,
            "Folder path cannot escape the vault root"
        );

        let absolute_destination = move_folder(dir.path(), "projects", "/tmp").unwrap_err();
        assert_eq!(
            absolute_destination,
            "Folder path must be relative to the vault root"
        );
    }

    #[test]
    fn move_folder_noop_when_already_in_destination() {
        let dir = TempDir::new().unwrap();
        make_folder(&dir, "archive/projects");

        let result = move_folder(dir.path(), "archive/projects", "archive").unwrap();

        assert_eq!(result.old_path, "archive/projects");
        assert_eq!(result.new_path, "archive/projects");
        assert_eq!(result.updated_files, 0);
        assert!(dir.path().join("archive/projects").is_dir());
    }

    #[test]
    fn move_folder_rejects_missing_destination() {
        let dir = TempDir::new().unwrap();
        make_folder(&dir, "projects");

        let error = move_folder(dir.path(), "projects", "missing").unwrap_err();

        assert_eq!(error, "Destination folder does not exist: missing");
    }

    #[test]
    fn move_folder_with_local_only_notes_succeeds() {
        // Path-based locality is a frontend egress classification; a local move
        // inside the vault is not an exfiltration and must not be blocked.
        let dir = TempDir::new().unwrap();
        make_folder(&dir, "archive");
        write_note(
            &dir,
            "journal/dream.md",
            "---\nprivate: true\n---\n# Dream\n",
        );

        let result = move_folder(dir.path(), "journal", "archive").unwrap();

        assert_eq!(result.new_path, "archive/journal");
        assert!(dir.path().join("archive/journal/dream.md").exists());
    }
}
