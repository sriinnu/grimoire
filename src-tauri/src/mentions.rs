//! Unlinked-mention discovery and one-click linking for the Second Brain rail.
//!
//! Scans the vault for prose occurrences of a note's title (or aliases) that
//! are not already wikilinks, mirroring Obsidian's "Unlinked mentions" panel.
//! Matching is case-insensitive and whole-word; occurrences inside wikilinks,
//! markdown links, inline code spans, fenced code blocks, and YAML
//! frontmatter are excluded.
//!
//! Locality Firewall: local-only notes (protected by path lane or frontmatter,
//! see `grimoire_core::locality`) are never scanned, surfaced, or rewritten by
//! this feature. Scanning FOR a local-only note is allowed — its title showing
//! up in public notes does not leak protected content.

use serde::Serialize;
use std::path::{Path, PathBuf};
use walkdir::WalkDir;

const MAX_SCANNABLE_FILE_BYTES: u64 = 2 * 1024 * 1024;
const MAX_MENTION_RESULTS: usize = 50;
const MIN_NEEDLE_CHARS: usize = 3;
const MAX_CONTEXT_CHARS: usize = 240;

#[derive(Debug, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct MentionHit {
    /// Absolute path of the source note containing the mention.
    pub path: String,
    /// Display title of the source note.
    pub title: String,
    /// 1-based line number of the mention in the source note.
    pub line: u32,
    /// The matched line, trimmed and capped for preview display.
    pub context: String,
    /// The exact matched text, preserving the source note's casing.
    pub matched_text: String,
}

fn build_needles(title: &str, aliases: &[String]) -> Vec<String> {
    let mut needles: Vec<String> = std::iter::once(title)
        .chain(aliases.iter().map(String::as_str))
        .map(str::trim)
        .filter(|needle| needle.chars().count() >= MIN_NEEDLE_CHARS)
        .map(str::to_lowercase)
        .collect();
    needles.sort();
    needles.dedup();
    needles
}

fn is_word_char(ch: char) -> bool {
    ch.is_alphanumeric() || ch == '_'
}

fn has_word_boundaries(line: &str, start: usize, end: usize) -> bool {
    let before_ok = line[..start]
        .chars()
        .next_back()
        .is_none_or(|ch| !is_word_char(ch));
    let after_ok = line[end..]
        .chars()
        .next()
        .is_none_or(|ch| !is_word_char(ch));
    before_ok && after_ok
}

/// Case-insensitively matches `needle_lower` at byte offset `start` of `line`.
/// Returns the byte length consumed in the original line on a full match.
fn match_len_at(line: &str, start: usize, needle_lower: &str) -> Option<usize> {
    let mut needle_chars = needle_lower.chars();
    let mut expected = needle_chars.next();
    let mut consumed = 0;
    for ch in line[start..].chars() {
        for lowered in ch.to_lowercase() {
            match expected {
                Some(want) if want == lowered => expected = needle_chars.next(),
                _ => return None,
            }
        }
        consumed += ch.len_utf8();
        if expected.is_none() {
            return Some(consumed);
        }
    }
    None
}

/// Finds case-insensitive whole-word matches of `needle_lower` in `line`,
/// returning byte spans into the original line.
fn find_word_matches(line: &str, needle_lower: &str) -> Vec<(usize, usize)> {
    let mut spans = Vec::new();
    let mut idx = 0;
    while idx < line.len() {
        if let Some(len) = match_len_at(line, idx, needle_lower) {
            let end = idx + len;
            if has_word_boundaries(line, idx, end) {
                spans.push((idx, end));
                idx = end;
                continue;
            }
        }
        idx += line[idx..].chars().next().map_or(1, char::len_utf8);
    }
    spans
}

fn wikilink_spans(line: &str) -> Vec<(usize, usize)> {
    let mut spans = Vec::new();
    let mut search_from = 0;
    while let Some(open_rel) = line[search_from..].find("[[") {
        let open = search_from + open_rel;
        match line[open + 2..].find("]]") {
            Some(close_rel) => {
                let end = open + 2 + close_rel + 2;
                spans.push((open, end));
                search_from = end;
            }
            None => break,
        }
    }
    spans
}

