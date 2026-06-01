use serde::Serialize;
use std::fs::{self, File};
use std::io;
use std::path::{Path, PathBuf};
use tempfile::TempPath;
use walkdir::{DirEntry, WalkDir};
use zip::write::FileOptions;

use super::locality::is_local_only_export_file;
use super::locality_attachments::local_only_referenced_attachments;

const SKIPPED_DIRS: &[&str] = &[
    ".claude",
    ".codex",
    ".git",
    ".grimoire",
    ".grimoire-local",
    "certs",
    "mockups",
    "node_modules",
    "target",
];
const SKIPPED_FILES: &[&str] = &[".ds_store", ".mcp.json"];

#[derive(Debug, Clone, Serialize, PartialEq, Eq)]
pub struct VaultExportReport {
    pub export_path: String,
    pub files_exported: usize,
    pub skipped_files: usize,
}

/// Writes the current vault as a portable Markdown ZIP archive.
pub fn export_markdown_zip(
    vault_path: &Path,
    target_path: &Path,
) -> Result<VaultExportReport, String> {
    let vault_root = canonical_dir(vault_path, "Vault")?;
    let target = resolve_target_path(target_path);
    validate_target(&vault_root, &target)?;
    if let Some(parent) = target.parent() {
        fs::create_dir_all(parent).map_err(|e| format!("Failed to create export folder: {e}"))?;
    }

    let local_only_attachments = local_only_referenced_attachments(&vault_root)?;
    let mut files_exported = 0;
    let mut skipped_files = 0;
    let temp_path = create_export_temp_path(&target)?;
    let file = File::create(&temp_path).map_err(|e| format!("Failed to create ZIP export: {e}"))?;
    let mut zip = zip::ZipWriter::new(file);
    let options = FileOptions::default()
        .compression_method(zip::CompressionMethod::Deflated)
        .unix_permissions(0o644);

    for entry in WalkDir::new(&vault_root)
        .follow_links(false)
        .into_iter()
        .filter_entry(should_enter)
    {
        let entry = entry.map_err(|e| format!("Failed to read vault for export: {e}"))?;
        if !entry.file_type().is_file() {
            continue;
        }
        if should_skip_file(&vault_root, &entry, &local_only_attachments) {
            skipped_files += 1;
            continue;
        }
        add_file_to_zip(&vault_root, entry.path(), &mut zip, options)?;
        files_exported += 1;
    }

    zip.finish()
        .map_err(|e| format!("Failed to finish ZIP export: {e}"))?;
    persist_export_temp_path(temp_path, &target)?;
    Ok(VaultExportReport {
        export_path: target.to_string_lossy().into_owned(),
        files_exported,
        skipped_files,
    })
}

pub(super) fn canonical_dir(path: &Path, label: &str) -> Result<PathBuf, String> {
    let canonical = path
        .canonicalize()
        .map_err(|e| format!("{label} folder is not available: {e}"))?;
    if !canonical.is_dir() {
        return Err(format!("{label} path is not a folder"));
    }
    Ok(canonical)
}

pub(super) fn resolve_target_path(path: &Path) -> PathBuf {
    if path.extension().is_some() {
        return path.to_path_buf();
    }
    path.with_extension("zip")
}

pub(super) fn validate_target(vault_root: &Path, target: &Path) -> Result<(), String> {
    let parent = target
        .parent()
        .unwrap_or_else(|| Path::new("."))
        .canonicalize()
        .map_err(|e| format!("Failed to inspect export folder: {e}"))?;
    let canonical_target = parent.join(
        target
            .file_name()
            .ok_or_else(|| "Export target must include a file name".to_string())?,
    );
    if canonical_target.starts_with(vault_root) {
        return Err("Choose an export path outside the active vault".to_string());
    }
    Ok(())
}

pub(super) fn create_export_temp_path(target: &Path) -> Result<TempPath, String> {
    let parent = target.parent().unwrap_or_else(|| Path::new("."));
    tempfile::Builder::new()
        .prefix(".grimoire-export-")
        .suffix(".zip.tmp")
        .tempfile_in(parent)
        .map(|file| file.into_temp_path())
        .map_err(|e| format!("Failed to create temporary ZIP export: {e}"))
}

pub(super) fn persist_export_temp_path(temp_path: TempPath, target: &Path) -> Result<(), String> {
    temp_path
        .persist(target)
        .map(|_| ())
        .map_err(|e| format!("Failed to finalize ZIP export: {e}"))
}

pub(super) fn should_enter(entry: &DirEntry) -> bool {
    if entry.depth() == 0 {
        return true;
    }
    if !entry.file_type().is_dir() {
        return true;
    }
    let name = entry.file_name().to_string_lossy().to_ascii_lowercase();
    !matches!(name.as_str(), ".git" | "node_modules" | "target")
}

