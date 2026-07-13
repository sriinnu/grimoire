use serde::{Deserialize, Serialize};

pub const EVENT_ENVELOPE_SCHEMA_VERSION: &str = "grimoire.event-envelope.v1";

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "kebab-case")]
pub enum EventSensitivityV1 {
    Public,
    Internal,
    Private,
    Secret,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(tag = "type", rename_all_fields = "camelCase")]
pub enum IdeEventV1 {
    #[serde(rename = "context.assembled")]
    ContextAssembled { manifest_id: String },
    #[serde(rename = "context.pin.changed")]
    ContextPinChanged {
        manifest_id: String,
        source_id: String,
        pinned: bool,
    },
    #[serde(rename = "context.exclusion.changed")]
    ContextExclusionChanged {
        manifest_id: String,
        source_id: String,
        excluded: bool,
    },
    #[serde(rename = "agent.run.started")]
    AgentRunStarted { run_id: String },
    #[serde(rename = "agent.run.completed")]
    AgentRunCompleted { run_id: String },
    #[serde(rename = "agent.run.failed")]
    AgentRunFailed { run_id: String, error_code: String },
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct EventEnvelopeV1 {
    pub schema_version: String,
    pub event_id: String,
    pub sequence: u64,
    pub occurred_at: String,
    pub producer: String,
    pub correlation_id: String,
    pub causation_id: Option<String>,
    pub sensitivity: EventSensitivityV1,
    pub payload: IdeEventV1,
}

impl EventEnvelopeV1 {
    pub fn validate(&self) -> Vec<String> {
        let mut errors = Vec::new();
        if self.schema_version != EVENT_ENVELOPE_SCHEMA_VERSION {
            errors.push("unsupported event envelope schema version".to_string());
        }
        if self.event_id.trim().is_empty()
            || self.correlation_id.trim().is_empty()
            || self.producer.trim().is_empty()
        {
            errors.push("event identity, correlation, and producer must be non-empty".to_string());
        }
        if self.sequence == 0 {
            errors.push("event sequence must start at one".to_string());
        }
        errors
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn serializes_a_typed_versioned_event() {
        let envelope = EventEnvelopeV1 {
            schema_version: EVENT_ENVELOPE_SCHEMA_VERSION.to_string(),
            event_id: "event-1".to_string(),
            sequence: 1,
            occurred_at: "2026-07-13T00:00:00Z".to_string(),
            producer: "grimoire-core".to_string(),
            correlation_id: "request-1".to_string(),
            causation_id: None,
            sensitivity: EventSensitivityV1::Internal,
            payload: IdeEventV1::ContextAssembled {
                manifest_id: "ctx-1".to_string(),
            },
        };

        assert!(envelope.validate().is_empty());
        let value = serde_json::to_value(envelope).expect("serialize event");
        assert_eq!(value["schemaVersion"], EVENT_ENVELOPE_SCHEMA_VERSION);
        assert_eq!(value["payload"]["type"], "context.assembled");
        assert_eq!(value["payload"]["manifestId"], "ctx-1");
    }

    #[test]
    fn reads_the_cross_language_event_fixture() {
        let fixture = include_str!("../../../../contracts/fixtures/event-envelope-v1.json");
        let event: EventEnvelopeV1 =
            serde_json::from_str(fixture).expect("deserialize shared event fixture");
        assert!(event.validate().is_empty());
        assert!(matches!(event.payload, IdeEventV1::ContextAssembled { .. }));
    }
}
