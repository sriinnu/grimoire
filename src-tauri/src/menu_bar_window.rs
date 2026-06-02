use tauri::{AppHandle, LogicalSize, Manager};

const MAIN_WINDOW_LABEL: &str = "main";

pub(crate) fn show_main_window(app_handle: &AppHandle) {
    if let Some(window) = app_handle.get_webview_window(MAIN_WINDOW_LABEL) {
        let _ = window.set_content_protected(false);
        if !window.is_visible().unwrap_or(false) {
            let _ = window.set_size(LogicalSize::new(1400.0, 900.0));
            let _ = window.center();
        }
        let _ = window.unminimize();
        let _ = window.show();
        let _ = window.set_focus();
    }
}