pub(super) fn should_skip_file(
    vault_root: &Path,
    entry: &DirEntry,
    local_only_attachments: &std::collections::BTreeSet<String>,
) -> bool {
    let name = entry.file_name().to_string_lossy().to_ascii_lowercase();
    let relative = entry
        .path()
        .strip_prefix(vault_root)
        .map(|path| path.to_string_lossy().replace('\\', "/"))
        .unwrap_or_default();
    is_skipped_name(&name)
        || name.starts_with(".env")
        || has_skipped_component(Path::new(&relative))
        || local_only_attachments.contains(&relative)
        || is_local_only_export_file(vault_root, entry.path())
}

fn is_skipped_name(name: &str) -> bool {
    name.starts_with('.') || SKIPPED_DIRS.contains(&name) || SKIPPED_FILES.contains(&name)
}

fn has_skipped_component(path: &Path) -> bool {
    path.components().rev().skip(1).any(|component| {
        let name = component.as_os_str().to_string_lossy().to_ascii_lowercase();
        is_skipped_name(&name)
    })
}

pub(super) fn add_file_to_zip(
    vault_root: &Path,
    source_path: &Path,
    zip: &mut zip::ZipWriter<File>,
    options: FileOptions,
) -> Result<(), String> {
    let relative_path = source_path
        .strip_prefix(vault_root)
        .map_err(|_| "Failed to resolve vault file during export".to_string())?;
    let archive_name = relative_path.to_string_lossy().replace('\\', "/");
    zip.start_file(archive_name, options)
        .map_err(|e| format!("Failed to add ZIP entry: {e}"))?;
    let mut source = File::open(source_path)
        .map_err(|e| format!("Failed to open {}: {e}", source_path.display()))?;
    io::copy(&mut source, zip)
        .map(|_| ())
        .map_err(|e| format!("Failed to write {} into ZIP: {e}", source_path.display()))
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::TempDir;
    use zip::ZipArchive;

    #[test]
    fn exports_vault_files_to_zip() {
        let vault = TempDir::new().unwrap();
        let target_dir = TempDir::new().unwrap();
        fs::write(vault.path().join("note.md"), "# Note\n").unwrap();
        fs::create_dir_all(vault.path().join("assets")).unwrap();
        fs::write(vault.path().join("assets/image.svg"), "<svg/>").unwrap();

        let result =
            export_markdown_zip(vault.path(), &target_dir.path().join("vault.zip")).unwrap();

        assert_eq!(result.files_exported, 2);
        assert!(Path::new(&result.export_path).exists());
    }

    #[test]
    fn rejects_export_inside_vault() {
        let vault = TempDir::new().unwrap();
        let error =
            export_markdown_zip(vault.path(), &vault.path().join("export.zip")).unwrap_err();

        assert!(error.contains("outside the active vault"));
    }

    #[test]
    fn excludes_local_only_lanes_from_zip_export() {
        let vault = TempDir::new().unwrap();
        let target_dir = TempDir::new().unwrap();
        fs::write(
            vault.path().join("public.md"),
            "---\ntype: Project\n---\n# Public\n",
        )
        .unwrap();
        fs::write(
            vault.path().join("journal.md"),
            "---\ntype: Journal\n---\n# Private day\n",
        )
        .unwrap();
        fs::write(
            vault.path().join("private-flag.md"),
            "---\nlocal_only: true\n---\n# Secret\n",
        )
        .unwrap();
        fs::create_dir_all(vault.path().join("Dreams")).unwrap();
        fs::write(vault.path().join("Dreams/hidden.md"), "# Hidden\n").unwrap();
        fs::create_dir_all(vault.path().join("Private/attachments")).unwrap();
        fs::write(vault.path().join("Private/attachments/audio.m4a"), "audio").unwrap();
        fs::write(
            vault.path().join("sadhana.md"),
            "---\ntype: Sadhana\nlocality: local\n---\n# Practice\n",
        )
        .unwrap();
        fs::write(
            vault.path().join("import-report.md"),
            "---\ntype: Import Report\n---\n# Import Report\n",
        )
        .unwrap();

        let result =
            export_markdown_zip(vault.path(), &target_dir.path().join("vault.zip")).unwrap();

        assert_eq!(result.files_exported, 1);
        assert_eq!(result.skipped_files, 6);
        let names = zip_entry_names(Path::new(&result.export_path));
        assert_eq!(names, vec!["public.md"]);
    }

    #[test]
    fn counts_pruned_local_only_files_as_skipped_in_zip_export() {
        let vault = TempDir::new().unwrap();
        let target_dir = TempDir::new().unwrap();
        fs::write(vault.path().join("public.md"), "# Public\n").unwrap();
        fs::create_dir_all(vault.path().join(".grimoire-local/cache")).unwrap();
        fs::create_dir_all(vault.path().join("mockups")).unwrap();
        fs::write(vault.path().join(".mcp.json"), "{}").unwrap();
        fs::write(vault.path().join(".env.local"), "secret").unwrap();
        fs::write(vault.path().join(".grimoire-local/cache/state.json"), "{}").unwrap();
        fs::write(vault.path().join("mockups/private.png"), "mock").unwrap();

        let result =
            export_markdown_zip(vault.path(), &target_dir.path().join("vault.zip")).unwrap();

        assert_eq!(result.files_exported, 1);
        assert_eq!(result.skipped_files, 4);
        let names = zip_entry_names(Path::new(&result.export_path));
        assert_eq!(names, vec!["public.md"]);
    }

    #[test]
    fn excludes_local_only_import_attachments_from_zip_export() {
        let vault = TempDir::new().unwrap();
        let target_dir = TempDir::new().unwrap();
        let private_import = vault.path().join("imports/spanda-export");
        let public_import = vault.path().join("imports/notion-export");
        fs::create_dir_all(private_import.join("attachments")).unwrap();
        fs::create_dir_all(public_import.join("attachments")).unwrap();
        fs::write(
            private_import.join("practice.md"),
            "---\ntype: Sadhana\nlocality: local\n---\n# Practice\n",
        )
        .unwrap();
        fs::write(private_import.join("attachments/audio.m4a"), "audio").unwrap();
        fs::write(
            public_import.join("project.md"),
            "---\ntype: Project\n---\n# Project\n",
        )
        .unwrap();
        fs::write(public_import.join("attachments/diagram.png"), "image").unwrap();

        let result =
            export_markdown_zip(vault.path(), &target_dir.path().join("vault.zip")).unwrap();

        assert_eq!(result.files_exported, 2);
        assert_eq!(result.skipped_files, 2);
        let names = zip_entry_names(Path::new(&result.export_path));
        assert_eq!(
            names,
            vec![
                "imports/notion-export/attachments/diagram.png",
                "imports/notion-export/project.md"
            ]
        );
    }

    #[test]
    fn excludes_attachments_referenced_only_by_local_only_notes() {
        let vault = TempDir::new().unwrap();
        let target_dir = TempDir::new().unwrap();
        fs::create_dir_all(vault.path().join("attachments")).unwrap();
        fs::write(
            vault.path().join("private-transcript.md"),
            "---\nlocality: local\nsource_audio: attachments/private-audio.m4a\n---\n# Transcript\n\n![wave](attachments/private-wave.png)\n```grimoire-canvas\ntype: handwriting\nsource: attachments/private-canvas.grimoire-canvas.json\npreview: attachments/private-canvas.png\n```\n",
        )
        .unwrap();
        fs::write(
            vault.path().join("public-note.md"),
            "---\ntype: Project\n---\n# Public\n\n![diagram](attachments/public-diagram.png)\n",
        )
        .unwrap();
        fs::write(vault.path().join("attachments/private-audio.m4a"), "audio").unwrap();
        fs::write(vault.path().join("attachments/private-wave.png"), "wave").unwrap();
        fs::write(vault.path().join("attachments/private-photo.png"), "photo").unwrap();
        fs::write(
            vault
                .path()
                .join("attachments/private-canvas.grimoire-canvas.json"),
            r#"{"version":1,"images":[{"src":"attachments/private-photo.png"}],"strokes":[]}"#,
        )
        .unwrap();
        fs::write(vault.path().join("attachments/private-canvas.png"), "image").unwrap();
        fs::write(
            vault.path().join("attachments/public-diagram.png"),
            "diagram",
        )
        .unwrap();

        let result =
            export_markdown_zip(vault.path(), &target_dir.path().join("vault.zip")).unwrap();

        assert_eq!(result.files_exported, 2);
        assert_eq!(result.skipped_files, 6);
        let names = zip_entry_names(Path::new(&result.export_path));
        assert_eq!(
            names,
            vec!["attachments/public-diagram.png", "public-note.md"]
        );
    }

    fn zip_entry_names(path: &Path) -> Vec<String> {
        let file = File::open(path).unwrap();
        let mut archive = ZipArchive::new(file).unwrap();
        let mut names = (0..archive.len())
            .map(|index| archive.by_index(index).unwrap().name().to_string())
            .collect::<Vec<_>>();
        names.sort();
        names
    }
}
