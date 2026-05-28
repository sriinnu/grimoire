use super::AiAgentStreamEvent;

pub(super) fn dispatch_chitragupta_event<F>(line: &str, emit: &mut F)
where
    F: FnMut(AiAgentStreamEvent),
{
    let trimmed = line.trim();
    if trimmed.is_empty() {
        return;
    }

    let json = match serde_json::from_str::<serde_json::Value>(trimmed) {
        Ok(json) => json,
        Err(_) => {
            emit(AiAgentStreamEvent::TextDelta {
                text: format!("{line}\n"),
            });
            return;
        }
    };

    dispatch_chitragupta_json_event(&json, emit);
}

fn dispatch_chitragupta_json_event<F>(json: &serde_json::Value, emit: &mut F)
where
    F: FnMut(AiAgentStreamEvent),
{
    let event_type = json_text(json, &["type", "event"]).unwrap_or_default();
    let phase = json_text(json, &["phase"]).unwrap_or_default();

    if event_type == "error" {
        emit(AiAgentStreamEvent::Error {
            message: chitragupta_error_message(json),
        });
        return;
    }

    if phase == "route.resolved" || event_type == "route.resolved" {
        if let Some(route) = chitragupta_route(json) {
            emit(AiAgentStreamEvent::RouteResolved {
                provider: route.provider.clone(),
                model: route.model.clone(),
                source: "Chitragupta route stream".to_string(),
            });
            let label = chitragupta_route_label(&route);
            emit(AiAgentStreamEvent::ThinkingDelta { text: label });
        }
        return;
    }

    if event_type == "status" {
        if let Some(text) = json_text(json, &["displayText", "display_text"]) {
            emit(AiAgentStreamEvent::ThinkingDelta {
                text: ensure_newline(text),
            });
        }
        return;
    }

    if matches!(event_type, "done" | "result") {
        return;
    }

    if let Some(text) = json_text(json, &["content", "delta", "text", "message"]) {
        let event = if chitragupta_visibility_is_reasoning(json) {
            AiAgentStreamEvent::ThinkingDelta {
                text: ensure_newline(text),
            }
        } else {
            AiAgentStreamEvent::TextDelta {
                text: text.to_string(),
            }
        };
        emit(event);
    }
}

fn chitragupta_visibility_is_reasoning(json: &serde_json::Value) -> bool {
    matches!(
        json_text(json, &["visibility"]).unwrap_or_default(),
        "thinking" | "reasoning" | "status"
    )
}

fn chitragupta_error_message(json: &serde_json::Value) -> String {
    json_text(json, &["message", "error"])
        .or_else(|| {
            json.get("error")
                .and_then(|error| json_text(error, &["message"]))
        })
        .unwrap_or("Chitragupta reported an error.")
        .to_string()
}

#[derive(Debug, Clone, PartialEq, Eq)]
struct ChitraguptaRoute {
    provider: Option<String>,
    model: Option<String>,
}

fn chitragupta_route(json: &serde_json::Value) -> Option<ChitraguptaRoute> {
    let route = json
        .get("routeDecision")
        .or_else(|| json.get("route_decision"))
        .or_else(|| json.get("data").and_then(|data| data.get("routeDecision")))
        .or_else(|| json.get("data").and_then(|data| data.get("route_decision")))
        .unwrap_or(json);
    let provider =
        json_text(route, &["providerId", "provider_id", "provider"]).map(ToString::to_string);
    let model = json_text(route, &["modelId", "model_id", "model"]).map(ToString::to_string);

    if provider.is_none() && model.is_none() {
        return None;
    }

    Some(ChitraguptaRoute { provider, model })
}

fn chitragupta_route_label(route: &ChitraguptaRoute) -> String {
    match (&route.provider, &route.model) {
        (Some(provider), Some(model)) => {
            format!("Chitragupta route resolved: provider {provider}, model {model}\n")
        }
        (Some(provider), None) => format!("Chitragupta route resolved: provider {provider}\n"),
        (None, Some(model)) => format!("Chitragupta route resolved: model {model}\n"),
        (None, None) => String::new(),
    }
}

fn json_text<'a>(json: &'a serde_json::Value, keys: &[&str]) -> Option<&'a str> {
    for key in keys {
        if let Some(text) = json.get(*key).and_then(|value| value.as_str()) {
            if !text.trim().is_empty() {
                return Some(text);
            }
        }
    }
    None
}

fn ensure_newline(text: &str) -> String {
    if text.ends_with('\n') {
        text.to_string()
    } else {
        format!("{text}\n")
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn answer_delta_maps_to_text_delta() {
        let mut events = Vec::new();

        dispatch_chitragupta_event(
            r#"{"type":"text_delta","visibility":"answer","content":"pong"}"#,
            &mut |event| events.push(event),
        );

        assert!(matches!(
            &events[0],
            AiAgentStreamEvent::TextDelta { text } if text == "pong"
        ));
    }

    #[test]
    fn route_status_maps_to_structured_route_and_thinking_delta() {
        let mut events = Vec::new();

        dispatch_chitragupta_event(
            r#"{"type":"status","phase":"route.resolved","routeDecision":{"providerId":"ollama","modelId":"qwen3:8b"}}"#,
            &mut |event| events.push(event),
        );

        assert!(matches!(
            &events[0],
            AiAgentStreamEvent::RouteResolved { provider, model, source }
                if provider.as_deref() == Some("ollama")
                    && model.as_deref() == Some("qwen3:8b")
                    && source == "Chitragupta route stream"
        ));
        assert!(matches!(
            &events[1],
            AiAgentStreamEvent::ThinkingDelta { text }
                if text == "Chitragupta route resolved: provider ollama, model qwen3:8b\n"
        ));
    }

    #[test]
    fn error_maps_to_error_event() {
        let mut events = Vec::new();

        dispatch_chitragupta_event(
            r#"{"type":"error","error":{"message":"model failed to load"}}"#,
            &mut |event| events.push(event),
        );

        assert!(matches!(
            &events[0],
            AiAgentStreamEvent::Error { message } if message == "model failed to load"
        ));
    }

    #[test]
    fn plain_text_falls_back_to_answer_delta() {
        let mut events = Vec::new();

        dispatch_chitragupta_event("plain answer", &mut |event| events.push(event));

        assert!(matches!(
            &events[0],
            AiAgentStreamEvent::TextDelta { text } if text == "plain answer\n"
        ));
    }
}
