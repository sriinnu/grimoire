use std::process::{Command, Stdio};
use std::time::{Duration, Instant};

#[derive(Debug, Clone, PartialEq, Eq)]
pub(super) struct AzureCommandOutput {
    pub(super) stdout: String,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub(super) enum AzureCommandFailure {
    MissingCli,
    TimedOut,
    Failed(String),
}

pub(super) async fn run_az_command(
    args: Vec<String>,
    timeout: Duration,
) -> Result<AzureCommandOutput, AzureCommandFailure> {
    tokio::task::spawn_blocking(move || run_command_with_timeout("az", &args, timeout))
        .await
        .map_err(|_| AzureCommandFailure::Failed("azure cli task failed".to_string()))?
}

pub(super) fn string_args<const N: usize>(args: [&str; N]) -> Vec<String> {
    args.iter().map(|arg| (*arg).to_string()).collect()
}

fn run_command_with_timeout(
    program: &str,
    args: &[String],
    timeout: Duration,
) -> Result<AzureCommandOutput, AzureCommandFailure> {
    let mut child = Command::new(program)
        .args(args)
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .spawn()
        .map_err(|error| {
            if error.kind() == std::io::ErrorKind::NotFound {
                AzureCommandFailure::MissingCli
            } else {
                AzureCommandFailure::Failed(error.to_string())
            }
        })?;

    let started = Instant::now();
    loop {
        match child.try_wait() {
            Ok(Some(_)) => {
                let output = child
                    .wait_with_output()
                    .map_err(|error| AzureCommandFailure::Failed(error.to_string()))?;
                let stdout = String::from_utf8_lossy(&output.stdout).to_string();
                let stderr = String::from_utf8_lossy(&output.stderr).to_string();
                return if output.status.success() {
                    Ok(AzureCommandOutput { stdout })
                } else {
                    Err(AzureCommandFailure::Failed(format!("{stdout}\n{stderr}")))
                };
            }
            Ok(None) if started.elapsed() >= timeout => {
                let _ = child.kill();
                let _ = child.wait();
                return Err(AzureCommandFailure::TimedOut);
            }
            Ok(None) => std::thread::sleep(Duration::from_millis(50)),
            Err(error) => return Err(AzureCommandFailure::Failed(error.to_string())),
        }
    }
}
