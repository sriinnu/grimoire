use tauri::{
    menu::{Menu, MenuBuilder, MenuItemBuilder},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    App, AppHandle, LogicalSize, Manager, WebviewWindow,
};

#[cfg(target_os = "macos")]
use objc2::{msg_send, runtime::Bool};
#[cfg(target_os = "macos")]
use objc2_app_kit::{
    NSApplicationActivationOptions, NSApplicationActivationPolicy, NSColor, NSRunningApplication,
    NSWindow, NSWindowCollectionBehavior, NSWindowSharingType,
};

const TRAY_ID: &str = "grimoire-menu-bar";
const TRAY_OPEN_GRIMOIRE: &str = "tray-open-grimoire";
const TRAY_QUIT: &str = "tray-quit";
const MAIN_WINDOW_LABEL: &str = "main";

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

fn ensure_main_window(app_handle: &AppHandle) -> Option<WebviewWindow> {
    if let Some(window) = app_handle.get_webview_window(MAIN_WINDOW_LABEL) {
        return Some(window);
    }

    let window_config = app_handle
        .config()
        .app
        .windows
        .iter()
        .find(|config| config.label == MAIN_WINDOW_LABEL)
        .or_else(|| app_handle.config().app.windows.first())?;

    tauri::WebviewWindowBuilder::from_config(app_handle, window_config)
        .and_then(|builder| builder.build())
        .map_err(|error| log::warn!("Failed to create main window: {}", error))
        .ok()
}

#[cfg(target_os = "macos")]
fn activate_app() {
    if let Some(mtm) = objc2::MainThreadMarker::new() {
        let app = objc2_app_kit::NSApplication::sharedApplication(mtm);
        app.unhide(None);
        app.setActivationPolicy(NSApplicationActivationPolicy::Regular);
        app.activate();
        #[allow(deprecated)]
        app.activateIgnoringOtherApps(true);
        let running_app = NSRunningApplication::currentApplication();
        let _ = running_app.activateWithOptions(NSApplicationActivationOptions::ActivateAllWindows);
    }
}

#[cfg(target_os = "macos")]
fn order_native_window_front(window: &WebviewWindow) {
    let _ = window.set_content_protected(false);
    let _ = window.set_always_on_top(true);

    let Ok(ns_window) = window.ns_window() else {
        return;
    };
    if ns_window.is_null() {
        return;
    }

    let ns_window = unsafe { &*ns_window.cast::<NSWindow>() };
    let background = NSColor::colorWithSRGBRed_green_blue_alpha(0.9686, 0.9647, 0.9529, 1.0);
    // Tauri owns the singleton window lifecycle; AppKit snapshots can restore a
    // classless stale window and leave Grimoire running behind a phantom shell.
    unsafe {
        let _: () = msg_send![ns_window, setRestorable: Bool::NO];
        let _: () = msg_send![ns_window, disableSnapshotRestoration];
    }
    ns_window.setCollectionBehavior(
        NSWindowCollectionBehavior::Managed | NSWindowCollectionBehavior::MoveToActiveSpace,
    );
    ns_window.setSharingType(NSWindowSharingType::ReadOnly);
    ns_window.setAlphaValue(1.0);
    ns_window.setOpaque(true);
    ns_window.setBackgroundColor(Some(&background));
    if let Some(content_view) = ns_window.contentView() {
        content_view.setHidden(false);
        content_view.setAlphaValue(1.0);
    }
    ns_window.makeKeyAndOrderFront(None);
    ns_window.orderFrontRegardless();
}

#[cfg(target_os = "macos")]
fn settle_main_window_layer(app_handle: &AppHandle) {
    if let Some(window) = app_handle.get_webview_window(MAIN_WINDOW_LABEL) {
        let _ = window.set_always_on_top(false);
    }
}

#[cfg(target_os = "macos")]
fn focus_main_window(app_handle: &AppHandle) {
    activate_app();
    reveal_main_window(app_handle);
}

#[cfg(target_os = "macos")]
fn run_on_main_thread(app_handle: &AppHandle, action: fn(&AppHandle)) {
    let runner = app_handle.clone();
    let app_handle_for_main = app_handle.clone();
    let _ = runner.run_on_main_thread(move || action(&app_handle_for_main));
}

#[cfg(target_os = "macos")]
fn schedule_focus_retry(app_handle: &AppHandle, delay_ms: u64) {
    let app_handle = app_handle.clone();
    std::thread::spawn(move || {
        std::thread::sleep(std::time::Duration::from_millis(delay_ms));
        run_on_main_thread(&app_handle, focus_main_window);
    });
}

fn reveal_main_window(app_handle: &AppHandle) {
    if let Some(window) = ensure_main_window(app_handle) {
        let _ = window.set_size(LogicalSize::new(1400.0, 900.0));
        let _ = window.center();
        let _ = window.unminimize();
        let _ = window.show();
        #[cfg(target_os = "macos")]
        order_native_window_front(&window);
        let _ = window.set_focus();
    }
}

pub(crate) fn show_main_window(app_handle: &AppHandle) {
    #[cfg(target_os = "macos")]
    {
        let _ = app_handle.set_activation_policy(tauri::ActivationPolicy::Regular);
        run_on_main_thread(app_handle, focus_main_window);
        schedule_focus_retry(app_handle, 75);
        schedule_focus_retry(app_handle, 350);
        let app_handle = app_handle.clone();
        std::thread::spawn(move || {
            std::thread::sleep(std::time::Duration::from_millis(900));
            run_on_main_thread(&app_handle, settle_main_window_layer);
        });
    }

    #[cfg(not(target_os = "macos"))]
    reveal_main_window(app_handle);
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
    let new_note = MenuItemBuilder::new("New Note")
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
    let reload = MenuItemBuilder::new("Reload Vault")
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
    let settings = crate::settings::get_settings().map_err(io_error)?;
    let app_handle = app.handle();
    apply_menu_bar_icon_setting(app_handle, settings.menu_bar_icon_enabled == Some(true))
        .map_err(io_error)?;
    Ok(())
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
    fn grimoire_menu_bar_icon_uses_explicit_non_template_asset() {
        assert!(GRIMOIRE_MENU_BAR_ICON_PNG.starts_with(b"\x89PNG\r\n\x1a\n"));
        assert!(!grimoire_menu_bar_icon_as_template());
    }
}
