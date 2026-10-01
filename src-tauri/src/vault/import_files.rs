//! Importing files that live anywhere on disk into a folder of the vault.
//!
//! Markdown and plain text become notes in the target folder (`.txt` is
//! renamed to `.md` on the way in); everything else becomes an attachment in
//! that folder's `attachments/`. The source is never touched. A file that is
//! byte-identical to one already at the destination is reported as a
//! duplicate and the existing path is returned, so importing twice never
//! makes a `Report (2).md`. Name collisions with different content get a
//! ` (2)`, ` (3)`, … suffix.

use serde::Serialize;
use sha2::{Digest, Sha256};
use std::fs;
use std::path::{Path, PathBuf};

const NOTE_EXTENSIONS: &[&str] = &["md", "markdown", "txt"];
const ATTACHMENTS_DIR: &str = "attachments";

#[derive(Debug, Clone, Serialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct ImportedFile {
    /// Where the file came from.
    pub source: String,
    /// Where it lives in the vault now (or already lived, for a duplicate).
    pub path: String,
    /// `note`, `attachment`, or `duplicate`.
    pub kind: String,
}

fn extension_of(path: &Path) -> String {
    path.extension()
        .and_then(|value| value.to_str())
        .map(|value| value.to_ascii_lowercase())
        .unwrap_or_default()
}

fn is_note_extension(extension: &str) -> bool {
    NOTE_EXTENSIONS.contains(&extension)
}

/// The filename a source gets inside the vault: notes always end in `.md`.
fn destination_filename(source: &Path) -> Result<String, String> {
    let filename = source
        .file_name()
        .and_then(|name| name.to_str())
        .ok_or_else(|| format!("Cannot read the name of {}", source.display()))?;
    let extension = extension_of(source);
    if extension == "txt" || extension == "markdown" {
        let stem = source
            .file_stem()
            .and_then(|stem| stem.to_str())
            .unwrap_or(filename);
        return Ok(format!("{stem}.md"));
    }
    Ok(filename.to_string())
}

fn file_hash(path: &Path) -> Result<String, String> {
    let bytes =
        fs::read(path).map_err(|error| format!("Could not read {}: {error}", path.display()))?;
    let mut hasher = Sha256::new();
    hasher.update(&bytes);
    Ok(format!("{:x}", hasher.finalize()))
}

/// First free path for `filename` in `dir`: the name itself, then ` (2)`, ` (3)`, …
fn unique_path_in(dir: &Path, filename: &str) -> PathBuf {
    let candidate = dir.join(filename);
    if !candidate.exists() {
        return candidate;
    }
    let path = Path::new(filename);
    let stem = path
        .file_stem()
        .and_then(|stem| stem.to_str())
        .unwrap_or(filename);
    let extension = path.extension().and_then(|ext| ext.to_str());
    for index in 2.. {
        let name = match extension {
            Some(ext) => format!("{stem} ({index}).{ext}"),
            None => format!("{stem} ({index})"),
        };
        let candidate = dir.join(&name);
        if !candidate.exists() {
            return candidate;
        }
    }
    unreachable!("the counter is unbounded")
}

fn import_one(target_dir: &Path, source: &Path) -> Result<ImportedFile, String> {
    if !source.is_file() {
        return Err(format!("{} is not a file", source.display()));
    }
    let extension = extension_of(source);
    let is_note = is_note_extension(&extension);
    let destination_dir = if is_note {
        target_dir.to_path_buf()
    } else {
        target_dir.join(ATTACHMENTS_DIR)
    };
    fs::create_dir_all(&destination_dir)
        .map_err(|error| format!("Could not create {}: {error}", destination_dir.display()))?;

    let filename = destination_filename(source)?;
    let same_name = destination_dir.join(&filename);
    if same_name.is_file() && file_hash(&same_name)? == file_hash(source)? {
        return Ok(ImportedFile {
            source: source.to_string_lossy().to_string(),
            path: same_name.to_string_lossy().to_string(),
            kind: "duplicate".to_string(),
        });
    }

    let destination = unique_path_in(&destination_dir, &filename);
    fs::copy(source, &destination).map_err(|error| {
        format!(
            "Could not copy {} to {}: {error}",
            source.display(),
            destination.display()
        )
    })?;
    Ok(ImportedFile {
        source: source.to_string_lossy().to_string(),
        path: destination.to_string_lossy().to_string(),
        kind: if is_note { "note" } else { "attachment" }.to_string(),
    })
}

