#[cfg(desktop)]
use std::{
    path::{Path, PathBuf},
    process::{Command, Stdio},
};

#[cfg(desktop)]
#[derive(Debug, Eq, PartialEq)]
struct RevealRequest {
    target: PathBuf,
    opens_vault: bool,
}

#[cfg(desktop)]
fn canonicalize_existing_path(path: &Path, label: &str) -> Result<PathBuf, String> {
    path.canonicalize()
        .map_err(|err| format!("Could not resolve {label}: {err}"))
}

#[cfg(desktop)]
fn target_candidate(vault_path: &Path, path: &str) -> PathBuf {
    let expanded = super::expand_tilde(path).into_owned();
    let candidate = PathBuf::from(expanded);
    if candidate.is_absolute() {
        candidate
    } else {
        vault_path.join(candidate)
    }
}

#[cfg(desktop)]
fn prepare_reveal_request(vault_path: &str, path: &str) -> Result<RevealRequest, String> {
    let expanded_vault_path = super::expand_tilde(vault_path).into_owned();
    let vault = canonicalize_existing_path(Path::new(&expanded_vault_path), "vault path")?;
    let target = canonicalize_existing_path(&target_candidate(&vault, path), "target path")?;

    if target != vault && !target.starts_with(&vault) {
        return Err("Cannot reveal a path outside the active vault".into());
    }

    Ok(RevealRequest {
        opens_vault: target == vault,
        target,
    })
}

#[cfg(desktop)]
fn run_command(command: &mut Command, action: &str) -> Result<(), String> {
    let status = command
        .status()
        .map_err(|err| format!("Failed to {action}: {err}"))?;
    if status.success() {
        Ok(())
    } else {
        Err(format!("{action} exited with status {status}"))
    }
}

#[cfg(all(desktop, target_os = "macos"))]
fn spawn_command(command: &mut Command, action: &str) -> Result<(), String> {
    command
        .stdin(Stdio::null())
        .stdout(Stdio::null())
        .stderr(Stdio::null())
        .spawn()
        .map(|_| ())
        .map_err(|err| format!("Failed to {action}: {err}"))
}

#[cfg(all(desktop, target_os = "macos"))]
fn reveal_with_file_manager(request: RevealRequest) -> Result<(), String> {
    let mut command = Command::new("open");
    if request.opens_vault {
        command.arg(&request.target);
    } else {
        command.arg("-R").arg(&request.target);
    }
    run_command(&mut command, "reveal path in Finder")
}

#[cfg(all(desktop, target_os = "macos"))]
fn preview_with_quick_look(request: RevealRequest) -> Result<(), String> {
    if request.opens_vault {
        return Err("Quick Look preview requires a file inside the active vault".into());
    }
    let mut command = Command::new("qlmanage");
    command.arg("-p").arg(&request.target);
    spawn_command(&mut command, "preview path with Quick Look")
}

#[cfg(all(desktop, target_os = "windows"))]
fn reveal_with_file_manager(request: RevealRequest) -> Result<(), String> {
    let mut command = Command::new("explorer");
    if request.opens_vault {
        command.arg(&request.target);
    } else {
        command.arg(format!("/select,{}", request.target.display()));
    }
    run_command(&mut command, "reveal path in File Explorer")
}

#[cfg(all(desktop, not(any(target_os = "macos", target_os = "windows"))))]
fn reveal_with_file_manager(request: RevealRequest) -> Result<(), String> {
    let directory = if request.target.is_dir() {
        request.target
    } else {
        request
            .target
            .parent()
            .ok_or_else(|| "Could not find containing folder".to_string())?
            .to_path_buf()
    };
    let mut command = Command::new("xdg-open");
    command.arg(directory);
    run_command(&mut command, "open containing folder")
}

/// Reveal an existing vault-local path in the platform file manager.
#[cfg(desktop)]
#[tauri::command]
pub fn reveal_path_in_finder(vault_path: String, path: String) -> Result<(), String> {
    prepare_reveal_request(&vault_path, &path).and_then(reveal_with_file_manager)
}

/// Preview an existing vault-local file with macOS Quick Look.
#[cfg(all(desktop, target_os = "macos"))]
#[tauri::command]
pub fn preview_path_with_quick_look(vault_path: String, path: String) -> Result<(), String> {
    prepare_reveal_request(&vault_path, &path).and_then(preview_with_quick_look)
}

#[cfg(all(desktop, not(target_os = "macos")))]
#[tauri::command]
pub fn preview_path_with_quick_look(_vault_path: String, _path: String) -> Result<(), String> {
    Err("Quick Look preview is only available on macOS".into())
}

#[cfg(mobile)]
#[tauri::command]
pub fn reveal_path_in_finder(_vault_path: String, _path: String) -> Result<(), String> {
    Err("Finder reveal is not available on mobile".into())
}

#[cfg(mobile)]
#[tauri::command]
pub fn preview_path_with_quick_look(_vault_path: String, _path: String) -> Result<(), String> {
    Err("Quick Look preview is not available on mobile".into())
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;

    #[test]
    fn prepares_absolute_note_inside_vault() {
        let vault = tempfile::TempDir::new().unwrap();
        let note = vault.path().join("note.md");
        fs::write(&note, "# Note").unwrap();

        let request =
            prepare_reveal_request(&vault.path().to_string_lossy(), &note.to_string_lossy())
                .unwrap();

        assert_eq!(request.target, note.canonicalize().unwrap());
        assert!(!request.opens_vault);
    }

    #[test]
    fn prepares_relative_note_inside_vault() {
        let vault = tempfile::TempDir::new().unwrap();
        fs::create_dir(vault.path().join("journal")).unwrap();
        let note = vault.path().join("journal/dream.md");
        fs::write(&note, "# Dream").unwrap();

        let request =
            prepare_reveal_request(&vault.path().to_string_lossy(), "journal/dream.md").unwrap();

        assert_eq!(request.target, note.canonicalize().unwrap());
        assert!(!request.opens_vault);
    }

    #[test]
    fn opens_vault_when_target_is_vault() {
        let vault = tempfile::TempDir::new().unwrap();

        let request = prepare_reveal_request(
            &vault.path().to_string_lossy(),
            &vault.path().to_string_lossy(),
        )
        .unwrap();

        assert_eq!(request.target, vault.path().canonicalize().unwrap());
        assert!(request.opens_vault);
    }

    #[test]
    fn quick_look_request_resolves_file_inside_vault() {
        let vault = tempfile::TempDir::new().unwrap();
        let note = vault.path().join("dream.md");
        fs::write(&note, "# Dream").unwrap();

        let request = prepare_reveal_request(&vault.path().to_string_lossy(), "dream.md").unwrap();

        assert_eq!(request.target, note.canonicalize().unwrap());
        assert!(!request.opens_vault);
    }

    #[test]
    fn rejects_paths_outside_the_active_vault() {
        let vault = tempfile::TempDir::new().unwrap();
        let outside = tempfile::TempDir::new().unwrap();
        let note = outside.path().join("outside.md");
        fs::write(&note, "# Nope").unwrap();

        let err = prepare_reveal_request(&vault.path().to_string_lossy(), &note.to_string_lossy())
            .unwrap_err();

        assert_eq!(err, "Cannot reveal a path outside the active vault");
    }
}
