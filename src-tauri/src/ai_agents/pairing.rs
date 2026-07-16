//! One-click Chitragupta daemon pairing.
//!
//! Runs `chitragupta secret rotate api-key --consumer grimoire --store config`
//! and extracts the freshly minted secret from stdout. The CLI receipt format
//! may drift, so extraction is defensive; the raw CLI output must NEVER reach
//! logs, errors, or the frontend, because it contains the secret. Every error
//! string produced here passes through [`sanitize_secret_material`] first.

#[cfg(desktop)]
use std::time::Duration;

#[cfg(desktop)]
const ROTATE_TIMEOUT: Duration = Duration::from_secs(30);

/// Shortest run of token characters the sanitizer treats as secret-like.
const SANITIZE_MIN_RUN: usize = 25;

/// Shortest candidate the extractor accepts as a rotated secret.
const SECRET_MIN_LEN: usize = 32;

/// Rotate the Grimoire API key through the installed Chitragupta CLI and
/// return the new secret. Callers must store it immediately and never log it.
#[cfg(desktop)]
pub fn rotate_chitragupta_socket_secret() -> Result<String, String> {
    let binary = super::discovery::find_chitragupta_binary()?;
    let mut command = super::path_env::command_for_binary(&binary);
    command.args([
        "secret",
        "rotate",
        "api-key",
        "--consumer",
        "grimoire",
        "--store",
        "config",
    ]);

    let output =
        super::discovery::output_with_timeout(command, ROTATE_TIMEOUT).map_err(|error| {
            format!(
                "Chitragupta secret rotation failed: {}",
                sanitize_secret_material(&error)
            )
        })?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        let detail: String = sanitize_secret_material(stderr.trim())
            .chars()
            .take(360)
            .collect();
        return Err(if detail.is_empty() {
            format!(
                "Chitragupta secret rotation exited with status {}.",
                output.status
            )
        } else {
            format!("Chitragupta secret rotation failed: {detail}")
        });
    }

    let stdout = String::from_utf8_lossy(&output.stdout);
    extract_rotated_secret(&stdout).ok_or_else(|| {
        let receipt: String = sanitize_secret_material(stdout.trim())
            .chars()
            .take(240)
            .collect();
        format!(
            "Chitragupta rotated a key, but Grimoire could not read the receipt: {receipt} \
             Paste the token manually in Settings."
        )
    })
}

// ── Pure extraction and sanitization (unit-tested, never touch the CLI) ─────

fn is_secret_char(ch: char) -> bool {
    ch.is_ascii_alphanumeric() || ch == '_' || ch == '-'
}

/// A plausible rotated secret: long enough, base64url charset, and at least
/// one lowercase letter so SCREAMING_ENV_VAR names never qualify.
fn looks_like_secret(candidate: &str) -> bool {
    candidate.len() >= SECRET_MIN_LEN
        && candidate.chars().all(is_secret_char)
        && candidate.chars().any(|ch| ch.is_ascii_lowercase())
}

/// Extract the rotated secret from CLI stdout.
///
/// Primary pattern: the quoted value on an assignment line, e.g.
/// `export GRIMOIRE_CHITRAGUPTA_TOKEN='<secret>'` (single or double quotes).
/// Fallback for drifted receipts: any standalone base64url run of
/// [`SECRET_MIN_LEN`]+ characters anywhere in the output.
pub(super) fn extract_rotated_secret(stdout: &str) -> Option<String> {
    for line in stdout.lines() {
        if let Some(secret) = quoted_assignment_secret(line) {
            return Some(secret);
        }
    }
    stdout
        .split(|ch: char| !is_secret_char(ch))
        .find(|candidate| looks_like_secret(candidate))
        .map(ToString::to_string)
}

fn quoted_assignment_secret(line: &str) -> Option<String> {
    for quote in ['\'', '"'] {
        let pattern = format!("={quote}");
        let mut rest = line;
        while let Some(index) = rest.find(&pattern) {
            let after = &rest[index + pattern.len()..];
            let Some(end) = after.find(quote) else { break };
            let candidate = &after[..end];
            if looks_like_secret(candidate) {
                return Some(candidate.to_string());
            }
            rest = &after[end + 1..];
        }
    }
    None
}

