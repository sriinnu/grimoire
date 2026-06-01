use std::collections::HashMap;
use std::fs;
use std::path::Path;
use walkdir::WalkDir;

use super::{parse_md_file, parse_non_md_file, FolderNode, VaultEntry};
use crate::git::GitDates;

/// Directories hidden from user-facing vault scans.
const HIDDEN_DIRS: &[&str] = &[".git", ".grimoire", ".DS_Store"];
/// Dependency and build output directories that make code-project vaults unusably slow.
const SCAN_EXCLUDED_DIRS: &[&str] = &[
    "node_modules",
    "dist",
    "build",
    "out",
    "coverage",
    "target",
    "deriveddata",
    "pods",
    "carthage",
    "vendor",
    "venv",
    "__pycache__",
];
/// Keep type definitions in their dedicated sidebar section instead of the generic folder tree.
const FOLDER_TREE_EXCLUDED_DIRS: &[&str] = &["type"];

fn is_scan_excluded_dir(name: &str) -> bool {
    let lower = name.to_lowercase();
    SCAN_EXCLUDED_DIRS.contains(&lower.as_str())
}

pub(super) fn is_hidden_dir(name: &str) -> bool {
    name.starts_with('.') || HIDDEN_DIRS.contains(&name) || is_scan_excluded_dir(name)
}

fn is_folder_tree_hidden_dir(name: &str) -> bool {
    is_hidden_dir(name) || FOLDER_TREE_EXCLUDED_DIRS.contains(&name)
}

pub(crate) fn is_md_file(path: &Path) -> bool {
    path.is_file()
        && path.extension().is_some_and(|ext| {
            let ext = ext.to_string_lossy().to_lowercase();
            ext == "md" || ext == "markdown"
        })
}

/// Extensions recognized as editable text files (opened in raw editor).
const TEXT_EXTENSIONS: &[&str] = &[
    "yml",
    "yaml",
    "json",
    "txt",
    "toml",
    "csv",
    "xml",
    "html",
    "htm",
    "css",
    "scss",
    "less",
    "ts",
    "tsx",
    "js",
    "jsx",
    "py",
    "rs",
    "sh",
    "bash",
    "zsh",
    "fish",
    "rb",
    "go",
    "java",
    "kt",
    "c",
    "cpp",
    "h",
    "hpp",
    "swift",
    "lua",
    "sql",
    "graphql",
    "env",
    "ini",
    "cfg",
    "conf",
    "properties",
    "makefile",
    "dockerfile",
    "gitignore",
    "editorconfig",
    "mdx",
    "svelte",
    "vue",
    "astro",
    "tf",
    "hcl",
    "nix",
    "zig",
    "hs",
    "ml",
    "ex",
    "exs",
    "erl",
    "clj",
    "lisp",
    "el",
    "vim",
    "r",
    "jl",
    "ps1",
    "bat",
    "cmd",
];

/// Classify a file extension into "markdown", "text", or "binary".
pub(crate) fn classify_file_kind(path: &Path) -> &'static str {
    let ext = match path.extension() {
        Some(e) => e.to_string_lossy().to_lowercase(),
        None => return classify_extensionless_file(path),
    };
    if ext == "md" || ext == "markdown" {
        "markdown"
    } else if TEXT_EXTENSIONS.contains(&ext.as_str()) {
        "text"
    } else {
        "binary"
    }
}

fn classify_extensionless_file(path: &Path) -> &'static str {
    let name = path
        .file_name()
        .map(|n| n.to_string_lossy().to_lowercase())
        .unwrap_or_default();
    if [
        "makefile",
        "dockerfile",
        "rakefile",
        "gemfile",
        "procfile",
        "brewfile",
        ".gitignore",
        ".gitattributes",
        ".editorconfig",
        ".env",
    ]
    .contains(&name.as_str())
    {
        "text"
    } else {
        "binary"
    }
}

