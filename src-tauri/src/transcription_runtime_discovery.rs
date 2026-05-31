use std::path::PathBuf;
use std::process::Command;

pub(crate) fn find_executable(name: &str) -> Option<PathBuf> {
    known_executable_paths(name)
        .into_iter()
        .find(|path| path.is_file())
        .or_else(|| {
            executable_lookup_command()
                .arg(name)
                .output()
                .ok()
                .filter(|output| output.status.success())
                .and_then(|output| String::from_utf8(output.stdout).ok())
                .and_then(first_existing_path)
        })
}

pub(crate) fn whisper_install_hint() -> String {
    if cfg!(windows) {
        "Install whisper.cpp and make whisper-cli.exe available on PATH.".to_string()
    } else if cfg!(target_os = "linux") {
        "Install whisper.cpp and make whisper-cli available on PATH.".to_string()
    } else {
        "Install whisper.cpp, for example: brew install whisper-cpp.".to_string()
    }
}

fn known_executable_paths(name: &str) -> Vec<PathBuf> {
    let mut paths = executable_names(name)
        .into_iter()
        .flat_map(|executable| {
            [
                PathBuf::from(format!("/opt/homebrew/bin/{executable}")),
                PathBuf::from(format!("/usr/local/bin/{executable}")),
                PathBuf::from(format!("/usr/bin/{executable}")),
            ]
        })
        .collect::<Vec<_>>();
    if let Some(home) = dirs::home_dir() {
        for executable in executable_names(name) {
            paths.push(home.join(".local").join("bin").join(&executable));
            paths.push(home.join("AppData/Roaming/npm").join(&executable));
            paths.push(home.join(".volta").join("bin").join(executable));
        }
    }
    paths
}

fn first_existing_path(stdout: String) -> Option<PathBuf> {
    stdout.lines().find_map(|line| {
        let path = PathBuf::from(line.trim());
        path.is_file().then_some(path)
    })
}

fn executable_names(name: &str) -> Vec<String> {
    let mut names = vec![name.to_string()];
    if cfg!(windows) {
        names.push(format!("{name}.exe"));
        names.push(format!("{name}.cmd"));
    }
    names
}

fn executable_lookup_command() -> Command {
    #[cfg(windows)]
    let command = crate::hidden_command("where.exe");
    #[cfg(not(windows))]
    let command = crate::hidden_command("which");

    command
}
