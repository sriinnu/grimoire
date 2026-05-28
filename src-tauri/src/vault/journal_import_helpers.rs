use chrono::{DateTime, TimeZone, Utc};
use serde_json::Value;
use std::collections::HashMap;
use std::fs;
use std::path::Path;

#[derive(Debug)]
pub(super) struct JournalEntry {
    pub id: String,
    pub title: String,
    pub text: String,
    pub created: Option<String>,
    pub modified: Option<String>,
    pub tags: Vec<String>,
    pub media_keys: Vec<String>,
    pub raw_source: String,
    pub source_path: String,
}

pub(super) fn read_entries_from_json(
    path: &Path,
    source_kind: &str,
) -> Result<Vec<JournalEntry>, String> {
    let raw =
        fs::read_to_string(path).map_err(|e| format!("Failed to read {}: {e}", path.display()))?;
    let value: Value = serde_json::from_str(&raw)
        .map_err(|e| format!("Failed to parse {} as JSON: {e}", path.display()))?;
    let values = match &value {
        Value::Object(map) => map
            .get("entries")
            .and_then(Value::as_array)
            .cloned()
            .unwrap_or_else(|| vec![value]),
        Value::Array(items) => items.clone(),
        _ => Vec::new(),
    };
    let source_path = path.to_string_lossy().into_owned();
    Ok(values
        .iter()
        .filter_map(|entry| parse_journal_entry(entry, source_kind, &source_path))
        .collect())
}

pub(super) fn format_entry_markdown(
    entry: &JournalEntry,
    source_kind: &str,
    links: &[String],
) -> Result<String, String> {
    let frontmatter = serde_yaml::to_string(&serde_json::json!({
        "type": "Journal",
        "source_app": source_kind,
        "source_id": entry.id,
        "source_kind": entry.raw_source,
        "created": entry.created,
        "modified": entry.modified,
        "tags": entry.tags,
        "attachments": links,
    }))
    .map_err(|e| format!("Failed to serialize journal frontmatter: {e}"))?;
    let mut body = format!(
        "---\n{}---\n\n# {}\n\n{}",
        frontmatter,
        entry.title.trim(),
        entry.text.trim()
    );
    if !links.is_empty() {
        body.push_str("\n\n## Attachments\n\n");
        for link in links {
            if is_image_link(link) {
                body.push_str(&format!("![]({link})\n"));
            } else {
                body.push_str(&format!("- [{link}]({link})\n"));
            }
        }
    }
    body.push('\n');
    Ok(body)
}

pub(super) fn unique_note_name(
    entry: &JournalEntry,
    used_names: &mut HashMap<String, usize>,
) -> String {
    let date = entry
        .created
        .as_deref()
        .and_then(|value| value.get(0..10))
        .unwrap_or("undated");
    let base = format!("{date}-{}", slugify_name(&entry.title));
    let key = if base.ends_with('-') {
        format!("{base}entry")
    } else {
        base
    };
    let count = used_names.entry(key.clone()).or_insert(0);
    *count += 1;
    if *count == 1 {
        format!("{key}.md")
    } else {
        format!("{key}-{}.md", *count)
    }
}

fn parse_journal_entry(
    value: &Value,
    source_kind: &str,
    source_path: &str,
) -> Option<JournalEntry> {
    let object = value.as_object()?;
    let text = first_string(
        object,
        &[
            "text",
            "markdown",
            "content",
            "body",
            "preview_text",
            "html",
        ],
    )?;
    let created = first_temporal(
        object,
        &[
            "creationDate",
            "createdDate",
            "created",
            "date",
            "date_journal",
            "timestamp",
        ],
    );
    let modified = first_temporal(
        object,
        &["modifiedDate", "updatedDate", "modified", "updated"],
    );
    let id = first_string(object, &["uuid", "id", "_id", "identifier"]).unwrap_or_else(|| {
        format!(
            "{}-{}",
            source_kind,
            created.clone().unwrap_or_else(|| "entry".into())
        )
    });
    let title = first_string(object, &["title", "summary"])
        .or_else(|| first_markdown_heading(&text))
        .unwrap_or_else(|| first_nonempty_line(&text).unwrap_or_else(|| "Journal Entry".into()));
    Some(JournalEntry {
        id,
        title,
        text,
        created,
        modified,
        tags: collect_tags(object),
        media_keys: collect_media_keys(object),
        raw_source: source_kind.to_string(),
        source_path: source_path.to_string(),
    })
}

