//! Blocking HTTP client for the local Chitragupta daemon socket.
//!
//! The daemon speaks a `{ ok: bool, data | error }` JSON envelope on
//! `http://127.0.0.1:3141`. The API shape is still evolving, so every parser
//! here is defensive: it looks for known field spellings, tolerates unknown
//! fields, and never fails a whole payload for one missing key.
//!
//! Secrecy rule: the bearer token only travels through [`SocketToken`], which
//! redacts itself from `Debug` output and is never serialized or logged.

use serde::Serialize;
use serde_json::Value;
use std::collections::HashMap;
use std::fmt;
use std::sync::{Mutex, OnceLock};
use std::time::{Duration, Instant};

pub const DEFAULT_SOCKET_BASE_URL: &str = "http://127.0.0.1:3141";
pub const SOCKET_BASE_URL_ENV_VAR: &str = "GRIMOIRE_CHITRAGUPTA_SOCKET";

const HEALTH_TIMEOUT: Duration = Duration::from_secs(2);
const CHAT_TIMEOUT: Duration = Duration::from_secs(300);
const SESSIONS_TIMEOUT: Duration = Duration::from_secs(10);
const HEALTH_CACHE_TTL: Duration = Duration::from_secs(30);

/// Bearer token for the daemon. Deliberately opaque: no `Serialize`, no
/// `Display`, and a `Debug` impl that never prints the secret.
pub struct SocketToken(String);

impl SocketToken {
    pub fn new(token: String) -> Self {
        Self(token)
    }

    fn expose(&self) -> &str {
        &self.0
    }
}

impl fmt::Debug for SocketToken {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        f.write_str("SocketToken(redacted)")
    }
}

#[derive(Debug, Clone, Serialize, PartialEq, Eq)]
pub struct DaemonHealth {
    pub service: Option<String>,
    pub version: Option<String>,
}

/// Body for `POST /api/chat`. Carries no secret material, so `Debug` is safe.
#[derive(Debug, Clone, Serialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct SocketChatRequest {
    pub message: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub session_id: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub project_path: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub title: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub provider: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub model: Option<String>,
    pub consumer: String,
    pub surface: String,
    pub channel: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub session_lineage_key: Option<String>,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct SocketChatReply {
    pub text: Option<String>,
    pub session_id: Option<String>,
    pub provider: Option<String>,
    pub model: Option<String>,
}

/// A session summary trimmed down to what the AI panel renders. `updated_at`
/// and `created_at` stay as raw JSON values because the daemon may send epoch
/// numbers or ISO strings.
#[derive(Debug, Clone, Serialize, PartialEq)]
pub struct TrimmedChitraguptaSession {
    pub id: String,
    pub title: Option<String>,
    pub updated_at: Option<Value>,
    pub created_at: Option<Value>,
    pub message_count: Option<u64>,
    pub gist: Option<String>,
}

/// Base URL for the daemon, overridable via `GRIMOIRE_CHITRAGUPTA_SOCKET`.
pub fn socket_base_url() -> String {
    std::env::var(SOCKET_BASE_URL_ENV_VAR)
        .ok()
        .map(|value| value.trim().trim_end_matches('/').to_string())
        .filter(|value| !value.is_empty())
        .unwrap_or_else(|| DEFAULT_SOCKET_BASE_URL.to_string())
}

// ── HTTP surface ─────────────────────────────────────────────────────────────

fn blocking_client(timeout: Duration) -> Result<reqwest::blocking::Client, String> {
    reqwest::blocking::Client::builder()
        .timeout(timeout)
        .build()
        .map_err(|error| format!("Could not build the Chitragupta socket client: {error}"))
}

fn unreachable_message(base: &str) -> String {
    format!("Chitragupta daemon is unreachable at {base}.")
}

fn read_envelope(response: reqwest::blocking::Response, base: &str) -> Result<Value, String> {
    let status = response.status();
    let body = response
        .text()
        .map_err(|_| unreachable_message(base))?;

    if status.as_u16() == 401 || status.as_u16() == 403 {
        return Err(
            "Chitragupta daemon rejected the saved token. Update it in Settings.".to_string(),
        );
    }

    let envelope = match parse_envelope(&body) {
        Ok(data) => Ok(data),
        Err(error) if !status.is_success() => Err(format!(
            "Chitragupta daemon returned HTTP {}: {error}",
            status.as_u16()
        )),
        Err(error) => Err(error),
    }?;
    Ok(envelope)
}

