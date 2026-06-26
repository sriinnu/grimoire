use tauri::{
    menu::{Menu, MenuBuilder, MenuItemBuilder},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    App, AppHandle,
};

const TRAY_ID: &str = "grimoire-menu-bar";
const TRAY_OPEN_GRIMOIRE: &str = "tray-open-grimoire";
const TRAY_QUIT: &str = "tray-quit";

const APP_SETTINGS: &str = "app-settings";
const FILE_NEW_NOTE: &str = "file-new-note";
const FILE_CAPTURE_THOUGHT: &str = "file-capture-thought";
const FILE_CAPTURE_JOURNAL: &str = "file-capture-journal";
const FILE_CAPTURE_DREAM: &str = "file-capture-dream";
const FILE_QUICK_OPEN: &str = "file-quick-open";
const VAULT_RELOAD: &str = "vault-reload";
const VIEW_COMMAND_PALETTE: &str = "view-command-palette";
const VIEW_TOGGLE_AI_CHAT: &str = "view-toggle-ai-chat";
#[cfg(test)]
const GRIMOIRE_MENU_BAR_ICON_PNG: &[u8] = include_bytes!("../icons/32x32.png");

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
enum TrayMenuAction {
    ShowWindow,
    EmitMenuCommand(&'static str),
    Quit,
}

fn io_error(message: String) -> std::io::Error {
    std::io::Error::other(message)
}

fn is_left_click_release(event: &TrayIconEvent) -> bool {
    matches!(
        event,
        TrayIconEvent::Click {
            button: MouseButton::Left,
            button_state: MouseButtonState::Up,
            ..
        }
    )
}

fn tray_menu_action(id: &str) -> Option<TrayMenuAction> {
    match id {
        TRAY_OPEN_GRIMOIRE => Some(TrayMenuAction::ShowWindow),
        FILE_NEW_NOTE => Some(TrayMenuAction::EmitMenuCommand(FILE_NEW_NOTE)),
        FILE_CAPTURE_THOUGHT => Some(TrayMenuAction::EmitMenuCommand(FILE_CAPTURE_THOUGHT)),
        FILE_CAPTURE_JOURNAL => Some(TrayMenuAction::EmitMenuCommand(FILE_CAPTURE_JOURNAL)),
        FILE_CAPTURE_DREAM => Some(TrayMenuAction::EmitMenuCommand(FILE_CAPTURE_DREAM)),
        FILE_QUICK_OPEN => Some(TrayMenuAction::EmitMenuCommand(FILE_QUICK_OPEN)),
        VIEW_TOGGLE_AI_CHAT => Some(TrayMenuAction::EmitMenuCommand(VIEW_TOGGLE_AI_CHAT)),
        VIEW_COMMAND_PALETTE => Some(TrayMenuAction::EmitMenuCommand(VIEW_COMMAND_PALETTE)),
        APP_SETTINGS => Some(TrayMenuAction::EmitMenuCommand(APP_SETTINGS)),
        VAULT_RELOAD => Some(TrayMenuAction::EmitMenuCommand(VAULT_RELOAD)),
        TRAY_QUIT => Some(TrayMenuAction::Quit),
        _ => None,
    }
}

pub(crate) fn show_main_window(app_handle: &AppHandle) {
    crate::menu_bar_window::show_main_window(app_handle);
}

fn handle_tray_menu_event(app_handle: &AppHandle, id: &str) {
    match tray_menu_action(id) {
        Some(TrayMenuAction::ShowWindow) => show_main_window(app_handle),
        Some(TrayMenuAction::EmitMenuCommand(command_id)) => {
            show_main_window(app_handle);
            if let Err(error) = crate::menu::emit_custom_menu_event(app_handle, command_id) {
                log::warn!("Failed to emit tray menu command {}: {}", command_id, error);
            }
        }
        Some(TrayMenuAction::Quit) => app_handle.exit(0),
        None => log::warn!("Ignoring unknown tray menu item: {}", id),
    }
}

fn build_menu(app_handle: &AppHandle) -> Result<Menu<tauri::Wry>, String> {
    let open = MenuItemBuilder::new("Open Grimoire")
        .id(TRAY_OPEN_GRIMOIRE)
        .build(app_handle)
        .map_err(|error| error.to_string())?;
    let new_note = MenuItemBuilder::new("New Page")
        .id(FILE_NEW_NOTE)
        .build(app_handle)
        .map_err(|error| error.to_string())?;
    let capture_thought = MenuItemBuilder::new("Capture Thought")
        .id(FILE_CAPTURE_THOUGHT)
        .build(app_handle)
        .map_err(|error| error.to_string())?;
    let capture_journal = MenuItemBuilder::new("Journal Entry")
        .id(FILE_CAPTURE_JOURNAL)
        .build(app_handle)
        .map_err(|error| error.to_string())?;
    let capture_dream = MenuItemBuilder::new("Dream Entry")
        .id(FILE_CAPTURE_DREAM)
        .build(app_handle)
        .map_err(|error| error.to_string())?;
    let quick_open = MenuItemBuilder::new("Quick Open")
        .id(FILE_QUICK_OPEN)
        .build(app_handle)
        .map_err(|error| error.to_string())?;
    let ask_grimoire = MenuItemBuilder::new("Ask Grimoire")
        .id(VIEW_TOGGLE_AI_CHAT)
        .build(app_handle)
        .map_err(|error| error.to_string())?;
    let command_palette = MenuItemBuilder::new("Command Palette")
        .id(VIEW_COMMAND_PALETTE)
        .build(app_handle)
        .map_err(|error| error.to_string())?;
    let settings = MenuItemBuilder::new("Settings...")
        .id(APP_SETTINGS)
        .build(app_handle)
        .map_err(|error| error.to_string())?;
    let reload = MenuItemBuilder::new("Reload Notebook")
        .id(VAULT_RELOAD)
        .build(app_handle)
        .map_err(|error| error.to_string())?;
    let quit = MenuItemBuilder::new("Quit Grimoire")
        .id(TRAY_QUIT)
        .build(app_handle)
        .map_err(|error| error.to_string())?;

    MenuBuilder::new(app_handle)
        .item(&open)
        .separator()
        .item(&new_note)
        .item(&capture_thought)
        .item(&capture_journal)
        .item(&capture_dream)
        .item(&quick_open)
        .item(&ask_grimoire)
        .item(&command_palette)
        .separator()
        .item(&settings)
        .item(&reload)
        .separator()
        .item(&quit)
        .build()
        .map_err(|error| error.to_string())
}

fn grimoire_menu_bar_icon_as_template() -> bool {
    false
}

/// Apply the saved menu bar icon preference to the native tray icon.
pub fn apply_menu_bar_icon_setting(app_handle: &AppHandle, enabled: bool) -> Result<(), String> {
    if !enabled {
        let _ = app_handle.remove_tray_by_id(TRAY_ID);
        return Ok(());
    }

    if app_handle.tray_by_id(TRAY_ID).is_some() {
        return Ok(());
    }

    let icon = app_handle
        .default_window_icon()
        .cloned()
        .ok_or_else(|| "Grimoire has no default app icon configured".to_string())?;
    let menu = build_menu(app_handle)?;

    TrayIconBuilder::with_id(TRAY_ID)
        .icon(icon)
        .icon_as_template(grimoire_menu_bar_icon_as_template())
        .tooltip("Grimoire")
        .menu(&menu)
        .show_menu_on_left_click(true)
        .on_menu_event(|app_handle, event| {
            handle_tray_menu_event(app_handle, event.id().as_ref());
        })
        .on_tray_icon_event(|tray, event| {
            if is_left_click_release(&event) {
                show_main_window(tray.app_handle());
            }
        })
        .build(app_handle)
        .map(|_| ())
        .map_err(|error| error.to_string())
}

/// Restore the native menu bar icon on startup when Settings has it enabled.
pub fn setup_menu_bar_icon(app: &App) -> Result<(), Box<dyn std::error::Error>> {
    restore_menu_bar_icon(app.handle()).map_err(io_error)?;
    Ok(())
}

pub fn restore_menu_bar_icon(app_handle: &AppHandle) -> Result<(), String> {
    let settings = crate::settings::get_settings().map_err(|error| error.to_string())?;
    apply_menu_bar_icon_setting(app_handle, settings.menu_bar_icon_enabled == Some(true))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn tray_menu_action_maps_context_menu_items() {
        assert_eq!(
            tray_menu_action(TRAY_OPEN_GRIMOIRE),
            Some(TrayMenuAction::ShowWindow)
        );
        assert_eq!(
            tray_menu_action(FILE_NEW_NOTE),
            Some(TrayMenuAction::EmitMenuCommand(FILE_NEW_NOTE))
        );
        assert_eq!(
            tray_menu_action(FILE_CAPTURE_THOUGHT),
            Some(TrayMenuAction::EmitMenuCommand(FILE_CAPTURE_THOUGHT))
        );
        assert_eq!(
            tray_menu_action(FILE_CAPTURE_JOURNAL),
            Some(TrayMenuAction::EmitMenuCommand(FILE_CAPTURE_JOURNAL))
        );
        assert_eq!(
            tray_menu_action(FILE_CAPTURE_DREAM),
            Some(TrayMenuAction::EmitMenuCommand(FILE_CAPTURE_DREAM))
        );
        assert_eq!(
            tray_menu_action(FILE_QUICK_OPEN),
            Some(TrayMenuAction::EmitMenuCommand(FILE_QUICK_OPEN))
        );
        assert_eq!(
            tray_menu_action(VIEW_TOGGLE_AI_CHAT),
            Some(TrayMenuAction::EmitMenuCommand(VIEW_TOGGLE_AI_CHAT))
        );
        assert_eq!(
            tray_menu_action(VIEW_COMMAND_PALETTE),
            Some(TrayMenuAction::EmitMenuCommand(VIEW_COMMAND_PALETTE))
        );
        assert_eq!(
            tray_menu_action(APP_SETTINGS),
            Some(TrayMenuAction::EmitMenuCommand(APP_SETTINGS))
        );
        assert_eq!(
            tray_menu_action(VAULT_RELOAD),
            Some(TrayMenuAction::EmitMenuCommand(VAULT_RELOAD))
        );
        assert_eq!(tray_menu_action(TRAY_QUIT), Some(TrayMenuAction::Quit));
    }

    #[test]
    fn tray_menu_action_ignores_unknown_ids() {
        assert_eq!(tray_menu_action("unknown-menu-item"), None);
    }

    #[test]
    fn grimoire_menu_bar_icon_uses_full_color_logo() {
        assert!(GRIMOIRE_MENU_BAR_ICON_PNG.starts_with(b"\x89PNG\r\n\x1a\n"));
        assert!(!grimoire_menu_bar_icon_as_template());
    }
}
