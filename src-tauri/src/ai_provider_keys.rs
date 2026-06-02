use serde::Serialize;
use std::process::Command;

use crate::ai_agents::AiAgentId;

#[cfg(target_os = "macos")]
const KEYCHAIN_SERVICE: &str = "app.grimoire.ai-provider-keys";
#[cfg(target_os = "macos")]
const ERR_SEC_ITEM_NOT_FOUND: i32 = -25300;

/// Static provider metadata for a secret-bearing CLI environment variable.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct AiProviderKeyDefinition {
    pub provider_id: &'static str,
    pub label: &'static str,
    pub env_var: &'static str,
}

/// Redacted source Grimoire can disclose without returning the secret value.
#[derive(Debug, Clone, Copy, Serialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum AiProviderKeySource {
    Keychain,
    Environment,
    Missing,
}

/// Redacted provider key readiness returned to the Settings UI.
#[derive(Debug, Clone, Serialize, PartialEq, Eq)]
pub struct AiProviderKeyStatus {
    pub provider_id: &'static str,
    pub label: &'static str,
    pub env_var: &'static str,
    pub configured: bool,
    pub source: AiProviderKeySource,
}

/// Providers whose keys can be stored locally and injected into AI CLI processes.
pub const AI_PROVIDER_KEY_DEFINITIONS: &[AiProviderKeyDefinition] = &[
    AiProviderKeyDefinition {
        provider_id: "anthropic",
        label: "Anthropic",
        env_var: "ANTHROPIC_API_KEY",
    },
    AiProviderKeyDefinition {
        provider_id: "openai",
        label: "OpenAI",
        env_var: "OPENAI_API_KEY",
    },
    AiProviderKeyDefinition {
        provider_id: "openrouter",
        label: "OpenRouter",
        env_var: "OPENROUTER_API_KEY",
    },
    AiProviderKeyDefinition {
        provider_id: "deepseek",
        label: "DeepSeek",
        env_var: "DEEPSEEK_API_KEY",
    },
    AiProviderKeyDefinition {
        provider_id: "gemini",
        label: "Gemini",
        env_var: "GEMINI_API_KEY",
    },
    AiProviderKeyDefinition {
        provider_id: "google",
        label: "Google AI",
        env_var: "GOOGLE_API_KEY",
    },
    AiProviderKeyDefinition {
        provider_id: "groq",
        label: "Groq",
        env_var: "GROQ_API_KEY",
    },
    AiProviderKeyDefinition {
        provider_id: "xai",
        label: "xAI",
        env_var: "XAI_API_KEY",
    },
];

/// Return redacted provider key readiness without exposing key material.
pub fn get_ai_provider_key_statuses() -> Vec<AiProviderKeyStatus> {
    AI_PROVIDER_KEY_DEFINITIONS
        .iter()
        .map(provider_key_status)
        .collect()
}

/// Save a provider API key to secure platform storage and return refreshed status.
pub fn save_ai_provider_api_key(
    provider_id: &str,
    api_key: &str,
) -> Result<Vec<AiProviderKeyStatus>, String> {
    let definition = provider_definition(provider_id)?;
    let trimmed = api_key.trim();
    if trimmed.is_empty() {
        return Err("API key cannot be blank".into());
    }

    save_keychain_password(definition, trimmed)?;
    Ok(get_ai_provider_key_statuses())
}

/// Clear a provider API key from secure platform storage and return refreshed status.
pub fn clear_ai_provider_api_key(provider_id: &str) -> Result<Vec<AiProviderKeyStatus>, String> {
    let definition = provider_definition(provider_id)?;
    delete_keychain_password(definition)?;
    Ok(get_ai_provider_key_statuses())
}

/// Inject stored provider keys into a CLI command according to the selected agent.
pub fn apply_provider_keys_to_command(command: &mut Command, agent: AiAgentId) {
    for env_var in agent_provider_key_env_vars(agent) {
        if let Some(value) = keychain_password_for_env_var(env_var) {
            command.env(env_var, value);
        }
    }
}

/// Resolve provider metadata by stable provider id.
pub fn provider_definition(provider_id: &str) -> Result<&'static AiProviderKeyDefinition, String> {
    AI_PROVIDER_KEY_DEFINITIONS
        .iter()
        .find(|definition| definition.provider_id == provider_id)
        .ok_or_else(|| format!("Unknown AI provider key: {provider_id}"))
}

/// Return the key env vars an agent is allowed to receive from secure storage.
pub fn agent_provider_key_env_vars(agent: AiAgentId) -> Vec<&'static str> {
    match agent {
        AiAgentId::ClaudeCode => vec!["ANTHROPIC_API_KEY"],
        AiAgentId::Codex => vec!["OPENAI_API_KEY"],
        AiAgentId::Chitragupta => AI_PROVIDER_KEY_DEFINITIONS
            .iter()
            .map(|definition| definition.env_var)
            .collect(),
    }
}

