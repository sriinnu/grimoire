use serde_yaml::Value;
use std::fs;
use std::path::{Component, Path, PathBuf};
use walkdir::WalkDir;

const LOCAL_ONLY_FIELD_KEYS: &[&str] = &[
    "egress",
    "locality",
    "localonly",
    "nosync",
    "neversync",
    "private",
];
const LOCAL_ONLY_TYPE_NAMES: &[&str] = &[
    "dream",
    "dreams",
    "health",
    "import report",
    "import-report",
    "journal",
    "journals",
    "memory",
    "private",
    "sadhana",
    "therapy",
];
const LOCAL_ONLY_PATH_SEGMENTS: &[&str] = &[
    "dream",
    "dreams",
    "health",
    "journal",
    "journals",
    "local-only",
    "memory",
    "private",
    "therapy",
];
const TRUE_LOCALITY_VALUES: &[&str] = &[
    "1",
    "always",
    "blocked",
    "deny",
    "denied",
    "local",
    "local-only",
    "local_only",
    "never",
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
    is_local_only_markdown_file(path) || is_local_only_import_attachment(vault_root, relative_path)
}

pub(crate) fn is_local_only_markdown_content(content: &str) -> bool {
    parse_frontmatter(content).is_some_and(|frontmatter| frontmatter_marks_local_only(&frontmatter))
}

fn is_local_only_markdown_file(path: &Path) -> bool {
    is_markdown_file(path)
        && fs::read_to_string(path)
            .ok()
            .is_some_and(|content| is_local_only_markdown_content(&content))
}

fn is_local_only_import_attachment(vault_root: &Path, relative_path: &Path) -> bool {
    if is_markdown_file(relative_path) {
        return false;
    }

    let Some(import_root) = import_root_for_attachment(vault_root, relative_path) else {
        return false;
    };
    if !import_root.is_dir() {
        return false;
    }

    WalkDir::new(import_root)
        .follow_links(false)
        .into_iter()
        .filter_map(Result::ok)
        .any(|entry| entry.file_type().is_file() && is_local_only_markdown_file(entry.path()))
}

fn import_root_for_attachment(vault_root: &Path, relative_path: &Path) -> Option<PathBuf> {
    let mut components = relative_path.components().filter_map(normal_component_text);
    if !components
        .next()
        .is_some_and(|segment| segment.eq_ignore_ascii_case("imports"))
    {
        return None;
    }
    let import_name = components.next()?;
    if !components.any(is_attachment_segment) {
        return None;
    }
    Some(vault_root.join("imports").join(import_name))
}

fn normal_component_text(component: Component<'_>) -> Option<String> {
    match component {
        Component::Normal(value) => Some(value.to_string_lossy().into_owned()),
        _ => None,
    }
}

fn is_attachment_segment(segment: String) -> bool {
    matches!(
        segment.to_ascii_lowercase().as_str(),
        "attachments" | "assets" | "files" | "media" | "resources"
    )
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
        let sadhana = vault.path().join("sadhana.md");
        let report = vault.path().join("import-report.md");
        let public = vault.path().join("public.md");
        fs::write(&journal, "---\ntype: Journal\n---\n# Day\n").unwrap();
        fs::write(&private, "---\nno_sync: yes\n---\n# Private\n").unwrap();
        fs::write(
            &sadhana,
            "---\ntype: Sadhana\nlocality: local\n---\n# Practice\n",
        )
        .unwrap();
        fs::write(&report, "---\ntype: Import Report\n---\n# Report\n").unwrap();
        fs::write(
            &public,
            "---\ntype: Project\nprivate: false\n---\n# Public\n",
        )
        .unwrap();

        assert!(is_local_only_export_file(vault.path(), &journal));
        assert!(is_local_only_export_file(vault.path(), &private));
        assert!(is_local_only_export_file(vault.path(), &sadhana));
        assert!(is_local_only_export_file(vault.path(), &report));
        assert!(!is_local_only_export_file(vault.path(), &public));
    }

    #[test]
    fn treats_import_attachments_as_local_when_their_import_contains_local_notes() {
        let vault = TempDir::new().unwrap();
        let spanda_root = vault.path().join("imports/spanda-export");
        let public_root = vault.path().join("imports/notion-export");
        fs::create_dir_all(spanda_root.join("attachments")).unwrap();
        fs::create_dir_all(public_root.join("attachments")).unwrap();
        let spanda_note = spanda_root.join("practice.md");
        let spanda_attachment = spanda_root.join("attachments/audio.m4a");
        let public_note = public_root.join("project.md");
        let public_attachment = public_root.join("attachments/diagram.png");

        fs::write(
            &spanda_note,
            "---\ntype: Sadhana\nlocality: local\n---\n# Practice\n",
        )
        .unwrap();
        fs::write(&spanda_attachment, "audio").unwrap();
        fs::write(&public_note, "---\ntype: Project\n---\n# Project\n").unwrap();
        fs::write(&public_attachment, "image").unwrap();

        assert!(is_local_only_export_file(vault.path(), &spanda_attachment));
        assert!(!is_local_only_export_file(vault.path(), &public_attachment));
    }
}
