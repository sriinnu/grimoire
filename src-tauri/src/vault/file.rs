use std::fs;
use std::io::{ErrorKind, Write};
use std::path::Path;
use std::time::UNIX_EPOCH;

/// Read file metadata (modified_at timestamp, created_at timestamp, file size).
/// Creation time is sourced from filesystem metadata (birthtime on macOS).
pub(crate) fn read_file_metadata(path: &Path) -> Result<(Option<u64>, Option<u64>, u64), String> {
    let metadata =
        fs::metadata(path).map_err(|e| format!("Failed to stat {}: {}", path.display(), e))?;
    let modified_at = metadata
        .modified()
        .ok()
        .and_then(|t| t.duration_since(UNIX_EPOCH).ok())
        .map(|d| d.as_secs());
    let created_at = metadata
        .created()
        .ok()
        .and_then(|t| t.duration_since(UNIX_EPOCH).ok())
        .map(|d| d.as_secs());
    Ok((modified_at, created_at, metadata.len()))
}

fn invalid_utf8_text_error(path: &Path) -> String {
    format!("File is not valid UTF-8 text: {}", path.display())
}

/// Read the content of a single note file.
pub fn get_note_content(path: &Path) -> Result<String, String> {
    if !path.exists() {
        return Err(format!("File does not exist: {}", path.display()));
    }
    if !path.is_file() {
        return Err(format!("Path is not a file: {}", path.display()));
    }
    let bytes = fs::read(path).map_err(|e| format!("Failed to read {}: {}", path.display(), e))?;
    String::from_utf8(bytes).map_err(|_| invalid_utf8_text_error(path))
}

fn validate_save_path(file_path: &Path, display_path: &str) -> Result<(), String> {
    let parent_missing = file_path.parent().is_some_and(|p| !p.exists());
    if parent_missing {
        return Err(format!(
            "Parent directory does not exist: {}",
            file_path.parent().unwrap().display()
        ));
    }
    let is_readonly = file_path.exists()
        && file_path
            .metadata()
            .map(|m| m.permissions().readonly())
            .unwrap_or(false);
    if is_readonly {
        return Err(format!("File is read-only: {}", display_path));
    }
    Ok(())
}

fn sync_parent_dir(path: &Path) {
    let Some(parent) = path.parent() else {
        return;
    };
    if let Ok(dir) = fs::File::open(parent) {
        if let Err(err) = dir.sync_all() {
            log::warn!("Failed to sync directory {}: {}", parent.display(), err);
        }
    }
}

fn persist_temp_file(
    path: &Path,
    display_path: &str,
    content: &str,
    overwrite: bool,
) -> Result<(), String> {
    let parent = path.parent().unwrap_or_else(|| Path::new("."));
    let mut temp_file = tempfile::Builder::new()
        .prefix(".grimoire-save-")
        .tempfile_in(parent)
        .map_err(|e| format!("Failed to create temp file for {}: {}", display_path, e))?;

    temp_file
        .write_all(content.as_bytes())
        .map_err(|e| format!("Failed to write temp file for {}: {}", display_path, e))?;
    temp_file
        .as_file_mut()
        .sync_all()
        .map_err(|e| format!("Failed to sync temp file for {}: {}", display_path, e))?;

    let persist_result = if overwrite {
        temp_file.persist(path).map(|_| ())
    } else {
        temp_file.persist_noclobber(path).map(|_| ())
    };

    persist_result.map_err(|e| match e.error.kind() {
        ErrorKind::AlreadyExists => format!("File already exists: {}", display_path),
        _ => format!("Failed to save {}: {}", display_path, e.error),
    })?;
    sync_parent_dir(path);
    Ok(())
}

/// Write content to a note file with a same-directory temp file and atomic persist.
pub fn save_note_content(path: &str, content: &str) -> Result<(), String> {
    let file_path = Path::new(path);
    if let Some(parent) = file_path.parent() {
        if !parent.exists() {
            fs::create_dir_all(parent)
                .map_err(|e| format!("Failed to create directory {}: {}", parent.display(), e))?;
        }
    }
    validate_save_path(file_path, path)?;
    persist_temp_file(file_path, path, content, true)
}

/// Create a new note file without overwriting any existing file.
pub fn create_note_content(path: &str, content: &str) -> Result<(), String> {
    let file_path = Path::new(path);
    if let Some(parent) = file_path.parent() {
        if !parent.exists() {
            fs::create_dir_all(parent)
                .map_err(|e| format!("Failed to create directory {}: {}", parent.display(), e))?;
        }
    }
    validate_save_path(file_path, path)?;
    persist_temp_file(file_path, path, content, false)
}
