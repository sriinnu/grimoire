use super::locality::{is_local_only_export_file, is_local_only_relative_path};
use super::locality_attachments::local_only_referenced_attachments;
use super::object_storage_signature::{build_preview_signature, file_fingerprint};
use super::object_storage_sync_report::{
    count_kind, operation, ObjectStorageSyncOperation, ObjectStorageSyncOperationKind,
    ObjectStorageSyncReport,
};
use std::collections::{BTreeMap, BTreeSet};
use std::fs;
use std::path::{Path, PathBuf};
use walkdir::{DirEntry, WalkDir};
const SUPPORTED_PROVIDERS: &[&str] = &["s3", "azure-blob"];
const SKIPPED_DIRS: &[&str] = &[
    ".claude",
    ".codex",
    ".git",
    ".grimoire",
    ".grimoire-local",
    "certs",
    "mockups",
    "node_modules",
    "target",
];
const SKIPPED_FILES: &[&str] = &[".ds_store", ".mcp.json"];
#[derive(Debug, Clone, PartialEq, Eq)]
pub(super) enum SyncDirection {
    Push,
    Pull,
}

/// Builds a dry-run object-storage sync report against a local mirror folder.
pub fn preview_object_storage_sync(
    vault_path: &Path,
    mirror_path: &Path,
    provider_id: &str,
    direction: &str,
) -> Result<ObjectStorageSyncReport, String> {
    let direction = parse_direction(direction)?;
    let provider_id = validate_provider_id(provider_id)?;
    let vault_root = canonical_dir(vault_path, "Vault")?;
    let mirror_root = resolve_mirror_root(mirror_path)?;
    validate_mirror_outside_vault(&vault_root, &mirror_root)?;

    let mut operations = Vec::new();
    let mut file_fingerprints = Vec::new();
    let local_files = collect_sync_files(
        &vault_root,
        &vault_root,
        "local",
        &mut operations,
        &mut file_fingerprints,
    )?;
    let remote_files = collect_sync_files(
        &mirror_root,
        &mirror_root,
        "remote",
        &mut operations,
        &mut file_fingerprints,
    )?;

    match direction {
        SyncDirection::Push => add_push_operations(&local_files, &remote_files, &mut operations)?,
        SyncDirection::Pull => add_pull_operations(&local_files, &remote_files, &mut operations)?,
    }

    Ok(build_report(
        provider_id,
        &direction,
        &mirror_root,
        false,
        operations,
        file_fingerprints,
        SyncReportExtras {
            sync_report_path: None,
            conflict_artifacts: Vec::new(),
        },
    ))
}

/// Applies a previously previewed sync against a local mirror folder.
pub fn apply_object_storage_sync(
    vault_path: &Path,
    mirror_path: &Path,
    provider_id: &str,
    direction: &str,
    expected_preview_signature: &str,
) -> Result<ObjectStorageSyncReport, String> {
    let cancelled = std::sync::atomic::AtomicBool::new(false);
    super::object_storage_sync_progress::apply_object_storage_sync_with_progress(
        vault_path,
        mirror_path,
        provider_id,
        direction,
        expected_preview_signature,
        &cancelled,
        &|_| {},
    )
}

pub(super) fn parse_direction(direction: &str) -> Result<SyncDirection, String> {
    match direction {
        "push" => Ok(SyncDirection::Push),
        "pull" => Ok(SyncDirection::Pull),
        _ => Err("Object-storage sync direction must be push or pull".to_string()),
    }
}

pub(super) fn validate_provider_id(provider_id: &str) -> Result<String, String> {
    if SUPPORTED_PROVIDERS.contains(&provider_id) {
        Ok(provider_id.to_string())
    } else {
        Err("Object-storage provider must be s3 or azure-blob".to_string())
    }
}

pub(super) fn canonical_dir(path: &Path, label: &str) -> Result<PathBuf, String> {
    let canonical = path
        .canonicalize()
        .map_err(|e| format!("{label} folder is not available: {e}"))?;
    if !canonical.is_dir() {
        return Err(format!("{label} path is not a folder"));
    }
    Ok(canonical)
}

