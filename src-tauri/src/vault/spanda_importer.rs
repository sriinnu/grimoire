use serde_json::Value;
use std::collections::HashMap;
use std::fs;
use std::path::Path;

use super::app_importer::{import_markdown_like_export, AppImportKind, AppImportState};
use super::app_importer_io::{
    copy_file, extension, is_attachment, record_failure, unique_destination_path, walk_files,
    write_text_file,
};
use super::journal_import_helpers::slugify_name;

const SPANDA_TEMPORAL_KEYS: &[&str] = &[
    "created",
    "createdAt",
    "date",
    "endedAt",
    "startedAt",
    "started_at",
    "timestamp",
];
const SPANDA_PRACTICE_KEYS: &[&str] = &["practice", "sadhana", "japa", "pranayama"];
const SPANDA_DETAIL_KEYS: &[&str] = &["count", "mantra", "notes", "reflection", "rounds"];

pub(super) fn import_spanda_export(
    selected_source: &Path,
    source_root: &Path,
    import_root: &Path,
    state: &mut AppImportState,
) -> Result<(), String> {
    let entries = collect_spanda_entries(selected_source, source_root, state)?;
    if entries.is_empty() {
        import_markdown_like_export(AppImportKind::Spanda, source_root, import_root, state)?;
        if state.notes == 0 {
            return Err(
                "No Spanda sessions or Markdown notes were found in that export".to_string(),
            );
        }
        return Ok(());
    }

    let mut used_names = HashMap::<String, usize>::new();
    for entry in entries {
        let destination = import_root.join(unique_spanda_note_name(&entry, &mut used_names));
        let content = format_spanda_markdown(&entry)?;
        match write_text_file(&destination, &content) {
            Ok(()) => state.notes += 1,
            Err(error) => record_failure(state, error),
        }
    }
    copy_spanda_assets(source_root, import_root, state)?;
    Ok(())
}

fn collect_spanda_entries(
    selected_source: &Path,
    source_root: &Path,
    state: &mut AppImportState,
) -> Result<Vec<Value>, String> {
    let json_files =
        if selected_source.is_file() && extension(selected_source).as_deref() == Some("json") {
            vec![selected_source.to_path_buf()]
        } else {
            walk_files(source_root)?
                .into_iter()
                .filter(|path| extension(path).as_deref() == Some("json"))
                .collect()
        };

    let mut entries = Vec::new();
    for file in json_files {
        match read_spanda_entries(&file) {
            Ok(mut found) if !found.is_empty() => entries.append(&mut found),
            Ok(_) => state.skipped += 1,
            Err(error) => record_failure(state, error),
        }
    }
    Ok(entries)
}

fn read_spanda_entries(path: &Path) -> Result<Vec<Value>, String> {
    let raw =
        fs::read_to_string(path).map_err(|e| format!("Failed to read {}: {e}", path.display()))?;
    let value: Value = serde_json::from_str(&raw)
        .map_err(|e| format!("Failed to parse {} as JSON: {e}", path.display()))?;
    Ok(match value {
        Value::Array(items) => filter_spanda_entries(items),
        Value::Object(map) => ["sessions", "practices", "entries", "items"]
            .iter()
            .find_map(|key| map.get(*key).and_then(Value::as_array).cloned())
            .map(filter_spanda_entries)
            .unwrap_or_else(|| {
                let entry = Value::Object(map);
                if is_spanda_entry(&entry) {
                    vec![entry]
                } else {
                    Vec::new()
                }
            }),
        _ => Vec::new(),
    })
}

fn filter_spanda_entries(items: Vec<Value>) -> Vec<Value> {
    items.into_iter().filter(is_spanda_entry).collect()
}

fn is_spanda_entry(value: &Value) -> bool {
    let Some(object) = value.as_object() else {
        return false;
    };
    let has_temporal_key = SPANDA_TEMPORAL_KEYS
        .iter()
        .any(|key| object.contains_key(*key));
    let has_practice_key = SPANDA_PRACTICE_KEYS
        .iter()
        .any(|key| object.contains_key(*key));
    let has_detail_key = SPANDA_DETAIL_KEYS
        .iter()
        .any(|key| object.contains_key(*key));

    has_temporal_key && (has_practice_key || has_detail_key)
}

