use super::*;

fn assert_empty_settings(settings: &Settings) {
    assert_eq!(settings, &Settings::default());
}

/// Helper: save settings to a temp file and reload them.
fn save_and_reload(settings: Settings) -> Settings {
    let dir = tempfile::TempDir::new().unwrap();
    let path = dir.path().join("settings.json");
    save_settings_at(&path, settings).unwrap();
    get_settings_at(&path).unwrap()
}

fn create_last_vault_path(path_parts: &[&str]) -> (tempfile::TempDir, PathBuf) {
    let dir = tempfile::TempDir::new().unwrap();
    let path = path_parts
        .iter()
        .fold(dir.path().to_path_buf(), |acc, part| acc.join(part));
    (dir, path)
}

fn write_and_assert_last_vault(path: &PathBuf, value: &str) {
    set_last_vault_at(path, value).unwrap();
    assert_eq!(get_last_vault_at(path).as_deref(), Some(value));
}

#[test]
fn test_default_settings_all_none() {
    assert_empty_settings(&Settings::default());
}

#[test]
fn test_settings_json_roundtrip() {
    let settings = Settings {
        auto_pull_interval_minutes: Some(10),
        autogit_enabled: Some(true),
        autogit_idle_threshold_seconds: Some(90),
        autogit_inactive_threshold_seconds: Some(30),
        auto_advance_inbox_after_organize: Some(true),
        telemetry_consent: Some(true),
        crash_reporting_enabled: Some(true),
        analytics_enabled: Some(false),
        anonymous_id: Some("abc-123-uuid".to_string()),
        release_channel: Some("alpha".to_string()),
        theme_mode: Some("dark".to_string()),
        theme_preset: Some("manuscript".to_string()),
        editor_font: Some("serif".to_string()),
        ui_language: Some("zh-Hans".to_string()),
        menu_bar_icon_enabled: Some(true),
        initial_h1_auto_rename_enabled: Some(false),
        default_ai_agent: Some("codex".to_string()),
        ai_agent_models: Some(BTreeMap::from([(
            "codex".to_string(),
            "gpt-5.2".to_string(),
        )])),
        ai_agent_providers: Some(BTreeMap::from([(
            "chitragupta".to_string(),
            "openai".to_string(),
        )])),
    };
    let json = serde_json::to_string(&settings).unwrap();
    let parsed: Settings = serde_json::from_str(&json).unwrap();
    assert_eq!(parsed, settings);
}

#[test]
fn test_get_settings_returns_default_for_missing_file() {
    let dir = tempfile::TempDir::new().unwrap();
    let path = dir.path().join("nonexistent.json");
    let result = get_settings_at(&path).unwrap();
    assert!(result.auto_pull_interval_minutes.is_none());
}

#[test]
fn test_save_and_load_preserves_values() {
    let loaded = save_and_reload(Settings {
        auto_pull_interval_minutes: Some(10),
        autogit_enabled: Some(true),
        autogit_idle_threshold_seconds: Some(90),
        autogit_inactive_threshold_seconds: Some(30),
        auto_advance_inbox_after_organize: Some(true),
        release_channel: Some("alpha".to_string()),
        theme_mode: Some("dark".to_string()),
        theme_preset: Some("manuscript".to_string()),
        editor_font: Some("serif".to_string()),
        ui_language: Some("zh-Hans".to_string()),
        menu_bar_icon_enabled: Some(true),
        initial_h1_auto_rename_enabled: Some(false),
        default_ai_agent: Some("codex".to_string()),
        ..Default::default()
    });
    assert_eq!(loaded.auto_pull_interval_minutes, Some(10));
    assert_eq!(loaded.autogit_enabled, Some(true));
    assert_eq!(loaded.autogit_idle_threshold_seconds, Some(90));
    assert_eq!(loaded.autogit_inactive_threshold_seconds, Some(30));
    assert_eq!(loaded.auto_advance_inbox_after_organize, Some(true));
    assert_eq!(loaded.release_channel.as_deref(), Some("alpha"));
    assert_eq!(loaded.theme_mode.as_deref(), Some("dark"));
    assert_eq!(loaded.theme_preset.as_deref(), Some("manuscript"));
    assert_eq!(loaded.editor_font.as_deref(), Some("serif"));
    assert_eq!(loaded.ui_language.as_deref(), Some("zh-Hans"));
    assert_eq!(loaded.menu_bar_icon_enabled, Some(true));
    assert_eq!(loaded.initial_h1_auto_rename_enabled, Some(false));
    assert_eq!(loaded.default_ai_agent.as_deref(), Some("codex"));
}

