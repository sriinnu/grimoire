use regex::Regex;
use serde_json::Value as JsonValue;
use serde_yaml::Value;
use std::collections::BTreeSet;
use std::fs;
use std::path::{Component, Path};
use std::sync::OnceLock;
use walkdir::WalkDir;

use super::locality::is_local_only_markdown_content;

macro_rules! regex {
    ($name:ident, $pattern:expr) => {
        fn $name() -> &'static Regex {
            static RE: OnceLock<Regex> = OnceLock::new();
            RE.get_or_init(|| Regex::new($pattern).unwrap())
        }
    };
}

regex!(markdown_link_re, r"!?\[[^\]]*\]\(([^)]+)\)");
regex!(
    wikilink_attachment_re,
    r"!\[\[([^\]|#]+)(?:#[^\]|]*)?(?:\|[^\]]*)?\]\]"
);
regex!(html_attachment_re, r#"\b(?:src|href)=["']([^"']+)["']"#);
regex!(canvas_fence_re, r"(?s)```grimoire-canvas\s*\n(.*?)\n```");

const ATTACHMENT_FRONTMATTER_KEYS: &[&str] = &[
    "attachment",
    "attachments",
    "assets",
    "audio",
    "files",
    "media",
    "resources",
    "sourceaudio",
];

/// Returns attachment paths referenced by local-only Markdown files in a vault.
pub(crate) fn local_only_referenced_attachments(
    vault_root: &Path,
) -> Result<BTreeSet<String>, String> {
    let mut attachments = BTreeSet::new();
    for entry in WalkDir::new(vault_root).follow_links(false) {
        let entry = entry.map_err(|e| format!("Failed to inspect local-only attachments: {e}"))?;
        if !entry.file_type().is_file() || !is_markdown_file(entry.path()) {
            continue;
        }
        let content = fs::read_to_string(entry.path())
            .map_err(|e| format!("Failed to read {}: {e}", entry.path().display()))?;
        if !is_local_only_markdown_content(&content) {
            continue;
        }
        let note_relative = entry
            .path()
            .strip_prefix(vault_root)
            .map_err(|_| "Failed to resolve local-only note path".to_string())?;
        collect_markdown_attachment_refs(note_relative, &content, &mut attachments);
        collect_canvas_attachment_refs(vault_root, note_relative, &content, &mut attachments);
        if let Some(frontmatter) = parse_frontmatter(&content) {
            collect_frontmatter_attachment_refs(note_relative, &frontmatter, &mut attachments);
        }
    }
    Ok(attachments)
}

fn is_markdown_file(path: &Path) -> bool {
    path.extension()
        .map(|extension| extension.to_string_lossy().to_ascii_lowercase())
        .is_some_and(|extension| matches!(extension.as_str(), "md" | "markdown" | "mdown" | "mkd"))
}

fn parse_frontmatter(content: &str) -> Option<Value> {
    let rest = content.strip_prefix("---")?;
    let end = rest.find("\n---")?;
    let frontmatter = &rest[..end];
    serde_yaml::from_str(frontmatter).ok()
}

fn collect_markdown_attachment_refs(
    note_relative: &Path,
    content: &str,
    attachments: &mut BTreeSet<String>,
) {
    for captures in markdown_link_re().captures_iter(content) {
        if let Some(raw_path) = captures.get(1) {
            insert_attachment_ref(note_relative, raw_path.as_str(), attachments);
        }
    }
    for captures in wikilink_attachment_re().captures_iter(content) {
        if let Some(raw_path) = captures.get(1) {
            insert_attachment_ref(note_relative, raw_path.as_str(), attachments);
        }
    }
    for captures in html_attachment_re().captures_iter(content) {
        if let Some(raw_path) = captures.get(1) {
            insert_attachment_ref(note_relative, raw_path.as_str(), attachments);
        }
    }
}

fn collect_canvas_attachment_refs(
    vault_root: &Path,
    note_relative: &Path,
    content: &str,
    attachments: &mut BTreeSet<String>,
) {
    for captures in canvas_fence_re().captures_iter(content) {
        let Some(body) = captures.get(1) else {
            continue;
        };
        if let Ok(metadata) = serde_yaml::from_str::<Value>(body.as_str()) {
            let source = canvas_source_ref(note_relative, &metadata);
            collect_attachment_value_refs(note_relative, &metadata, attachments);
            if let Some(source) = source {
                collect_canvas_source_refs(vault_root, &source, attachments);
            }
        }
    }
}

fn canvas_source_ref(note_relative: &Path, metadata: &Value) -> Option<String> {
    let mapping = metadata.as_mapping()?;
    let source = mapping.iter().find_map(|(key, value)| {
        (normalize_key(key.as_str().unwrap_or_default()) == "source").then_some(value.as_str())?
    })?;
    normalize_attachment_ref(note_relative, source)
}

fn collect_canvas_source_refs(
    vault_root: &Path,
    source_ref: &str,
    attachments: &mut BTreeSet<String>,
) {
    let Ok(raw) = fs::read_to_string(vault_root.join(source_ref)) else {
        return;
    };
    let Ok(json) = serde_json::from_str::<JsonValue>(&raw) else {
        return;
    };
    collect_canvas_json_refs(&json, attachments);
}

fn collect_canvas_json_refs(value: &JsonValue, attachments: &mut BTreeSet<String>) {
    match value {
        JsonValue::Array(items) => {
            for item in items {
                collect_canvas_json_refs(item, attachments);
            }
        }
        JsonValue::Object(mapping) => {
            for (key, value) in mapping {
                if normalize_key(key) == "src" {
                    if let Some(path) = value.as_str() {
                        insert_canvas_json_ref(path, attachments);
                    }
                }
                collect_canvas_json_refs(value, attachments);
            }
        }
        _ => {}
    }
}

fn collect_frontmatter_attachment_refs(
    note_relative: &Path,
    frontmatter: &Value,
    attachments: &mut BTreeSet<String>,
) {
    let Some(mapping) = frontmatter.as_mapping() else {
        return;
    };
    for (key, value) in mapping {
        let key = key.as_str().unwrap_or_default();
        if ATTACHMENT_FRONTMATTER_KEYS.contains(&normalize_key(key).as_str()) {
            collect_attachment_value_refs(note_relative, value, attachments);
        }
    }
}

fn collect_attachment_value_refs(
    note_relative: &Path,
    value: &Value,
    attachments: &mut BTreeSet<String>,
) {
    match value {
        Value::String(path) => insert_attachment_ref(note_relative, path, attachments),
        Value::Sequence(items) => {
            for item in items {
                collect_attachment_value_refs(note_relative, item, attachments);
            }
        }
        Value::Mapping(mapping) => {
            for value in mapping.values() {
                collect_attachment_value_refs(note_relative, value, attachments);
            }
        }
        _ => {}
    }
}

fn insert_attachment_ref(note_relative: &Path, raw_path: &str, attachments: &mut BTreeSet<String>) {
    if let Some(path) = normalize_attachment_ref(note_relative, raw_path) {
        attachments.insert(path);
    }
}

fn insert_canvas_json_ref(raw_path: &str, attachments: &mut BTreeSet<String>) {
    if let Some(path) = normalize_vault_relative_ref(raw_path) {
        attachments.insert(path);
    }
}

fn normalize_attachment_ref(note_relative: &Path, raw_path: &str) -> Option<String> {
    let trimmed = raw_path
        .split_whitespace()
        .next()
        .unwrap_or_default()
        .trim_matches('"')
        .trim_matches('\'');
    let path = trimmed.split(['#', '?']).next()?.trim();
    if path.is_empty()
        || path.starts_with('#')
        || path.starts_with('/')
        || path.starts_with('\\')
        || path.contains("://")
        || path.starts_with("mailto:")
    {
        return None;
    }

    let mut parts = note_relative
        .parent()
        .map(Path::to_path_buf)
        .unwrap_or_default();
    parts.push(path);
    clean_relative_path(&parts)
}

fn normalize_vault_relative_ref(raw_path: &str) -> Option<String> {
    let trimmed = raw_path
        .split_whitespace()
        .next()
        .unwrap_or_default()
        .trim_matches('"')
        .trim_matches('\'');
    let path = trimmed.split(['#', '?']).next()?.trim();
    if path.is_empty()
        || path.starts_with('#')
        || path.starts_with('/')
        || path.starts_with('\\')
        || path.contains("://")
        || path.starts_with("mailto:")
    {
        return None;
    }
    clean_relative_path(Path::new(path))
}

fn clean_relative_path(path: &Path) -> Option<String> {
    let mut parts = Vec::new();
    for component in path.components() {
        match component {
            Component::Normal(value) => parts.push(value.to_string_lossy().into_owned()),
            Component::CurDir => {}
            Component::ParentDir => {
                parts.pop()?;
            }
            Component::Prefix(_) | Component::RootDir => return None,
        }
    }
    if parts.is_empty() {
        None
    } else {
        Some(parts.join("/"))
    }
}

fn normalize_key(value: &str) -> String {
    value
        .chars()
        .filter(|ch| !matches!(ch, '_' | '-' | ' '))
        .flat_map(char::to_lowercase)
        .collect()
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;
    use tempfile::TempDir;

    #[test]
    fn collects_canvas_wikilink_and_html_refs_from_local_only_notes() {
        let vault = TempDir::new().unwrap();
        fs::create_dir_all(vault.path().join("attachments")).unwrap();
        fs::write(vault.path().join("attachments/sketch.json"), "{}").unwrap();
        fs::write(vault.path().join("attachments/sketch.png"), "image").unwrap();
        fs::write(vault.path().join("attachments/placed.png"), "image").unwrap();
        fs::write(vault.path().join("attachments/wiki.png"), "image").unwrap();
        fs::write(vault.path().join("attachments/audio.m4a"), "audio").unwrap();
        fs::write(
            vault.path().join("attachments/sketch.json"),
            r#"{"version":1,"images":[{"src":"attachments/placed.png"}],"strokes":[]}"#,
        )
        .unwrap();
        fs::write(
            vault.path().join("private.md"),
            "---\nlocality: local\n---\n# Private\n\n![[attachments/wiki.png]]\n<audio src=\"attachments/audio.m4a\"></audio>\n```grimoire-canvas\ntype: handwriting\nsource: attachments/sketch.json\npreview: attachments/sketch.png\n```\n",
        )
        .unwrap();

        let refs = local_only_referenced_attachments(vault.path()).unwrap();

        assert!(refs.contains("attachments/audio.m4a"));
        assert!(refs.contains("attachments/placed.png"));
        assert!(refs.contains("attachments/sketch.json"));
        assert!(refs.contains("attachments/sketch.png"));
        assert!(refs.contains("attachments/wiki.png"));
    }
}