/// Copies every source into `target_dir` (a folder inside the vault, already
/// validated by the caller). One bad source fails the whole call before any
/// copying starts, so a batch is all-or-nothing on validation.
pub fn import_files_into_folder(
    target_dir: &str,
    sources: &[PathBuf],
) -> Result<Vec<ImportedFile>, String> {
    let target = Path::new(target_dir);
    if !target.is_dir() {
        return Err(format!(
            "{} is not a folder in this vault",
            target.display()
        ));
    }
    for source in sources {
        if !source.is_absolute() {
            return Err(format!(
                "Import needs an absolute path, got {}",
                source.display()
            ));
        }
        if !source.is_file() {
            return Err(format!("{} is not a file", source.display()));
        }
        if source.starts_with(target) {
            return Err(format!("{} is already in this folder", source.display()));
        }
    }
    sources
        .iter()
        .map(|source| import_one(target, source))
        .collect()
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::TempDir;

    fn write(dir: &Path, name: &str, contents: &str) -> PathBuf {
        let path = dir.join(name);
        fs::write(&path, contents).expect("write fixture");
        path
    }

    #[test]
    fn notes_land_in_the_folder_and_txt_becomes_md() {
        let vault = TempDir::new().unwrap();
        let elsewhere = TempDir::new().unwrap();
        let folder = vault.path().join("Projects");
        fs::create_dir_all(&folder).unwrap();
        let note = write(elsewhere.path(), "Plan.md", "# Plan");
        let text = write(elsewhere.path(), "notes.txt", "loose thoughts");

        let imported =
            import_files_into_folder(folder.to_str().unwrap(), &[note.clone(), text]).unwrap();

        assert_eq!(imported.len(), 2);
        assert_eq!(imported[0].kind, "note");
        assert_eq!(imported[0].path, folder.join("Plan.md").to_string_lossy());
        assert_eq!(imported[1].kind, "note");
        assert_eq!(imported[1].path, folder.join("notes.md").to_string_lossy());
        assert_eq!(
            fs::read_to_string(folder.join("notes.md")).unwrap(),
            "loose thoughts"
        );
        assert!(note.exists(), "the source is left where it was");
    }

    #[test]
    fn other_files_become_attachments_of_the_folder() {
        let vault = TempDir::new().unwrap();
        let elsewhere = TempDir::new().unwrap();
        let pdf = write(elsewhere.path(), "spec.pdf", "%PDF-1.7");

        let imported = import_files_into_folder(vault.path().to_str().unwrap(), &[pdf]).unwrap();

        assert_eq!(imported[0].kind, "attachment");
        assert_eq!(
            imported[0].path,
            vault
                .path()
                .join("attachments")
                .join("spec.pdf")
                .to_string_lossy()
        );
    }

    #[test]
    fn identical_content_is_reported_as_a_duplicate_not_copied_again() {
        let vault = TempDir::new().unwrap();
        let elsewhere = TempDir::new().unwrap();
        write(vault.path(), "Plan.md", "# Plan");
        let again = write(elsewhere.path(), "Plan.md", "# Plan");

        let imported = import_files_into_folder(vault.path().to_str().unwrap(), &[again]).unwrap();

        assert_eq!(imported[0].kind, "duplicate");
        assert_eq!(
            imported[0].path,
            vault.path().join("Plan.md").to_string_lossy()
        );
        assert!(!vault.path().join("Plan (2).md").exists());
    }

    #[test]
    fn same_name_different_content_gets_a_numbered_name() {
        let vault = TempDir::new().unwrap();
        let elsewhere = TempDir::new().unwrap();
        write(vault.path(), "Plan.md", "# Plan v1");
        write(vault.path(), "Plan (2).md", "# Plan v2");
        let newer = write(elsewhere.path(), "Plan.md", "# Plan v3");

        let imported = import_files_into_folder(vault.path().to_str().unwrap(), &[newer]).unwrap();

        assert_eq!(imported[0].kind, "note");
        assert_eq!(
            imported[0].path,
            vault.path().join("Plan (3).md").to_string_lossy()
        );
    }

    #[test]
    fn a_bad_source_fails_before_anything_is_copied() {
        let vault = TempDir::new().unwrap();
        let elsewhere = TempDir::new().unwrap();
        let good = write(elsewhere.path(), "Good.md", "ok");
        let missing = elsewhere.path().join("Missing.md");

        let error =
            import_files_into_folder(vault.path().to_str().unwrap(), &[good, missing]).unwrap_err();

        assert!(error.contains("Missing.md"));
        assert!(!vault.path().join("Good.md").exists());
    }

    #[test]
    fn refuses_a_source_already_inside_the_target() {
        let vault = TempDir::new().unwrap();
        let inside = write(vault.path(), "Here.md", "here");

        let error =
            import_files_into_folder(vault.path().to_str().unwrap(), &[inside]).unwrap_err();

        assert!(error.contains("already in this folder"));
    }
}