#[test]
fn test_save_preserves_ai_agent_models() {
    let loaded = save_and_reload(Settings {
        ai_agent_models: Some(BTreeMap::from([
            ("claude_code".to_string(), "sonnet".to_string()),
            ("codex".to_string(), "gpt-5.2".to_string()),
            ("chitragupta".to_string(), "deepseek-chat".to_string()),
        ])),
        ..Default::default()
    });

    let models = loaded.ai_agent_models.unwrap();
    assert_eq!(
        models.get("claude_code").map(String::as_str),
        Some("sonnet")
    );
    assert_eq!(models.get("codex").map(String::as_str), Some("gpt-5.2"));
    assert_eq!(
        models.get("chitragupta").map(String::as_str),
        Some("deepseek-chat")
    );
}

#[test]
fn test_save_preserves_ai_agent_providers() {
    let loaded = save_and_reload(Settings {
        ai_agent_providers: Some(BTreeMap::from([
            ("claude_code".to_string(), "anthropic".to_string()),
            ("codex".to_string(), "openai".to_string()),
            ("chitragupta".to_string(), "deepseek".to_string()),
        ])),
        ..Default::default()
    });

    let providers = loaded.ai_agent_providers.unwrap();
    assert_eq!(
        providers.get("claude_code").map(String::as_str),
        Some("anthropic")
    );
    assert_eq!(providers.get("codex").map(String::as_str), Some("openai"));
    assert_eq!(
        providers.get("chitragupta").map(String::as_str),
        Some("deepseek")
    );
}

#[test]
fn test_save_trims_whitespace() {
    let loaded = save_and_reload(Settings {
        anonymous_id: Some("  test-uuid  ".to_string()),
        release_channel: Some("  alpha  ".to_string()),
        theme_mode: Some("  dark  ".to_string()),
        theme_preset: Some("  nocturne  ".to_string()),
        editor_font: Some("  literary  ".to_string()),
        ui_language: Some("  zh-cn  ".to_string()),
        default_ai_agent: Some("  codex  ".to_string()),
        ..Default::default()
    });
    assert_eq!(loaded.anonymous_id.as_deref(), Some("test-uuid"));
    assert_eq!(loaded.release_channel.as_deref(), Some("alpha"));
    assert_eq!(loaded.theme_mode.as_deref(), Some("dark"));
    assert_eq!(loaded.theme_preset.as_deref(), Some("nocturne"));
    assert_eq!(loaded.editor_font.as_deref(), Some("literary"));
    assert_eq!(loaded.ui_language.as_deref(), Some("zh-Hans"));
    assert_eq!(loaded.default_ai_agent.as_deref(), Some("codex"));
}

#[test]
fn test_save_filters_empty_and_whitespace_only() {
    let loaded = save_and_reload(Settings {
        release_channel: Some("".to_string()),
        ..Default::default()
    });
    assert!(loaded.release_channel.is_none());
}

#[test]
fn test_non_positive_autogit_thresholds_are_filtered() {
    let loaded = save_and_reload(Settings {
        autogit_idle_threshold_seconds: Some(0),
        autogit_inactive_threshold_seconds: Some(0),
        ..Default::default()
    });
    assert!(loaded.autogit_idle_threshold_seconds.is_none());
    assert!(loaded.autogit_inactive_threshold_seconds.is_none());
}

#[test]
fn test_non_alpha_release_channels_normalize_to_stable() {
    let loaded = save_and_reload(Settings {
        release_channel: Some("beta".to_string()),
        ..Default::default()
    });
    assert!(loaded.release_channel.is_none());
}

