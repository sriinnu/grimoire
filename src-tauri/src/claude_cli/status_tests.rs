use super::*;

#[cfg(unix)]
#[test]
fn version_output_times_out_for_hung_cli() {
    use std::os::unix::fs::PermissionsExt;
    use std::time::Instant;

    let dir = tempfile::tempdir().unwrap();
    let hung_cli = dir.path().join("hung-claude");
    std::fs::write(&hung_cli, "#!/bin/sh\nsleep 5\n").unwrap();
    std::fs::set_permissions(&hung_cli, std::fs::Permissions::from_mode(0o755)).unwrap();

    let mut command = Command::new(hung_cli);
    command.arg("--version");
    let started = Instant::now();

    assert!(output_with_timeout(command, Duration::from_millis(200)).is_err());
    assert!(started.elapsed() < Duration::from_secs(2));
}
