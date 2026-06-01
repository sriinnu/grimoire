use super::linux_appimage_startup_env_overrides_with;
use super::should_show_window_on_reopen;
use super::StartupEnvOverride;
use super::MACOS_WEBVIEW_RESERVED_COMMAND_SHIFT_KEYS;

#[cfg(all(desktop, unix))]
use super::vault_asset_scope_roots;

#[test]
fn macos_webview_shortcut_prevention_includes_ai_panel_shortcut() {
    assert_eq!(MACOS_WEBVIEW_RESERVED_COMMAND_SHIFT_KEYS, ["L"]);
}

#[test]
fn macos_reopen_always_restores_the_singleton_window() {
    assert!(should_show_window_on_reopen(false));
    assert!(should_show_window_on_reopen(true));
}

#[test]
fn linux_appimage_startup_env_overrides_are_empty_outside_appimage_launches() {
    let overrides = linux_appimage_startup_env_overrides_with(|_| None);

    assert!(overrides.is_empty());
}

#[test]
fn linux_appimage_startup_env_overrides_disable_dmabuf_for_appimages() {
    let overrides = linux_appimage_startup_env_overrides_with(|key| match key {
        "APPIMAGE" => Some("/tmp/Grimoire.AppImage".to_string()),
        _ => None,
    });

    assert_eq!(
        overrides,
        vec![StartupEnvOverride {
            key: "WEBKIT_DISABLE_DMABUF_RENDERER",
            value: "1",
        }]
    );
}

#[test]
fn linux_appimage_startup_env_overrides_preserve_explicit_user_setting() {
    let overrides = linux_appimage_startup_env_overrides_with(|key| match key {
        "APPDIR" => Some("/tmp/.mount_Grimoire".to_string()),
        "WEBKIT_DISABLE_DMABUF_RENDERER" => Some("0".to_string()),
        _ => None,
    });

    assert!(overrides.is_empty());
}

#[cfg(all(desktop, unix))]
#[test]
fn vault_asset_scope_roots_include_requested_symlink_path() {
    let dir = tempfile::tempdir().unwrap();
    let canonical_vault = dir.path().join("Getting Started");
    let symlinked_vault = dir.path().join("Symlinked Getting Started");
    std::fs::create_dir(&canonical_vault).unwrap();
    std::os::unix::fs::symlink(&canonical_vault, &symlinked_vault).unwrap();

    let roots = vault_asset_scope_roots(&symlinked_vault).unwrap();

    assert_eq!(roots[0], canonical_vault.canonicalize().unwrap());
    assert!(roots.contains(&symlinked_vault));
}
