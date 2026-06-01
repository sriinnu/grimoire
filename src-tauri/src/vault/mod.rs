mod app_importer;
#[cfg(test)]
mod app_importer_golden_tests;
mod app_importer_io;
mod app_importer_preview;
mod app_importer_progress;
#[cfg(test)]
mod app_importer_progress_tests;
#[cfg(test)]
mod app_importer_tests;
mod cache;
mod config_seed;
mod entry;
mod exporter;
mod exporter_progress;
#[cfg(test)]
mod exporter_progress_tests;
mod file;
pub(crate) mod filename_rules;
mod folders;
mod frontmatter;
mod getting_started;
mod html_exporter;
mod html_exporter_progress;
#[cfg(test)]
mod html_exporter_progress_tests;
#[cfg(test)]
mod html_exporter_tests;
mod image;
mod import_manifest;
mod import_preview_signature;
#[cfg(test)]
mod import_preview_signature_tests;
mod importer;
mod importer_progress;
#[cfg(test)]
mod importer_tests;
mod journal_html_import_helpers;
mod journal_import_helpers;
mod journal_importer;
mod journal_importer_preview;
mod journal_importer_progress;
#[cfg(test)]
mod journal_importer_progress_tests;
#[cfg(test)]
mod journal_importer_tests;
mod journal_media_import;
#[cfg(test)]
mod journal_media_import_tests;
pub(crate) mod locality;
pub(crate) mod locality_attachments;
mod migration;
mod object_storage_azure_cli;
mod object_storage_azure_io;
mod object_storage_azure_live;
mod object_storage_azure_plan;
mod object_storage_azure_sync;
mod object_storage_azure_target;
mod object_storage_live;
#[cfg(test)]
mod object_storage_live_provider_sync_tests;
#[cfg(test)]
mod object_storage_live_roundtrip_tests;
mod object_storage_s3_io;
mod object_storage_s3_plan;
mod object_storage_s3_sync;
mod object_storage_s3_target;
mod object_storage_signature;
mod object_storage_sync;
mod object_storage_sync_progress;
#[cfg(test)]
mod object_storage_sync_progress_tests;
mod object_storage_sync_report;
#[cfg(test)]
mod object_storage_sync_tests;
mod parsing;
mod portability_capsule;
mod portability_capsule_import;
mod portability_capsule_import_filter;
mod portability_capsule_import_readers;
mod portability_capsule_io;
mod portability_capsule_loop;
#[cfg(test)]
mod portability_capsule_loop_tests;
#[cfg(test)]
mod portability_capsule_signature_tests;
#[cfg(test)]
mod portability_capsule_tests;
mod rename;
mod rename_transaction;
mod scanner;
mod scanner_progress;
#[cfg(test)]
mod scanner_progress_tests;
mod spanda_importer;
mod title_sync;
mod trash;
mod views;
mod zip_importer;
#[cfg(test)]
mod zip_importer_golden_tests;
#[cfg(test)]
mod zip_importer_progress_tests;

