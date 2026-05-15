use serde_yaml::Value;
use std::fs;
use std::path::Path;

const LOCAL_ONLY_FIELD_KEYS: &[&str] = &["localonly", "nosync", "neversync", "private"];
const LOCAL_ONLY_TYPE_NAMES: &[&str] = &[
    "dream", "dreams", "health", "journal", "journals", "private", "therapy",
];
const LOCAL_ONLY_PATH_SEGMENTS: &[&str] = &[
    "dream",
    "dreams",
    "health",
    "journal",
    "journals",
    "local-only",
    "private",
    "therapy",
];
const TRUE_LOCALITY_VALUES: &[&str] = &[
    "1",
    "always",
    "local",
    "local-only",
    "local_only",
    "private",
    "true",
    "yes",
];

/// Returns true when a relative vault path is protected by its lane/folder.
pub(crate) fn is_local_only_relative_path(path: &Path) -> bool {
    path.components().any(|component| {
        let segment = component.as_os_str().to_string_lossy().to_ascii_lowercase();
        LOCAL_ONLY_PATH_SEGMENTS.contains(&segment.as_str())
    })
}

/// Returns true when a file must stay out of portable exports.
pub(crate) fn is_local_only_export_file(vault_root: &Path, path: &Path) -> bool {
    let relative_path = path.strip_prefix(vault_root).unwrap_or(path);
    if is_local_only_relative_path(relative_path) {
        return true;
    }
    if !is_markdown_file(path) {
        return false;
    }
    fs::read_to_string(path)
        .ok()
        .and_then(|content| parse_frontmatter(&content))
        .is_some_and(|frontmatter| frontmatter_marks_local_only(&frontmatter))
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

fn frontmatter_marks_local_only(frontmatter: &Value) -> bool {
    let Some(mapping) = frontmatter.as_mapping() else {
        return false;
    };
    mapping.iter().any(|(key, value)| {
        let key = key.as_str().unwrap_or_default();
        let normalized_key = normalize_key(key);
        if LOCAL_ONLY_FIELD_KEYS.contains(&normalized_key.as_str()) {
            return value_marks_true(value);
        }
        if matches!(normalized_key.as_str(), "type" | "isa") {
            return value_matches_local_only_type(value);
        }
        false
    })
}

fn value_marks_true(value: &Value) -> bool {
    match value {
        Value::Bool(true) => true,
        Value::Number(number) => number.as_i64() == Some(1) || number.as_u64() == Some(1),
        Value::String(text) => TRUE_LOCALITY_VALUES.contains(&normalize_value(text).as_str()),
        Value::Sequence(items) => items.iter().any(value_marks_true),
        _ => false,
    }
}

fn value_matches_local_only_type(value: &Value) -> bool {
    match value {
        Value::String(text) => LOCAL_ONLY_TYPE_NAMES.contains(&normalize_value(text).as_str()),
        Value::Sequence(items) => items.iter().any(value_matches_local_only_type),
        _ => false,
    }
}

fn normalize_key(value: &str) -> String {
    value
        .chars()
        .filter(|ch| !matches!(ch, '_' | '-' | ' '))
        .flat_map(char::to_lowercase)
        .collect()
}

fn normalize_value(value: &str) -> String {
    value.trim().to_ascii_lowercase()
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;
    use tempfile::TempDir;

    #[test]
    fn detects_local_only_paths_from_relative_lanes() {
        assert!(is_local_only_relative_path(Path::new("Dreams/hidden.md")));
        assert!(is_local_only_relative_path(Path::new(
            "notes/local-only/hidden.md"
        )));
        assert!(!is_local_only_relative_path(Path::new(
            "projects/private-sector.md"
        )));
    }

    #[test]
    fn detects_frontmatter_and_type_markers() {
        let vault = TempDir::new().unwrap();
        let journal = vault.path().join("daily.md");
        let private = vault.path().join("note.md");
        let public = vault.path().join("public.md");
        fs::write(&journal, "---\ntype: Journal\n---\n# Day\n").unwrap();
        fs::write(&private, "---\nno_sync: yes\n---\n# Private\n").unwrap();
        fs::write(
            &public,
            "---\ntype: Project\nprivate: false\n---\n# Public\n",
        )
        .unwrap();

        assert!(is_local_only_export_file(vault.path(), &journal));
        assert!(is_local_only_export_file(vault.path(), &private));
        assert!(!is_local_only_export_file(vault.path(), &public));
    }
}
