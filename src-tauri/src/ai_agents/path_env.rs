use std::env;
use std::ffi::OsString;
use std::path::Path;
use std::process::Command;

pub(super) fn command_for_binary(binary: &Path) -> Command {
    let mut command = Command::new(binary);
    if let Some(path) = path_with_binary_parent(binary, env::var_os("PATH")) {
        command.env("PATH", path);
    }
    command
}

fn path_with_binary_parent(binary: &Path, current_path: Option<OsString>) -> Option<OsString> {
    let parent = binary.parent()?;
    if parent.as_os_str().is_empty() {
        return current_path;
    }

    let mut paths = vec![parent.to_path_buf()];
    if let Some(current_path) = current_path.as_ref() {
        paths.extend(env::split_paths(current_path));
    }

    env::join_paths(paths).ok()
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::path::PathBuf;

    #[test]
    fn prepends_binary_parent_to_existing_path() {
        let binary = Path::new("/Users/sriinnu/.nvm/versions/node/v22.22.0/bin/chitragupta");
        let path = path_with_binary_parent(binary, Some(OsString::from("/usr/bin:/bin"))).unwrap();
        let parts: Vec<PathBuf> = env::split_paths(&path).collect();

        assert_eq!(
            parts[0],
            PathBuf::from("/Users/sriinnu/.nvm/versions/node/v22.22.0/bin")
        );
        assert!(parts.contains(&PathBuf::from("/usr/bin")));
        assert!(parts.contains(&PathBuf::from("/bin")));
    }

    #[test]
    fn command_sets_path_override_for_shebang_tools() {
        let binary = Path::new("/tmp/toolchain/bin/codex");
        let command = command_for_binary(binary);
        let path = command
            .get_envs()
            .find_map(|(key, value)| (key == "PATH").then_some(value.unwrap()))
            .unwrap();
        let parts: Vec<PathBuf> = env::split_paths(path).collect();

        assert_eq!(parts[0], PathBuf::from("/tmp/toolchain/bin"));
    }
}
