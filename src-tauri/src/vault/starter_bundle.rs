use std::fs;
use std::path::{Path, PathBuf};
use walkdir::WalkDir;

const STARTER_RESOURCE_DIR: &str = "starter-vault";
const STARTER_MANIFEST: &str = ".fixture-manifest.json";
const STARTER_ENTRY_NOTE: &str = "grimoire-start-here.md";

/// Copy the bundled Getting Started vault into `target_path` and initialize it
/// as a local-only Git vault.
pub(crate) fn copy_bundled_starter_vault(
    target_path: &Path,
    resource_dir: Option<&Path>,
) -> Result<PathBuf, String> {
    ensure_target_is_available(target_path)?;
    let source = find_bundled_starter_vault(resource_dir)?;
    copy_directory_contents(&source, target_path)?;
    let vault_path = target_path
        .canonicalize()
        .map_err(|e| format!("Failed to resolve bundled vault path: {e}"))?;
    crate::vault::repair_config_files(path_to_utf8(&vault_path, "Vault path")?)?;
    crate::git::init_repo(path_to_utf8(&vault_path, "Vault path")?)?;
    Ok(vault_path)
}

fn bundled_starter_candidates(resource_dir: Option<&Path>) -> Vec<PathBuf> {
    let mut candidates = Vec::new();
    if let Some(resource_dir) = resource_dir {
        candidates.push(resource_dir.join(STARTER_RESOURCE_DIR));
    }

    candidates.push(
        PathBuf::from(env!("CARGO_MANIFEST_DIR"))
            .join("..")
            .join("demo-vault-v2"),
    );
    candidates
}

fn find_bundled_starter_vault(resource_dir: Option<&Path>) -> Result<PathBuf, String> {
    bundled_starter_candidates(resource_dir)
        .into_iter()
        .find(|candidate| is_valid_starter_bundle(candidate))
        .ok_or_else(|| "Bundled Getting Started vault was not found".to_string())
}

fn is_valid_starter_bundle(path: &Path) -> bool {
    path.is_dir()
        && path.join(STARTER_MANIFEST).is_file()
        && path.join(STARTER_ENTRY_NOTE).is_file()
}

fn ensure_target_is_available(target_path: &Path) -> Result<(), String> {
    if target_path.as_os_str().is_empty() {
        return Err("Target path is required".to_string());
    }

    if !target_path.exists() {
        if let Some(parent) = target_path
            .parent()
            .filter(|parent| !parent.as_os_str().is_empty())
        {
            fs::create_dir_all(parent).map_err(|e| {
                format!(
                    "Failed to create parent directory for '{}': {e}",
                    target_path.display()
                )
            })?;
        }
        return Ok(());
    }

    if !target_path.is_dir() {
        return Err(format!(
            "Destination '{}' already exists and is not a directory",
            target_path.display()
        ));
    }

    if target_path
        .read_dir()
        .map_err(|e| {
            format!(
                "Failed to inspect destination '{}': {e}",
                target_path.display()
            )
        })?
        .next()
        .is_some()
    {
        return Err(format!(
            "Destination '{}' already exists and is not empty",
            target_path.display()
        ));
    }

    Ok(())
}

fn copy_directory_contents(source: &Path, target_path: &Path) -> Result<(), String> {
    fs::create_dir_all(target_path)
        .map_err(|e| format!("Failed to create bundled vault target: {e}"))?;

    for entry in WalkDir::new(source)
        .into_iter()
        .filter_entry(|entry| entry.depth() == 0 || entry.file_name().to_string_lossy() != ".git")
    {
        let entry = entry.map_err(|e| format!("Failed to read bundled starter vault: {e}"))?;
        let relative = entry
            .path()
            .strip_prefix(source)
            .map_err(|e| format!("Failed to map bundled starter path: {e}"))?;
        if relative.as_os_str().is_empty() {
            continue;
        }

        let destination = target_path.join(relative);
        if entry.file_type().is_dir() {
            fs::create_dir_all(&destination)
                .map_err(|e| format!("Failed to create {}: {e}", destination.display()))?;
            continue;
        }

        if entry.file_type().is_file() {
            if let Some(parent) = destination.parent() {
                fs::create_dir_all(parent)
                    .map_err(|e| format!("Failed to create {}: {e}", parent.display()))?;
            }
            fs::copy(entry.path(), &destination)
                .map_err(|e| format!("Failed to copy {}: {e}", destination.display()))?;
        }
    }

    Ok(())
}

fn path_to_utf8<'a>(path: &'a Path, context: &str) -> Result<&'a str, String> {
    path.to_str()
        .ok_or_else(|| format!("{context} '{}' is not valid UTF-8", path.display()))
}

#[cfg(test)]
mod tests {
    use super::*;

    fn write_bundle(path: &Path) {
        fs::create_dir_all(path.join("views")).unwrap();
        fs::write(path.join(STARTER_MANIFEST), "{}\n").unwrap();
        fs::write(path.join(STARTER_ENTRY_NOTE), "# Start here\n").unwrap();
        fs::write(
            path.join("views").join("active-projects.yml"),
            "title: Active\n",
        )
        .unwrap();
    }

    #[test]
    fn copy_bundled_starter_vault_creates_local_git_vault() {
        let temp = tempfile::TempDir::new().unwrap();
        let resource_dir = temp.path().join("resources");
        let source = resource_dir.join(STARTER_RESOURCE_DIR);
        let target = temp.path().join("Getting Started");
        write_bundle(&source);

        let result = copy_bundled_starter_vault(&target, Some(&resource_dir)).unwrap();

        assert_eq!(result, target.canonicalize().unwrap());
        assert!(target.join(STARTER_ENTRY_NOTE).exists());
        assert!(target.join("AGENTS.md").exists());
        assert!(target.join("type.md").exists());
        assert!(target.join("note.md").exists());
        assert!(target.join(".git").exists());
        assert!(!crate::git::has_remote(target.to_str().unwrap()).unwrap());
    }

    #[test]
    fn copy_bundled_starter_vault_rejects_nonempty_destination() {
        let temp = tempfile::TempDir::new().unwrap();
        let resource_dir = temp.path().join("resources");
        write_bundle(&resource_dir.join(STARTER_RESOURCE_DIR));
        let target = temp.path().join("Getting Started");
        fs::create_dir_all(&target).unwrap();
        fs::write(target.join("existing.md"), "# Existing\n").unwrap();

        let err = copy_bundled_starter_vault(&target, Some(&resource_dir)).unwrap_err();

        assert!(err.contains("not empty"));
    }
}