fn markdown_link_spans(line: &str) -> Vec<(usize, usize)> {
    let mut spans = Vec::new();
    let mut search_from = 0;
    while let Some(open_rel) = line[search_from..].find('[') {
        let open = search_from + open_rel;
        let Some(close_rel) = line[open..].find(']') else {
            break;
        };
        let close = open + close_rel;
        if line[close + 1..].starts_with('(') {
            if let Some(paren_rel) = line[close + 2..].find(')') {
                let end = close + 2 + paren_rel + 1;
                spans.push((open, end));
                search_from = end;
                continue;
            }
        }
        search_from = close + 1;
    }
    spans
}

/// Byte spans of inline code in `line`, per CommonMark backtick-string
/// matching: a run of N backticks opens a code span closed by the next run of
/// exactly N backticks; runs of other lengths in between stay inside the span,
/// and an opening run with no matching closer is literal text.
fn inline_code_spans(line: &str) -> Vec<(usize, usize)> {
    let bytes = line.as_bytes();
    let mut spans = Vec::new();
    let mut idx = 0;
    while idx < bytes.len() {
        if bytes[idx] != b'`' {
            idx += 1;
            continue;
        }
        let open_start = idx;
        while idx < bytes.len() && bytes[idx] == b'`' {
            idx += 1;
        }
        let open_len = idx - open_start;
        let mut cursor = idx;
        while cursor < bytes.len() {
            if bytes[cursor] != b'`' {
                cursor += 1;
                continue;
            }
            let run_start = cursor;
            while cursor < bytes.len() && bytes[cursor] == b'`' {
                cursor += 1;
            }
            if cursor - run_start == open_len {
                spans.push((open_start, cursor));
                idx = cursor;
                break;
            }
        }
    }
    spans
}

fn excluded_spans(line: &str) -> Vec<(usize, usize)> {
    let mut spans = wikilink_spans(line);
    spans.extend(markdown_link_spans(line));
    spans.extend(inline_code_spans(line));
    spans
}

fn overlaps(spans: &[(usize, usize)], start: usize, end: usize) -> bool {
    spans.iter().any(|&(s, e)| start < e && end > s)
}

fn trimmed_context(line: &str) -> String {
    let trimmed = line.trim();
    if trimmed.chars().count() <= MAX_CONTEXT_CHARS {
        return trimmed.to_string();
    }
    let capped: String = trimmed.chars().take(MAX_CONTEXT_CHARS).collect();
    format!("{capped}…")
}

/// The first unlinked whole-word match of any needle in `line`, if any.
fn first_unlinked_match(line: &str, needles_lower: &[String]) -> Option<(usize, usize)> {
    let excluded = excluded_spans(line);
    needles_lower
        .iter()
        .flat_map(|needle| find_word_matches(line, needle))
        .filter(|&(start, end)| !overlaps(&excluded, start, end))
        .min_by_key(|&(start, _)| start)
}

/// Collects unlinked mentions in one note body: at most one hit per line,
/// skipping YAML frontmatter and fenced code blocks.
fn collect_mentions_in_content(
    content: &str,
    needles_lower: &[String],
) -> Vec<(u32, String, String)> {
    let mut hits = Vec::new();
    let mut in_frontmatter = false;
    let mut in_fence = false;

    for (index, line) in content.lines().enumerate() {
        let trimmed = line.trim();
        if index == 0 && trimmed == "---" {
            in_frontmatter = true;
            continue;
        }
        if in_frontmatter {
            if trimmed == "---" || trimmed == "..." {
                in_frontmatter = false;
            }
            continue;
        }
        if trimmed.starts_with("```") || trimmed.starts_with("~~~") {
            in_fence = !in_fence;
            continue;
        }
        if in_fence {
            continue;
        }

        if let Some((start, end)) = first_unlinked_match(line, needles_lower) {
            hits.push((
                (index + 1) as u32,
                trimmed_context(line),
                line[start..end].to_string(),
            ));
        }
    }
    hits
}

fn is_scannable_file_size(path: &Path) -> bool {
    std::fs::metadata(path)
        .map(|metadata| metadata.len() <= MAX_SCANNABLE_FILE_BYTES)
        .unwrap_or(false)
}

const LOCAL_ONLY_SOURCE_ERROR: &str =
    "Source note is local-only; unlinked mentions never touch protected notes";

/// True when the file is protected by the Locality Firewall, judged by its
/// vault-relative path lane. Cheap; runs before the file is read.
fn is_local_only_path(vault_dir: &Path, path: &Path) -> bool {
    let relative = path.strip_prefix(vault_dir).unwrap_or(path);
    crate::vault::locality::is_local_only_relative_path(relative)
}