/// `GET /api/health` — open endpoint, no token required.
pub fn health(base: &str) -> Result<DaemonHealth, String> {
    let client = blocking_client(HEALTH_TIMEOUT)?;
    let response = client
        .get(format!("{base}/api/health"))
        .send()
        .map_err(|_| unreachable_message(base))?;
    let data = read_envelope(response, base)?;
    Ok(DaemonHealth {
        service: json_text(&data, &["service"]).map(ToString::to_string),
        version: json_text(&data, &["version"]).map(ToString::to_string),
    })
}

/// `POST /api/chat` — non-streaming request/response.
pub fn chat(
    base: &str,
    token: &SocketToken,
    request: &SocketChatRequest,
) -> Result<SocketChatReply, String> {
    let client = blocking_client(CHAT_TIMEOUT)?;
    let response = client
        .post(format!("{base}/api/chat"))
        .bearer_auth(token.expose())
        .json(request)
        .send()
        .map_err(|_| unreachable_message(base))?;
    let data = read_envelope(response, base)?;
    Ok(parse_chat_reply(&data))
}

/// `GET /api/sessions?projectPath=…&consumer=…` — raw session summaries.
pub fn list_sessions(
    base: &str,
    token: &SocketToken,
    project_path: &str,
    consumer: &str,
) -> Result<Vec<Value>, String> {
    let client = blocking_client(SESSIONS_TIMEOUT)?;
    let response = client
        .get(format!("{base}/api/sessions"))
        .query(&[("projectPath", project_path), ("consumer", consumer)])
        .bearer_auth(token.expose())
        .send()
        .map_err(|_| unreachable_message(base))?;
    let data = read_envelope(response, base)?;
    Ok(extract_session_list(&data))
}

/// `GET /api/sessions/:id` — full session passthrough.
pub fn get_session(base: &str, token: &SocketToken, id: &str) -> Result<Value, String> {
    let client = blocking_client(SESSIONS_TIMEOUT)?;
    let response = client
        .get(format!("{base}/api/sessions/{id}"))
        .bearer_auth(token.expose())
        .send()
        .map_err(|_| unreachable_message(base))?;
    read_envelope(response, base)
}

// ── Envelope and reply parsing (pure, unit-tested) ───────────────────────────

fn parse_envelope(body: &str) -> Result<Value, String> {
    let json: Value = serde_json::from_str(body)
        .map_err(|_| "Chitragupta daemon returned an unreadable response.".to_string())?;

    if json.get("ok").and_then(Value::as_bool) == Some(false) {
        return Err(envelope_error_message(&json));
    }

    Ok(json.get("data").cloned().unwrap_or(json))
}

fn envelope_error_message(json: &Value) -> String {
    json_text(json, &["error", "message"])
        .or_else(|| {
            json.get("error")
                .and_then(|error| json_text(error, &["message", "code"]))
        })
        .unwrap_or("Chitragupta daemon reported an error.")
        .to_string()
}

fn parse_chat_reply(data: &Value) -> SocketChatReply {
    SocketChatReply {
        text: reply_text(data, 0),
        session_id: reply_session_id(data),
        provider: route_field(data, &["providerId", "provider_id", "provider"]),
        model: route_field(data, &["modelId", "model_id", "model"]),
    }
}

/// The assistant text may live under several spellings and may be nested one
/// level (e.g. `{ reply: { text: "…" } }`). Depth-capped to stay predictable.
fn reply_text(data: &Value, depth: u8) -> Option<String> {
    if depth > 2 {
        return None;
    }
    for key in ["reply", "message", "text", "response", "answer", "content"] {
        let Some(value) = data.get(key) else { continue };
        if let Some(text) = value.as_str() {
            if !text.trim().is_empty() {
                return Some(text.to_string());
            }
        }
        if value.is_object() {
            if let Some(text) = reply_text(value, depth + 1) {
                return Some(text);
            }
        }
    }
    None
}

fn reply_session_id(data: &Value) -> Option<String> {
    json_text(data, &["sessionId", "session_id"])
        .map(ToString::to_string)
        .or_else(|| {
            data.get("session")
                .and_then(|session| json_text(session, &["id", "sessionId"]))
                .map(ToString::to_string)
        })
}