pub use app_importer::import_app_export;
pub use app_importer_preview::preview_app_export;
pub use app_importer_progress::import_app_export_with_progress;
pub use cache::{invalidate_cache, scan_vault_cached};
pub use config_seed::{
    get_ai_guidance_status, migrate_agents_md, repair_config_files, restore_ai_guidance_files,
    seed_config_files, AiGuidanceFileState, VaultAiGuidanceStatus,
};
pub use entry::{FolderNode, VaultEntry};
pub use exporter::{export_markdown_zip, VaultExportReport};
pub use exporter_progress::{export_markdown_zip_with_progress, VaultExportProgressEvent};
pub use file::{create_note_content, get_note_content, save_note_content};
pub use folders::{delete_folder, rename_folder, FolderRenameResult};
pub use getting_started::{create_getting_started_vault, default_vault_path, vault_exists};
pub use html_exporter::export_static_html_archive;
pub use html_exporter_progress::export_static_html_archive_with_progress;
pub use image::{copy_image_to_vault, save_audio_recording, save_canvas_preview, save_image};
pub use import_preview_signature::{
    import_reviewed_app_export, import_reviewed_app_export_with_progress,
    import_reviewed_journal_export, import_reviewed_journal_export_with_progress,
    import_reviewed_markdown_folder, import_reviewed_markdown_folder_with_progress,
    import_reviewed_markdown_zip, import_reviewed_markdown_zip_with_progress,
};
pub use importer::{
    import_markdown_folder, preview_markdown_folder_import, MarkdownFolderImportPreview,
    MarkdownFolderImportReport,
};
pub use importer_progress::{
    import_markdown_folder_with_progress, MarkdownFolderImportProgressEvent,
};
pub use journal_importer::import_journal_export;
pub use journal_importer_preview::preview_journal_export;
pub use journal_importer_progress::import_journal_export_with_progress;
pub use migration::migrate_is_a_to_type;
pub use object_storage_azure_live::{
    azure_live_preflight, AzureLivePreflightInput, AzureLivePreflightReport,
};
pub use object_storage_azure_sync::{
    apply_azure_provider_sync, preview_azure_provider_sync, AzureProviderSyncInput,
};
pub use object_storage_live::{s3_live_preflight, S3LivePreflightInput, S3LivePreflightReport};
pub use object_storage_s3_sync::{
    apply_s3_provider_sync, preview_s3_provider_sync, S3ProviderSyncInput,
};
pub use object_storage_sync::{apply_object_storage_sync, preview_object_storage_sync};
pub use object_storage_sync_progress::{
    apply_object_storage_sync_with_progress, preview_object_storage_sync_with_progress,
    ObjectStorageSyncProgressEvent,
};
pub use object_storage_sync_report::{
    ObjectStorageSyncOperation, ObjectStorageSyncOperationKind, ObjectStorageSyncReport,
};
pub use portability_capsule::{
    export_portability_capsule, preview_portability_capsule, PortabilityCapsuleFormat,
    PortabilityCapsulePreviewReport,
};
pub use portability_capsule_import::{
    import_portability_capsule, preview_portability_capsule_import,
};
pub use portability_capsule_loop::{
    run_portability_capsule_loop_proof, PortabilityCapsuleLoopProofReport,
};
pub use rename::{
    auto_rename_untitled, detect_renames, move_note_to_folder, rename_note, rename_note_filename,
    update_wikilinks_for_renames, AutoRenameUntitledRequest, DetectedRename,
    MoveNoteToFolderRequest, RenameNoteFilenameRequest, RenameNoteRequest, RenameResult,
};
use scanner::extract_yml_name;
pub(crate) use scanner::{classify_file_kind, is_hidden_dir, is_md_file};
pub use scanner::{scan_vault, scan_vault_folders};
pub use scanner_progress::{scan_vault_with_progress, VaultRebuildProgressEvent};
pub use title_sync::{sync_title_on_open, SyncAction};
pub use trash::{batch_delete_notes, delete_note};
pub use views::{
    delete_view, evaluate_view, save_view, scan_views, FilterCondition, FilterGroup, FilterNode,
    FilterOp, ViewDefinition, ViewFile,
};
pub use zip_importer::{
    import_markdown_zip, import_markdown_zip_with_progress, preview_markdown_zip_import,
};

use file::read_file_metadata;
use frontmatter::{extract_fm_and_rels, resolve_is_a};
use parsing::{count_body_words, extract_outgoing_links, extract_snippet, extract_title};

use gray_matter::engine::YAML;
use gray_matter::Matter;
use std::fs;
use std::path::Path;

fn preferred_relationship_refs(
    relationships: &std::collections::HashMap<String, Vec<String>>,
    canonical_key: &str,
    legacy_key: &str,
) -> Vec<String> {
    relationships
        .get(canonical_key)
        .cloned()
        .or_else(|| relationships.get(legacy_key).cloned())
        .unwrap_or_default()
}

pub(crate) fn derive_markdown_title_from_content(content: &str, filename: &str) -> String {
    let matter = Matter::<YAML>::new();
    let parsed = matter.parse(content);
    let (frontmatter, _, _) = extract_fm_and_rels(parsed.data, content);
    extract_title(frontmatter.title.as_deref(), content, filename)
}

fn resolve_entry_dates(
    fs_modified: Option<u64>,
    fs_created: Option<u64>,
    git_dates: Option<(u64, u64)>,
) -> (Option<u64>, Option<u64>) {
    match git_dates {
        Some((git_modified, git_created)) => {
            let modified_at = Some(fs_modified.map_or(git_modified, |fs| fs.max(git_modified)));
            (modified_at, Some(git_created))
        }
        None => (fs_modified, fs_created),
    }
}

