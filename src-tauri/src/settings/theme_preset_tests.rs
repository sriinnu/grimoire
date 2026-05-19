use super::normalize_theme_preset;

#[test]
fn test_flagship_theme_presets_are_supported() {
    for preset in [
        "constellation",
        "living-archive",
        "research-cockpit",
        "manuscript",
        "nocturne",
        "retro-terminal",
    ] {
        assert_eq!(
            normalize_theme_preset(Some(preset)).as_deref(),
            Some(preset)
        );
    }
}

#[test]
fn test_retired_theme_presets_are_filtered() {
    for preset in [
        "classic", "graphite", "studio", "folio", "aether", "ion", "moss", "lumen", "lotus",
        "ember", "retro", "aurora", "future",
    ] {
        assert!(normalize_theme_preset(Some(preset)).is_none());
    }
}
