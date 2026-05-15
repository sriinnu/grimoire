use serde::{Deserialize, Serialize};
use std::collections::BTreeMap;
use std::fs;
use std::path::PathBuf;

const APP_CONFIG_DIR: &str = "com.grimoire.app";
const LEGACY_APP_CONFIG_DIR: &str = "com.tolaria.app";
const LAPUTA_LEGACY_APP_CONFIG_DIR: &str = "com.laputa.app";
const THEME_PRESETS: &[&str] = &[
    "classic",
    "manuscript",
    "graphite",
    "studio",
    "folio",
    "nocturne",
    "aether",
    "ion",
    "moss",
    "lumen",
    "lotus",
    "ember",
];
const EDITOR_FONTS: &[&str] = &[
    "system",
    "serif",
    "mono",
    "readable",
    "literary",
    "compact",
    "handwritten",
];

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, Default)]
pub struct Settings {
    pub auto_pull_interval_minutes: Option<u32>,
    pub autogit_enabled: Option<bool>,
    pub autogit_idle_threshold_seconds: Option<u32>,
    pub autogit_inactive_threshold_seconds: Option<u32>,
    pub auto_advance_inbox_after_organize: Option<bool>,
    pub telemetry_consent: Option<bool>,
    pub crash_reporting_enabled: Option<bool>,
    pub analytics_enabled: Option<bool>,
    pub anonymous_id: Option<String>,
    pub release_channel: Option<String>,
    pub theme_mode: Option<String>,
    pub theme_preset: Option<String>,
    pub editor_font: Option<String>,
    pub ui_language: Option<String>,
    pub initial_h1_auto_rename_enabled: Option<bool>,
    pub default_ai_agent: Option<String>,
    pub ai_agent_models: Option<BTreeMap<String, String>>,
    pub ai_agent_providers: Option<BTreeMap<String, String>>,
}

fn normalize_optional_string(value: Option<String>) -> Option<String> {
    value
        .map(|candidate| candidate.trim().to_string())
        .filter(|candidate| !candidate.is_empty())
}

fn normalize_optional_positive_u32(value: Option<u32>) -> Option<u32> {
    value.filter(|candidate| *candidate > 0)
}

pub fn normalize_release_channel(value: Option<&str>) -> Option<String> {
    match value.map(|candidate| candidate.trim().to_ascii_lowercase()) {
        Some(channel) if channel == "alpha" => Some(channel),
        _ => None,
    }
}

pub fn effective_release_channel(value: Option<&str>) -> &'static str {
    if normalize_release_channel(value).is_some() {
        "alpha"
    } else {
        "stable"
    }
}

pub fn normalize_default_ai_agent(value: Option<&str>) -> Option<String> {
    match value.map(|candidate| candidate.trim().to_ascii_lowercase()) {
        Some(agent) if matches!(agent.as_str(), "claude_code" | "codex" | "chitragupta") => {
            Some(agent)
        }
        _ => None,
    }
}

fn normalize_ai_agent_string_map(
    value: Option<BTreeMap<String, String>>,
) -> Option<BTreeMap<String, String>> {
    let mut normalized_values = BTreeMap::new();
    for (agent, raw_value) in value? {
        let Some(agent) = normalize_default_ai_agent(Some(&agent)) else {
            continue;
        };
        let Some(value) = normalize_optional_string(Some(raw_value)) else {
            continue;
        };
        if !value.chars().any(char::is_whitespace) {
            normalized_values.insert(agent, value);
        }
    }
    (!normalized_values.is_empty()).then_some(normalized_values)
}

pub fn normalize_ai_agent_models(
    value: Option<BTreeMap<String, String>>,
) -> Option<BTreeMap<String, String>> {
    normalize_ai_agent_string_map(value)
}

pub fn normalize_ai_agent_providers(
    value: Option<BTreeMap<String, String>>,
) -> Option<BTreeMap<String, String>> {
    normalize_ai_agent_string_map(value)
}

pub fn normalize_theme_mode(value: Option<&str>) -> Option<String> {
    match value.map(|candidate| candidate.trim().to_ascii_lowercase()) {
        Some(mode) if mode == "light" || mode == "dark" => Some(mode),
        _ => None,
    }
}

pub fn normalize_theme_preset(value: Option<&str>) -> Option<String> {
    let preset = value.map(|candidate| candidate.trim().to_ascii_lowercase())?;
    THEME_PRESETS.contains(&preset.as_str()).then_some(preset)
}

pub fn normalize_editor_font(value: Option<&str>) -> Option<String> {
    let font = value.map(|candidate| candidate.trim().to_ascii_lowercase())?;
    EDITOR_FONTS.contains(&font.as_str()).then_some(font)
}

fn canonical_language_code(value: &str) -> Option<String> {
    let code = value.trim().replace('_', "-").to_ascii_lowercase();
    if code.is_empty() {
        None
    } else {
        Some(code)
    }
}

fn is_english_language(code: &str) -> bool {
    code == "en" || code.starts_with("en-")
}

fn is_simplified_chinese_language(code: &str) -> bool {
    matches!(code, "zh" | "zh-cn" | "zh-hans" | "zh-sg")
}