fn route_field(data: &Value, keys: &[&str]) -> Option<String> {
    let route = data
        .get("routeDecision")
        .or_else(|| data.get("route_decision"))
        .or_else(|| data.get("route"))
        .unwrap_or(data);
    json_text(route, keys).map(ToString::to_string)
}

fn extract_session_list(data: &Value) -> Vec<Value> {
    if let Some(list) = data.as_array() {
        return list.clone();
    }
    for key in ["sessions", "items", "results"] {
        if let Some(list) = data.get(key).and_then(Value::as_array) {
            return list.clone();
        }
    }
    Vec::new()
}

// ── Note-scoped session filtering (pure, unit-tested) ────────────────────────

fn summary_project_path(summary: &Value) -> Option<&str> {
    json_text(summary, &["projectPath", "project_path", "project"])
}

fn summary_lineage_key(summary: &Value) -> Option<&str> {
    json_text(
        summary,
        &[
            "sessionLineageKey",
            "session_lineage_key",
            "lineageKey",
            "lineage_key",
            "lineage",
        ],
    )
    .or_else(|| {
        summary
            .get("scope")
            .and_then(|scope| json_text(scope, &["sessionLineageKey", "lineageKey", "lineage"]))
    })
}

/// A session belongs to a note when its project matches the vault and — if it
/// declares a lineage key at all — that key matches the note's vault-relative
/// path. Sessions without any lineage field stay visible for the vault.
pub fn session_matches_note(summary: &Value, vault_path: &str, note_path: &str) -> bool {
    match summary_project_path(summary) {
        Some(project) if project == vault_path => {}
        _ => return false,
    }
    match summary_lineage_key(summary) {
        Some(lineage) => lineage == note_path,
        None => true,
    }
}

/// Reduce a raw session summary to the fields the AI panel renders.
pub fn trim_session_summary(summary: &Value) -> Option<TrimmedChitraguptaSession> {
    let id = json_text(summary, &["id", "sessionId", "session_id"])?.to_string();
    Some(TrimmedChitraguptaSession {
        id,
        title: json_text(summary, &["title", "name"]).map(ToString::to_string),
        updated_at: first_value(summary, &["updatedAt", "updated_at", "lastMessageAt", "last_message_at"]),
        created_at: first_value(summary, &["createdAt", "created_at"]),
        message_count: summary
            .get("messageCount")
            .or_else(|| summary.get("message_count"))
            .and_then(Value::as_u64),
        gist: json_text(
            summary,
            &["gist", "summary", "preview", "lastMessagePreview", "last_message_preview"],
        )
        .map(ToString::to_string),
    })
}

fn first_value(json: &Value, keys: &[&str]) -> Option<Value> {
    keys.iter()
        .find_map(|key| json.get(*key))
        .filter(|value| !value.is_null())
        .cloned()
}

fn json_text<'a>(json: &'a Value, keys: &[&str]) -> Option<&'a str> {
    for key in keys {
        if let Some(text) = json.get(*key).and_then(Value::as_str) {
            if !text.trim().is_empty() {
                return Some(text);
            }
        }
    }
    None
}

// ── Health cache and per-note session memory (app-run scoped) ────────────────

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct CachedSocketHealth {
    pub healthy: bool,
    pub version: Option<String>,
}

struct HealthCacheEntry {
    base: String,
    checked_at: Instant,
    health: CachedSocketHealth,
}

fn health_cache() -> &'static Mutex<Option<HealthCacheEntry>> {
    static CACHE: OnceLock<Mutex<Option<HealthCacheEntry>>> = OnceLock::new();
    CACHE.get_or_init(|| Mutex::new(None))
}

fn session_ids() -> &'static Mutex<HashMap<(String, String), String>> {
    static IDS: OnceLock<Mutex<HashMap<(String, String), String>>> = OnceLock::new();
    IDS.get_or_init(|| Mutex::new(HashMap::new()))
}

/// Health, probing at most once per [`HEALTH_CACHE_TTL`] per base URL.
pub fn cached_health(base: &str) -> CachedSocketHealth {
    {
        let cache = health_cache().lock().unwrap_or_else(|poison| poison.into_inner());
        if let Some(entry) = cache.as_ref() {
            if entry.base == base && entry.checked_at.elapsed() < HEALTH_CACHE_TTL {
                return entry.health.clone();
            }
        }
    }
    probe_health(base)
}

