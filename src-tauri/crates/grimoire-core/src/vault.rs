use crate::locality::is_local_only_export_file;
use crate::vault_file::{
    create_note_content, get_note_content, read_file_metadata, save_note_content,
};
use serde::{Deserialize, Serialize};
use serde_yaml::Value;
use std::ffi::OsString;
use std::path::{Component, Path, PathBuf};
use walkdir::{DirEntry, WalkDir};

pub const VAULT_SERVICE_VERSION: u8 = 1;
pub const VAULT_BOUNDARY_ERROR: &str = "Path must stay inside the active vault";

#[derive(Clone, Debug)]
pub struct VaultRoot {
    requested: PathBuf,
    canonical: PathBuf,
}

#[derive(Clone, Debug, Deserialize, Serialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct VaultDocumentV1 {
    pub path: String,
    pub title: String,
    pub collection: String,
    pub is_local_only: bool,
    pub modified_at: Option<u64>,
    pub file_size: u64,
}

#[derive(Clone, Debug, Deserialize, Serialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct VaultSnapshotV1 {
    pub version: u8,
    pub root: String,
    pub documents: Vec<VaultDocumentV1>,
}

impl VaultRoot {
    pub fn open(path: impl AsRef<Path>) -> Result<Self, String> {
        let requested = path.as_ref().to_path_buf();
        let canonical = requested
            .canonicalize()
            .map_err(|_| "Vault is not available".to_string())?;
        if !canonical.is_dir() {
            return Err("Vault is not a directory".to_string());
        }
        Ok(Self {
            requested,
            canonical,
        })
    }

    pub fn scan(&self) -> Result<VaultSnapshotV1, String> {
        let mut documents = Vec::new();
        let walker = WalkDir::new(&self.canonical)
            .follow_links(false)
            .into_iter()
            .filter_entry(should_visit);

        for entry in walker {
            let entry = entry.map_err(|error| format!("Failed to scan vault: {error}"))?;
            if !is_markdown_file(&entry) {
                continue;
            }
            documents.push(self.describe(entry.path())?);
        }
        documents.sort_by(|left, right| left.path.cmp(&right.path));

        Ok(VaultSnapshotV1 {
            version: VAULT_SERVICE_VERSION,
            root: self.requested.to_string_lossy().into_owned(),
            documents,
        })
    }

    pub fn read(&self, relative_path: &str) -> Result<String, String> {
        get_note_content(&self.resolve_existing(relative_path)?)
    }

    pub fn create(&self, relative_path: &str, content: &str) -> Result<(), String> {
        let path = self.resolve_writable(relative_path)?;
        create_note_content(path.to_string_lossy().as_ref(), content)
    }

    pub fn save(&self, relative_path: &str, content: &str) -> Result<(), String> {
        let path = self.resolve_writable(relative_path)?;
        save_note_content(path.to_string_lossy().as_ref(), content)
    }

    fn resolve_existing(&self, relative_path: &str) -> Result<PathBuf, String> {
        validate_relative_path(relative_path)?;
        let requested = self.requested.join(relative_path);
        let canonical = requested
            .canonicalize()
            .map_err(|_| "File does not exist".to_string())?;
        self.ensure_inside(&canonical)?;
        Ok(requested)
    }

    fn resolve_writable(&self, relative_path: &str) -> Result<PathBuf, String> {
        validate_relative_path(relative_path)?;
        let requested = self.requested.join(relative_path);
        let canonical = canonicalize_for_write(&requested)?;
        self.ensure_inside(&canonical)?;
        Ok(requested)
    }

    fn ensure_inside(&self, path: &Path) -> Result<(), String> {
        path.strip_prefix(&self.canonical)
            .map(|_| ())
            .map_err(|_| VAULT_BOUNDARY_ERROR.to_string())
    }

    fn describe(&self, path: &Path) -> Result<VaultDocumentV1, String> {
        let relative = path
            .strip_prefix(&self.canonical)
            .map_err(|_| VAULT_BOUNDARY_ERROR.to_string())?;
        let relative_path = relative.to_string_lossy().replace('\\', "/");
        let content = get_note_content(path)?;
        let metadata = frontmatter(&content);
        let filename = path
            .file_stem()
            .map(|value| value.to_string_lossy().into_owned())
            .unwrap_or_else(|| "Untitled".to_string());
        let title = metadata
            .as_ref()
            .and_then(|value| yaml_string(value, "title"))
            .or_else(|| first_heading(&content))
            .unwrap_or(filename);
        let note_type = metadata
            .as_ref()
            .and_then(|value| yaml_string(value, "type"));
        let (modified_at, _, file_size) = read_file_metadata(path)?;

        Ok(VaultDocumentV1 {
            path: relative_path.clone(),
            title,
            collection: collection_for(&relative_path, note_type.as_deref()).to_string(),
            is_local_only: is_local_only_export_file(&self.canonical, path),
            modified_at,
            file_size,
        })
    }
}