fn provider_key_status(definition: &AiProviderKeyDefinition) -> AiProviderKeyStatus {
    status_from_sources(
        definition,
        keychain_password(definition)
            .ok()
            .flatten()
            .is_some_and(|value| !value.trim().is_empty()),
        env_var_configured(definition.env_var),
    )
}

fn status_from_sources(
    definition: &AiProviderKeyDefinition,
    keychain_configured: bool,
    env_configured: bool,
) -> AiProviderKeyStatus {
    let source = if keychain_configured {
        AiProviderKeySource::Keychain
    } else if env_configured {
        AiProviderKeySource::Environment
    } else {
        AiProviderKeySource::Missing
    };

    AiProviderKeyStatus {
        provider_id: definition.provider_id,
        label: definition.label,
        env_var: definition.env_var,
        configured: source != AiProviderKeySource::Missing,
        source,
    }
}

fn env_var_configured(env_var: &str) -> bool {
    std::env::var(env_var).is_ok_and(|value| !value.trim().is_empty())
}

fn keychain_password_for_env_var(env_var: &str) -> Option<String> {
    AI_PROVIDER_KEY_DEFINITIONS
        .iter()
        .find(|definition| definition.env_var == env_var)
        .and_then(|definition| keychain_password(definition).ok().flatten())
        .filter(|value| !value.trim().is_empty())
}

#[cfg(target_os = "macos")]
fn keychain_password(definition: &AiProviderKeyDefinition) -> Result<Option<String>, String> {
    match security_framework::passwords::get_generic_password(
        KEYCHAIN_SERVICE,
        definition.provider_id,
    ) {
        Ok(bytes) => String::from_utf8(bytes)
            .map(Some)
            .map_err(|_| format!("Stored key for {} is not UTF-8", definition.label)),
        Err(error) if error.code() == ERR_SEC_ITEM_NOT_FOUND => Ok(None),
        Err(error) => Err(format!(
            "Could not read {} key from Keychain: {}",
            definition.label, error
        )),
    }
}

#[cfg(not(target_os = "macos"))]
fn keychain_password(_definition: &AiProviderKeyDefinition) -> Result<Option<String>, String> {
    Ok(None)
}

#[cfg(target_os = "macos")]
fn save_keychain_password(
    definition: &AiProviderKeyDefinition,
    api_key: &str,
) -> Result<(), String> {
    security_framework::passwords::set_generic_password(
        KEYCHAIN_SERVICE,
        definition.provider_id,
        api_key.as_bytes(),
    )
    .map_err(|error| {
        format!(
            "Could not save {} key to Keychain: {error}",
            definition.label
        )
    })
}

#[cfg(not(target_os = "macos"))]
fn save_keychain_password(
    definition: &AiProviderKeyDefinition,
    _api_key: &str,
) -> Result<(), String> {
    Err(format!(
        "{} keys can only be saved to Keychain on macOS.",
        definition.label
    ))
}

#[cfg(target_os = "macos")]
fn delete_keychain_password(definition: &AiProviderKeyDefinition) -> Result<(), String> {
    match security_framework::passwords::delete_generic_password(
        KEYCHAIN_SERVICE,
        definition.provider_id,
    ) {
        Ok(()) => Ok(()),
        Err(error) if error.code() == ERR_SEC_ITEM_NOT_FOUND => Ok(()),
        Err(error) => Err(format!(
            "Could not clear {} key from Keychain: {}",
            definition.label, error
        )),
    }
}

#[cfg(not(target_os = "macos"))]
fn delete_keychain_password(_definition: &AiProviderKeyDefinition) -> Result<(), String> {
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn maps_agent_ids_to_expected_provider_env_vars() {
        assert_eq!(
            agent_provider_key_env_vars(AiAgentId::ClaudeCode),
            vec!["ANTHROPIC_API_KEY"]
        );
        assert_eq!(
            agent_provider_key_env_vars(AiAgentId::Codex),
            vec!["OPENAI_API_KEY"]
        );

        let chitragupta_env_vars = agent_provider_key_env_vars(AiAgentId::Chitragupta);
        assert!(chitragupta_env_vars.contains(&"OPENROUTER_API_KEY"));
        assert!(chitragupta_env_vars.contains(&"DEEPSEEK_API_KEY"));
        assert!(chitragupta_env_vars.contains(&"GEMINI_API_KEY"));
    }

    #[test]
    fn reports_keychain_before_environment_before_missing() {
        let definition = AiProviderKeyDefinition {
            provider_id: "unit",
            label: "Unit",
            env_var: "UNIT_API_KEY",
        };

        assert_eq!(
            status_from_sources(&definition, true, true).source,
            AiProviderKeySource::Keychain
        );
        assert_eq!(
            status_from_sources(&definition, false, true).source,
            AiProviderKeySource::Environment
        );
        assert_eq!(
            status_from_sources(&definition, false, false).source,
            AiProviderKeySource::Missing
        );
    }

    #[test]
    fn rejects_unknown_provider_ids() {
        assert!(provider_definition("missing-provider").is_err());
    }
}
