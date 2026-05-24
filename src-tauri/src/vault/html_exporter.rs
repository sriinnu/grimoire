use std::fs::{self, File};
use std::io::Write;
use std::path::{Path, PathBuf};
use walkdir::{DirEntry, WalkDir};

use super::exporter::VaultExportReport;
use super::locality::is_local_only_export_file;
use super::locality_attachments::local_only_referenced_attachments;

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

pub(super) struct HtmlPage {
    pub(super) title: String,
    href: String,
}

/// Writes the current vault as a browsable static HTML archive.
pub fn export_static_html_archive(
    vault_path: &Path,
    target_path: &Path,
) -> Result<VaultExportReport, String> {
    let vault_root = canonical_dir(vault_path, "Vault")?;
    let target_root = unique_archive_dir(&vault_root, target_path)?;
    fs::create_dir_all(&target_root)
        .map_err(|e| format!("Failed to create HTML export folder: {e}"))?;

    let local_only_attachments = local_only_referenced_attachments(&vault_root)?;
    let mut pages = Vec::new();
    let mut files_exported = 0;
    let mut skipped_files = 0;

    for entry in WalkDir::new(&vault_root)
        .follow_links(false)
        .into_iter()
        .filter_entry(should_enter)
    {
        let entry = entry.map_err(|e| format!("Failed to read vault for HTML export: {e}"))?;
        if !entry.file_type().is_file() {
            continue;
        }
        if should_skip_file(&vault_root, &entry, &local_only_attachments) {
            skipped_files += 1;
            continue;
        }

        let relative_path = relative_path(&vault_root, entry.path())?;
        if is_markdown(entry.path()) {
            let page = write_markdown_page(&target_root, entry.path(), &relative_path)?;
            pages.push(page);
        } else {
            copy_asset(&target_root, entry.path(), &relative_path)?;
        }
        files_exported += 1;
    }

    pages.sort_by(|left, right| left.title.cmp(&right.title));
    write_index(&target_root, &pages)?;

    Ok(VaultExportReport {
        export_path: target_root.to_string_lossy().into_owned(),
        files_exported,
        skipped_files,
    })
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

pub(super) fn unique_archive_dir(vault_root: &Path, requested: &Path) -> Result<PathBuf, String> {
    let parent = requested
        .parent()
        .unwrap_or_else(|| Path::new("."))
        .canonicalize()
        .map_err(|e| format!("Failed to inspect HTML export folder: {e}"))?;
    if parent.starts_with(vault_root) {
        return Err("Choose an HTML export path outside the active vault".to_string());
    }

    let file_name = requested
        .file_name()
        .ok_or_else(|| "HTML export target must include a folder name".to_string())?;
    let base = parent.join(file_name);
    if base.exists() && !base.is_dir() {
        return Err("HTML export target exists and is not a folder".to_string());
    }
    if !base.exists() {
        return Ok(base);
    }

    let stem = file_name.to_string_lossy();
    for index in 2..1000 {
        let candidate = parent.join(format!("{stem}-{index}"));
        if !candidate.exists() {
            return Ok(candidate);
        }
    }
    Err("Could not find a free HTML export folder name".to_string())
}

pub(super) fn should_enter(entry: &DirEntry) -> bool {
    if entry.depth() == 0 {
        return true;
    }
    if !entry.file_type().is_dir() {
        return true;
    }
    let name = entry.file_name().to_string_lossy().to_ascii_lowercase();
    !is_skipped_name(&name)
}

pub(super) fn should_skip_file(
    vault_root: &Path,
    entry: &DirEntry,
    local_only_attachments: &std::collections::BTreeSet<String>,
) -> bool {
    let name = entry.file_name().to_string_lossy().to_ascii_lowercase();
    let relative = entry
        .path()
        .strip_prefix(vault_root)
        .map(|path| path.to_string_lossy().replace('\\', "/"))
        .unwrap_or_default();
    is_skipped_name(&name)
        || name.starts_with(".env")
        || local_only_attachments.contains(&relative)
        || is_local_only_export_file(vault_root, entry.path())
}

fn is_skipped_name(name: &str) -> bool {
    name.starts_with('.') || SKIPPED_DIRS.contains(&name) || SKIPPED_FILES.contains(&name)
}

pub(super) fn relative_path(vault_root: &Path, source_path: &Path) -> Result<PathBuf, String> {
    source_path
        .strip_prefix(vault_root)
        .map(PathBuf::from)
        .map_err(|_| "Failed to resolve vault file during HTML export".to_string())
}

pub(super) fn is_markdown(path: &Path) -> bool {
    path.extension()
        .and_then(|ext| ext.to_str())
        .is_some_and(|ext| ext.eq_ignore_ascii_case("md"))
}

pub(super) fn write_markdown_page(
    target_root: &Path,
    source_path: &Path,
    relative_path: &Path,
) -> Result<HtmlPage, String> {
    let markdown = fs::read_to_string(source_path)
        .map_err(|e| format!("Failed to read {}: {e}", source_path.display()))?;
    let title = markdown_title(&markdown)
        .or_else(|| {
            relative_path
                .file_stem()
                .map(|stem| stem.to_string_lossy().to_string())
        })
        .unwrap_or_else(|| "Untitled".to_string());
    let output_relative = relative_path.with_extension("html");
    let output_path = target_root.join(&output_relative);
    if let Some(parent) = output_path.parent() {
        fs::create_dir_all(parent)
            .map_err(|e| format!("Failed to create HTML page folder: {e}"))?;
    }

    fs::write(
        &output_path,
        render_page(&title, &relative_path.to_string_lossy(), &markdown),
    )
    .map_err(|e| format!("Failed to write HTML page {}: {e}", output_path.display()))?;

    Ok(HtmlPage {
        title,
        href: output_relative.to_string_lossy().replace('\\', "/"),
    })
}

pub(super) fn copy_asset(
    target_root: &Path,
    source_path: &Path,
    relative_path: &Path,
) -> Result<(), String> {
    let output_path = target_root.join(relative_path);
    if let Some(parent) = output_path.parent() {
        fs::create_dir_all(parent).map_err(|e| format!("Failed to create asset folder: {e}"))?;
    }
    fs::copy(source_path, &output_path)
        .map(|_| ())
        .map_err(|e| {
            format!(
                "Failed to copy {} into HTML archive: {e}",
                source_path.display()
            )
        })
}

pub(super) fn write_index(target_root: &Path, pages: &[HtmlPage]) -> Result<(), String> {
    let mut index = File::create(target_root.join("index.html"))
        .map_err(|e| format!("Failed to create HTML export index: {e}"))?;
    writeln!(
        index,
        "{}",
        html_shell(
            "Grimoire Archive",
            "index",
            &format!(
                "<h1>Grimoire Archive</h1><p>{} exported note pages.</p><ul class=\"archive-index\">{}</ul>",
                pages.len(),
                pages
                    .iter()
                    .map(|page| format!(
                        "<li><a href=\"{}\">{}</a></li>",
                        escape_attr(&page.href),
                        escape_html(&page.title)
                    ))
                    .collect::<Vec<_>>()
                    .join("")
            ),
        )
    )
    .map_err(|e| format!("Failed to write HTML export index: {e}"))
}

fn render_page(title: &str, source_path: &str, markdown: &str) -> String {
    html_shell(
        title,
        source_path,
        &format!(
            "<p class=\"source\">Source: <code>{}</code></p>{}",
            escape_html(source_path),
            markdown_to_html(markdown)
        ),
    )
}

fn html_shell(title: &str, source_path: &str, body: &str) -> String {
    format!(
        "<!doctype html><html lang=\"en\"><head><meta charset=\"utf-8\"><meta name=\"viewport\" content=\"width=device-width, initial-scale=1\"><title>{}</title><style>{}</style></head><body data-source=\"{}\"><main>{}</main></body></html>",
        escape_html(title),
        ARCHIVE_CSS,
        escape_attr(source_path),
        body
    )
}

const ARCHIVE_CSS: &str = "body{margin:0;background:#f7f4eb;color:#1f2933;font:16px/1.6 -apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif}main{max-width:860px;margin:0 auto;padding:48px 28px}h1,h2,h3{line-height:1.2;color:#16343b}code,pre{background:#ece6d8;border-radius:6px}code{padding:2px 5px}pre{overflow:auto;padding:14px}.source{color:#667085;font-size:13px}a{color:#286477}img{max-width:100%;border-radius:8px}.archive-index{padding-left:22px}";

fn markdown_title(markdown: &str) -> Option<String> {
    strip_frontmatter(markdown).lines().find_map(|line| {
        let trimmed = line.trim_start();
        let title = trimmed.strip_prefix("# ")?;
        let title = title.trim();
        (!title.is_empty()).then(|| title.to_string())
    })
}

fn markdown_to_html(markdown: &str) -> String {
    let mut html = String::new();
    let mut in_code = false;
    let mut in_list = false;

    for line in strip_frontmatter(markdown).lines() {
        let trimmed = line.trim();
        if trimmed.starts_with("```") {
            if in_list {
                html.push_str("</ul>");
                in_list = false;
            }
            html.push_str(if in_code {
                "</code></pre>"
            } else {
                "<pre><code>"
            });
            in_code = !in_code;
            continue;
        }
        if in_code {
            html.push_str(&escape_html(line));
            html.push('\n');
            continue;
        }
        if trimmed.is_empty() {
            if in_list {
                html.push_str("</ul>");
                in_list = false;
            }
            continue;
        }
        if let Some((level, text)) = heading(trimmed) {
            if in_list {
                html.push_str("</ul>");
                in_list = false;
            }
            html.push_str(&format!("<h{level}>{}</h{level}>", inline_markdown(text)));
            continue;
        }
        if let Some(item) = list_item(trimmed) {
            if !in_list {
                html.push_str("<ul>");
                in_list = true;
            }
            html.push_str(&format!("<li>{}</li>", inline_markdown(item)));
            continue;
        }
        if in_list {
            html.push_str("</ul>");
            in_list = false;
        }
        html.push_str(&format!("<p>{}</p>", inline_markdown(trimmed)));
    }

    if in_code {
        html.push_str("</code></pre>");
    }
    if in_list {
        html.push_str("</ul>");
    }
    html
}

fn strip_frontmatter(markdown: &str) -> &str {
    let Some(rest) = markdown.strip_prefix("---\n") else {
        return markdown;
    };
    rest.find("\n---\n")
        .map(|end| &rest[end + 5..])
        .unwrap_or(markdown)
}

fn heading(line: &str) -> Option<(usize, &str)> {
    let hashes = line.chars().take_while(|ch| *ch == '#').count();
    if (1..=6).contains(&hashes) && line.as_bytes().get(hashes) == Some(&b' ') {
        return Some((hashes, line[hashes + 1..].trim()));
    }
    None
}

fn list_item(line: &str) -> Option<&str> {
    line.strip_prefix("- ")
        .or_else(|| line.strip_prefix("* "))
        .map(str::trim)
}

fn inline_markdown(text: &str) -> String {
    if let Some((alt, src)) = image_token(text) {
        return format!(
            "<img alt=\"{}\" src=\"{}\">",
            escape_attr(alt),
            escape_attr(src)
        );
    }
    escape_html(text)
}

fn image_token(text: &str) -> Option<(&str, &str)> {
    let alt_start = text.find("![")? + 2;
    let alt_end = text[alt_start..].find("](")? + alt_start;
    let src_start = alt_end + 2;
    let src_end = text[src_start..].find(')')? + src_start;
    Some((&text[alt_start..alt_end], &text[src_start..src_end]))
}

fn escape_html(value: &str) -> String {
    value
        .replace('&', "&amp;")
        .replace('<', "&lt;")
        .replace('>', "&gt;")
        .replace('"', "&quot;")
}

fn escape_attr(value: &str) -> String {
    escape_html(value).replace('\'', "&#39;")
}