fn validate_relative_path(value: &str) -> Result<(), String> {
    if value.trim().is_empty() || !value.to_ascii_lowercase().ends_with(".md") {
        return Err("Note path must be a relative Markdown path".to_string());
    }
    let path = Path::new(value);
    if path.is_absolute()
        || path.components().any(|component| {
            matches!(
                component,
                Component::CurDir
                    | Component::ParentDir
                    | Component::RootDir
                    | Component::Prefix(_)
            )
        })
    {
        return Err(VAULT_BOUNDARY_ERROR.to_string());
    }
    Ok(())
}

fn canonicalize_for_write(path: &Path) -> Result<PathBuf, String> {
    let mut current = path;
    let mut tail: Vec<OsString> = Vec::new();
    loop {
        if current.exists() {
            let canonical = current
                .canonicalize()
                .map_err(|_| VAULT_BOUNDARY_ERROR.to_string())?;
            tail.reverse();
            return Ok(tail
                .into_iter()
                .fold(canonical, |root, component| root.join(component)));
        }
        tail.push(
            current
                .file_name()
                .ok_or_else(|| VAULT_BOUNDARY_ERROR.to_string())?
                .to_os_string(),
        );
        current = current
            .parent()
            .ok_or_else(|| VAULT_BOUNDARY_ERROR.to_string())?;
    }
}

fn should_visit(entry: &DirEntry) -> bool {
    if !entry.file_type().is_dir() || entry.depth() == 0 {
        return true;
    }
    let name = entry.file_name().to_string_lossy();
    !name.starts_with('.')
        && !matches!(
            name.as_ref(),
            "node_modules" | "target" | "dist" | "build" | "coverage" | ".next"
        )
}

fn is_markdown_file(entry: &DirEntry) -> bool {
    entry.file_type().is_file()
        && entry
            .path()
            .extension()
            .is_some_and(|value| value.eq_ignore_ascii_case("md"))
}

fn frontmatter(content: &str) -> Option<Value> {
    let rest = content.strip_prefix("---\n")?;
    let end = rest.find("\n---")?;
    serde_yaml::from_str(&rest[..end]).ok()
}

fn yaml_string(value: &Value, key: &str) -> Option<String> {
    value
        .as_mapping()?
        .get(Value::String(key.to_string()))?
        .as_str()
        .map(str::to_string)
}

fn first_heading(content: &str) -> Option<String> {
    content.lines().find_map(|line| {
        line.strip_prefix("# ")
            .map(str::trim)
            .filter(|value| !value.is_empty())
            .map(str::to_string)
    })
}

fn collection_for(path: &str, note_type: Option<&str>) -> &'static str {
    let marker = note_type.unwrap_or(path).to_ascii_lowercase();
    if marker.contains("dream") {
        "dreams"
    } else if marker.contains("journal") || marker.contains("diary") {
        "journal"
    } else if marker.contains("project") || marker.contains("spec") {
        "projects"
    } else {
        "notes"
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;

    #[test]
    fn scans_classifies_and_round_trips_notes() {
        let directory = tempfile::tempdir().unwrap();
        fs::create_dir_all(directory.path().join("Journal")).unwrap();
        fs::write(
            directory.path().join("Journal/Today.md"),
            "---\ntitle: Morning\ntype: Journal\nlocality: local-only\n---\n# Today\n",
        )
        .unwrap();
        fs::write(directory.path().join("Welcome.md"), "# Welcome\n").unwrap();

        let vault = VaultRoot::open(directory.path()).unwrap();
        let snapshot = vault.scan().unwrap();
        assert_eq!(snapshot.version, 1);
        assert_eq!(snapshot.documents.len(), 2);
        let journal = snapshot
            .documents
            .iter()
            .find(|document| document.path == "Journal/Today.md")
            .unwrap();
        assert_eq!(journal.title, "Morning");
        assert_eq!(journal.collection, "journal");
        assert!(journal.is_local_only);

        vault.create("Notes/New.md", "# New\n").unwrap();
        vault.save("Notes/New.md", "# Updated\n").unwrap();
        assert_eq!(vault.read("Notes/New.md").unwrap(), "# Updated\n");
    }

    #[test]
    fn rejects_escape_paths_and_ignores_generated_directories() {
        let directory = tempfile::tempdir().unwrap();
        fs::create_dir_all(directory.path().join("node_modules/pkg")).unwrap();
        fs::write(
            directory.path().join("node_modules/pkg/Noise.md"),
            "# Noise\n",
        )
        .unwrap();
        let vault = VaultRoot::open(directory.path()).unwrap();

        assert_eq!(vault.scan().unwrap().documents.len(), 0);
        assert_eq!(
            vault.read("../outside.md").unwrap_err(),
            VAULT_BOUNDARY_ERROR
        );
        assert_eq!(
            vault.create("../outside.md", "nope").unwrap_err(),
            VAULT_BOUNDARY_ERROR
        );
    }
}
