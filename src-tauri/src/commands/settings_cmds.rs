use crate::settings::Settings;
use crate::vault_list::{self, VaultList};

use super::parse_build_label;

/// Return the compact build label displayed in the settings UI.
#[tauri::command]
pub fn get_build_number(app_handle: tauri::AppHandle) -> String {
    let version = app_handle.package_info().version.to_string();
    parse_build_label(&version)
}

/// Load persisted application settings.
#[tauri::command]
pub fn get_settings() -> Result<Settings, String> {
    crate::settings::get_settings()
}

/// Persist application settings and refresh any platform-owned shell affordances.
#[tauri::command]
pub fn save_settings(app_handle: tauri::AppHandle, settings: Settings) -> Result<(), String> {
    let menu_bar_enabled = settings.menu_bar_icon_enabled == Some(true);
    crate::settings::save_settings(settings)?;
    apply_menu_bar_icon_setting_after_save(&app_handle, menu_bar_enabled);
    Ok(())
}

#[cfg(all(desktop, target_os = "macos"))]
fn apply_menu_bar_icon_setting_after_save(app_handle: &tauri::AppHandle, menu_bar_enabled: bool) {
    if let Err(error) = crate::menu_bar::apply_menu_bar_icon_setting(app_handle, menu_bar_enabled) {
        log::warn!("Failed to apply menu bar icon setting after settings save: {error}");
    }
}

#[cfg(not(all(desktop, target_os = "macos")))]
fn apply_menu_bar_icon_setting_after_save(_app_handle: &tauri::AppHandle, _menu_bar_enabled: bool) {
}

/// Reinitialize telemetry after settings that affect diagnostics change.
#[tauri::command]
pub fn reinit_telemetry() {
    crate::telemetry::reinit_sentry();
}

/// Load the local vault switcher list.
#[tauri::command]
pub fn load_vault_list() -> Result<VaultList, String> {
    vault_list::load_vault_list()
}

/// Persist the local vault switcher list.
#[tauri::command]
pub fn save_vault_list(list: VaultList) -> Result<(), String> {
    vault_list::save_vault_list(&list)
}