/// Replace every run of [`SANITIZE_MIN_RUN`]+ token characters with
/// `[redacted]` so no secret-like string survives into an error message.
pub(super) fn sanitize_secret_material(text: &str) -> String {
    let mut sanitized = String::with_capacity(text.len());
    let mut run = String::new();
    for ch in text.chars() {
        if is_secret_char(ch) {
            run.push(ch);
        } else {
            flush_sanitized_run(&mut sanitized, &mut run);
            sanitized.push(ch);
        }
    }
    flush_sanitized_run(&mut sanitized, &mut run);
    sanitized
}

fn flush_sanitized_run(sanitized: &mut String, run: &mut String) {
    if run.len() >= SANITIZE_MIN_RUN {
        sanitized.push_str("[redacted]");
    } else {
        sanitized.push_str(run);
    }
    run.clear();
}

#[cfg(test)]
mod tests {
    use super::*;

    // Deliberately fake: a 43-char base64url-shaped stand-in, never a real key.
    const FAKE_SECRET: &str = "fake0secret0fake0secret0fake0secret0fake043";

    #[test]
    fn extracts_the_secret_from_the_export_line() {
        let stdout = format!(
            "Rotated api-key for consumer grimoire.\n\
             export GRIMOIRE_CHITRAGUPTA_TOKEN='{FAKE_SECRET}'\n\
             Stored in config."
        );
        assert_eq!(
            extract_rotated_secret(&stdout).as_deref(),
            Some(FAKE_SECRET)
        );
    }

    #[test]
    fn extracts_from_a_drifted_export_line_with_double_quotes_and_new_var_name() {
        let stdout = format!("set CHITRAGUPTA_CONSUMER_KEY=\"{FAKE_SECRET}\" to use it");
        assert_eq!(
            extract_rotated_secret(&stdout).as_deref(),
            Some(FAKE_SECRET)
        );
    }

    #[test]
    fn falls_back_to_a_standalone_token_when_the_export_line_is_gone() {
        let stdout = format!("Your new Grimoire API key:\n\n  {FAKE_SECRET}\n\nKeep it safe.");
        assert_eq!(
            extract_rotated_secret(&stdout).as_deref(),
            Some(FAKE_SECRET)
        );
    }

    #[test]
    fn falls_back_to_an_unquoted_assignment() {
        let stdout = format!("GRIMOIRE_CHITRAGUPTA_TOKEN={FAKE_SECRET}");
        assert_eq!(
            extract_rotated_secret(&stdout).as_deref(),
            Some(FAKE_SECRET)
        );
    }

    #[test]
    fn never_extracts_env_var_names_short_runs_or_garbage() {
        // Env-var names are long but have no lowercase; words are too short.
        assert_eq!(
            extract_rotated_secret("export GRIMOIRE_CHITRAGUPTA_TOKEN_PLACEHOLDER_NAME=''"),
            None
        );
        assert_eq!(
            extract_rotated_secret("rotation complete, check your config"),
            None
        );
        assert_eq!(extract_rotated_secret(""), None);
        assert_eq!(extract_rotated_secret("<html>proxy error</html>"), None);
    }

    #[test]
    fn extraction_ignores_quoted_values_that_are_not_secrets() {
        let stdout = format!("profile='default' key='{FAKE_SECRET}'");
        assert_eq!(
            extract_rotated_secret(&stdout).as_deref(),
            Some(FAKE_SECRET)
        );
    }

    #[test]
    fn sanitizer_strips_secret_like_runs_from_error_strings() {
        let error = format!("daemon rejected key {FAKE_SECRET} for consumer grimoire");
        let sanitized = sanitize_secret_material(&error);
        assert!(!sanitized.contains(FAKE_SECRET));
        assert!(sanitized.contains("[redacted]"));
        assert!(sanitized.contains("for consumer grimoire"));
    }

    #[test]
    fn sanitizer_strips_quoted_and_embedded_secrets() {
        let error = format!("export GRIMOIRE_CHITRAGUPTA_TOKEN='{FAKE_SECRET}'");
        let sanitized = sanitize_secret_material(&error);
        assert!(!sanitized.contains(FAKE_SECRET));
        // The env var name itself is >= 25 token chars, so it redacts too.
        assert!(sanitized.contains("[redacted]"));
    }

    #[test]
    fn sanitizer_keeps_ordinary_prose_intact() {
        let message = "Chitragupta daemon is unreachable at http://127.0.0.1:3141.";
        assert_eq!(sanitize_secret_material(message), message);
    }
}
