use std::io::{BufRead, Read};
use std::process::{Command, ExitStatus};
use std::sync::mpsc::{self, RecvTimeoutError};
use std::thread;
use std::time::Duration;

const DEFAULT_STREAM_IDLE_TIMEOUT: Duration = Duration::from_secs(300);
const STDERR_PREVIEW_BYTES: usize = 16 * 1024;

type StdoutLine = Result<Option<String>, String>;

pub(super) struct LineStreamOutcome {
    pub stderr_output: String,
    pub status: ExitStatus,
}

pub(super) fn agent_stream_idle_timeout(env_key: &str) -> Duration {
    std::env::var(env_key)
        .ok()
        .and_then(|value| value.parse::<u64>().ok())
        .filter(|seconds| *seconds > 0)
        .map(Duration::from_secs)
        .unwrap_or(DEFAULT_STREAM_IDLE_TIMEOUT)
}

pub(super) fn run_command_line_stream<F>(
    mut command: Command,
    idle_timeout: Duration,
    label: &str,
    mut on_line: F,
) -> Result<LineStreamOutcome, String>
where
    F: FnMut(&str),
{
    let mut child = command
        .spawn()
        .map_err(|error| format!("Failed to spawn {label}: {error}"))?;
    let stdout = child
        .stdout
        .take()
        .ok_or_else(|| format!("{label} did not expose stdout"))?;
    let stderr_handle = child.stderr.take().map(spawn_stderr_reader);
    let (line_sender, line_receiver) = mpsc::channel::<StdoutLine>();
    thread::spawn(move || stream_stdout_lines(stdout, line_sender));

    let mut stream_error: Option<String> = None;
    loop {
        match line_receiver.recv_timeout(idle_timeout) {
            Ok(Ok(Some(line))) => on_line(&line),
            Ok(Ok(None)) => break,
            Ok(Err(message)) => {
                stream_error = Some(format!("{label} stdout read failed: {message}"));
                break;
            }
            Err(RecvTimeoutError::Timeout) => {
                let _ = child.kill();
                stream_error = Some(format!("{label} produced no output for {idle_timeout:?}"));
                break;
            }
            Err(RecvTimeoutError::Disconnected) => break,
        }
    }

    let status = child
        .wait()
        .map_err(|error| format!("{label} wait failed: {error}"))?;
    let stderr_output = stderr_handle
        .and_then(|handle| handle.join().ok())
        .unwrap_or_default();

    if let Some(message) = stream_error {
        return Err(message);
    }

    Ok(LineStreamOutcome {
        stderr_output,
        status,
    })
}

fn stream_stdout_lines<R: Read>(stdout: R, sender: mpsc::Sender<StdoutLine>) {
    for line in std::io::BufReader::new(stdout).lines() {
        if sender
            .send(line.map(Some).map_err(|error| error.to_string()))
            .is_err()
        {
            return;
        }
    }
    let _ = sender.send(Ok(None));
}

fn spawn_stderr_reader<R: Read + Send + 'static>(mut stderr: R) -> thread::JoinHandle<String> {
    thread::spawn(move || {
        let mut buffer = Vec::new();
        let mut chunk = [0_u8; 1024];
        while let Ok(count) = stderr.read(&mut chunk) {
            if count == 0 {
                break;
            }
            if buffer.len() < STDERR_PREVIEW_BYTES {
                let remaining = STDERR_PREVIEW_BYTES - buffer.len();
                buffer.extend_from_slice(&chunk[..count.min(remaining)]);
            }
        }
        String::from_utf8_lossy(&buffer).to_string()
    })
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::process::Stdio;

    #[cfg(unix)]
    fn shell_script(contents: &str) -> (tempfile::TempDir, std::path::PathBuf) {
        use std::os::unix::fs::PermissionsExt;

        let dir = tempfile::tempdir().unwrap();
        let path = dir.path().join("mock-agent");
        std::fs::write(&path, contents).unwrap();
        std::fs::set_permissions(&path, std::fs::Permissions::from_mode(0o755)).unwrap();
        (dir, path)
    }

    #[cfg(unix)]
    #[test]
    fn drains_stderr_while_streaming_stdout() {
        let (_dir, path) = shell_script(concat!(
            "#!/bin/sh\n",
            "echo '{\"type\":\"thread.started\",\"thread_id\":\"t1\"}'\n",
            "for i in 1 2 3; do echo warning-$i >&2; done\n",
            "exit 1\n",
        ));
        let mut command = Command::new(path);
        command.stdout(Stdio::piped()).stderr(Stdio::piped());

        let mut lines = Vec::new();
        let outcome =
            run_command_line_stream(command, Duration::from_secs(10), "mock-agent", |line| {
                lines.push(line.to_string())
            })
            .unwrap();

        assert!(!outcome.status.success());
        assert_eq!(lines, vec![r#"{"type":"thread.started","thread_id":"t1"}"#]);
        assert!(outcome.stderr_output.contains("warning-1"));
    }

    #[cfg(unix)]
    #[test]
    fn kills_silent_process_after_idle_timeout() {
        let (_dir, path) = shell_script("#!/bin/sh\nsleep 5\n");
        let mut command = Command::new(path);
        command.stdout(Stdio::piped()).stderr(Stdio::piped());

        let result =
            run_command_line_stream(command, Duration::from_millis(100), "mock-agent", |_| {});

        assert!(matches!(result, Err(message) if message.contains("no output")));
    }
}