/// Probe the daemon now and refresh the cache with the live answer.
pub fn probe_health(base: &str) -> CachedSocketHealth {
    let health = match health(base) {
        Ok(daemon) => CachedSocketHealth {
            healthy: true,
            version: daemon.version,
        },
        Err(_) => CachedSocketHealth {
            healthy: false,
            version: None,
        },
    };
    store_health(base, health.clone());
    health
}

/// Record a mid-call failure so the *next* message routes through the CLI
/// without re-sending anything, until the cache window elapses.
pub fn mark_socket_unhealthy(base: &str) {
    store_health(
        base,
        CachedSocketHealth {
            healthy: false,
            version: None,
        },
    );
}

fn store_health(base: &str, health: CachedSocketHealth) {
    let mut cache = health_cache().lock().unwrap_or_else(|poison| poison.into_inner());
    *cache = Some(HealthCacheEntry {
        base: base.to_string(),
        checked_at: Instant::now(),
        health,
    });
}

/// Last socket session id for a (vault, note) pair within this app run.
pub fn remembered_session_id(vault_path: &str, note_path: &str) -> Option<String> {
    let map = session_ids().lock().unwrap_or_else(|poison| poison.into_inner());
    map.get(&(vault_path.to_string(), note_path.to_string())).cloned()
}

