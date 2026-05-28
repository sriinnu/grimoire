use crate::vault::{
    self, MarkdownFolderImportPreview, MarkdownFolderImportProgressEvent,
    MarkdownFolderImportReport, PortabilityCapsuleFormat,
};
use std::path::PathBuf;
use tauri::ipc::Channel;

use super::boundary::with_boundary;
use super::portability_progress::{
    cancel_portability_token, operation_id_error, register_portability_operation,
    unregister_portability_operation,
};

/// Imports a Markdown folder into the active vault without mutating the source.
#[tauri::command]
pub fn import_markdown_folder(
    vault_path: PathBuf,
    source_path: PathBuf,
) -> Result<MarkdownFolderImportReport, String> {
    let raw_vault_path = vault_path.to_string_lossy();
    with_boundary(Some(raw_vault_path.as_ref()), |boundary| {
        vault::import_markdown_folder(boundary.requested_root(), source_path.as_path())
    })
}

/// Imports a Markdown folder with progress events and cancellable copy checkpoints.
#[tauri::command]
pub async fn import_markdown_folder_with_progress(
    vault_path: PathBuf,
    source_path: PathBuf,
    operation_id: String,
    on_event: Channel<MarkdownFolderImportProgressEvent>,
) -> Result<(), String> {
    if let Some(error) = operation_id_error(&operation_id) {
        return Err(error);
    }

    let cancellation = register_portability_operation(&operation_id)?;
    let cleanup_operation_id = operation_id.clone();
    let raw_vault_path = vault_path.to_string_lossy().into_owned();
    let task_result = tauri::async_runtime::spawn_blocking(move || {
        with_boundary(Some(raw_vault_path.as_str()), |boundary| {
            vault::import_markdown_folder_with_progress(
                boundary.requested_root(),
                source_path.as_path(),
                cancellation.as_ref(),
                &move |event| {
                    let _ = on_event.send(event);
                },
            )
        })
    })
    .await;

    unregister_portability_operation(&cleanup_operation_id);
    let result = task_result.map_err(|e| format!("Markdown import task failed: {e}"))?;
    result.map(|_| ())
}

/// Requests cancellation for an active Markdown folder import.
#[tauri::command]
pub fn cancel_markdown_folder_import(operation_id: String) -> Result<bool, String> {
    cancel_portability_token(&operation_id)
}

/// Requests cancellation for any active portability operation.
#[tauri::command]
pub fn cancel_portability_operation(operation_id: String) -> Result<bool, String> {
    cancel_portability_token(&operation_id)
}

/// Previews a Markdown folder import without writing to the active vault.
#[tauri::command]
pub fn preview_markdown_folder_import(
    vault_path: PathBuf,
    source_path: PathBuf,
) -> Result<MarkdownFolderImportPreview, String> {
    let raw_vault_path = vault_path.to_string_lossy();
    with_boundary(Some(raw_vault_path.as_ref()), |boundary| {
        vault::preview_markdown_folder_import(boundary.requested_root(), source_path.as_path())
    })
}

/// Previews a Markdown ZIP import without writing to the active vault.
#[tauri::command]
pub fn preview_markdown_zip_import(
    vault_path: PathBuf,
    source_path: PathBuf,
) -> Result<MarkdownFolderImportPreview, String> {
    let raw_vault_path = vault_path.to_string_lossy();
    with_boundary(Some(raw_vault_path.as_ref()), |boundary| {
        vault::preview_markdown_zip_import(boundary.requested_root(), source_path.as_path())
    })
}

/// Imports a portable Markdown ZIP archive into the active vault.
#[tauri::command]
pub fn import_markdown_zip(
    vault_path: PathBuf,
    source_path: PathBuf,
) -> Result<MarkdownFolderImportReport, String> {
    let raw_vault_path = vault_path.to_string_lossy();
    with_boundary(Some(raw_vault_path.as_ref()), |boundary| {
        vault::import_markdown_zip(boundary.requested_root(), source_path.as_path())
    })
}

/// Previews a Grimoire JSON or SQLite capsule import without writing to the active vault.
#[tauri::command]
pub fn preview_portability_capsule_import(
    vault_path: PathBuf,
    source_path: PathBuf,
    format: PortabilityCapsuleFormat,
) -> Result<MarkdownFolderImportPreview, String> {
    let raw_vault_path = vault_path.to_string_lossy();
    with_boundary(Some(raw_vault_path.as_ref()), |boundary| {
        vault::preview_portability_capsule_import(
            boundary.requested_root(),
            source_path.as_path(),
            format,
        )
    })
}

/// Imports a reviewed Grimoire JSON or SQLite capsule into the active vault.
#[tauri::command]
pub fn import_portability_capsule(
    vault_path: PathBuf,
    source_path: PathBuf,
    format: PortabilityCapsuleFormat,
    preview_signature: String,
) -> Result<MarkdownFolderImportReport, String> {
    let raw_vault_path = vault_path.to_string_lossy();
    with_boundary(Some(raw_vault_path.as_ref()), |boundary| {
        vault::import_portability_capsule(
            boundary.requested_root(),
            source_path.as_path(),
            format,
            preview_signature.as_str(),
        )
    })
}