#[test]
fn test_invalid_default_ai_agent_is_filtered() {
    let loaded = save_and_reload(Settings {
        default_ai_agent: Some("cursor".to_string()),
        ..Default::default()
    });
    assert!(loaded.default_ai_agent.is_none());
}

#[test]
fn test_chitragupta_default_ai_agent_is_supported() {
    let loaded = save_and_reload(Settings {
        default_ai_agent: Some(" chitragupta ".to_string()),
        ..Default::default()
    });
    assert_eq!(loaded.default_ai_agent.as_deref(), Some("chitragupta"));
}

#[test]
fn test_invalid_ai_agent_models_are_filtered() {
    let loaded = save_and_reload(Settings {
        ai_agent_models: Some(BTreeMap::from([
            ("cursor".to_string(), "gpt-5.2".to_string()),
            ("codex".to_string(), "bad model".to_string()),
            ("claude_code".to_string(), "  opus  ".to_string()),
        ])),
        ..Default::default()
    });

    let models = loaded.ai_agent_models.unwrap();
    assert_eq!(models.len(), 1);
    assert_eq!(models.get("claude_code").map(String::as_str), Some("opus"));
}

#[test]
fn test_invalid_ai_agent_providers_are_filtered() {
    let loaded = save_and_reload(Settings {
        ai_agent_providers: Some(BTreeMap::from([
            ("cursor".to_string(), "openai".to_string()),
            ("chitragupta".to_string(), "bad provider".to_string()),
            ("claude_code".to_string(), "  anthropic  ".to_string()),
        ])),
        ..Default::default()
    });

    let providers = loaded.ai_agent_providers.unwrap();
    assert_eq!(providers.len(), 1);
    assert_eq!(
        providers.get("claude_code").map(String::as_str),
        Some("anthropic")
    );
}

#[test]
fn test_invalid_theme_mode_is_filtered() {
    let loaded = save_and_reload(Settings {
        theme_mode: Some("system".to_string()),
        ..Default::default()
    });
    assert!(loaded.theme_mode.is_none());
}

#[test]
fn test_expanded_theme_presets_are_supported() {
    for preset in ["aether", "ion", "moss", "lumen", "lotus", "ember"] {
        assert_eq!(
            normalize_theme_preset(Some(preset)).as_deref(),
            Some(preset)
        );
    }
}

#[test]
fn test_retired_theme_presets_are_filtered() {
    for preset in ["retro", "aurora", "future"] {
        assert!(normalize_theme_preset(Some(preset)).is_none());
    }
}

#[test]
fn test_handwritten_editor_font_is_supported() {
    assert_eq!(
        normalize_editor_font(Some("handwritten")).as_deref(),
        Some("handwritten")
    );
}

#[test]
fn test_invalid_appearance_settings_are_filtered() {
    let loaded = save_and_reload(Settings {
        theme_preset: Some("neon".to_string()),
        editor_font: Some("papyrus".to_string()),
        ..Default::default()
    });
    assert!(loaded.theme_preset.is_none());
    assert!(loaded.editor_font.is_none());
}

#[test]
fn test_invalid_ui_language_is_filtered() {
    let loaded = save_and_reload(Settings {
        ui_language: Some("fr-FR".to_string()),
        ..Default::default()
    });
    assert!(loaded.ui_language.is_none());
}

#[test]
fn test_ui_language_aliases_are_canonicalized() {
    assert_eq!(normalize_ui_language(Some("en-US")).as_deref(), Some("en"));
    assert_eq!(
        normalize_ui_language(Some("zh_CN")).as_deref(),
        Some("zh-Hans")
    );
}

