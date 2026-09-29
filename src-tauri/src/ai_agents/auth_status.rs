//! How each CLI is signed in, read from the CLI itself: Claude Code answers
//! `claude auth status` as JSON; Codex keeps `~/.codex/auth.json`. Grimoire
//! only reports the shape of the login (subscription or key), never a token.

use serde::Serialize;
use std::path::PathBuf;
use std::time::Duration;

use super::discovery::output_with_timeout;

#[derive(Debug, Clone, Default, Serialize, PartialEq, Eq)]
pub struct AiAgentAuthStatus {
    pub signed_in: bool,
    /// "subscription" or "api_key" when known.
    pub method: Option<String>,
    /// Human line for Settings: the account kind or why it could not be read.
    pub detail: Option<String>,
}

#[derive(Debug, Clone, Default, Serialize)]
pub struct AiAgentsAuthStatus {
    pub claude_code: AiAgentAuthStatus,
    pub codex: AiAgentAuthStatus,
}

const PROBE_TIMEOUT: Duration = Duration::from_secs(4);

pub fn get_ai_agent_auth_status() -> AiAgentsAuthStatus {
    AiAgentsAuthStatus {
        claude_code: claude_auth_status(),
        codex: codex_auth_status(dirs::home_dir().map(|home| home.join(".codex/auth.json"))),
    }
}

fn claude_auth_status() -> AiAgentAuthStatus {
    let binary = match crate::claude_cli::find_claude_binary() {
        Ok(binary) => binary,
        Err(error) => {
            return AiAgentAuthStatus {
                signed_in: false,
                method: None,
                detail: Some(error),
            }
        }
    };
    let mut command = crate::hidden_command(binary.to_string_lossy().as_ref());
    command.args(["auth", "status"]);
    let output = match output_with_timeout(command, PROBE_TIMEOUT) {
        Ok(output) => output,
        Err(error) => {
            return AiAgentAuthStatus {
                signed_in: false,
                method: None,
                detail: Some(format!("Could not read Claude Code sign-in: {error}")),
            }
        }
    };
    parse_claude_auth_status(&String::from_utf8_lossy(&output.stdout))
}

/// Parses the JSON from `claude auth status`.
pub fn parse_claude_auth_status(stdout: &str) -> AiAgentAuthStatus {
    let json: serde_json::Value = match serde_json::from_str(stdout.trim()) {
        Ok(json) => json,
        Err(_) => {
            return AiAgentAuthStatus {
                signed_in: false,
                method: None,
                detail: Some("Claude Code did not report its sign-in state.".into()),
            }
        }
    };
    let signed_in = json
        .get("loggedIn")
        .and_then(|v| v.as_bool())
        .unwrap_or(false);
    if !signed_in {
        return AiAgentAuthStatus {
            signed_in: false,
            method: None,
            detail: Some("Not signed in. Run `claude` in Terminal and log in.".into()),
        };
    }
    let auth_method = json
        .get("authMethod")
        .and_then(|v| v.as_str())
        .unwrap_or("");
    let subscription = json.get("subscriptionType").and_then(|v| v.as_str());
    let is_subscription = auth_method == "claude.ai";
    let detail = match (is_subscription, subscription) {
        (true, Some(kind)) if !kind.is_empty() => format!("Signed in with claude.ai ({kind})"),
        (true, _) => "Signed in with claude.ai".to_string(),
        (false, _) => "Signed in with an API key".to_string(),
    };
    AiAgentAuthStatus {
        signed_in: true,
        method: Some(
            if is_subscription {
                "subscription"
            } else {
                "api_key"
            }
            .into(),
        ),
        detail: Some(detail),
    }
}

fn codex_auth_status(auth_file: Option<PathBuf>) -> AiAgentAuthStatus {
    let Some(path) = auth_file else {
        return AiAgentAuthStatus {
            signed_in: false,
            method: None,
            detail: Some("No home directory.".into()),
        };
    };
    match std::fs::read_to_string(&path) {
        Ok(contents) => parse_codex_auth_file(&contents),
        Err(_) => AiAgentAuthStatus {
            signed_in: false,
            method: None,
            detail: Some("Not signed in. Run `codex login` in Terminal.".into()),
        },
    }
}

/// Parses `~/.codex/auth.json`: `auth_mode` is "chatgpt" for a subscription login.
pub fn parse_codex_auth_file(contents: &str) -> AiAgentAuthStatus {
    let json: serde_json::Value = match serde_json::from_str(contents) {
        Ok(json) => json,
        Err(_) => {
            return AiAgentAuthStatus {
                signed_in: false,
                method: None,
                detail: Some("Codex sign-in file could not be read.".into()),
            }
        }
    };
    let mode = json.get("auth_mode").and_then(|v| v.as_str()).unwrap_or("");
    let has_tokens = json.get("tokens").map(|v| !v.is_null()).unwrap_or(false);
    let has_key = json
        .get("OPENAI_API_KEY")
        .and_then(|v| v.as_str())
        .is_some_and(|value| !value.trim().is_empty());
    if mode == "chatgpt" && has_tokens {
        return AiAgentAuthStatus {
            signed_in: true,
            method: Some("subscription".into()),
            detail: Some("Signed in with ChatGPT".into()),
        };
    }
    if has_key {
        return AiAgentAuthStatus {
            signed_in: true,
            method: Some("api_key".into()),
            detail: Some("Signed in with an API key".into()),
        };
    }
    AiAgentAuthStatus {
        signed_in: false,
        method: None,
        detail: Some("Not signed in. Run `codex login` in Terminal.".into()),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn claude_subscription_login_is_reported() {
        let status = parse_claude_auth_status(
            r#"{"loggedIn":true,"authMethod":"claude.ai","subscriptionType":"max"}"#,
        );
        assert!(status.signed_in);
        assert_eq!(status.method.as_deref(), Some("subscription"));
        assert_eq!(
            status.detail.as_deref(),
            Some("Signed in with claude.ai (max)")
        );
    }

    #[test]
    fn claude_logged_out_and_garbage_are_not_signed_in() {
        assert!(!parse_claude_auth_status(r#"{"loggedIn":false}"#).signed_in);
        assert!(!parse_claude_auth_status("not json").signed_in);
    }

    #[test]
    fn codex_chatgpt_login_is_a_subscription() {
        let status = parse_codex_auth_file(
            r#"{"auth_mode":"chatgpt","OPENAI_API_KEY":null,"tokens":{"access_token":"x"}}"#,
        );
        assert!(status.signed_in);
        assert_eq!(status.method.as_deref(), Some("subscription"));
    }

    #[test]
    fn codex_key_login_and_empty_file_are_distinguished() {
        let key = parse_codex_auth_file(
            r#"{"auth_mode":"apikey","OPENAI_API_KEY":"sk-test","tokens":null}"#,
        );
        assert_eq!(key.method.as_deref(), Some("api_key"));
        assert!(!parse_codex_auth_file(r#"{"auth_mode":"chatgpt","tokens":null}"#).signed_in);
    }
}