pub(super) fn resolve_mirror_root(path: &Path) -> Result<PathBuf, String> {
    if path.exists() {
        return canonical_dir(path, "Object-storage mirror");
    }
    let parent = path
        .parent()
        .unwrap_or_else(|| Path::new("."))
        .canonicalize()
        .map_err(|e| format!("Failed to inspect object-storage mirror parent: {e}"))?;
    let file_name = path
        .file_name()
        .ok_or_else(|| "Object-storage mirror path must include a folder name".to_string())?;
    Ok(parent.join(file_name))
}

pub(super) fn validate_mirror_outside_vault(
    vault_root: &Path,
    mirror_root: &Path,
) -> Result<(), String> {
    if mirror_root.starts_with(vault_root) || vault_root.starts_with(mirror_root) {
        return Err(
            "Object-storage mirror must not contain or live inside the active vault".to_string(),
        );
    }
    Ok(())
}

pub(super) fn collect_sync_files(
    root: &Path,
    locality_root: &Path,
    role: &str,
    operations: &mut Vec<ObjectStorageSyncOperation>,
    file_fingerprints: &mut Vec<String>,
) -> Result<BTreeMap<String, PathBuf>, String> {
    let mut files = BTreeMap::new();
    if !root.exists() {
        return Ok(files);
    }
    let local_only_attachments = local_only_referenced_attachments(locality_root)?;

    for entry in WalkDir::new(root)
        .follow_links(false)
        .into_iter()
        .filter_entry(should_enter)
    {
        let entry = entry.map_err(|e| format!("Failed to inspect sync folder: {e}"))?;
        if !entry.file_type().is_file() {
            continue;
        }
        let relative = relative_path(root, entry.path())?;
        if should_skip_file(&entry)
            || has_skipped_component(Path::new(&relative))
            || local_only_attachments.contains(&relative)
            || is_local_only_export_file(locality_root, entry.path())
            || is_local_only_relative_path(Path::new(&relative))
        {
            operations.push(ObjectStorageSyncOperation {
                kind: ObjectStorageSyncOperationKind::Exclude,
                path: relative,
                reason: "Protected by local-only policy".to_string(),
            });
            continue;
        }
        file_fingerprints.push(file_fingerprint(role, &relative, entry.path())?);
        files.insert(relative, entry.path().to_path_buf());
    }

    Ok(files)
}

pub(super) fn add_push_operations(
    local_files: &BTreeMap<String, PathBuf>,
    remote_files: &BTreeMap<String, PathBuf>,
    operations: &mut Vec<ObjectStorageSyncOperation>,
) -> Result<(), String> {
    let excluded = excluded_paths(operations);
    for (path, local_file) in local_files {
        if excluded.contains(path) {
            continue;
        }
        match remote_files.get(path) {
            Some(remote_file) if files_differ(local_file, remote_file)? => {
                operations.push(conflict_operation(path));
            }
            None => operations.push(operation(
                ObjectStorageSyncOperationKind::Upload,
                path,
                "Missing from object-storage mirror",
            )),
            _ => {}
        }
    }
    for path in remote_files.keys() {
        if !local_files.contains_key(path) && !excluded.contains(path) {
            operations.push(operation(
                ObjectStorageSyncOperationKind::DeleteRemote,
                path,
                "Missing from local working copy",
            ));
        }
    }
    Ok(())
}

pub(super) fn add_pull_operations(
    local_files: &BTreeMap<String, PathBuf>,
    remote_files: &BTreeMap<String, PathBuf>,
    operations: &mut Vec<ObjectStorageSyncOperation>,
) -> Result<(), String> {
    let excluded = excluded_paths(operations);
    for (path, remote_file) in remote_files {
        if excluded.contains(path) {
            continue;
        }
        match local_files.get(path) {
            Some(local_file) if files_differ(local_file, remote_file)? => {
                operations.push(conflict_operation(path));
            }
            None => operations.push(operation(
                ObjectStorageSyncOperationKind::Download,
                path,
                "Missing from local working copy",
            )),
            _ => {}
        }
    }
    Ok(())
}

fn excluded_paths(operations: &[ObjectStorageSyncOperation]) -> BTreeSet<String> {
    operations
        .iter()
        .filter(|operation| operation.kind == ObjectStorageSyncOperationKind::Exclude)
        .map(|operation| operation.path.clone())
        .collect()
}

fn conflict_operation(path: &str) -> ObjectStorageSyncOperation {
    operation(
        ObjectStorageSyncOperationKind::Conflict,
        path,
        "Local and object-storage mirror content differ",
    )
}

