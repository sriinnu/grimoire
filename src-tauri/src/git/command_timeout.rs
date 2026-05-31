use std::io::Read;
use std::path::Path;
use std::process::{Command, Output, Stdio};
use std::thread;
use std::time::{Duration, Instant};

use super::git_command;

pub(super) const REMOTE_GIT_TIMEOUT: Duration = Duration::from_secs(15);

pub(super) fn remote_git_output(vault: &Path, args: &[&str]) -> Result<Output, String> {
    let mut command = git_command();
    command.args(args).current_dir(vault);
    configure_noninteractive_git_command(&mut command);
    command_output_with_timeout(
        command,
        args.first().copied().unwrap_or("git"),
        REMOTE_GIT_TIMEOUT,
    )
}

pub(super) fn configure_noninteractive_git_command(command: &mut Command) {
    command
        .env("GIT_TERMINAL_PROMPT", "0")
        .env("GIT_ASKPASS", "")
        .env("SSH_ASKPASS_REQUIRE", "never")
        .env("GCM_INTERACTIVE", "Never");
}

pub(super) fn command_output_with_timeout(
    mut command: Command,
    label: &str,
    timeout: Duration,
) -> Result<Output, String> {
    command
        .stdin(Stdio::null())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped());
    prepare_child_process(&mut command);

    let mut child = command
        .spawn()
        .map_err(|e| format!("Failed to run git {label}: {e}"))?;
    let pid = child.id();
    let stdout = child
        .stdout
        .take()
        .ok_or_else(|| format!("Failed to capture git {label} stdout"))?;
    let stderr = child
        .stderr
        .take()
        .ok_or_else(|| format!("Failed to capture git {label} stderr"))?;
    let stdout_reader = pipe_reader(stdout);
    let stderr_reader = pipe_reader(stderr);
    let started = Instant::now();

    loop {
        match child
            .try_wait()
            .map_err(|e| format!("Failed to wait for git {label}: {e}"))?
        {
            Some(status) => {
                return Ok(Output {
                    status,
                    stdout: join_pipe_reader(stdout_reader, label, "stdout")?,
                    stderr: join_pipe_reader(stderr_reader, label, "stderr")?,
                });
            }
            None if started.elapsed() >= timeout => {
                terminate_process_tree(pid);
                let _ = child.kill();
                let _ = child.wait();
                let _ = join_pipe_reader(stdout_reader, label, "stdout");
                let _ = join_pipe_reader(stderr_reader, label, "stderr");
                return Err(format!(
                    "git {label} timed out after {}s",
                    timeout.as_secs()
                ));
            }
            None => thread::sleep(Duration::from_millis(50)),
        }
    }
}

fn pipe_reader<R>(mut reader: R) -> thread::JoinHandle<Result<Vec<u8>, String>>
where
    R: Read + Send + 'static,
{
    thread::spawn(move || {
        let mut buffer = Vec::new();
        reader
            .read_to_end(&mut buffer)
            .map(|_| buffer)
            .map_err(|error| error.to_string())
    })
}

fn join_pipe_reader(
    reader: thread::JoinHandle<Result<Vec<u8>, String>>,
    label: &str,
    stream: &str,
) -> Result<Vec<u8>, String> {
    reader
        .join()
        .map_err(|_| format!("Failed to join git {label} {stream} reader"))?
}

#[cfg(unix)]
fn prepare_child_process(command: &mut Command) {
    use std::os::unix::process::CommandExt;
    command.process_group(0);
}

#[cfg(not(unix))]
fn prepare_child_process(_command: &mut Command) {}

#[cfg(unix)]
fn terminate_process_tree(pid: u32) {
    let group = format!("-{pid}");
    let _ = crate::hidden_command("kill")
        .args(["-TERM", &group])
        .stdin(Stdio::null())
        .stdout(Stdio::null())
        .stderr(Stdio::null())
        .status();
    thread::sleep(Duration::from_millis(50));
    let _ = crate::hidden_command("kill")
        .args(["-KILL", &group])
        .stdin(Stdio::null())
        .stdout(Stdio::null())
        .stderr(Stdio::null())
        .status();
}

#[cfg(windows)]
fn terminate_process_tree(pid: u32) {
    let _ = crate::hidden_command("taskkill.exe")
        .args(["/PID", &pid.to_string(), "/T", "/F"])
        .stdin(Stdio::null())
        .stdout(Stdio::null())
        .stderr(Stdio::null())
        .status();
}

#[cfg(all(not(unix), not(windows)))]
fn terminate_process_tree(_pid: u32) {}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn command_output_with_timeout_stops_hanging_process() {
        let command = ping_command();

        let result = command_output_with_timeout(command, "fetch", Duration::from_millis(10));

        assert!(result.unwrap_err().contains("timed out"));
    }

    #[cfg(windows)]
    fn ping_command() -> Command {
        let mut command = Command::new("ping.exe");
        command.args(["-n", "3", "127.0.0.1"]);
        command
    }

    #[cfg(not(windows))]
    fn ping_command() -> Command {
        let mut command = Command::new("ping");
        command.args(["-c", "3", "127.0.0.1"]);
        command
    }
}