/// Scans every markdown file in the vault (except the note itself) for
/// unlinked, whole-word occurrences of `title` or any of `aliases`.
///
/// Local-only notes are never read or surfaced: files in protected path lanes
/// are skipped before reading, and files whose frontmatter marks them
/// local-only are dropped after reading, before any hit is emitted.
pub fn find_note_mentions(
    vault_path: &str,
    note_path: &str,
    title: &str,
    aliases: &[String],
) -> Result<Vec<MentionHit>, String> {
    let needles = build_needles(title, aliases);
    if needles.is_empty() {
        return Ok(Vec::new());
    }

    let vault_dir = Path::new(vault_path);
    let skip_path = Path::new(note_path)
        .canonicalize()
        .unwrap_or_else(|_| PathBuf::from(note_path));

    let mut hits: Vec<MentionHit> = Vec::new();
    let walker = WalkDir::new(vault_dir)
        .follow_links(false)
        .into_iter()
        .filter_entry(|entry| {
            if entry.file_type().is_dir() {
                let name = entry.file_name().to_string_lossy();
                return entry.depth() == 0 || !crate::vault::is_hidden_dir(&name);
            }
            true
        });

    for entry in walker.filter_map(|e| e.ok()) {
        if hits.len() >= MAX_MENTION_RESULTS {
            break;
        }
        let path = entry.path();
        if !entry.file_type().is_file() {
            continue;
        }
        if entry.file_name().to_string_lossy().starts_with('.') {
            continue;
        }
        if !crate::vault::is_md_file(path) {
            continue;
        }
        if !is_scannable_file_size(path) {
            continue;
        }
        if is_local_only_path(vault_dir, path) {
            continue;
        }
        if path
            .canonicalize()
            .map(|canonical| canonical == skip_path)
            .unwrap_or(false)
        {
            continue;
        }

        let Ok(content) = std::fs::read_to_string(path) else {
            continue;
        };
        if crate::vault::locality::is_local_only_markdown_content(&content) {
            continue;
        }
        let line_hits = collect_mentions_in_content(&content, &needles);
        if line_hits.is_empty() {
            continue;
        }

        let filename = path
            .file_name()
            .and_then(|value| value.to_str())
            .unwrap_or("");
        let source_title = crate::vault::derive_markdown_title_from_content(&content, filename);
        let full_path = path.to_string_lossy().to_string();

        for (line, context, matched_text) in line_hits {
            if hits.len() >= MAX_MENTION_RESULTS {
                break;
            }
            hits.push(MentionHit {
                path: full_path.clone(),
                title: source_title.clone(),
                line,
                context,
                matched_text,
            });
        }
    }

    Ok(hits)
}

/// Rewrites one unlinked mention into a wikilink inside `content`.
///
/// The first non-linked, whole-word occurrence of `matched_text` on the given
/// 1-based `line` becomes `[[target_title]]`, or `[[target_title|matched_text]]`
/// when the matched text differs from the title (casing or alias), preserving
/// the prose exactly as written.
fn link_mention_in_content(
    content: &str,
    target_title: &str,
    matched_text: &str,
    line: u32,
) -> Result<String, String> {
    if line == 0 {
        return Err("Mention line numbers are 1-based".to_string());
    }

    let mut offset = 0;
    let mut current: u32 = 1;
    for segment in content.split_inclusive('\n') {
        if current == line {
            let excluded = excluded_spans(segment);
            let occurrence = find_word_matches(segment, &matched_text.to_lowercase())
                .into_iter()
                .filter(|&(start, end)| &segment[start..end] == matched_text)
                .find(|&(start, end)| !overlaps(&excluded, start, end));
            let Some((start, end)) = occurrence else {
                return Err(format!(
                    "Mention \"{matched_text}\" is no longer present on line {line}"
                ));
            };

            let replacement = if matched_text == target_title {
                format!("[[{target_title}]]")
            } else {
                format!("[[{target_title}|{matched_text}]]")
            };

            let mut updated = String::with_capacity(content.len() + replacement.len());
            updated.push_str(&content[..offset + start]);
            updated.push_str(&replacement);
            updated.push_str(&content[offset + end..]);
            return Ok(updated);
        }
        offset += segment.len();
        current += 1;
    }

    Err(format!("Line {line} not found in source note"))
}