fn first_string(map: &serde_json::Map<String, Value>, keys: &[&str]) -> Option<String> {
    keys.iter()
        .find_map(|key| map.get(*key).and_then(Value::as_str))
        .map(str::trim)
        .filter(|value| !value.is_empty())
        .map(ToOwned::to_owned)
}

fn first_temporal(map: &serde_json::Map<String, Value>, keys: &[&str]) -> Option<String> {
    for key in keys {
        let Some(value) = map.get(*key) else {
            continue;
        };
        if let Some(text) = value.as_str().and_then(normalize_date_string) {
            return Some(text);
        }
        if let Some(number) = value.as_i64().and_then(normalize_timestamp) {
            return Some(number);
        }
    }
    None
}

fn normalize_date_string(value: &str) -> Option<String> {
    DateTime::parse_from_rfc3339(value)
        .map(|date| date.with_timezone(&Utc).to_rfc3339())
        .ok()
        .or_else(|| {
            if value.trim().is_empty() {
                None
            } else {
                Some(value.trim().to_string())
            }
        })
}

fn normalize_timestamp(value: i64) -> Option<String> {
    let seconds = if value > 10_000_000_000 {
        value / 1000
    } else {
        value
    };
    Utc.timestamp_opt(seconds, 0)
        .single()
        .map(|date| date.to_rfc3339())
}

fn collect_tags(map: &serde_json::Map<String, Value>) -> Vec<String> {
    let mut tags = Vec::new();
    for key in ["tags", "labels"] {
        if let Some(Value::Array(items)) = map.get(key) {
            tags.extend(
                items
                    .iter()
                    .filter_map(Value::as_str)
                    .map(ToOwned::to_owned),
            );
        }
    }
    tags.sort();
    tags.dedup();
    tags
}

fn collect_media_keys(map: &serde_json::Map<String, Value>) -> Vec<String> {
    let mut keys = Vec::new();
    for field in ["photos", "videos", "audios", "pdfs", "media", "attachments"] {
        if let Some(Value::Array(items)) = map.get(field) {
            for item in items {
                collect_media_keys_from_value(item, &mut keys);
            }
        }
    }
    keys.sort();
    keys.dedup();
    keys
}

fn collect_media_keys_from_value(value: &Value, keys: &mut Vec<String>) {
    match value {
        Value::String(text) => keys.push(text.to_string()),
        Value::Object(map) => {
            for field in ["md5", "identifier", "filename", "fileName", "path", "url"] {
                if let Some(text) = map.get(field).and_then(Value::as_str) {
                    keys.push(text.to_string());
                }
            }
        }
        _ => {}
    }
}

fn first_markdown_heading(text: &str) -> Option<String> {
    text.lines()
        .find_map(|line| line.trim().strip_prefix("# "))
        .map(str::trim)
        .filter(|line| !line.is_empty())
        .map(ToOwned::to_owned)
}

fn first_nonempty_line(text: &str) -> Option<String> {
    text.lines()
        .map(str::trim)
        .find(|line| !line.is_empty())
        .map(|line| line.chars().take(80).collect())
}

pub(super) fn slugify_name(value: &str) -> String {
    let mut output = String::new();
    let mut previous_dash = false;
    for ch in value.chars().flat_map(char::to_lowercase) {
        if ch.is_ascii_alphanumeric() {
            output.push(ch);
            previous_dash = false;
        } else if !previous_dash {
            output.push('-');
            previous_dash = true;
        }
    }
    output.trim_matches('-').to_string()
}

pub(super) fn extension(path: &Path) -> Option<String> {
    path.extension()
        .map(|value| value.to_string_lossy().to_ascii_lowercase())
}

fn is_image_link(link: &str) -> bool {
    extension(Path::new(link)).is_some_and(|ext| {
        matches!(
            ext.as_str(),
            "avif" | "gif" | "heic" | "heif" | "jpeg" | "jpg" | "png" | "svg" | "webp"
        )
    })
}