fn format_spanda_markdown(entry: &Value) -> Result<String, String> {
    let title = value_string(entry, &["title", "name", "practice", "sadhana", "summary"])
        .unwrap_or_else(|| "Spanda Practice Session".to_string());
    let date = value_string(
        entry,
        &["date", "created", "createdAt", "startedAt", "timestamp"],
    );
    let practice = value_string(entry, &["practice", "kind", "type", "sadhana"]);
    let notes = value_string(
        entry,
        &["notes", "body", "content", "description", "reflection"],
    )
    .unwrap_or_default();
    let tags = value_string_array(entry, "tags");
    let frontmatter = serde_yaml::to_string(&serde_json::json!({
        "type": "Sadhana",
        "source_app": "spanda",
        "source_id": value_string(entry, &["id", "uuid", "_id"]),
        "date": date,
        "practice": practice,
        "tags": tags,
        "locality": "local",
        "local_only": true,
    }))
    .map_err(|e| format!("Failed to serialize Spanda frontmatter: {e}"))?;
    let source_json = serde_json::to_string_pretty(entry)
        .map_err(|e| format!("Failed to serialize Spanda source JSON: {e}"))?;
    Ok(format!(
        "---\n{frontmatter}---\n\n# {}\n\n{}\n\n## Source Fields\n\n```json\n{}\n```\n",
        title.trim(),
        notes.trim(),
        source_json
    ))
}

fn copy_spanda_assets(
    source_root: &Path,
    import_root: &Path,
    state: &mut AppImportState,
) -> Result<(), String> {
    if source_root.is_file() {
        return Ok(());
    }
    for source_file in walk_files(source_root)? {
        if is_attachment(&source_file) && extension(&source_file).as_deref() != Some("json") {
            let file_name = source_file
                .file_name()
                .map(|value| value.to_string_lossy().into_owned())
                .unwrap_or_else(|| "attachment".to_string());
            let destination =
                unique_destination_path(import_root.join("attachments").join(file_name), state);
            match copy_file(&source_file, &destination) {
                Ok(()) => state.assets += 1,
                Err(error) => record_failure(state, error),
            }
        }
    }
    Ok(())
}

fn unique_spanda_note_name(entry: &Value, used: &mut HashMap<String, usize>) -> String {
    let title = value_string(entry, &["title", "name", "practice", "sadhana", "summary"])
        .unwrap_or_else(|| "spanda-session".to_string());
    let date = value_string(
        entry,
        &["date", "created", "createdAt", "startedAt", "timestamp"],
    )
    .and_then(|value| value.get(0..10).map(ToOwned::to_owned))
    .unwrap_or_else(|| "undated".to_string());
    let base = format!("{date}-{}", slugify_name(&title));
    let key = if base.ends_with('-') {
        format!("{base}session")
    } else {
        base
    };
    let count = used.entry(key.clone()).or_insert(0);
    *count += 1;
    if *count == 1 {
        format!("{key}.md")
    } else {
        format!("{key}-{count}.md")
    }
}

fn value_string(value: &Value, keys: &[&str]) -> Option<String> {
    let object = value.as_object()?;
    keys.iter()
        .find_map(|key| object.get(*key).and_then(Value::as_str))
        .map(str::trim)
        .filter(|value| !value.is_empty())
        .map(ToOwned::to_owned)
}

fn value_string_array(value: &Value, key: &str) -> Vec<String> {
    let mut values = value
        .as_object()
        .and_then(|object| object.get(key))
        .and_then(Value::as_array)
        .map(|items| {
            items
                .iter()
                .filter_map(Value::as_str)
                .map(ToOwned::to_owned)
                .collect::<Vec<_>>()
        })
        .unwrap_or_default();
    values.sort();
    values.dedup();
    values
}
