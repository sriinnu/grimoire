use serde::{Deserialize, Serialize};
use std::collections::BTreeSet;

pub const CONTEXT_MANIFEST_SCHEMA_VERSION: &str = "grimoire.context-manifest.v1";

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "kebab-case")]
pub enum ContextIntentV1 {
    Explain,
    Edit,
    Plan,
    Debug,
    Research,
    Review,
    Refactor,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "kebab-case")]
pub enum ContextPermissionV1 {
    Allowed,
    Redacted,
    LocalOnly,
    Blocked,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "kebab-case")]
pub enum ContextSourceKindV1 {
    ActiveFile,
    Selection,
    OpenFile,
    GitDiff,
    TerminalError,
    Symbol,
    Diagnostic,
    Memory,
    UserPin,
    Other,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TextSelectionV1 {
    pub start_line: u32,
    pub end_line: u32,
}

#[derive(Debug, Clone, Default, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LiveContextV1 {
    pub active_file: Option<String>,
    pub selection: Option<TextSelectionV1>,
    pub open_files: Vec<String>,
    pub git_diffs: Vec<String>,
    pub terminal_errors: Vec<String>,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ContextItemV1 {
    pub id: String,
    pub kind: ContextSourceKindV1,
    pub uri: String,
    pub score: f64,
    pub token_count: u32,
    pub selected_because: Vec<String>,
    pub retrieval_channels: Vec<String>,
    pub scope: String,
    pub confidence: f64,
    pub revision: Option<String>,
    pub content_hash: Option<String>,
    pub permission: ContextPermissionV1,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ExcludedContextItemV1 {
    pub id: String,
    pub kind: ContextSourceKindV1,
    pub uri: String,
    pub reason: String,
    pub permission: ContextPermissionV1,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ContextBudgetV1 {
    pub maximum_tokens: u32,
    pub used_tokens: u32,
    pub remaining_tokens: u32,
    pub compacted_tokens: u32,
}

impl ContextBudgetV1 {
    pub fn new(maximum_tokens: u32, used_tokens: u32, compacted_tokens: u32) -> Option<Self> {
        (used_tokens <= maximum_tokens).then_some(Self {
            maximum_tokens,
            used_tokens,
            remaining_tokens: maximum_tokens - used_tokens,
            compacted_tokens,
        })
    }
}

#[derive(Debug, Clone, Default, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ContextWarningsV1 {
    pub stale: Vec<String>,
    pub contradictions: Vec<String>,
    pub weak_evidence: Vec<String>,
    pub policy_blocks: Vec<String>,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SourceReferenceV1 {
    pub kind: ContextSourceKindV1,
    pub uri: String,
    pub revision: Option<String>,
    pub content_hash: Option<String>,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ContextManifestV1 {
    pub schema_version: String,
    pub id: String,
    pub request_id: String,
    pub created_at: String,
    pub intent: ContextIntentV1,
    pub live: LiveContextV1,
    pub recalled: Vec<ContextItemV1>,
    pub code: Vec<ContextItemV1>,
    pub pinned: Vec<ContextItemV1>,
    pub excluded: Vec<ExcludedContextItemV1>,
    pub budget: ContextBudgetV1,
    pub warnings: ContextWarningsV1,
    pub provenance: Vec<SourceReferenceV1>,
}

impl ContextManifestV1 {
    pub fn validate(&self) -> Vec<String> {
        let mut errors = Vec::new();
        if self.schema_version != CONTEXT_MANIFEST_SCHEMA_VERSION {
            errors.push("unsupported context manifest schema version".to_string());
        }
        if self.id.trim().is_empty() || self.request_id.trim().is_empty() {
            errors.push("manifest and request IDs must be non-empty".to_string());
        }
        if self.budget.used_tokens > self.budget.maximum_tokens
            || self.budget.remaining_tokens != self.budget.maximum_tokens - self.budget.used_tokens
        {
            errors.push("context budget is inconsistent".to_string());
        }

        let mut seen = BTreeSet::new();
        for item in self.recalled.iter().chain(&self.code).chain(&self.pinned) {
            if item.id.trim().is_empty() || !seen.insert(item.id.as_str()) {
                errors.push(format!(
                    "context item ID is empty or duplicated: {}",
                    item.id
                ));
            }
            if !(0.0..=1.0).contains(&item.score) || !(0.0..=1.0).contains(&item.confidence) {
                errors.push(format!("context item score is outside 0...1: {}", item.id));
            }
        }

        for item in &self.excluded {
            if seen.contains(item.id.as_str()) {
                errors.push(format!(
                    "context item is both included and excluded: {}",
                    item.id
                ));
            }
        }
        errors
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn item(id: &str) -> ContextItemV1 {
        ContextItemV1 {
            id: id.to_string(),
            kind: ContextSourceKindV1::ActiveFile,
            uri: "file:///vault/Welcome.md".to_string(),
            score: 1.0,
            token_count: 12,
            selected_because: vec!["active file".to_string()],
            retrieval_channels: vec!["live".to_string()],
            scope: "repository".to_string(),
            confidence: 1.0,
            revision: Some("abc123".to_string()),
            content_hash: Some("sha256:example".to_string()),
            permission: ContextPermissionV1::Allowed,
        }
    }

    fn manifest() -> ContextManifestV1 {
        ContextManifestV1 {
            schema_version: CONTEXT_MANIFEST_SCHEMA_VERSION.to_string(),
            id: "ctx-1".to_string(),
            request_id: "request-1".to_string(),
            created_at: "2026-07-13T00:00:00Z".to_string(),
            intent: ContextIntentV1::Explain,
            live: LiveContextV1::default(),
            recalled: Vec::new(),
            code: vec![item("source-1")],
            pinned: Vec::new(),
            excluded: Vec::new(),
            budget: ContextBudgetV1::new(1_000, 12, 0).expect("valid budget"),
            warnings: ContextWarningsV1::default(),
            provenance: Vec::new(),
        }
    }

    #[test]
    fn validates_a_consistent_manifest() {
        assert!(manifest().validate().is_empty());
    }

    #[test]
    fn rejects_duplicate_and_inconsistently_excluded_items() {
        let mut manifest = manifest();
        manifest.pinned.push(item("source-1"));
        manifest.excluded.push(ExcludedContextItemV1 {
            id: "source-1".to_string(),
            kind: ContextSourceKindV1::ActiveFile,
            uri: "file:///vault/Welcome.md".to_string(),
            reason: "user excluded".to_string(),
            permission: ContextPermissionV1::Blocked,
        });

        let errors = manifest.validate();
        assert!(errors.iter().any(|error| error.contains("duplicated")));
        assert!(errors
            .iter()
            .any(|error| error.contains("both included and excluded")));
    }

    #[test]
    fn serializes_with_versioned_camel_case_contract_keys() {
        let value = serde_json::to_value(manifest()).expect("serialize manifest");
        assert_eq!(value["schemaVersion"], CONTEXT_MANIFEST_SCHEMA_VERSION);
        assert_eq!(value["budget"]["maximumTokens"], 1_000);
        assert_eq!(value["code"][0]["kind"], "active-file");
    }

    #[test]
    fn reads_the_cross_language_manifest_fixture() {
        let fixture = include_str!("../../../../contracts/fixtures/context-manifest-v1.json");
        let manifest: ContextManifestV1 =
            serde_json::from_str(fixture).expect("deserialize shared manifest fixture");
        assert!(manifest.validate().is_empty());
        assert_eq!(manifest.live.active_file.as_deref(), Some("Welcome.md"));
    }
}
