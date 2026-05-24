use super::*;
use crate::claude_cli::types::ClaudeStreamEvent;

fn new_state() -> StreamState {
    StreamState {
        session_id: String::new(),
        tool_inputs: HashMap::new(),
        current_tool_id: None,
    }
}

fn run_dispatch(json: serde_json::Value) -> (String, Vec<ClaudeStreamEvent>) {
    let mut state = new_state();
    let mut events = vec![];
    dispatch_event(&json, &mut state, &mut |e| events.push(e));
    (state.session_id, events)
}

fn run_dispatch_with_sid(
    json: serde_json::Value,
    initial_sid: &str,
) -> (String, Vec<ClaudeStreamEvent>) {
    let mut state = new_state();
    state.session_id = initial_sid.to_string();
    let mut events = vec![];
    dispatch_event(&json, &mut state, &mut |e| events.push(e));
    (state.session_id, events)
}

fn run_dispatch_sequence(
    events_json: Vec<serde_json::Value>,
) -> (StreamState, Vec<ClaudeStreamEvent>) {
    let mut state = new_state();
    let mut events = vec![];
    for json in &events_json {
        dispatch_event(json, &mut state, &mut |e| events.push(e));
    }
    (state, events)
}

#[test]
fn dispatch_event_handles_init() {
    let (sid, events) = run_dispatch(serde_json::json!({
        "type": "system", "subtype": "init", "session_id": "test-session-123"
    }));
    assert_eq!(sid, "test-session-123");
    assert!(
        matches!(&events[0], ClaudeStreamEvent::Init { session_id } if session_id == "test-session-123")
    );
}

#[test]
fn dispatch_event_system_without_init_subtype_is_ignored() {
    let (_, events) = run_dispatch(serde_json::json!({ "type": "system", "subtype": "other" }));
    assert!(events.is_empty());
}

#[test]
fn dispatch_event_system_init_without_session_id_is_ignored() {
    let (sid, events) = run_dispatch(serde_json::json!({ "type": "system", "subtype": "init" }));
    assert!(events.is_empty());
    assert!(sid.is_empty());
}

#[test]
fn dispatch_event_handles_text_delta() {
    let (_, events) = run_dispatch(serde_json::json!({
        "type": "stream_event",
        "event": { "type": "content_block_delta", "index": 0, "delta": { "type": "text_delta", "text": "Hello" } }
    }));
    assert!(matches!(&events[0], ClaudeStreamEvent::TextDelta { text } if text == "Hello"));
}

#[test]
fn dispatch_event_handles_tool_start() {
    let (_, events) = run_dispatch(serde_json::json!({
        "type": "stream_event",
        "event": { "type": "content_block_start", "index": 1, "content_block": { "type": "tool_use", "id": "tool_abc", "name": "read_note", "input": {} } }
    }));
    assert!(
        matches!(&events[0], ClaudeStreamEvent::ToolStart { tool_name, tool_id, .. } if tool_name == "read_note" && tool_id == "tool_abc")
    );
}

#[test]
fn dispatch_event_handles_result() {
    let (sid, events) = run_dispatch(serde_json::json!({
        "type": "result", "subtype": "success", "result": "All done!", "session_id": "sess-456"
    }));
    assert_eq!(sid, "sess-456");
    assert!(
        matches!(&events[0], ClaudeStreamEvent::Result { text, session_id } if text == "All done!" && session_id == "sess-456")
    );
}

#[test]
fn dispatch_event_result_with_empty_session_id() {
    let (sid, events) = run_dispatch_with_sid(
        serde_json::json!({ "type": "result", "result": "text here" }),
        "prev-session",
    );
    assert_eq!(sid, "prev-session");
    assert!(matches!(&events[0], ClaudeStreamEvent::Result { text, .. } if text == "text here"));
}

#[test]
fn dispatch_event_handles_tool_progress() {
    let (_, events) = run_dispatch(serde_json::json!({
        "type": "tool_progress", "tool_name": "search_notes", "tool_use_id": "tool_xyz"
    }));
    assert!(
        matches!(&events[0], ClaudeStreamEvent::ToolStart { tool_name, tool_id, .. } if tool_name == "search_notes" && tool_id == "tool_xyz")
    );
}

#[test]
fn dispatch_event_tool_progress_missing_fields_is_ignored() {
    let (_, events) =
        run_dispatch(serde_json::json!({ "type": "tool_progress", "tool_name": "x" }));
    assert!(events.is_empty());
}

#[test]
fn dispatch_event_handles_assistant_with_tool_use() {
    let (_, events) = run_dispatch(serde_json::json!({
        "type": "assistant",
        "message": { "content": [
            { "type": "text", "text": "Let me search." },
            { "type": "tool_use", "id": "tu_1", "name": "search_notes", "input": {} }
        ] }
    }));
    assert_eq!(events.len(), 1);
    assert!(
        matches!(&events[0], ClaudeStreamEvent::ToolStart { tool_name, tool_id, .. } if tool_name == "search_notes" && tool_id == "tu_1")
    );
}