/// Imports a Markdown ZIP with progress events and cancellable checkpoints.
#[tauri::command]
pub async fn import_markdown_zip_with_progress(
    vault_path: PathBuf,
    source_path: PathBuf,
    operation_id: String,
    on_event: Channel<MarkdownFolderImportProgressEvent>,
) -> Result<(), String> {
    if let Some(error) = operation_id_error(&operation_id) {
        return Err(error);
    }

    let cancellation = register_portability_operation(&operation_id)?;
    let cleanup_operation_id = operation_id.clone();
    let raw_vault_path = vault_path.to_string_lossy().into_owned();
    let task_result = tauri::async_runtime::spawn_blocking(move || {
        with_boundary(Some(raw_vault_path.as_str()), |boundary| {
            vault::import_markdown_zip_with_progress(
                boundary.requested_root(),
                source_path.as_path(),
                cancellation.as_ref(),
                &move |event| {
                    let _ = on_event.send(event);
                },
            )
        })
    })
    .await;

    unregister_portability_operation(&cleanup_operation_id);
    let result = task_result.map_err(|e| format!("Markdown ZIP import task failed: {e}"))?;
    result.map(|_| ())
}

/// Imports a Day One or Journey export into the active vault.
#[tauri::command]
pub fn import_journal_export(
    vault_path: PathBuf,
    source_path: PathBuf,
    source_kind: String,
) -> Result<MarkdownFolderImportReport, String> {
    let raw_vault_path = vault_path.to_string_lossy();
    with_boundary(Some(raw_vault_path.as_ref()), |boundary| {
        vault::import_journal_export(
            boundary.requested_root(),
            source_path.as_path(),
            source_kind.as_str(),
        )
    })
}

/// Imports a journal export with progress events and cancellable checkpoints.
#[tauri::command]
pub async fn import_journal_export_with_progress(
    vault_path: PathBuf,
    source_path: PathBuf,
    source_kind: String,
    operation_id: String,
    on_event: Channel<MarkdownFolderImportProgressEvent>,
) -> Result<(), String> {
    if let Some(error) = operation_id_error(&operation_id) {
        return Err(error);
    }

    let cancellation = register_portability_operation(&operation_id)?;
    let cleanup_operation_id = operation_id.clone();
    let raw_vault_path = vault_path.to_string_lossy().into_owned();
    let task_result = tauri::async_runtime::spawn_blocking(move || {
        with_boundary(Some(raw_vault_path.as_str()), |boundary| {
            vault::import_journal_export_with_progress(
                boundary.requested_root(),
                source_path.as_path(),
                source_kind.as_str(),
                cancellation.as_ref(),
                &move |event| {
                    let _ = on_event.send(event);
                },
            )
        })
    })
    .await;

    unregister_portability_operation(&cleanup_operation_id);
    let result = task_result.map_err(|e| format!("Journal import task failed: {e}"))?;
    result.map(|_| ())
}

/// Previews a Day One, Journey, or Apple Journal export without writing to the active vault.
#[tauri::command]
pub fn preview_journal_export(
    vault_path: PathBuf,
    source_path: PathBuf,
    source_kind: String,
) -> Result<MarkdownFolderImportPreview, String> {
    let raw_vault_path = vault_path.to_string_lossy();
    with_boundary(Some(raw_vault_path.as_ref()), |boundary| {
        vault::preview_journal_export(
            boundary.requested_root(),
            source_path.as_path(),
            source_kind.as_str(),
        )
    })
}

/// Imports an app-specific export into the active vault.
#[tauri::command]
pub fn import_app_export(
    vault_path: PathBuf,
    source_path: PathBuf,
    source_kind: String,
) -> Result<MarkdownFolderImportReport, String> {
    let raw_vault_path = vault_path.to_string_lossy();
    with_boundary(Some(raw_vault_path.as_ref()), |boundary| {
        vault::import_app_export(
            boundary.requested_root(),
            source_path.as_path(),
            source_kind.as_str(),
        )
    })
}

/// Imports an app-specific export with progress events and cancellable checkpoints.
#[tauri::command]
pub async fn import_app_export_with_progress(
    vault_path: PathBuf,
    source_path: PathBuf,
    source_kind: String,
    operation_id: String,
    on_event: Channel<MarkdownFolderImportProgressEvent>,
) -> Result<(), String> {
    if let Some(error) = operation_id_error(&operation_id) {
        return Err(error);
    }

    let cancellation = register_portability_operation(&operation_id)?;
    let cleanup_operation_id = operation_id.clone();
    let raw_vault_path = vault_path.to_string_lossy().into_owned();
    let task_result = tauri::async_runtime::spawn_blocking(move || {
        with_boundary(Some(raw_vault_path.as_str()), |boundary| {
            vault::import_app_export_with_progress(
                boundary.requested_root(),
                source_path.as_path(),
                source_kind.as_str(),
                cancellation.as_ref(),
                &move |event| {
                    let _ = on_event.send(event);
                },
            )
        })
    })
    .await;

    unregister_portability_operation(&cleanup_operation_id);
    let result = task_result.map_err(|e| format!("App import task failed: {e}"))?;
    result.map(|_| ())
}

/// Previews an app-specific export without writing to the active vault.
#[tauri::command]
pub fn preview_app_export(
    vault_path: PathBuf,
    source_path: PathBuf,
    source_kind: String,
) -> Result<MarkdownFolderImportPreview, String> {
    let raw_vault_path = vault_path.to_string_lossy();
    with_boundary(Some(raw_vault_path.as_ref()), |boundary| {
        vault::preview_app_export(
            boundary.requested_root(),
            source_path.as_path(),
            source_kind.as_str(),
        )
    })
}
