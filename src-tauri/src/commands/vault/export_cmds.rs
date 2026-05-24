use crate::vault::{self, VaultExportProgressEvent, VaultExportReport};
use std::path::PathBuf;
use tauri::ipc::Channel;

use super::boundary::with_boundary;
use super::portability_progress::{
    operation_id_error, register_portability_operation, unregister_portability_operation,
};

/// Exports the active vault as a portable Markdown ZIP archive.
#[tauri::command]
pub fn export_markdown_zip(
    vault_path: PathBuf,
    target_path: PathBuf,
) -> Result<VaultExportReport, String> {
    let raw_vault_path = vault_path.to_string_lossy();
    with_boundary(Some(raw_vault_path.as_ref()), |boundary| {
        vault::export_markdown_zip(boundary.requested_root(), target_path.as_path())
    })
}

/// Exports the active vault as a Markdown ZIP with progress and cancellation.
#[tauri::command]
pub async fn export_markdown_zip_with_progress(
    vault_path: PathBuf,
    target_path: PathBuf,
    operation_id: String,
    on_event: Channel<VaultExportProgressEvent>,
) -> Result<(), String> {
    export_with_progress(
        vault_path,
        target_path,
        operation_id,
        on_event,
        |vault_path, target_path, cancelled, on_progress| {
            vault::export_markdown_zip_with_progress(
                vault_path,
                target_path,
                cancelled,
                on_progress,
            )
        },
        "Markdown ZIP export task failed",
    )
    .await
}

/// Exports the active vault as a browsable static HTML archive folder.
#[tauri::command]
pub fn export_static_html_archive(
    vault_path: PathBuf,
    target_path: PathBuf,
) -> Result<VaultExportReport, String> {
    let raw_vault_path = vault_path.to_string_lossy();
    with_boundary(Some(raw_vault_path.as_ref()), |boundary| {
        vault::export_static_html_archive(boundary.requested_root(), target_path.as_path())
    })
}

/// Exports the active vault as static HTML with progress and cancellation.
#[tauri::command]
pub async fn export_static_html_archive_with_progress(
    vault_path: PathBuf,
    target_path: PathBuf,
    operation_id: String,
    on_event: Channel<VaultExportProgressEvent>,
) -> Result<(), String> {
    export_with_progress(
        vault_path,
        target_path,
        operation_id,
        on_event,
        |vault_path, target_path, cancelled, on_progress| {
            vault::export_static_html_archive_with_progress(
                vault_path,
                target_path,
                cancelled,
                on_progress,
            )
        },
        "Static HTML export task failed",
    )
    .await
}

async fn export_with_progress<F>(
    vault_path: PathBuf,
    target_path: PathBuf,
    operation_id: String,
    on_event: Channel<VaultExportProgressEvent>,
    export_fn: F,
    task_error: &'static str,
) -> Result<(), String>
where
    F: Fn(
            &std::path::Path,
            &std::path::Path,
            &std::sync::atomic::AtomicBool,
            &dyn Fn(VaultExportProgressEvent),
        ) -> Result<VaultExportReport, String>
        + Send
        + 'static,
{
    if let Some(error) = operation_id_error(&operation_id) {
        return Err(error);
    }

    let cancellation = register_portability_operation(&operation_id)?;
    let cleanup_operation_id = operation_id.clone();
    let raw_vault_path = vault_path.to_string_lossy().into_owned();
    let task_result = tauri::async_runtime::spawn_blocking(move || {
        with_boundary(Some(raw_vault_path.as_str()), |boundary| {
            export_fn(
                boundary.requested_root(),
                target_path.as_path(),
                cancellation.as_ref(),
                &|event| {
                    let _ = on_event.send(event);
                },
            )
        })
    })
    .await;

    unregister_portability_operation(&cleanup_operation_id);
    let result = task_result.map_err(|e| format!("{task_error}: {e}"))?;
    result.map(|_| ())
}