/// Parse a single markdown file into a VaultEntry.
///
/// If `git_dates` is provided, `created_at` comes from git history while
/// `modified_at` uses the newer of the latest git touch and the current
/// filesystem modified time. Pass `None` to use filesystem dates only
/// (appropriate for non-git vaults).
pub fn parse_md_file(path: &Path, git_dates: Option<(u64, u64)>) -> Result<VaultEntry, String> {
    let content = fs::read_to_string(path)
        .map_err(|e| format!("Failed to read {}: {}", path.display(), e))?;
    let filename = path
        .file_name()
        .map(|f| f.to_string_lossy().to_string())
        .unwrap_or_default();

    let matter = Matter::<YAML>::new();
    let parsed = matter.parse(&content);
    let (frontmatter, mut relationships, properties) = extract_fm_and_rels(parsed.data, &content);

    let title = derive_markdown_title_from_content(&content, &filename);
    let has_h1 = parsing::extract_h1_title(&content).is_some();
    let snippet = extract_snippet(&content);
    let word_count = count_body_words(&content);
    let outgoing_links = extract_outgoing_links(&parsed.content);
    let (fs_modified, fs_created, file_size) = read_file_metadata(path)?;
    let (modified_at, created_at) = resolve_entry_dates(fs_modified, fs_created, git_dates);
    let is_a = resolve_is_a(frontmatter.is_a);

    // Add "Type" relationship: isA becomes a navigable link to the type document.
    // Skip for type documents themselves (isA == "Type") to avoid self-referential links.
    if let Some(ref type_name) = is_a {
        if type_name != "Type" {
            let type_link = if type_name.starts_with("[[") && type_name.ends_with("]]") {
                type_name.clone()
            } else {
                format!("[[{}]]", type_name.to_lowercase())
            };
            relationships.insert("Type".to_string(), vec![type_link]);
        }
    }

    let belongs_to = preferred_relationship_refs(&relationships, "belongs_to", "Belongs to");
    let related_to = preferred_relationship_refs(&relationships, "related_to", "Related to");

    Ok(VaultEntry {
        path: path.to_string_lossy().to_string(),
        filename,
        title,
        is_a,
        snippet,
        relationships,
        aliases: frontmatter
            .aliases
            .map(|a| a.into_vec())
            .unwrap_or_default(),
        belongs_to,
        related_to,
        status: frontmatter.status.and_then(|v| v.into_scalar()),
        archived: frontmatter.archived.unwrap_or(false),
        modified_at,
        created_at,
        file_size,
        icon: frontmatter.icon.and_then(|v| v.into_scalar()),
        color: frontmatter.color.and_then(|v| v.into_scalar()),
        order: frontmatter.order,
        sidebar_label: frontmatter.sidebar_label.and_then(|v| v.into_scalar()),
        template: frontmatter.template.and_then(|v| v.into_scalar()),
        sort: frontmatter.sort.and_then(|v| v.into_scalar()),
        view: frontmatter.view.and_then(|v| v.into_scalar()),
        visible: frontmatter.visible,
        organized: frontmatter.organized.unwrap_or(false),
        favorite: frontmatter.favorite.unwrap_or(false),
        favorite_index: frontmatter.favorite_index,
        list_properties_display: frontmatter.list_properties_display.unwrap_or_default(),
        word_count,
        outgoing_links,
        properties,
        has_h1,
        file_kind: "markdown".to_string(),
    })
}

/// Parse a non-markdown file into a minimal VaultEntry.
/// Uses filename as title, except for `.yml` files where the YAML `name` field is used.
pub(crate) fn parse_non_md_file(
    path: &Path,
    git_dates: Option<(u64, u64)>,
) -> Result<VaultEntry, String> {
    let filename = path
        .file_name()
        .map(|f| f.to_string_lossy().to_string())
        .unwrap_or_default();
    let (fs_modified, fs_created, file_size) = read_file_metadata(path)?;
    let (modified_at, created_at) = resolve_entry_dates(fs_modified, fs_created, git_dates);
    let file_kind = classify_file_kind(path).to_string();
    let title = extract_yml_name(path).unwrap_or_else(|| filename.clone());

    Ok(VaultEntry {
        path: path.to_string_lossy().to_string(),
        filename: filename.clone(),
        title,
        file_kind,
        modified_at,
        created_at,
        file_size,
        ..VaultEntry::default()
    })
}

/// Re-read a single file from disk and return a fresh VaultEntry.
/// Uses filesystem dates (no git lookup) since the file was likely just saved.
pub fn reload_entry(path: &Path) -> Result<VaultEntry, String> {
    if !path.exists() {
        return Err(format!("File does not exist: {}", path.display()));
    }
    if is_md_file(path) {
        parse_md_file(path, None)
    } else {
        parse_non_md_file(path, None)
    }
}

#[cfg(test)]
#[path = "frontmatter_regression_tests.rs"]
mod frontmatter_regression_tests;
#[cfg(test)]
#[path = "modified_dates_tests.rs"]
mod modified_dates_tests;
#[cfg(test)]
#[path = "relationship_key_tests.rs"]
mod relationship_key_tests;
#[cfg(test)]
#[path = "system_metadata_tests.rs"]
mod system_metadata_tests;
#[cfg(test)]
#[path = "mod_tests.rs"]
mod tests;