pub fn remember_session_id(vault_path: &str, note_path: &str, session_id: &str) {
    if session_id.trim().is_empty() {
        return;
    }
    let mut map = session_ids().lock().unwrap_or_else(|poison| poison.into_inner());
    map.insert(
        (vault_path.to_string(), note_path.to_string()),
        session_id.to_string(),
    );
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    #[test]
    fn socket_token_debug_never_contains_the_secret() {
        let token = SocketToken::new("chg_super_secret_value".into());
        let debug = format!("{token:?}");
        assert!(!debug.contains("chg_super_secret_value"));
        assert!(!debug.contains("super_secret"));
        assert_eq!(debug, "SocketToken(redacted)");
    }

    #[test]
    fn chat_request_serializes_camel_case_and_skips_absent_fields() {
        let request = SocketChatRequest {
            message: "hi".into(),
            session_id: None,
            project_path: Some("/tmp/vault".into()),
            title: Some("Grimoire · alpha".into()),
            provider: None,
            model: None,
            consumer: "grimoire".into(),
            surface: "grimoire-app".into(),
            channel: "editor".into(),
            session_lineage_key: Some("notes/alpha.md".into()),
        };
        let json = serde_json::to_value(&request).unwrap();
        assert_eq!(json["projectPath"], "/tmp/vault");
        assert_eq!(json["sessionLineageKey"], "notes/alpha.md");
        assert_eq!(json["consumer"], "grimoire");
        assert!(json.get("sessionId").is_none());
        assert!(json.get("provider").is_none());
    }

    #[test]
    fn parse_envelope_unwraps_data_on_success() {
        let data = parse_envelope(r#"{"ok":true,"data":{"reply":"pong","extra":1}}"#).unwrap();
        assert_eq!(data["reply"], "pong");
        assert_eq!(data["extra"], 1);
    }

    #[test]
    fn parse_envelope_surfaces_error_envelope_message() {
        let error = parse_envelope(r#"{"ok":false,"error":{"message":"session not found"}}"#)
            .unwrap_err();
        assert_eq!(error, "session not found");
    }

    #[test]
    fn parse_envelope_tolerates_missing_ok_and_data() {
        let data = parse_envelope(r#"{"reply":"bare"}"#).unwrap();
        assert_eq!(data["reply"], "bare");
    }

    #[test]
    fn parse_envelope_rejects_non_json() {
        assert!(parse_envelope("<html>proxy error</html>").is_err());
    }

    #[test]
    fn chat_reply_finds_text_across_known_spellings() {
        for payload in [
            json!({"reply": "answer"}),
            json!({"message": "answer"}),
            json!({"text": "answer"}),
            json!({"response": "answer"}),
            json!({"reply": {"text": "answer"}}),
        ] {
            assert_eq!(parse_chat_reply(&payload).text.as_deref(), Some("answer"), "payload: {payload}");
        }
    }

    #[test]
    fn chat_reply_tolerates_unknown_fields_and_finds_session_and_route() {
        let payload = json!({
            "reply": "done",
            "sessionId": "ses_1",
            "routeDecision": {"providerId": "ollama", "modelId": "qwen3:8b"},
            "somethingNew": {"nested": true}
        });
        let reply = parse_chat_reply(&payload);
        assert_eq!(reply.text.as_deref(), Some("done"));
        assert_eq!(reply.session_id.as_deref(), Some("ses_1"));
        assert_eq!(reply.provider.as_deref(), Some("ollama"));
        assert_eq!(reply.model.as_deref(), Some("qwen3:8b"));
    }

    #[test]
    fn chat_reply_reads_nested_session_id() {
        let reply = parse_chat_reply(&json!({"answer": "ok", "session": {"id": "ses_9"}}));
        assert_eq!(reply.session_id.as_deref(), Some("ses_9"));
    }

    #[test]
    fn session_list_extraction_handles_bare_and_wrapped_arrays() {
        assert_eq!(extract_session_list(&json!([{"id": "a"}])).len(), 1);
        assert_eq!(extract_session_list(&json!({"sessions": [{"id": "a"}, {"id": "b"}]})).len(), 2);
        assert!(extract_session_list(&json!({"unexpected": true})).is_empty());
    }

    #[test]
    fn session_filter_requires_project_match() {
        let summary = json!({"id": "s1", "projectPath": "/vault-a", "sessionLineageKey": "notes/a.md"});
        assert!(session_matches_note(&summary, "/vault-a", "notes/a.md"));
        assert!(!session_matches_note(&summary, "/vault-b", "notes/a.md"));
    }

    #[test]
    fn session_filter_enforces_lineage_only_when_present() {
        let with_lineage = json!({"id": "s1", "projectPath": "/vault", "sessionLineageKey": "notes/a.md"});
        let without_lineage = json!({"id": "s2", "projectPath": "/vault"});
        let snake_lineage = json!({"id": "s3", "projectPath": "/vault", "lineage_key": "notes/b.md"});

        assert!(session_matches_note(&with_lineage, "/vault", "notes/a.md"));
        assert!(!session_matches_note(&with_lineage, "/vault", "notes/other.md"));
        assert!(session_matches_note(&without_lineage, "/vault", "notes/a.md"));
        assert!(!session_matches_note(&snake_lineage, "/vault", "notes/a.md"));
        assert!(session_matches_note(&snake_lineage, "/vault", "notes/b.md"));
    }

    #[test]
    fn trim_session_summary_keeps_render_fields_and_drops_the_rest() {
        let summary = json!({
            "id": "ses_1",
            "title": "Alpha planning",
            "updatedAt": "2026-07-15T10:00:00Z",
            "createdAt": 1752300000000i64,
            "messageCount": 12,
            "summary": "Talked through the alpha rollout.",
            "consumer": "grimoire",
            "unknownField": {"deep": true}
        });
        let trimmed = trim_session_summary(&summary).unwrap();
        assert_eq!(trimmed.id, "ses_1");
        assert_eq!(trimmed.title.as_deref(), Some("Alpha planning"));
        assert_eq!(trimmed.updated_at, Some(json!("2026-07-15T10:00:00Z")));
        assert_eq!(trimmed.created_at, Some(json!(1752300000000i64)));
        assert_eq!(trimmed.message_count, Some(12));
        assert_eq!(trimmed.gist.as_deref(), Some("Talked through the alpha rollout."));
        let serialized = serde_json::to_value(&trimmed).unwrap();
        assert!(serialized.get("unknownField").is_none());
    }

    #[test]
    fn trim_session_summary_requires_an_id() {
        assert!(trim_session_summary(&json!({"title": "no id"})).is_none());
    }

    #[test]
    fn session_memory_round_trips_per_vault_and_note() {
        remember_session_id("/vault-mem", "notes/a.md", "ses_a");
        remember_session_id("/vault-mem", "", "ses_vault");
        assert_eq!(remembered_session_id("/vault-mem", "notes/a.md").as_deref(), Some("ses_a"));
        assert_eq!(remembered_session_id("/vault-mem", "").as_deref(), Some("ses_vault"));
        assert_eq!(remembered_session_id("/vault-mem", "notes/b.md"), None);
    }
}