pub fn normalize_ui_language(value: Option<&str>) -> Option<String> {
    let language = canonical_language_code(value?)?;
    if is_english_language(&language) {
        return Some("en".to_string());
    }
    if is_simplified_chinese_language(&language) {
        return Some("zh-Hans".to_string());
    }
    None
}

fn normalize_settings(settings: Settings) -> Settings {
    Settings {
        auto_pull_interval_minutes: settings.auto_pull_interval_minutes,
        autogit_enabled: settings.autogit_enabled,
        autogit_idle_threshold_seconds: normalize_optional_positive_u32(
            settings.autogit_idle_threshold_seconds,
        ),
        autogit_inactive_threshold_seconds: normalize_optional_positive_u32(
            settings.autogit_inactive_threshold_seconds,
        ),
        auto_advance_inbox_after_organize: settings.auto_advance_inbox_after_organize,
        telemetry_consent: settings.telemetry_consent,
        crash_reporting_enabled: settings.crash_reporting_enabled,
        analytics_enabled: settings.analytics_enabled,
        anonymous_id: normalize_optional_string(settings.anonymous_id),
        release_channel: normalize_release_channel(settings.release_channel.as_deref()),
        theme_mode: normalize_theme_mode(settings.theme_mode.as_deref()),
        theme_preset: normalize_theme_preset(settings.theme_preset.as_deref()),
        editor_font: normalize_editor_font(settings.editor_font.as_deref()),
        ui_language: normalize_ui_language(settings.ui_language.as_deref()),
        initial_h1_auto_rename_enabled: settings.initial_h1_auto_rename_enabled,
        default_ai_agent: normalize_default_ai_agent(settings.default_ai_agent.as_deref()),
        ai_agent_models: normalize_ai_agent_models(settings.ai_agent_models),
        ai_agent_providers: normalize_ai_agent_providers(settings.ai_agent_providers),
    }
}

fn app_config_dir() -> Result<PathBuf, String> {
    dirs::config_dir().ok_or_else(|| "Could not determine config directory".to_string())
}

fn preferred_app_config_path(file_name: &str) -> Result<PathBuf, String> {
    Ok(app_config_dir()?.join(APP_CONFIG_DIR).join(file_name))
}

fn resolve_existing_or_preferred_app_config_path(file_name: &str) -> Result<PathBuf, String> {
    let preferred = preferred_app_config_path(file_name)?;
    if preferred.exists() {
        return Ok(preferred);
    }

    let legacy = app_config_dir()?
        .join(LEGACY_APP_CONFIG_DIR)
        .join(file_name);
    if legacy.exists() {
        return Ok(legacy);
    }

    let laputa_legacy = app_config_dir()?
        .join(LAPUTA_LEGACY_APP_CONFIG_DIR)
        .join(file_name);
    if laputa_legacy.exists() {
        return Ok(laputa_legacy);
    }

    Ok(preferred)
}

fn settings_path() -> Result<PathBuf, String> {
    resolve_existing_or_preferred_app_config_path("settings.json")
}

fn get_settings_at(path: &PathBuf) -> Result<Settings, String> {
    if !path.exists() {
        return Ok(Settings::default());
    }
    let content =
        fs::read_to_string(path).map_err(|e| format!("Failed to read settings: {}", e))?;
    let settings =
        serde_json::from_str(&content).map_err(|e| format!("Failed to parse settings: {}", e))?;
    Ok(normalize_settings(settings))
}

fn save_settings_at(path: &PathBuf, settings: Settings) -> Result<(), String> {
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent)
            .map_err(|e| format!("Failed to create config directory: {}", e))?;
    }

    let cleaned = normalize_settings(settings);

    let json = serde_json::to_string_pretty(&cleaned)
        .map_err(|e| format!("Failed to serialize settings: {}", e))?;
    fs::write(path, json).map_err(|e| format!("Failed to write settings: {}", e))
}

pub fn get_settings() -> Result<Settings, String> {
    get_settings_at(&settings_path()?)
}

pub fn save_settings(settings: Settings) -> Result<(), String> {
    save_settings_at(&preferred_app_config_path("settings.json")?, settings)
}

fn last_vault_file() -> Result<PathBuf, String> {
    resolve_existing_or_preferred_app_config_path("last-vault.txt")
}

fn get_last_vault_at(path: &PathBuf) -> Option<String> {
    fs::read_to_string(path)
        .ok()
        .map(|s| s.trim().to_string())
        .filter(|s| !s.is_empty())
}

fn set_last_vault_at(path: &PathBuf, vault_path: &str) -> Result<(), String> {
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent)
            .map_err(|e| format!("Failed to create config directory: {}", e))?;
    }
    fs::write(path, vault_path.trim())
        .map_err(|e| format!("Failed to write last vault path: {}", e))
}

pub fn get_last_vault() -> Option<String> {
    last_vault_file().ok().and_then(|p| get_last_vault_at(&p))
}

pub fn set_last_vault(vault_path: &str) -> Result<(), String> {
    set_last_vault_at(&preferred_app_config_path("last-vault.txt")?, vault_path)
}

#[cfg(test)]
mod tests;
