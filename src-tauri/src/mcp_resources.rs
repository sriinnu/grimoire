use std::path::{Path, PathBuf};
use std::sync::OnceLock;

static MCP_RESOURCE_DIR: OnceLock<PathBuf> = OnceLock::new();

pub(crate) fn set_resource_dir(path: PathBuf) {
    let _ = MCP_RESOURCE_DIR.set(path);
}

/// Resolve the bundled `mcp-server/` directory for dev and packaged apps.
pub(crate) fn mcp_server_dir() -> Result<PathBuf, String> {
    let dev_path = PathBuf::from(env!("CARGO_MANIFEST_DIR"))
        .join("..")
        .join("mcp-server");
    for candidate in mcp_server_dir_candidates(&dev_path) {
        if is_mcp_server_dir(&candidate) {
            return Ok(std::fs::canonicalize(&candidate).unwrap_or(candidate));
        }
    }

    let attempted = mcp_server_dir_candidates(&dev_path)
        .into_iter()
        .map(|path| path.display().to_string())
        .collect::<Vec<_>>()
        .join(", ");
    Err(format!("mcp-server not found. Checked: {attempted}"))
}

fn is_mcp_server_dir(path: &Path) -> bool {
    path.join("ws-bridge.js").is_file() && path.join("index.js").is_file()
}

fn mcp_server_dir_candidates(dev_path: &Path) -> Vec<PathBuf> {
    let mut candidates = Vec::new();
    if cfg!(debug_assertions) {
        push_unique(&mut candidates, dev_path.to_path_buf());
    }

    if let Some(resource_dir) = MCP_RESOURCE_DIR.get() {
        push_unique(&mut candidates, resource_dir.join("mcp-server"));
    }

    if let Ok(exe) = std::env::current_exe() {
        let appdir = std::env::var_os("APPDIR").map(PathBuf::from);
        for candidate in resource_dir_candidates_from_exe(&exe, appdir.as_deref()) {
            push_unique(&mut candidates, candidate);
        }
    }

    if !cfg!(debug_assertions) {
        push_unique(&mut candidates, dev_path.to_path_buf());
    }

    candidates
}

fn resource_dir_candidates_from_exe(exe: &Path, appdir: Option<&Path>) -> Vec<PathBuf> {
    let mut candidates = Vec::new();
    if let Some(exe_dir) = exe.parent() {
        push_unique(&mut candidates, exe_dir.join("mcp-server"));
        push_unique(
            &mut candidates,
            exe_dir.join("resources").join("mcp-server"),
        );
        if let Some(parent) = exe_dir.parent() {
            push_unique(&mut candidates, parent.join("Resources").join("mcp-server"));
            push_unique(&mut candidates, parent.join("resources").join("mcp-server"));
            push_unique(&mut candidates, parent.join("lib/grimoire/mcp-server"));
        }
    }
    if let Some(appdir) = appdir {
        push_unique(
            &mut candidates,
            appdir
                .join("usr")
                .join("lib")
                .join("grimoire")
                .join("mcp-server"),
        );
    }
    push_unique(
        &mut candidates,
        PathBuf::from("/usr/lib/grimoire/mcp-server"),
    );
    candidates
}

fn push_unique(paths: &mut Vec<PathBuf>, candidate: PathBuf) {
    if !paths.iter().any(|existing| existing == &candidate) {
        paths.push(candidate);
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn release_resource_candidates_cover_desktop_bundle_layouts() {
        let appdir = PathBuf::from("/tmp/.mount_grimoire");
        let candidates = resource_dir_candidates_from_exe(
            Path::new("/Applications/Grimoire.app/Contents/MacOS/grimoire"),
            Some(&appdir),
        );

        assert!(candidates.contains(&PathBuf::from(
            "/Applications/Grimoire.app/Contents/Resources/mcp-server"
        )));
        assert!(candidates.contains(&appdir.join("usr/lib/grimoire/mcp-server")));
        assert!(candidates.contains(&PathBuf::from("/usr/lib/grimoire/mcp-server")));
    }

    #[test]
    fn release_resource_candidates_cover_windows_resource_layouts() {
        let candidates = resource_dir_candidates_from_exe(
            Path::new("C:/Program Files/Grimoire/grimoire.exe"),
            None,
        );

        assert!(candidates.contains(&PathBuf::from("C:/Program Files/Grimoire/mcp-server")));
        assert!(candidates.contains(&PathBuf::from(
            "C:/Program Files/Grimoire/resources/mcp-server"
        )));
    }
}