#[test]
fn dispatch_event_assistant_without_content_is_noop() {
    let (_, events) = run_dispatch(serde_json::json!({ "type": "assistant", "message": {} }));
    assert!(events.is_empty());
}

#[test]
fn dispatch_event_ignores_unknown() {
    let (_, events) = run_dispatch(serde_json::json!({ "type": "some_future_type", "data": 42 }));
    assert!(events.is_empty());
}

#[test]
fn dispatch_stream_event_input_json_delta_accumulates_silently() {
    let (_, events) = run_dispatch(serde_json::json!({
        "type": "stream_event",
        "event": { "type": "content_block_delta", "index": 0, "delta": { "type": "input_json_delta", "partial_json": "{}" } }
    }));
    assert!(events.is_empty());
}

#[test]
fn dispatch_stream_event_non_tool_block_start_is_ignored() {
    let (_, events) = run_dispatch(serde_json::json!({
        "type": "stream_event",
        "event": { "type": "content_block_start", "index": 0, "content_block": { "type": "text", "text": "" } }
    }));
    assert!(events.is_empty());
}

#[test]
fn dispatch_stream_event_unknown_type_is_ignored() {
    let (_, events) = run_dispatch(serde_json::json!({
        "type": "stream_event", "event": { "type": "message_stop" }
    }));
    assert!(events.is_empty());
}

#[test]
fn dispatch_event_handles_tool_result_string_content() {
    let (_, events) = run_dispatch(serde_json::json!({
        "type": "tool_result",
        "tool_use_id": "tool_abc",
        "content": "Found 3 notes matching query"
    }));
    assert_eq!(events.len(), 1);
    assert!(
        matches!(&events[0], ClaudeStreamEvent::ToolDone { tool_id, output }
            if tool_id == "tool_abc" && output.as_deref() == Some("Found 3 notes matching query"))
    );
}

#[test]
fn dispatch_event_handles_tool_result_array_content() {
    let (_, events) = run_dispatch(serde_json::json!({
        "type": "tool_result",
        "tool_use_id": "tool_def",
        "content": [{ "type": "text", "text": "Line 1" }, { "type": "text", "text": "Line 2" }]
    }));
    assert!(
        matches!(&events[0], ClaudeStreamEvent::ToolDone { output, .. }
            if output.as_deref() == Some("Line 1\nLine 2"))
    );
}

#[test]
fn dispatch_event_tool_result_missing_tool_id_is_ignored() {
    let (_, events) = run_dispatch(serde_json::json!({
        "type": "tool_result", "content": "result text"
    }));
    assert!(events.is_empty());
}

#[test]
fn dispatch_accumulates_input_json_deltas() {
    let (_, events) = run_dispatch_sequence(vec![
        serde_json::json!({
            "type": "stream_event",
            "event": { "type": "content_block_start", "content_block": { "type": "tool_use", "id": "t1", "name": "search_notes", "input": {} } }
        }),
        serde_json::json!({
            "type": "stream_event",
            "event": { "type": "content_block_delta", "delta": { "type": "input_json_delta", "partial_json": "{\"query\":" } }
        }),
        serde_json::json!({
            "type": "stream_event",
            "event": { "type": "content_block_delta", "delta": { "type": "input_json_delta", "partial_json": "\"test\"}" } }
        }),
        serde_json::json!({
            "type": "stream_event",
            "event": { "type": "content_block_stop" }
        }),
        serde_json::json!({
            "type": "assistant",
            "message": { "content": [
                { "type": "tool_use", "id": "t1", "name": "search_notes", "input": { "query": "test" } }
            ] }
        }),
    ]);
    assert!(matches!(
        &events[0],
        ClaudeStreamEvent::ToolStart { input: None, .. }
    ));
    assert!(
        matches!(&events[1], ClaudeStreamEvent::ToolStart { input: Some(inp), .. }
            if inp == "{\"query\":\"test\"}")
    );
}

#[test]
fn dispatch_assistant_uses_block_input_when_no_deltas() {
    let (_, events) = run_dispatch(serde_json::json!({
        "type": "assistant",
        "message": { "content": [
            { "type": "tool_use", "id": "tu_x", "name": "create_note", "input": { "title": "Hello", "content": "world" } }
        ] }
    }));
    assert!(
        matches!(&events[0], ClaudeStreamEvent::ToolStart { input: Some(inp), .. }
            if inp.contains("title") && inp.contains("Hello"))
    );
}

#[test]
fn content_block_stop_clears_current_tool() {
    let (state, _) = run_dispatch_sequence(vec![
        serde_json::json!({
            "type": "stream_event",
            "event": { "type": "content_block_start", "content_block": { "type": "tool_use", "id": "t1", "name": "x", "input": {} } }
        }),
        serde_json::json!({
            "type": "stream_event",
            "event": { "type": "content_block_stop" }
        }),
    ]);
    assert!(state.current_tool_id.is_none());
}
