//! Writing a single exported document to a path the user picked in a save
//! dialog. Deliberately separate from the vault writers, which are fenced to
//! the active vault: an export is meant to leave it.

use std::path::{Path, PathBuf};

const ALLOWED_EXTENSIONS: &[&str] = &["html", "htm", "md", "txt"];

fn validate_export_path(path: &Path) -> Result<(), String> {
    let extension = path
        .extension()
        .and_then(|value| value.to_str())
        .map(|value| value.to_ascii_lowercase())
        .ok_or_else(|| "Export path needs a file extension".to_string())?;
    if !ALLOWED_EXTENSIONS.contains(&extension.as_str()) {
        return Err(format!("Cannot export to a .{extension} file"));
    }
    if path.components().any(|part| matches!(part, std::path::Component::ParentDir)) {
        return Err("Export path may not contain '..'".to_string());
    }
    if !path.is_absolute() {
        return Err("Export path must be absolute".to_string());
    }
    Ok(())
}

/// Writes `contents` to `path`, which must be an absolute .html/.htm/.md/.txt path.
#[tauri::command]
pub fn write_export_file(path: PathBuf, contents: String) -> Result<(), String> {
    validate_export_path(&path)?;
    if let Some(parent) = path.parent() {
        std::fs::create_dir_all(parent).map_err(|error| format!("Could not create {}: {error}", parent.display()))?;
    }
    std::fs::write(&path, contents).map_err(|error| format!("Could not write {}: {error}", path.display()))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn accepts_absolute_html_paths_only() {
        assert!(validate_export_path(Path::new("/tmp/note.html")).is_ok());
        assert!(validate_export_path(Path::new("/tmp/note.HTM")).is_ok());
        assert!(validate_export_path(Path::new("/tmp/note.pdf")).is_err());
        assert!(validate_export_path(Path::new("/tmp/note")).is_err());
        assert!(validate_export_path(Path::new("relative/note.html")).is_err());
        assert!(validate_export_path(Path::new("/tmp/../etc/note.html")).is_err());
    }

    #[test]
    fn writes_the_file() {
        let dir = tempfile::tempdir().expect("tempdir");
        let target = dir.path().join("out").join("note.html");
        write_export_file(target.clone(), "<p>hi</p>".to_string()).expect("write");
        assert_eq!(std::fs::read_to_string(target).expect("read"), "<p>hi</p>");
    }
}