/// For `.yml` files, try to extract the `name` field from the YAML content.
pub(super) fn extract_yml_name(path: &Path) -> Option<String> {
    let ext = path.extension()?.to_str()?;
    if ext != "yml" && ext != "yaml" {
        return None;
    }
    let content = fs::read_to_string(path).ok()?;
    let mapping: serde_yaml::Value = serde_yaml::from_str(&content).ok()?;
    mapping.get("name")?.as_str().map(|s| s.to_string())
}

fn lookup_git_dates(
    path: &Path,
    vault_path: &Path,
    git_dates: &HashMap<String, GitDates>,
) -> Option<(u64, u64)> {
    let rel = path
        .strip_prefix(vault_path)
        .ok()?
        .to_string_lossy()
        .to_string();
    git_dates.get(&rel).map(|d| (d.modified_at, d.created_at))
}

pub(super) fn try_parse_file(
    path: &Path,
    vault_path: &Path,
    git_dates: &HashMap<String, GitDates>,
    entries: &mut Vec<VaultEntry>,
) {
    let dates = lookup_git_dates(path, vault_path, git_dates);
    let result = if is_md_file(path) {
        parse_md_file(path, dates)
    } else {
        parse_non_md_file(path, dates)
    };
    match result {
        Ok(vault_entry) => entries.push(vault_entry),
        Err(e) => log::warn!("Skipping file: {}", e),
    }
}

/// Scan all files in the vault, including subdirectories.
fn scan_all_files(
    vault_path: &Path,
    git_dates: &HashMap<String, GitDates>,
    entries: &mut Vec<VaultEntry>,
) {
    let walker = WalkDir::new(vault_path)
        .follow_links(false)
        .into_iter()
        .filter_entry(|entry| {
            if entry.file_type().is_dir() {
                let name = entry.file_name().to_string_lossy();
                return entry.depth() == 0 || !is_hidden_dir(&name);
            }
            true
        });
    for entry in walker.filter_map(|e| e.ok()) {
        if entry.file_type().is_file() {
            let fname = entry.file_name().to_string_lossy();
            if fname.starts_with('.') {
                continue;
            }
            try_parse_file(entry.path(), vault_path, git_dates, entries);
        }
    }
}

/// Scan a directory recursively for all files and return VaultEntry for each.
pub fn scan_vault(
    vault_path: &Path,
    git_dates: &HashMap<String, GitDates>,
) -> Result<Vec<VaultEntry>, String> {
    if !vault_path.exists() {
        return Err(format!(
            "Vault path does not exist: {}",
            vault_path.display()
        ));
    }
    if !vault_path.is_dir() {
        return Err(format!(
            "Vault path is not a directory: {}",
            vault_path.display()
        ));
    }

    if let Err(err) = super::rename::recover_pending_rename_transactions(vault_path) {
        log::warn!(
            "Failed to recover pending rename transactions in {}: {}",
            vault_path.display(),
            err
        );
    }

    let mut entries = Vec::new();
    scan_all_files(vault_path, git_dates, &mut entries);
    entries.sort_by_key(|entry| std::cmp::Reverse(entry.modified_at));
    Ok(entries)
}

/// Build a tree of user-created folders in the vault.
pub fn scan_vault_folders(vault_path: &Path) -> Result<Vec<FolderNode>, String> {
    if !vault_path.is_dir() {
        return Err(format!("Not a directory: {}", vault_path.display()));
    }
    Ok(build_tree(vault_path, vault_path))
}

fn build_tree(dir: &Path, vault_root: &Path) -> Vec<FolderNode> {
    let mut nodes = Vec::new();
    let entries = match fs::read_dir(dir) {
        Ok(d) => d,
        Err(_) => return nodes,
    };
    for entry in entries.flatten() {
        let path = entry.path();
        if !path.is_dir() {
            continue;
        }
        let name = entry.file_name().to_string_lossy().to_string();
        if is_folder_tree_hidden_dir(&name) {
            continue;
        }
        let rel_path = path
            .strip_prefix(vault_root)
            .unwrap_or(&path)
            .to_string_lossy()
            .replace('\\', "/");
        let children = build_tree(&path, vault_root);
        nodes.push(FolderNode {
            name,
            path: rel_path,
            children,
        });
    }
    nodes.sort_by_key(|node| node.name.to_lowercase());
    nodes
}
