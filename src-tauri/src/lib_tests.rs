use super::linux_appimage_startup_env_overrides_with;
use super::native_startup_smoke;
use super::should_show_window_on_reopen;
use super::StartupEnvOverride;
use super::MACOS_WEBVIEW_RESERVED_COMMAND_SHIFT_KEYS;

#[cfg(desktop)]
use super::store_ws_bridge_spawn_result;
#[cfg(all(desktop, unix))]
use super::vault_asset_scope_roots;
#[cfg(desktop)]
use std::sync::Mutex;

#[test]
fn macos_webview_shortcut_prevention_includes_ai_panel_shortcut() {
    assert_eq!(MACOS_WEBVIEW_RESERVED_COMMAND_SHIFT_KEYS, ["L"]);
}

#[test]
fn macos_reopen_always_restores_the_singleton_window() {
    assert!(should_show_window_on_reopen(false));
    assert!(should_show_window_on_reopen(true));
}

#[cfg(desktop)]
#[test]
fn ws_bridge_spawn_failure_keeps_startup_optional() {
    let slot = Mutex::new(None);

    let started = store_ws_bridge_spawn_result(&slot, Err("missing optional bridge".to_string()));

    assert!(!started);
    assert!(slot.lock().unwrap().is_none());
}

#[test]
fn native_startup_smoke_accepts_explicit_truthy_values() {
    for value in ["1", "true", "yes", " TRUE "] {
        assert!(native_startup_smoke::enabled_with(|_| Some(
            value.to_string()
        )));
    }
}

#[test]
fn native_startup_smoke_accepts_explicit_app_argument() {
    assert!(native_startup_smoke::arg_enabled_with([
        "grimoire",
        "--grimoire-native-startup-smoke",
    ]));
}

#[test]
fn native_startup_smoke_ignores_absent_or_ambiguous_values() {
    assert!(!native_startup_smoke::enabled_with(|_| None));
    for value in ["", "0", "false", "smoke"] {
        assert!(!native_startup_smoke::enabled_with(|_| Some(
            value.to_string()
        )));
    }
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
