use super::*;

#[test]
fn claude_binary_candidates_include_supported_local_and_toolchain_installs() {
    let home = PathBuf::from("/Users/alex");
    let candidates = claude_binary_candidates_for_home(&home);
    let expected = [
        home.join(".local/bin/claude"),
        home.join(".claude/local/claude"),
        home.join(".local/share/mise/shims/claude"),
        home.join(".npm-global/bin/claude"),
        home.join(".volta/bin/claude"),
        home.join(".local/share/pnpm/claude"),
    ];

    for candidate in expected {
        assert!(
            candidates.contains(&candidate),
            "missing {}",
            candidate.display()
        );
    }
}

#[test]
fn claude_binary_candidates_include_nvm_installs() {
    let dir = tempfile::tempdir().unwrap();
    let claude = dir.path().join(".nvm/versions/node/v22.22.0/bin/claude");
    std::fs::create_dir_all(claude.parent().unwrap()).unwrap();
    std::fs::write(&claude, "#!/bin/sh\n").unwrap();

    let candidates = claude_binary_candidates_for_home(dir.path());

    assert!(candidates.contains(&claude), "missing {}", claude.display());
}

#[test]
fn claude_binary_candidates_include_windows_exe_installs() {
    let home = PathBuf::from(r"C:\Users\alex");
    let candidates = claude_binary_candidates_for_home(&home);
    let expected = [
        home.join(".local/bin/claude.exe"),
        home.join(".claude/local/claude.exe"),
        home.join("AppData/Roaming/npm/claude.cmd"),
    ];

    for candidate in expected {
        assert!(
            candidates.contains(&candidate),
            "missing {}",
            candidate.display()
        );
    }
}

#[test]
fn claude_path_lookup_command_matches_current_platform() {
    let expected = if cfg!(windows) { "where" } else { "which" };

    assert_eq!(claude_path_lookup_command(), expected);
}

#[test]
fn find_existing_binary_finds_windows_exe_candidate() {
    let dir = tempfile::tempdir().unwrap();
    let claude = dir.path().join(".local/bin/claude.exe");
    std::fs::create_dir_all(claude.parent().unwrap()).unwrap();
    std::fs::write(&claude, "").unwrap();

    assert_eq!(
        find_existing_binary(claude_binary_candidates_for_home(dir.path())),
        Some(claude)
    );
}