#[test]
fn test_get_settings_normalizes_legacy_beta_channel() {
    let dir = tempfile::TempDir::new().unwrap();
    let path = dir.path().join("settings.json");
    fs::write(&path, r#"{"release_channel":"beta"}"#).unwrap();

    let loaded = get_settings_at(&path).unwrap();
    assert!(loaded.release_channel.is_none());
}

#[test]
fn test_save_creates_parent_directories() {
    let dir = tempfile::TempDir::new().unwrap();
    let path = dir.path().join("nested").join("dir").join("settings.json");

    save_settings_at(
        &path,
        Settings {
            anonymous_id: Some("test-uuid".to_string()),
            ..Default::default()
        },
    )
    .unwrap();
    assert!(path.exists());
    assert_eq!(
        get_settings_at(&path).unwrap().anonymous_id.as_deref(),
        Some("test-uuid")
    );
}

#[test]
fn test_get_settings_malformed_json() {
    let dir = tempfile::TempDir::new().unwrap();
    let path = dir.path().join("bad.json");
    fs::write(&path, "not valid json{{{").unwrap();

    let err = get_settings_at(&path).unwrap_err();
    assert!(err.contains("Failed to parse settings"));
}

#[test]
fn test_telemetry_fields_roundtrip() {
    let loaded = save_and_reload(Settings {
        telemetry_consent: Some(true),
        crash_reporting_enabled: Some(true),
        analytics_enabled: Some(false),
        anonymous_id: Some("test-uuid-v4".to_string()),
        ..Default::default()
    });
    assert_eq!(
        loaded,
        Settings {
            telemetry_consent: Some(true),
            crash_reporting_enabled: Some(true),
            analytics_enabled: Some(false),
            anonymous_id: Some("test-uuid-v4".to_string()),
            ..Default::default()
        }
    );
}

#[test]
fn test_old_settings_json_missing_telemetry_fields() {
    let dir = tempfile::TempDir::new().unwrap();
    let path = dir.path().join("settings.json");
    // Simulate an old settings.json that still contains removed GitHub auth fields.
    fs::write(
        &path,
        r#"{"github_token":"gho_test","github_username":"sriinnu"}"#,
    )
    .unwrap();
    let loaded = get_settings_at(&path).unwrap();
    assert_empty_settings(&loaded);
}

#[test]
fn test_settings_path_returns_ok() {
    let result = settings_path();
    assert!(result.is_ok());
    let path = result.unwrap();
    let path = path.to_str().unwrap();
    assert!(
        path.contains("com.grimoire.app")
            || path.contains("com.tolaria.app")
            || path.contains("com.laputa.app")
    );
}

#[test]
fn test_preferred_settings_path_uses_grimoire_namespace() {
    let result = preferred_app_config_path("settings.json");
    assert!(result.is_ok());
    assert!(result
        .unwrap()
        .to_str()
        .unwrap()
        .contains("com.grimoire.app"));
}

#[test]
fn test_get_last_vault_returns_none_for_missing_file() {
    let dir = tempfile::TempDir::new().unwrap();
    let path = dir.path().join("last-vault.txt");
    assert!(get_last_vault_at(&path).is_none());
}

#[test]
fn test_set_and_get_last_vault_roundtrip() {
    let (_dir, path) = create_last_vault_path(&["last-vault.txt"]);
    write_and_assert_last_vault(&path, "/Users/test/MyVault");
}

#[test]
fn test_set_last_vault_trims_whitespace() {
    let (_dir, path) = create_last_vault_path(&["last-vault.txt"]);
    write_and_assert_last_vault(&path, "/Users/test/Vault");
}

#[test]
fn test_get_last_vault_returns_none_for_empty_file() {
    let dir = tempfile::TempDir::new().unwrap();
    let path = dir.path().join("last-vault.txt");
    fs::write(&path, "   \n  ").unwrap();
    assert!(get_last_vault_at(&path).is_none());
}

#[test]
fn test_set_last_vault_creates_parent_directories() {
    let (_dir, path) = create_last_vault_path(&["nested", "dir", "last-vault.txt"]);
    write_and_assert_last_vault(&path, "/Users/test/Vault");
    assert!(path.exists());
}

#[test]
fn test_set_last_vault_overwrites_previous() {
    let (_dir, path) = create_last_vault_path(&["last-vault.txt"]);
    write_and_assert_last_vault(&path, "/Users/test/OldVault");
    write_and_assert_last_vault(&path, "/Users/test/NewVault");
}
