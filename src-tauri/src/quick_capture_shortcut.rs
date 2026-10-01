//! System-wide quick-capture chord: brings Grimoire forward and asks the
//! renderer to open its capture sheet, even when another app has focus.

use tauri::{AppHandle, Emitter};
use tauri_plugin_global_shortcut::{Code, GlobalShortcutExt, Modifiers, Shortcut, ShortcutState};

/// Renderer listens for this in `src/app/useQuickCapture.ts`.
pub(crate) const QUICK_CAPTURE_OPEN_EVENT: &str = "quick-capture-open";

/// Cmd+Shift+Space on macOS, Ctrl+Shift+Space elsewhere (matches the in-app chord).
pub(crate) fn quick_capture_shortcut() -> Shortcut {
    #[cfg(target_os = "macos")]
    let modifiers = Modifiers::SUPER | Modifiers::SHIFT;
    #[cfg(not(target_os = "macos"))]
    let modifiers = Modifiers::CONTROL | Modifiers::SHIFT;
    Shortcut::new(Some(modifiers), Code::Space)
}

fn open_quick_capture(app_handle: &AppHandle) {
    crate::window_lifecycle::show_main_window(app_handle);
    if let Err(error) = app_handle.emit_to("main", QUICK_CAPTURE_OPEN_EVENT, ()) {
        log::warn!("Failed to emit quick-capture open event: {error}");
    }
}

/// Installs the global-shortcut plugin and registers the capture chord.
/// Failures are logged, never fatal: another app may already own the chord,
/// and some Wayland sessions refuse global grabs. The in-app shortcut still works.
pub(crate) fn setup(app: &tauri::App) {
    let shortcut = quick_capture_shortcut();
    let plugin = tauri_plugin_global_shortcut::Builder::new()
        .with_handler(move |app_handle, triggered, event| {
            if *triggered == shortcut && event.state() == ShortcutState::Pressed {
                open_quick_capture(app_handle);
            }
        })
        .build();
    if let Err(error) = app.handle().plugin(plugin) {
        log::warn!("Global shortcut plugin unavailable: {error}");
        return;
    }
    if let Err(error) = app.global_shortcut().register(shortcut) {
        log::warn!("Could not register the quick-capture shortcut: {error}");
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn quick_capture_chord_uses_the_platform_command_modifier() {
        let shortcut = quick_capture_shortcut();
        assert_eq!(shortcut.key, Code::Space);
        assert!(shortcut.mods.contains(Modifiers::SHIFT));
        #[cfg(target_os = "macos")]
        assert!(shortcut.mods.contains(Modifiers::SUPER));
        #[cfg(not(target_os = "macos"))]
        assert!(shortcut.mods.contains(Modifiers::CONTROL));
    }
}
