use super::super::*;
use super::save_and_reload;

#[test]
fn test_invalid_theme_mode_is_filtered() {
    let loaded = save_and_reload(Settings {
        theme_mode: Some("system".to_string()),
        ..Default::default()
    });
    assert!(loaded.theme_mode.is_none());
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
fn test_prabhat_studio_theme_preset_is_supported() {
    assert_eq!(
        normalize_theme_preset(Some(" prabhat-studio ")).as_deref(),
        Some("prabhat-studio")
    );
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
    assert_eq!(normalize_ui_language(Some("de-AT")).as_deref(), Some("de"));
    assert_eq!(normalize_ui_language(Some("hi-IN")).as_deref(), Some("hi"));
    assert_eq!(
        normalize_ui_language(Some("sa_Deva")).as_deref(),
        Some("sa")
    );
}