pub(super) struct SyncReportExtras {
    pub(super) sync_report_path: Option<String>,
    pub(super) conflict_artifacts: Vec<String>,
}

pub(super) fn build_report(
    provider_id: String,
    direction: &SyncDirection,
    mirror_root: &Path,
    applied: bool,
    operations: Vec<ObjectStorageSyncOperation>,
    file_fingerprints: Vec<String>,
    extras: SyncReportExtras,
) -> ObjectStorageSyncReport {
    let direction = direction_label(direction).to_string();
    let preview_signature = build_preview_signature(
        &provider_id,
        &direction,
        mirror_root,
        &operations,
        &file_fingerprints,
    );
    ObjectStorageSyncReport {
        provider_id,
        adapter_phase: "local-mirror-prototype".to_string(),
        prototype_mode: "local-mirror-fixture".to_string(),
        direction,
        mirror_path: path_to_string(mirror_root),
        preview_signature,
        applied,
        files_to_upload: count_kind(&operations, ObjectStorageSyncOperationKind::Upload),
        files_to_download: count_kind(&operations, ObjectStorageSyncOperationKind::Download),
        files_to_delete: count_kind(&operations, ObjectStorageSyncOperationKind::DeleteRemote),
        conflicts: count_kind(&operations, ObjectStorageSyncOperationKind::Conflict),
        excluded_files: count_kind(&operations, ObjectStorageSyncOperationKind::Exclude),
        operations,
        sync_report_path: extras.sync_report_path,
        conflict_artifacts: extras.conflict_artifacts,
    }
}

fn direction_label(direction: &SyncDirection) -> &'static str {
    match direction {
        SyncDirection::Push => "push",
        SyncDirection::Pull => "pull",
    }
}

pub(super) fn should_enter(entry: &DirEntry) -> bool {
    if entry.depth() == 0 {
        return true;
    }
    if !entry.file_type().is_dir() {
        return true;
    }
    let name = entry.file_name().to_string_lossy().to_ascii_lowercase();
    !matches!(name.as_str(), ".git" | "node_modules" | "target")
}

pub(super) fn should_skip_file(entry: &DirEntry) -> bool {
    let name = entry.file_name().to_string_lossy().to_ascii_lowercase();
    is_skipped_name(&name) || name.starts_with(".env")
}

pub(super) fn is_skipped_name(name: &str) -> bool {
    name.starts_with('.') || SKIPPED_DIRS.contains(&name) || SKIPPED_FILES.contains(&name)
}

pub(super) fn has_skipped_component(path: &Path) -> bool {
    path.components().rev().skip(1).any(|component| {
        let name = component.as_os_str().to_string_lossy().to_ascii_lowercase();
        is_skipped_name(&name)
    })
}

pub(super) fn relative_path(root: &Path, path: &Path) -> Result<String, String> {
    path.strip_prefix(root)
        .map(|relative| relative.to_string_lossy().replace('\\', "/"))
        .map_err(|_| "Failed to resolve sync file path".to_string())
}

fn files_differ(left: &Path, right: &Path) -> Result<bool, String> {
    let left_bytes = fs::read(left)
        .map_err(|_| "Object-storage sync could not read a local file.".to_string())?;
    let right_bytes = fs::read(right)
        .map_err(|_| "Object-storage sync could not read a mirror file.".to_string())?;
    Ok(left_bytes != right_bytes)
}

pub(super) fn copy_relative_file(
    from_root: &Path,
    to_root: &Path,
    relative: &str,
) -> Result<(), String> {
    let source = from_root.join(relative);
    let target = to_root.join(relative);
    if let Some(parent) = target.parent() {
        fs::create_dir_all(parent).map_err(|e| format!("Failed to create sync folder: {e}"))?;
    }
    fs::copy(&source, &target)
        .map(|_| ())
        .map_err(|_| "Object-storage sync could not copy a file.".to_string())
}

pub(super) fn remove_relative_file(root: &Path, relative: &str) -> Result<(), String> {
    let target = root.join(relative);
    if target.exists() {
        fs::remove_file(&target)
            .map_err(|_| "Object-storage sync could not delete a mirror file.".to_string())?;
    }
    Ok(())
}

pub(super) fn path_to_string(path: &Path) -> String {
    path.to_string_lossy().into_owned()
}
