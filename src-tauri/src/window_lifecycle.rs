/// Show and focus the main window when the desktop shell requests it.
pub(crate) fn show_main_window(app_handle: &tauri::AppHandle) {
    #[cfg(target_os = "macos")]
    {
        crate::menu_bar::show_main_window(app_handle);
        let app_handle = app_handle.clone();
        std::thread::spawn(move || {
            std::thread::sleep(std::time::Duration::from_millis(350));
            let app_handle_for_main = app_handle.clone();
            let _ = app_handle.run_on_main_thread(move || {
                crate::menu_bar::show_main_window(&app_handle_for_main);
            });
        });
    }

    #[cfg(not(target_os = "macos"))]
    {
        use tauri::Manager;

        if let Some(window) = app_handle.get_webview_window("main") {
            if !window.is_visible().unwrap_or(false) {
                let _ = window.set_size(tauri::LogicalSize::new(1400.0, 900.0));
                let _ = window.center();
            }
            let _ = window.unminimize();
            let _ = window.show();
            let _ = window.set_focus();
        }
    }
}

/// What the red button (or Cmd+W) does to the main window.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub(crate) enum CloseBehavior {
    /// Keep the webview, React tree and DOM alive; reopen is instant.
    Hide,
    Close,
}

/// macOS apps keep running with no window, so hiding is what the platform
/// expects and reopening from the Dock takes microseconds instead of a cold
/// launch. Elsewhere, hide only when the tray icon gives a way back.
pub(crate) fn close_behavior(label: &str, is_macos: bool, tray_enabled: bool) -> CloseBehavior {
    if label != "main" {
        return CloseBehavior::Close;
    }
    if is_macos || tray_enabled {
        CloseBehavior::Hide
    } else {
        CloseBehavior::Close
    }
}

fn tray_enabled() -> bool {
    crate::settings::get_settings()
        .ok()
        .and_then(|settings| settings.menu_bar_icon_enabled)
        .unwrap_or(false)
}

pub(crate) fn handle_window_event(window: &tauri::Window, event: &tauri::WindowEvent) {
    let tauri::WindowEvent::CloseRequested { api, .. } = event else {
        return;
    };
    let behavior = close_behavior(window.label(), cfg!(target_os = "macos"), tray_enabled());
    if behavior == CloseBehavior::Hide {
        api.prevent_close();
        if let Err(error) = window.hide() {
            log::warn!("Could not hide the main window on close: {error}");
        }
    }
}

#[cfg(test)]
mod close_behavior_tests {
    use super::*;

    #[test]
    fn main_window_hides_on_macos_or_with_a_tray_and_closes_otherwise() {
        assert_eq!(close_behavior("main", true, false), CloseBehavior::Hide);
        assert_eq!(close_behavior("main", false, true), CloseBehavior::Hide);
        assert_eq!(close_behavior("main", false, false), CloseBehavior::Close);
        assert_eq!(close_behavior("note-2", true, true), CloseBehavior::Close);
    }
}
