use super::*;
use crate::claude_cli::types::ClaudeStreamEvent;
use std::path::PathBuf;
use std::time::Duration;

#[cfg(unix)]
fn run_mock_script(script: &str) -> (Result<String, String>, Vec<ClaudeStreamEvent>) {
    run_mock_script_with_args(script, &[])
}

#[cfg(unix)]
fn run_mock_script_with_args(
    script: &str,
    args: &[String],
) -> (Result<String, String>, Vec<ClaudeStreamEvent>) {
    use std::os::unix::fs::PermissionsExt;
    let dir = tempfile::tempdir().unwrap();
    let path = dir.path().join("mock-claude");
    std::fs::write(&path, script).unwrap();
    std::fs::set_permissions(&path, std::fs::Permissions::from_mode(0o755)).unwrap();
    let mut events = vec![];
    let result = run_claude_subprocess(&path, args, None, &mut |e| events.push(e));
    (result, events)
}

#[cfg(unix)]
#[test]
fn run_subprocess_parses_ndjson_stream() {
    let (result, events) = run_mock_script(concat!(
        "#!/bin/sh\n",
        "echo '{\"type\":\"system\",\"subtype\":\"init\",\"session_id\":\"s1\"}'\n",
        "echo '{\"type\":\"stream_event\",\"event\":{\"type\":\"content_block_delta\",\"index\":0,\"delta\":{\"type\":\"text_delta\",\"text\":\"Hi\"}}}'\n",
        "echo '{\"type\":\"result\",\"result\":\"Done\",\"session_id\":\"s1\"}'\n",
    ));
    assert_eq!(result.unwrap(), "s1");
    assert!(matches!(&events[0], ClaudeStreamEvent::Init { session_id } if session_id == "s1"));
    assert!(matches!(&events[1], ClaudeStreamEvent::TextDelta { text } if text == "Hi"));
    assert!(matches!(&events[2], ClaudeStreamEvent::Result { .. }));
    assert!(matches!(&events[3], ClaudeStreamEvent::Done));
}

#[cfg(unix)]
#[test]
fn run_subprocess_skips_blank_and_non_json_lines() {
    let (result, events) = run_mock_script(concat!(
        "#!/bin/sh\n",
        "echo ''\n",
        "echo 'not json at all'\n",
        "echo '{\"type\":\"result\",\"result\":\"ok\",\"session_id\":\"s2\"}'\n",
    ));
    assert_eq!(result.unwrap(), "s2");
    assert!(matches!(&events[0], ClaudeStreamEvent::Result { text, .. } if text == "ok"));
    assert!(matches!(&events[1], ClaudeStreamEvent::Done));
}

#[cfg(unix)]
#[test]
fn run_subprocess_emits_error_on_nonzero_exit() {
    let (_, events) = run_mock_script("#!/bin/sh\necho 'auth problem' >&2\nexit 1\n");
    assert!(events
        .iter()
        .any(|e| matches!(e, ClaudeStreamEvent::Error { .. })));
    assert!(matches!(events.last().unwrap(), ClaudeStreamEvent::Done));
}

#[cfg(unix)]
#[test]
fn run_subprocess_detects_auth_error_in_stderr() {
    let (_, events) = run_mock_script("#!/bin/sh\necho 'not logged in' >&2\nexit 1\n");
    assert!(events.iter().any(|e| matches!(e, ClaudeStreamEvent::Error { message } if message.contains("not authenticated"))));
}

#[cfg(unix)]
#[test]
fn run_subprocess_reports_exit_code_on_empty_stderr() {
    let (_, events) = run_mock_script("#!/bin/sh\nexit 2\n");
    assert!(events.iter().any(
        |e| matches!(e, ClaudeStreamEvent::Error { message } if message.contains("exited with"))
    ));
}

#[cfg(unix)]
#[test]
fn run_subprocess_success_with_no_events() {
    let (result, events) = run_mock_script("#!/bin/sh\nexit 0\n");
    assert!(result.is_ok());
    assert!(matches!(events.last().unwrap(), ClaudeStreamEvent::Done));
}

#[cfg(unix)]
#[test]
fn run_subprocess_passes_args_through() {
    let args: Vec<String> = vec!["--foo".into(), "bar".into()];
    let (_, events) = run_mock_script_with_args(concat!(
        "#!/bin/sh\n",
        "echo \"{\\\"type\\\":\\\"result\\\",\\\"result\\\":\\\"$*\\\",\\\"session_id\\\":\\\"sx\\\"}\"\n",
    ), &args);
    let text = events.iter().find_map(|e| match e {
        ClaudeStreamEvent::Result { text, .. } => Some(text.as_str()),
        _ => None,
    });
    assert!(text.unwrap().contains("--foo"));
}

#[test]
fn run_subprocess_spawn_failure() {
    let fake_bin = PathBuf::from("/nonexistent/binary/path");
    let mut events = vec![];
    let result = run_claude_subprocess(&fake_bin, &[], None, &mut |e| events.push(e));
    assert!(result.is_err());
    assert!(result.unwrap_err().contains("Failed to spawn"));
}

#[cfg(unix)]
#[test]
fn run_subprocess_with_tool_progress_and_assistant() {
    let (result, events) = run_mock_script(concat!(
        "#!/bin/sh\n",
        "echo '{\"type\":\"system\",\"subtype\":\"init\",\"session_id\":\"s3\"}'\n",
        "echo '{\"type\":\"tool_progress\",\"tool_name\":\"search\",\"tool_use_id\":\"t1\"}'\n",
        "echo '{\"type\":\"assistant\",\"message\":{\"content\":[{\"type\":\"tool_use\",\"id\":\"t2\",\"name\":\"read\",\"input\":{}}]}}'\n",
        "echo '{\"type\":\"result\",\"result\":\"fin\",\"session_id\":\"s3\"}'\n",
    ));
    assert_eq!(result.unwrap(), "s3");
    assert!(events.len() >= 4);
}

#[cfg(unix)]
#[test]
fn run_subprocess_nonzero_after_session_id_emits_error() {
    let (result, events) = run_mock_script(concat!(
        "#!/bin/sh\n",
        "echo '{\"type\":\"system\",\"subtype\":\"init\",\"session_id\":\"s4\"}'\n",
        "echo 'some warning' >&2\n",
        "exit 1\n",
    ));
    assert!(result.is_err());
    assert!(events.iter().any(
        |e| matches!(e, ClaudeStreamEvent::Error { message } if message.contains("some warning"))
    ));
    assert!(matches!(events.last().unwrap(), ClaudeStreamEvent::Done));
}

#[cfg(unix)]
#[test]
fn run_subprocess_times_out_when_stdout_is_silent() {
    use std::os::unix::fs::PermissionsExt;
    let dir = tempfile::tempdir().unwrap();
    let path = dir.path().join("silent-claude");
    std::fs::write(&path, "#!/bin/sh\nsleep 5\n").unwrap();
    std::fs::set_permissions(&path, std::fs::Permissions::from_mode(0o755)).unwrap();

    let mut events = vec![];
    let result = run_claude_subprocess_with_idle_timeout(
        &path,
        &[],
        None,
        &mut |e| events.push(e),
        Duration::from_millis(100),
    );

    assert!(result.is_err());
    assert!(events.iter().any(
        |e| matches!(e, ClaudeStreamEvent::Error { message } if message.contains("no output"))
    ));
    assert!(matches!(events.last().unwrap(), ClaudeStreamEvent::Done));
}
