use std::fs;
use std::io::{ErrorKind, Write};
use std::path::Path;
use std::time::UNIX_EPOCH;

pub fn read_file_metadata(path: &Path) -> Result<(Option<u64>, Option<u64>, u64), String> {
    let metadata = fs::metadata(path)
        .map_err(|error| format!("Failed to stat {}: {error}", path.display()))?;
    let modified_at = metadata
        .modified()
        .ok()
        .and_then(|value| value.duration_since(UNIX_EPOCH).ok())
        .map(|value| value.as_secs());
    let created_at = metadata
        .created()
        .ok()
        .and_then(|value| value.duration_since(UNIX_EPOCH).ok())
        .map(|value| value.as_secs());
    Ok((modified_at, created_at, metadata.len()))
}

pub fn get_note_content(path: &Path) -> Result<String, String> {
    if !path.exists() {
        return Err(format!("File does not exist: {}", path.display()));
    }
    if !path.is_file() {
        return Err(format!("Path is not a file: {}", path.display()));
    }
    let bytes =
        fs::read(path).map_err(|error| format!("Failed to read {}: {error}", path.display()))?;
    String::from_utf8(bytes)
        .map_err(|_| format!("File is not valid UTF-8 text: {}", path.display()))
}

pub fn save_note_content(path: &str, content: &str) -> Result<(), String> {
    write_note_content(Path::new(path), content, true)
}

pub fn create_note_content(path: &str, content: &str) -> Result<(), String> {
    write_note_content(Path::new(path), content, false)
}

fn write_note_content(path: &Path, content: &str, overwrite: bool) -> Result<(), String> {
    let display_path = path.display().to_string();
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent)
            .map_err(|error| format!("Failed to create directory {}: {error}", parent.display()))?;
    }
    if path.exists()
        && path
            .metadata()
            .map(|metadata| metadata.permissions().readonly())
            .unwrap_or(false)
    {
        return Err(format!("File is read-only: {display_path}"));
    }

    let parent = path.parent().unwrap_or_else(|| Path::new("."));
    let mut temporary = tempfile::Builder::new()
        .prefix(".grimoire-save-")
        .tempfile_in(parent)
        .map_err(|error| format!("Failed to create temp file for {display_path}: {error}"))?;
    temporary
        .write_all(content.as_bytes())
        .map_err(|error| format!("Failed to write temp file for {display_path}: {error}"))?;
    temporary
        .as_file_mut()
        .sync_all()
        .map_err(|error| format!("Failed to sync temp file for {display_path}: {error}"))?;

    let result = if overwrite {
        temporary.persist(path).map(|_| ())
    } else {
        temporary.persist_noclobber(path).map(|_| ())
    };
    result.map_err(|error| match error.error.kind() {
        ErrorKind::AlreadyExists => format!("File already exists: {display_path}"),
        _ => format!("Failed to save {display_path}: {}", error.error),
    })?;
    sync_parent(path)
}

fn sync_parent(path: &Path) -> Result<(), String> {
    let Some(parent) = path.parent() else {
        return Ok(());
    };
    let directory = fs::File::open(parent)
        .map_err(|error| format!("Failed to open directory {}: {error}", parent.display()))?;
    directory
        .sync_all()
        .map_err(|error| format!("Failed to sync directory {}: {error}", parent.display()))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn create_save_and_read_round_trip() {
        let directory = tempfile::tempdir().unwrap();
        let note = directory.path().join("Notes/Hello.md");
        let path = note.to_string_lossy();

        create_note_content(&path, "# Hello\n").unwrap();
        assert_eq!(get_note_content(&note).unwrap(), "# Hello\n");
        assert!(create_note_content(&path, "overwrite").is_err());

        save_note_content(&path, "# Updated\n").unwrap();
        assert_eq!(get_note_content(&note).unwrap(), "# Updated\n");
    }
}
