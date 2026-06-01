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
