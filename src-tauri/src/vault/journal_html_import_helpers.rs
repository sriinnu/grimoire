use regex::Regex;
use std::fs;
use std::path::{Path, PathBuf};
use std::sync::OnceLock;

use super::journal_import_helpers::JournalEntry;

macro_rules! regex {
    ($name:ident, $pattern:expr) => {
        fn $name() -> &'static Regex {
            static RE: OnceLock<Regex> = OnceLock::new();
            RE.get_or_init(|| Regex::new($pattern).unwrap())
        }
    };
}

regex!(title_re, r"(?is)<title[^>]*>(.*?)</title>");
regex!(heading_re, r"(?is)<h[1-3][^>]*>(.*?)</h[1-3]>");
regex!(time_re, r#"(?is)<time[^>]+datetime=["']([^"']+)["']"#);
regex!(
    meta_date_re,
    r#"(?is)<meta[^>]+(?:property|name)=["'][^"']*(?:published|created|date)[^"']*["'][^>]+content=["']([^"']+)["']"#
);
regex!(script_re, r"(?is)<script[^>]*>.*?</script>");
regex!(style_re, r"(?is)<style[^>]*>.*?</style>");
regex!(line_break_re, r"(?i)<br\s*/?>");
regex!(block_end_re, r"(?i)</(p|div|section|article|li|h[1-6])>");
regex!(tag_re, r"(?is)<[^>]+>");
regex!(media_attr_re, r#"(?is)\b(?:src|href)=["']([^"']+)["']"#);
regex!(file_date_re, r"(\d{4})[-_](\d{2})[-_](\d{2})");

const MEDIA_EXTENSIONS: &[&str] = &[
    "aac", "avif", "gif", "heic", "heif", "jpeg", "jpg", "m4a", "mov", "mp3", "mp4", "pdf", "png",
    "svg", "wav", "webm", "webp",
];

pub(super) fn read_entry_from_html(
    path: &Path,
    source_kind: &str,
) -> Result<Option<JournalEntry>, String> {
    let raw =
        fs::read_to_string(path).map_err(|e| format!("Failed to read {}: {e}", path.display()))?;
    let text = html_to_text(&raw);
    if text.trim().is_empty() {
        return Ok(None);
    }

    let id = path
        .file_stem()
        .map(|value| value.to_string_lossy().into_owned())
        .unwrap_or_else(|| format!("{source_kind}-entry"));
    let title = html_title(&raw)
        .or_else(|| first_nonempty_line(&text))
        .unwrap_or_else(|| "Journal Entry".to_string());
    Ok(Some(JournalEntry {
        id,
        title,
        text,
        created: html_date(&raw).or_else(|| file_date(path)),
        modified: None,
        tags: Vec::new(),
        media_keys: html_media_keys(&raw),
        raw_source: source_kind.to_string(),
    }))
}

pub(super) fn html_entry_files(
    selected_source: &Path,
    root: &Path,
    walk_files: impl Fn(&Path) -> Result<Vec<PathBuf>, String>,
) -> Result<Vec<PathBuf>, String> {
    if selected_source.is_file()
        && extension(selected_source).is_some_and(|ext| matches!(ext.as_str(), "html" | "htm"))
    {
        return Ok(vec![selected_source.to_path_buf()]);
    }
    walk_files(root).map(|files| {
        files
            .into_iter()
            .filter(|path| {
                extension(path).is_some_and(|ext| matches!(ext.as_str(), "html" | "htm"))
            })
            .collect()
    })
}

fn extension(path: &Path) -> Option<String> {
    path.extension()
        .map(|value| value.to_string_lossy().to_ascii_lowercase())
}

fn html_title(raw: &str) -> Option<String> {
    title_re()
        .captures(raw)
        .or_else(|| heading_re().captures(raw))
        .and_then(|captures| captures.get(1))
        .map(|match_| html_to_text(match_.as_str()))
        .map(|value| value.trim().to_string())
        .filter(|value| !value.is_empty())
}

fn html_date(raw: &str) -> Option<String> {
    time_re()
        .captures(raw)
        .or_else(|| meta_date_re().captures(raw))
        .and_then(|captures| captures.get(1))
        .map(|match_| match_.as_str().trim().to_string())
        .filter(|value| !value.is_empty())
}

fn file_date(path: &Path) -> Option<String> {
    let name = path.file_name()?.to_string_lossy();
    let captures = file_date_re().captures(&name)?;
    Some(format!(
        "{}-{}-{}",
        captures.get(1)?.as_str(),
        captures.get(2)?.as_str(),
        captures.get(3)?.as_str()
    ))
}

fn html_media_keys(raw: &str) -> Vec<String> {
    let mut keys = media_attr_re()
        .captures_iter(raw)
        .filter_map(|captures| captures.get(1))
        .map(|match_| match_.as_str().trim().to_string())
        .filter(|value| has_media_extension(value))
        .collect::<Vec<_>>();
    keys.sort();
    keys.dedup();
    keys
}

fn has_media_extension(value: &str) -> bool {
    let path = value.split(['#', '?']).next().unwrap_or(value);
    let extension = Path::new(path)
        .extension()
        .map(|ext| ext.to_string_lossy().to_ascii_lowercase());
    extension.is_some_and(|ext| MEDIA_EXTENSIONS.contains(&ext.as_str()))
}

fn html_to_text(raw: &str) -> String {
    let without_scripts = script_re().replace_all(raw, "");
    let without_styles = style_re().replace_all(&without_scripts, "");
    let with_breaks = line_break_re().replace_all(&without_styles, "\n");
    let with_blocks = block_end_re().replace_all(&with_breaks, "\n");
    let without_tags = tag_re().replace_all(&with_blocks, "");
    normalize_lines(&decode_entities(&without_tags))
}

fn decode_entities(value: &str) -> String {
    value
        .replace("&nbsp;", " ")
        .replace("&amp;", "&")
        .replace("&lt;", "<")
        .replace("&gt;", ">")
        .replace("&quot;", "\"")
        .replace("&#39;", "'")
        .replace("&apos;", "'")
}

fn normalize_lines(value: &str) -> String {
    let mut output = Vec::new();
    let mut previous_blank = false;
    for line in value.lines().map(str::trim) {
        if line.is_empty() {
            if !previous_blank && !output.is_empty() {
                output.push(String::new());
            }
            previous_blank = true;
            continue;
        }
        output.push(line.to_string());
        previous_blank = false;
    }
    output.join("\n").trim().to_string()
}

fn first_nonempty_line(text: &str) -> Option<String> {
    text.lines()
        .map(str::trim)
        .find(|line| !line.is_empty())
        .map(|line| line.chars().take(80).collect())
}