/// Atomically rewrites the source note, converting one unlinked mention into a
/// wikilink to `target_title`. Uses the vault's atomic save path.
///
/// Refuses to modify local-only source notes (Locality Firewall), whether
/// protected by path lane or by frontmatter markers.
pub fn link_unlinked_mention(
    vault_path: &str,
    source_path: &str,
    target_title: &str,
    matched_text: &str,
    line: u32,
) -> Result<(), String> {
    let vault_dir = Path::new(vault_path);
    let source = Path::new(source_path);
    let canonical_vault = vault_dir
        .canonicalize()
        .unwrap_or_else(|_| vault_dir.to_path_buf());
    let canonical_source = source
        .canonicalize()
        .unwrap_or_else(|_| source.to_path_buf());
    if is_local_only_path(&canonical_vault, &canonical_source) {
        return Err(LOCAL_ONLY_SOURCE_ERROR.to_string());
    }
    let content = crate::vault::get_note_content(source)?;
    if crate::vault::locality::is_local_only_markdown_content(&content) {
        return Err(LOCAL_ONLY_SOURCE_ERROR.to_string());
    }
    let updated = link_mention_in_content(&content, target_title, matched_text, line)?;
    crate::vault::save_note_content(source_path, &updated)
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;
    use tempfile::TempDir;

    fn write_note(dir: &TempDir, name: &str, content: &str) -> PathBuf {
        let path = dir.path().join(name);
        if let Some(parent) = path.parent() {
            fs::create_dir_all(parent).unwrap();
        }
        fs::write(&path, content).unwrap();
        path
    }

    fn scan(dir: &TempDir, note: &Path, title: &str, aliases: &[&str]) -> Vec<MentionHit> {
        let aliases: Vec<String> = aliases.iter().map(|a| a.to_string()).collect();
        find_note_mentions(
            dir.path().to_str().unwrap(),
            note.to_str().unwrap(),
            title,
            &aliases,
        )
        .unwrap()
    }

    #[test]
    fn matches_whole_words_case_insensitively() {
        let dir = TempDir::new().unwrap();
        let target = write_note(&dir, "arun.md", "# Arun\n");
        write_note(
            &dir,
            "journal.md",
            "# Journal\n\nMet arun at the temple.\nClimbed Arunachala at dawn.\n",
        );

        let hits = scan(&dir, &target, "Arun", &[]);

        assert_eq!(hits.len(), 1);
        assert_eq!(hits[0].line, 3);
        assert_eq!(hits[0].matched_text, "arun");
        assert_eq!(hits[0].context, "Met arun at the temple.");
        assert_eq!(hits[0].title, "Journal");
    }

    #[test]
    fn skips_needles_shorter_than_three_chars() {
        let dir = TempDir::new().unwrap();
        let target = write_note(&dir, "ai.md", "# AI\n");
        write_note(&dir, "other.md", "# Other\n\nAI is everywhere.\n");

        let hits = scan(&dir, &target, "AI", &[]);

        assert!(hits.is_empty());
    }

    #[test]
    fn excludes_wikilinked_and_markdown_linked_occurrences() {
        let dir = TempDir::new().unwrap();
        let target = write_note(&dir, "grimoire.md", "# Grimoire\n");
        write_note(
            &dir,
            "notes.md",
            concat!(
                "# Notes\n\n",
                "Already linked to [[Grimoire]] here.\n",
                "Aliased link [[Grimoire|the app]] too.\n",
                "Markdown link [Grimoire](grimoire.md) as well.\n",
                "But plain Grimoire mention counts.\n",
            ),
        );

        let hits = scan(&dir, &target, "Grimoire", &[]);

        assert_eq!(hits.len(), 1);
        assert_eq!(hits[0].line, 6);
        assert_eq!(hits[0].matched_text, "Grimoire");
    }

    #[test]
    fn excludes_fenced_code_blocks_and_frontmatter() {
        let dir = TempDir::new().unwrap();
        let target = write_note(&dir, "grimoire.md", "# Grimoire\n");
        write_note(
            &dir,
            "notes.md",
            concat!(
                "---\n",
                "title: Notes\n",
                "related: Grimoire\n",
                "---\n",
                "# Notes\n\n",
                "```\n",
                "let grimoire = load(\"Grimoire\")\n",
                "```\n",
                "Grimoire outside the fence counts.\n",
            ),
        );

        let hits = scan(&dir, &target, "Grimoire", &[]);

        assert_eq!(hits.len(), 1);
        assert_eq!(hits[0].line, 10);
        assert_eq!(hits[0].context, "Grimoire outside the fence counts.");
    }

    #[test]
    fn matches_aliases_and_dedupes_to_one_hit_per_line() {
        let dir = TempDir::new().unwrap();
        let target = write_note(&dir, "arunachala.md", "# Arunachala\n");
        write_note(
            &dir,
            "trip.md",
            "# Trip\n\nThe Holy Hill and the holy hill again.\n",
        );

        let hits = scan(&dir, &target, "Arunachala", &["Holy Hill"]);

        assert_eq!(hits.len(), 1);
        assert_eq!(hits[0].line, 3);
        assert_eq!(hits[0].matched_text, "Holy Hill");
    }

    #[test]
    fn skips_the_note_itself_and_hidden_dirs() {
        let dir = TempDir::new().unwrap();
        let target = write_note(&dir, "self.md", "# Self\n\nSelf mentions Self inside.\n");
        write_note(
            &dir,
            ".obsidian/config.md",
            "# Config\n\nSelf lives here.\n",
        );

        let hits = scan(&dir, &target, "Self", &[]);

        assert!(hits.is_empty());
    }

    #[test]
    fn caps_context_length() {
        let dir = TempDir::new().unwrap();
        let target = write_note(&dir, "needle.md", "# Needle Note\n");
        let long_line = format!("Needle Note {}", "x".repeat(400));
        write_note(&dir, "long.md", &format!("# Long\n\n{long_line}\n"));

        let hits = scan(&dir, &target, "Needle Note", &[]);

        assert_eq!(hits.len(), 1);
        assert!(hits[0].context.chars().count() <= MAX_CONTEXT_CHARS + 1);
        assert!(hits[0].context.ends_with('…'));
    }

    #[test]
    fn respects_the_large_file_cap() {
        let dir = TempDir::new().unwrap();
        let target = write_note(&dir, "needle.md", "# Needle Note\n");
        let big = "Needle Note appears here.\n"
            .repeat((MAX_SCANNABLE_FILE_BYTES as usize / "Needle Note appears here.\n".len()) + 2);
        write_note(&dir, "big.md", &big);
        write_note(&dir, "small.md", "# Small\n\nNeedle Note appears once.\n");

        let hits = scan(&dir, &target, "Needle Note", &[]);

        assert_eq!(hits.len(), 1);
        assert_eq!(hits[0].title, "Small");
    }

    #[test]
    fn link_mention_rewrites_exact_title_as_plain_wikilink() {
        let content = "# Journal\n\nTalked about Grimoire today.\n";
        let updated = link_mention_in_content(content, "Grimoire", "Grimoire", 3).unwrap();
        assert_eq!(updated, "# Journal\n\nTalked about [[Grimoire]] today.\n");
    }

    #[test]
    fn link_mention_preserves_casing_with_alias_form() {
        let content = "# Journal\n\nTalked about grimoire today.\n";
        let updated = link_mention_in_content(content, "Grimoire", "grimoire", 3).unwrap();
        assert_eq!(
            updated,
            "# Journal\n\nTalked about [[Grimoire|grimoire]] today.\n"
        );
    }

    #[test]
    fn link_mention_skips_occurrences_already_inside_wikilinks() {
        let content = "See [[Grimoire]] and Grimoire again.\n";
        let updated = link_mention_in_content(content, "Grimoire", "Grimoire", 1).unwrap();
        assert_eq!(updated, "See [[Grimoire]] and [[Grimoire]] again.\n");
    }

    #[test]
    fn link_mention_errors_when_the_text_moved() {
        let content = "# Journal\n\nNothing relevant here.\n";
        let error = link_mention_in_content(content, "Grimoire", "Grimoire", 3).unwrap_err();
        assert!(error.contains("no longer present"));

        let out_of_range = link_mention_in_content(content, "Grimoire", "Grimoire", 9).unwrap_err();
        assert!(out_of_range.contains("not found"));
    }

    #[test]
    fn link_unlinked_mention_rewrites_the_file_atomically() {
        let dir = TempDir::new().unwrap();
        let source = write_note(&dir, "notes.md", "# Notes\n\nMet arun at the temple.\n");

        link_unlinked_mention(
            dir.path().to_str().unwrap(),
            source.to_str().unwrap(),
            "Arun",
            "arun",
            3,
        )
        .unwrap();

        let updated = fs::read_to_string(&source).unwrap();
        assert_eq!(updated, "# Notes\n\nMet [[Arun|arun]] at the temple.\n");
    }

    #[test]
    fn excludes_inline_code_spans() {
        let dir = TempDir::new().unwrap();
        let target = write_note(&dir, "grimoire.md", "# Grimoire\n");
        write_note(
            &dir,
            "notes.md",
            concat!(
                "# Notes\n\n",
                "Run `grimoire` from the shell.\n",
                "Double `` grimoire `tick` `` style too.\n",
                "An unmatched ` backtick before grimoire still counts.\n",
            ),
        );

        let hits = scan(&dir, &target, "Grimoire", &[]);

        assert_eq!(hits.len(), 1);
        assert_eq!(hits[0].line, 5);
        assert_eq!(
            hits[0].context,
            "An unmatched ` backtick before grimoire still counts."
        );
    }

    #[test]
    fn link_mention_skips_occurrences_inside_inline_code() {
        let content = "Run `grimoire` and then grimoire prose.\n";
        let updated = link_mention_in_content(content, "Grimoire", "grimoire", 1).unwrap();
        assert_eq!(
            updated,
            "Run `grimoire` and then [[Grimoire|grimoire]] prose.\n"
        );
    }

    #[test]
    fn link_mention_errors_when_the_only_occurrence_is_inline_code() {
        let content = "Run `grimoire` only.\n";
        let error = link_mention_in_content(content, "Grimoire", "grimoire", 1).unwrap_err();
        assert!(error.contains("no longer present"));
    }

    #[test]
    fn skips_local_only_notes_by_path_and_frontmatter() {
        let dir = TempDir::new().unwrap();
        let target = write_note(&dir, "grimoire.md", "# Grimoire\n");
        write_note(
            &dir,
            "journals/2026-07-16.md",
            "# Day\n\nGrimoire shipped today.\n",
        );
        write_note(&dir, "private/notes.md", "# Hidden\n\nGrimoire secret.\n");
        write_note(
            &dir,
            "session.md",
            "---\ntype: Therapy\n---\n# Session\n\nGrimoire came up.\n",
        );
        write_note(
            &dir,
            "flagged.md",
            "---\nlocal_only: true\n---\n# Flagged\n\nGrimoire again.\n",
        );
        write_note(&dir, "public.md", "# Public\n\nGrimoire in the open.\n");

        let hits = scan(&dir, &target, "Grimoire", &[]);

        assert_eq!(hits.len(), 1);
        assert_eq!(hits[0].title, "Public");
    }

    #[test]
    fn still_scans_public_notes_for_a_local_only_active_note() {
        let dir = TempDir::new().unwrap();
        let target = write_note(
            &dir,
            "journals/therapy-log.md",
            "---\nprivate: true\n---\n# Therapy Log\n",
        );
        write_note(
            &dir,
            "public.md",
            "# Public\n\nUpdated the Therapy Log today.\n",
        );

        let hits = scan(&dir, &target, "Therapy Log", &[]);

        assert_eq!(hits.len(), 1);
        assert_eq!(hits[0].title, "Public");
    }

    #[test]
    fn link_refuses_local_only_source_notes() {
        let dir = TempDir::new().unwrap();
        let by_path = write_note(
            &dir,
            "journals/day.md",
            "# Day\n\nMet arun at the temple.\n",
        );
        let by_frontmatter = write_note(
            &dir,
            "session.md",
            "---\ntype: Therapy\n---\n# Session\n\nMet arun again.\n",
        );
        let vault = dir.path().to_str().unwrap();

        let error =
            link_unlinked_mention(vault, by_path.to_str().unwrap(), "Arun", "arun", 3).unwrap_err();
        assert!(error.contains("local-only"));

        let error =
            link_unlinked_mention(vault, by_frontmatter.to_str().unwrap(), "Arun", "arun", 5)
                .unwrap_err();
        assert!(error.contains("local-only"));

        assert_eq!(
            fs::read_to_string(&by_path).unwrap(),
            "# Day\n\nMet arun at the temple.\n"
        );
        assert!(fs::read_to_string(&by_frontmatter)
            .unwrap()
            .contains("Met arun again."));
    }
}
