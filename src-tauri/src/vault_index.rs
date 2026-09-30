//! One SQLite index per vault: titles and bodies in FTS5, tags, links.
//!
//! Refreshed by comparing the cached vault scan's mtimes with what the index
//! already holds, so a query on an unchanged vault costs one small SELECT and
//! a save re-reads exactly one file. Search, tags and mentions are answered
//! from here instead of walking the vault or scanning every note in JS.

use rusqlite::{params, Connection, OptionalExtension};
use serde::Serialize;
use std::collections::{BTreeMap, HashMap, HashSet};
use std::path::{Path, PathBuf};
use std::sync::{Arc, Mutex};
use std::time::Instant;

use crate::vault::{self, VaultEntry};
use serde::Deserialize;
use sha2::{Digest, Sha256};

const SCHEMA_VERSION: i64 = 2;
/// Marks around FTS5 highlights; stripped before the text leaves this module.
const MARK_OPEN: &str = "\u{1}";
const MARK_CLOSE: &str = "\u{2}";

#[derive(Default, Clone)]
pub struct VaultIndexState(Arc<Mutex<HashMap<PathBuf, Connection>>>);

#[derive(Debug, Clone, Serialize)]
pub struct IndexSearchMatch {
    pub start: usize,
    pub end: usize,
}

#[derive(Debug, Clone, Serialize)]
pub struct IndexSearchResult {
    pub title: String,
    pub path: String,
    pub snippet: String,
    pub snippet_matches: Vec<IndexSearchMatch>,
    pub score: f64,
    pub note_type: Option<String>,
    pub file_kind: String,
}

#[derive(Debug, Clone, Serialize)]
pub struct IndexSearchResponse {
    pub results: Vec<IndexSearchResult>,
    pub elapsed_ms: u64,
    pub query: String,
    pub mode: String,
}

#[derive(Debug, Clone, Serialize)]
pub struct IndexTagRecord {
    pub tag: String,
    pub count: usize,
    pub paths: Vec<String>,
}

#[derive(Debug, Clone, Serialize)]
pub struct IndexTagSnapshot {
    pub version: i64,
    pub tags: Vec<IndexTagRecord>,
}

#[derive(Debug, Clone, Serialize, Default)]
pub struct IndexRefreshReport {
    pub indexed: usize,
    pub removed: usize,
    pub total: usize,
    pub elapsed_ms: u64,
}

fn index_path(vault_path: &Path) -> PathBuf {
    vault::index_db_path(vault_path)
}

fn open(vault_path: &Path) -> Result<Connection, String> {
    let path = index_path(vault_path);
    if let Some(parent) = path.parent() {
        std::fs::create_dir_all(parent)
            .map_err(|error| format!("Could not create the index folder: {error}"))?;
    }
    let conn = Connection::open(&path)
        .map_err(|error| format!("Could not open the vault index: {error}"))?;
    conn.execute_batch(
        "PRAGMA journal_mode = WAL;
         PRAGMA synchronous = NORMAL;
         CREATE TABLE IF NOT EXISTS meta (key TEXT PRIMARY KEY, value TEXT NOT NULL);
         CREATE TABLE IF NOT EXISTS notes (
           path TEXT PRIMARY KEY,
           mtime INTEGER NOT NULL,
           title TEXT NOT NULL,
           is_a TEXT,
           file_kind TEXT NOT NULL,
           size INTEGER NOT NULL DEFAULT 0,
           hash TEXT NOT NULL DEFAULT ''
         );
         CREATE VIRTUAL TABLE IF NOT EXISTS notes_fts USING fts5(
           path UNINDEXED, title, body,
           tokenize = 'unicode61 remove_diacritics 2'
         );
         CREATE TABLE IF NOT EXISTS tags (path TEXT NOT NULL, tag TEXT NOT NULL, PRIMARY KEY (path, tag));
         CREATE INDEX IF NOT EXISTS tags_by_tag ON tags(tag);
         CREATE TABLE IF NOT EXISTS links (from_path TEXT NOT NULL, target TEXT NOT NULL, to_path TEXT, PRIMARY KEY (from_path, target));
         CREATE INDEX IF NOT EXISTS links_by_target ON links(target);
         CREATE INDEX IF NOT EXISTS links_by_to_path ON links(to_path);",
    )
    .map_err(|error| format!("Could not prepare the vault index: {error}"))?;
    let version: Option<String> = conn
        .query_row("SELECT value FROM meta WHERE key = 'schema'", [], |row| {
            row.get(0)
        })
        .optional()
        .map_err(|error| error.to_string())?;
    if version.as_deref() != Some(&SCHEMA_VERSION.to_string()) {
        conn.execute_batch(
            "DELETE FROM notes; DELETE FROM notes_fts; DELETE FROM tags; DELETE FROM links;",
        )
        .map_err(|error| error.to_string())?;
        conn.execute(
            "INSERT OR REPLACE INTO meta (key, value) VALUES ('schema', ?1)",
            params![SCHEMA_VERSION.to_string()],
        )
        .map_err(|error| error.to_string())?;
    }
    Ok(conn)
}

fn with_connection<T>(
    state: &VaultIndexState,
    vault_path: &Path,
    action: impl FnOnce(&mut Connection) -> Result<T, String>,
) -> Result<T, String> {
    let mut guard = state
        .0
        .lock()
        .map_err(|_| "Vault index is busy.".to_string())?;
    if !guard.contains_key(vault_path) {
        let conn = open(vault_path)?;
        guard.insert(vault_path.to_path_buf(), conn);
    }
    let conn = guard
        .get_mut(vault_path)
        .expect("connection inserted above");
    action(conn)
}

// ── Text extraction (pure, unit-tested) ──────────────────────────────────

/// Body without frontmatter, fenced blocks and inline code; what tags and
/// mentions are read from. Search indexes this text too, so a `#tag` inside
/// a code sample never becomes a tag and a word in a fence still searches.
pub fn prose_of(content: &str) -> String {
    let without_frontmatter = strip_frontmatter(content);
    let mut out = String::with_capacity(without_frontmatter.len());
    let mut in_fence = false;
    for line in without_frontmatter.lines() {
        let trimmed = line.trim_start();
        if trimmed.starts_with("```") || trimmed.starts_with("~~~") {
            in_fence = !in_fence;
            out.push('\n');
            continue;
        }
        if in_fence {
            out.push('\n');
            continue;
        }
        let mut in_code = false;
        for ch in line.chars() {
            if ch == '`' {
                in_code = !in_code;
                out.push(' ');
            } else if in_code {
                out.push(' ');
            } else {
                out.push(ch);
            }
        }
        out.push('\n');
    }
    out
}

pub fn strip_frontmatter(content: &str) -> &str {
    let rest = content
        .strip_prefix("---\n")
        .or_else(|| content.strip_prefix("---\r\n"));
    let Some(rest) = rest else { return content };
    for terminator in ["\n---\n", "\n---\r\n", "\r\n---\r\n"] {
        if let Some(index) = rest.find(terminator) {
            return &rest[index + terminator.len()..];
        }
    }
    if rest.ends_with("\n---") || rest.ends_with("\r\n---") {
        return "";
    }
    content
}

/// `Tag/Sub` → `tag/sub`; empty when nothing usable remains.
pub fn normalize_tag(raw: &str) -> Option<String> {
    let trimmed = raw.trim().trim_start_matches('#').trim_matches('/');
    let collapsed: String = {
        let mut out = String::new();
        let mut last_slash = false;
        for ch in trimmed.chars() {
            if ch == '/' {
                if !last_slash {
                    out.push('/');
                }
                last_slash = true;
            } else {
                out.push(ch);
                last_slash = false;
            }
        }
        out
    };
    let lower = collapsed.to_lowercase();
    if lower.is_empty() || lower.chars().all(|ch| ch.is_ascii_digit()) {
        return None;
    }
    Some(lower)
}

fn is_tag_char(ch: char) -> bool {
    ch.is_alphanumeric() || ch == '_' || ch == '-' || ch == '/'
}

/// Tags from `tags:` in frontmatter (list or inline) and `#tag` tokens in prose.
pub fn tags_of(content: &str, prose: &str) -> Vec<String> {
    let mut tags = HashSet::new();
    for raw in frontmatter_tag_values(content) {
        if let Some(tag) = normalize_tag(&raw) {
            tags.insert(tag);
        }
    }
    let chars: Vec<char> = prose.chars().collect();
    let mut index = 0;
    while index < chars.len() {
        if chars[index] == '#' && (index == 0 || !chars[index - 1].is_alphanumeric()) {
            let start = index + 1;
            let mut end = start;
            while end < chars.len() && is_tag_char(chars[end]) {
                end += 1;
            }
            if end > start {
                let raw: String = chars[start..end].iter().collect();
                if let Some(tag) = normalize_tag(&raw) {
                    tags.insert(tag);
                }
            }
            index = end.max(index + 1);
        } else {
            index += 1;
        }
    }
    let mut list: Vec<String> = tags.into_iter().collect();
    list.sort();
    list
}

fn frontmatter_tag_values(content: &str) -> Vec<String> {
    let Some(rest) = content
        .strip_prefix("---\n")
        .or_else(|| content.strip_prefix("---\r\n"))
    else {
        return Vec::new();
    };
    let block = rest.split("\n---").next().unwrap_or("");
    let mut values = Vec::new();
    let mut lines = block.lines().peekable();
    while let Some(line) = lines.next() {
        let lower = line.trim_start().to_ascii_lowercase();
        if !(lower.starts_with("tags:") || lower.starts_with("tag:")) || line.starts_with(' ') {
            continue;
        }
        let after = line.split_once(':').map_or("", |(_, rest)| rest).trim();
        if after.starts_with('[') {
            for item in after.trim_matches(|c| c == '[' || c == ']').split(',') {
                values.push(item.trim().trim_matches('"').trim_matches('\'').to_string());
            }
        } else if !after.is_empty() {
            for item in after.split(',') {
                values.push(item.trim().trim_matches('"').trim_matches('\'').to_string());
            }
        } else {
            while let Some(next) = lines.peek() {
                let item = next.trim_start();
                if let Some(value) = item.strip_prefix("- ") {
                    values.push(
                        value
                            .trim()
                            .trim_matches('"')
                            .trim_matches('\'')
                            .to_string(),
                    );
                    lines.next();
                } else {
                    break;
                }
            }
        }
    }
    values
}

/// `a/b/c` → `a`, `a/b`, `a/b/c`, so a nested tag counts under each ancestor.
pub fn tag_lineage(tag: &str) -> Vec<String> {
    let parts: Vec<&str> = tag.split('/').collect();
    (1..=parts.len()).map(|n| parts[..n].join("/")).collect()
}

/// Turns free text into an FTS5 query: every word quoted, the last one a
/// prefix, so search-as-you-type matches "gri" against "grimoire".
pub fn fts_query(raw: &str) -> Option<String> {
    let words: Vec<String> = raw
        .split_whitespace()
        .map(|word| word.replace('"', ""))
        .filter(|word| !word.is_empty())
        .collect();
    if words.is_empty() {
        return None;
    }
    let last = words.len() - 1;
    Some(
        words
            .iter()
            .enumerate()
            .map(|(index, word)| {
                if index == last {
                    format!("\"{word}\"*")
                } else {
                    format!("\"{word}\"")
                }
            })
            .collect::<Vec<_>>()
            .join(" "),
    )
}

/// Removes the highlight marks and reports where the highlights were, in
/// character offsets, which is what the renderer slices with.
pub fn strip_marks(marked: &str) -> (String, Vec<IndexSearchMatch>) {
    let mut text = String::with_capacity(marked.len());
    let mut matches = Vec::new();
    let mut open_at: Option<usize> = None;
    let mut chars = 0usize;
    let mut rest = marked;
    while !rest.is_empty() {
        if let Some(after) = rest.strip_prefix(MARK_OPEN) {
            open_at = Some(chars);
            rest = after;
        } else if let Some(after) = rest.strip_prefix(MARK_CLOSE) {
            if let Some(start) = open_at.take() {
                matches.push(IndexSearchMatch { start, end: chars });
            }
            rest = after;
        } else {
            let ch = rest.chars().next().expect("non-empty");
            text.push(ch);
            chars += 1;
            rest = &rest[ch.len_utf8()..];
        }
    }
    (text, matches)
}

// ── Link resolution (same rules as the inspector's in-memory lookup) ───────

pub struct LinkLookup {
    exact: HashMap<String, Vec<String>>,
    suffix: HashMap<String, Vec<String>>,
}

impl LinkLookup {
    pub fn build(entries: &[VaultEntry]) -> Self {
        let mut exact: HashMap<String, Vec<String>> = HashMap::new();
        let mut suffix: HashMap<String, Vec<String>> = HashMap::new();
        for entry in entries {
            let stem = entry.filename.trim_end_matches(".md").to_string();
            let mut keys = vec![stem, entry.title.clone()];
            keys.extend(entry.aliases.iter().cloned());
            for key in keys {
                if key.is_empty() {
                    continue;
                }
                exact.entry(key).or_default().push(entry.path.clone());
            }
            let no_ext = entry.path.trim_end_matches(".md").trim_start_matches('/');
            let segments: Vec<&str> = no_ext.split('/').collect();
            for start in 0..segments.len() {
                suffix
                    .entry(segments[start..].join("/").to_lowercase())
                    .or_default()
                    .push(entry.path.clone());
            }
        }
        Self { exact, suffix }
    }

    /// First matching path for a wikilink target, or None when no page exists yet.
    pub fn resolve(&self, target: &str, from_path: &str) -> Option<String> {
        let mut candidates: Vec<&String> = Vec::new();
        if let Some(paths) = self.exact.get(target) {
            candidates.extend(paths);
        }
        if let Some(last) = target.rsplit('/').next() {
            if let Some(paths) = self.exact.get(last) {
                candidates.extend(paths);
            }
        }
        if target.contains('/') {
            if let Some(paths) = self.suffix.get(&target.to_lowercase()) {
                candidates.extend(paths);
            }
        }
        candidates
            .into_iter()
            .find(|path| path.as_str() != from_path)
            .cloned()
    }
}

pub fn content_hash(content: &str) -> String {
    let mut hasher = Sha256::new();
    hasher.update(content.as_bytes());
    format!("{:x}", hasher.finalize())
}

// ── Refresh ───────────────────────────────────────────────────────────────

fn indexed_mtimes(conn: &Connection) -> Result<HashMap<String, i64>, String> {
    let mut statement = conn
        .prepare("SELECT path, mtime FROM notes")
        .map_err(|e| e.to_string())?;
    let rows = statement
        .query_map([], |row| {
            Ok((row.get::<_, String>(0)?, row.get::<_, i64>(1)?))
        })
        .map_err(|e| e.to_string())?;
    let mut map = HashMap::new();
    for row in rows {
        let (path, mtime) = row.map_err(|e| e.to_string())?;
        map.insert(path, mtime);
    }
    Ok(map)
}

fn index_entry(
    conn: &Connection,
    entry: &VaultEntry,
    content: &str,
    lookup: &LinkLookup,
) -> Result<(), String> {
    let prose = prose_of(content);
    let tags = tags_of(content, &prose);
    let mtime = entry.modified_at.unwrap_or(0) as i64;
    conn.execute("DELETE FROM notes_fts WHERE path = ?1", params![entry.path])
        .map_err(|e| e.to_string())?;
    conn.execute("DELETE FROM tags WHERE path = ?1", params![entry.path])
        .map_err(|e| e.to_string())?;
    conn.execute(
        "DELETE FROM links WHERE from_path = ?1",
        params![entry.path],
    )
    .map_err(|e| e.to_string())?;
    conn.execute(
        "INSERT OR REPLACE INTO notes (path, mtime, title, is_a, file_kind, size, hash) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
        params![entry.path, mtime, entry.title, entry.is_a, entry.file_kind, content.len() as i64, content_hash(content)],
    )
    .map_err(|e| e.to_string())?;
    conn.execute(
        "INSERT INTO notes_fts (path, title, body) VALUES (?1, ?2, ?3)",
        params![entry.path, entry.title, strip_frontmatter(content)],
    )
    .map_err(|e| e.to_string())?;
    for tag in tags {
        conn.execute(
            "INSERT OR IGNORE INTO tags (path, tag) VALUES (?1, ?2)",
            params![entry.path, tag],
        )
        .map_err(|e| e.to_string())?;
    }
    for target in &entry.outgoing_links {
        let to_path = lookup.resolve(target, &entry.path);
        conn.execute(
            "INSERT OR IGNORE INTO links (from_path, target, to_path) VALUES (?1, ?2, ?3)",
            params![entry.path, target.to_lowercase(), to_path],
        )
        .map_err(|e| e.to_string())?;
    }
    Ok(())
}

fn remove_path(conn: &Connection, path: &str) -> Result<(), String> {
    for sql in [
        "DELETE FROM notes WHERE path = ?1",
        "DELETE FROM notes_fts WHERE path = ?1",
        "DELETE FROM tags WHERE path = ?1",
        "DELETE FROM links WHERE from_path = ?1",
    ] {
        conn.execute(sql, params![path])
            .map_err(|e| e.to_string())?;
    }
    Ok(())
}

/// Bring the index in line with the entries: re-read files whose mtime moved,
/// drop files that are gone. Cheap when nothing changed.
pub fn refresh_with(
    conn: &mut Connection,
    entries: &[VaultEntry],
) -> Result<IndexRefreshReport, String> {
    let started = Instant::now();
    let known = indexed_mtimes(conn)?;
    let mut report = IndexRefreshReport::default();
    let present: HashSet<&str> = entries.iter().map(|entry| entry.path.as_str()).collect();
    let lookup = LinkLookup::build(entries);
    let transaction = conn.transaction().map_err(|e| e.to_string())?;
    for entry in entries {
        if entry.file_kind != "markdown" {
            continue;
        }
        let mtime = entry.modified_at.unwrap_or(0) as i64;
        if known.get(&entry.path) == Some(&mtime) {
            continue;
        }
        let Ok(content) = std::fs::read_to_string(&entry.path) else {
            continue;
        };
        index_entry(&transaction, entry, &content, &lookup)?;
        report.indexed += 1;
    }
    for path in known.keys() {
        if !present.contains(path.as_str()) {
            remove_path(&transaction, path)?;
            report.removed += 1;
        }
    }
    transaction.commit().map_err(|e| e.to_string())?;
    report.total = entries
        .iter()
        .filter(|entry| entry.file_kind == "markdown")
        .count();
    report.elapsed_ms = started.elapsed().as_millis() as u64;
    Ok(report)
}

pub fn refresh(state: &VaultIndexState, vault_path: &Path) -> Result<IndexRefreshReport, String> {
    let entries = vault::scan_vault_cached(vault_path)?;
    with_connection(state, vault_path, |conn| refresh_with(conn, &entries))
}

// ── Queries ───────────────────────────────────────────────────────────────

pub fn search_with(
    conn: &Connection,
    query: &str,
    limit: usize,
) -> Result<IndexSearchResponse, String> {
    let started = Instant::now();
    let mut results = Vec::new();
    if let Some(fts) = fts_query(query) {
        let sql = format!(
            "SELECT n.path, n.title, n.is_a, n.file_kind,
                    highlight(notes_fts, 1, '{o}', '{c}') AS title_marked,
                    snippet(notes_fts, 2, '{o}', '{c}', '…', 24) AS body_snippet,
                    bm25(notes_fts, 8.0, 1.0) AS rank
             FROM notes_fts JOIN notes n ON n.path = notes_fts.path
             WHERE notes_fts MATCH ?1
             ORDER BY rank
             LIMIT ?2",
            o = MARK_OPEN,
            c = MARK_CLOSE
        );
        let mut statement = conn.prepare(&sql).map_err(|e| e.to_string())?;
        let rows = statement
            .query_map(params![fts, limit as i64], |row| {
                Ok((
                    row.get::<_, String>(0)?,
                    row.get::<_, String>(1)?,
                    row.get::<_, Option<String>>(2)?,
                    row.get::<_, String>(3)?,
                    row.get::<_, String>(4)?,
                    row.get::<_, String>(5)?,
                    row.get::<_, f64>(6)?,
                ))
            })
            .map_err(|e| e.to_string())?;
        for row in rows {
            let (path, title, is_a, file_kind, _title_marked, body_snippet, rank) =
                row.map_err(|e| e.to_string())?;
            let (snippet, snippet_matches) = strip_marks(&body_snippet);
            results.push(IndexSearchResult {
                title,
                path,
                snippet: snippet.split_whitespace().collect::<Vec<_>>().join(" "),
                snippet_matches,
                // bm25 is lower-is-better and negative; flip so bigger is better like the old scorer.
                score: -rank,
                note_type: is_a,
                file_kind,
            });
        }
    }
    Ok(IndexSearchResponse {
        results,
        elapsed_ms: started.elapsed().as_millis() as u64,
        query: query.to_string(),
        mode: "index".into(),
    })
}

pub fn search(
    state: &VaultIndexState,
    vault_path: &Path,
    query: &str,
    limit: usize,
) -> Result<IndexSearchResponse, String> {
    refresh(state, vault_path)?;
    with_connection(state, vault_path, |conn| search_with(conn, query, limit))
}

pub fn tags_with(conn: &Connection) -> Result<IndexTagSnapshot, String> {
    let mut statement = conn
        .prepare("SELECT path, tag FROM tags")
        .map_err(|e| e.to_string())?;
    let rows = statement
        .query_map([], |row| {
            Ok((row.get::<_, String>(0)?, row.get::<_, String>(1)?))
        })
        .map_err(|e| e.to_string())?;
    let mut by_tag: BTreeMap<String, HashSet<String>> = BTreeMap::new();
    for row in rows {
        let (path, tag) = row.map_err(|e| e.to_string())?;
        for ancestor in tag_lineage(&tag) {
            by_tag.entry(ancestor).or_default().insert(path.clone());
        }
    }
    let tags = by_tag
        .into_iter()
        .map(|(tag, paths)| {
            let mut paths: Vec<String> = paths.into_iter().collect();
            paths.sort();
            IndexTagRecord {
                count: paths.len(),
                tag,
                paths,
            }
        })
        .collect();
    let version: i64 = conn
        .query_row("SELECT COALESCE(MAX(mtime), 0) FROM notes", [], |row| {
            row.get(0)
        })
        .map_err(|e| e.to_string())?;
    Ok(IndexTagSnapshot { version, tags })
}

pub fn tags(state: &VaultIndexState, vault_path: &Path) -> Result<IndexTagSnapshot, String> {
    refresh(state, vault_path)?;
    with_connection(state, vault_path, |conn| tags_with(conn))
}

pub fn mentions_with(conn: &Connection, phrase: &str, limit: usize) -> Result<Vec<String>, String> {
    let cleaned = phrase.replace('"', "").trim().to_string();
    if cleaned.is_empty() {
        return Ok(Vec::new());
    }
    let mut statement = conn
        .prepare(
            "SELECT path FROM notes_fts WHERE notes_fts MATCH ?1 ORDER BY bm25(notes_fts) LIMIT ?2",
        )
        .map_err(|e| e.to_string())?;
    let rows = statement
        .query_map(params![format!("\"{cleaned}\""), limit as i64], |row| {
            row.get::<_, String>(0)
        })
        .map_err(|e| e.to_string())?;
    rows.map(|row| row.map_err(|e| e.to_string())).collect()
}

pub fn mentions(
    state: &VaultIndexState,
    vault_path: &Path,
    phrase: &str,
    limit: usize,
) -> Result<Vec<String>, String> {
    refresh(state, vault_path)?;
    with_connection(state, vault_path, |conn| mentions_with(conn, phrase, limit))
}

// ── Backlinks ─────────────────────────────────────────────────────────────

/// Pages whose body links to `path`, resolved at index time with the same
/// rules the inspector uses, so the answer is one indexed lookup.
pub fn backlinks_with(conn: &Connection, path: &str) -> Result<Vec<String>, String> {
    let mut statement = conn
        .prepare("SELECT DISTINCT from_path FROM links WHERE to_path = ?1 AND from_path != ?1 ORDER BY from_path")
        .map_err(|e| e.to_string())?;
    let rows = statement
        .query_map(params![path], |row| row.get::<_, String>(0))
        .map_err(|e| e.to_string())?;
    rows.map(|row| row.map_err(|e| e.to_string())).collect()
}

pub fn backlinks(
    state: &VaultIndexState,
    vault_path: &Path,
    path: &str,
) -> Result<Vec<String>, String> {
    refresh(state, vault_path)?;
    with_connection(state, vault_path, |conn| backlinks_with(conn, path))
}

// ── Sync manifest ─────────────────────────────────────────────────────────

/// What another device needs to know about a note to decide who is newer:
/// the vault-relative path, the mtime, the size and a content hash.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct ManifestEntry {
    pub path: String,
    pub mtime: i64,
    pub size: i64,
    pub hash: String,
}

pub fn manifest_with(conn: &Connection, vault_path: &Path) -> Result<Vec<ManifestEntry>, String> {
    let root = vault_path
        .to_string_lossy()
        .trim_end_matches('/')
        .to_string();
    let mut statement = conn
        .prepare(
            "SELECT path, mtime, size, hash FROM notes WHERE file_kind = 'markdown' ORDER BY path",
        )
        .map_err(|e| e.to_string())?;
    let rows = statement
        .query_map([], |row| {
            Ok(ManifestEntry {
                path: row.get::<_, String>(0)?,
                mtime: row.get::<_, i64>(1)?,
                size: row.get::<_, i64>(2)?,
                hash: row.get::<_, String>(3)?,
            })
        })
        .map_err(|e| e.to_string())?;
    rows.map(|row| {
        row.map(|mut entry| {
            if let Some(relative) = entry.path.strip_prefix(&format!("{root}/")) {
                entry.path = relative.to_string();
            }
            entry
        })
        .map_err(|e| e.to_string())
    })
    .collect()
}

pub fn manifest(state: &VaultIndexState, vault_path: &Path) -> Result<Vec<ManifestEntry>, String> {
    refresh(state, vault_path)?;
    with_connection(state, vault_path, |conn| manifest_with(conn, vault_path))
}

/// The decision for one sync round. Never silently drops an edit: a note
/// changed on both sides since the last sync is a conflict, kept as both.
#[derive(Debug, Clone, Serialize, Deserialize, Default, PartialEq, Eq)]
pub struct SyncPlan {
    /// Remote is newer or new; fetch it.
    pub pull: Vec<String>,
    /// Local is newer or new; send it.
    pub push: Vec<String>,
    /// Both changed since the last sync and differ; keep both as conflict copies.
    pub conflicts: Vec<String>,
    /// Deleted remotely since the last sync and untouched locally.
    pub delete_local: Vec<String>,
    /// Deleted locally since the last sync and untouched remotely.
    pub delete_remote: Vec<String>,
}

/// Three-way when a `base` (the manifest at the last successful sync) exists;
/// mtime comparison, hash-equal short circuit, when it does not.
pub fn sync_plan(
    local: &[ManifestEntry],
    remote: &[ManifestEntry],
    base: Option<&[ManifestEntry]>,
) -> SyncPlan {
    let by_path = |list: &[ManifestEntry]| -> BTreeMap<String, ManifestEntry> {
        list.iter()
            .map(|entry| (entry.path.clone(), entry.clone()))
            .collect()
    };
    let local = by_path(local);
    let remote = by_path(remote);
    let base = base.map(by_path);
    let mut plan = SyncPlan::default();
    let mut paths: Vec<&String> = local.keys().chain(remote.keys()).collect();
    if let Some(base) = &base {
        paths.extend(base.keys());
    }
    paths.sort();
    paths.dedup();
    for path in paths {
        let l = local.get(path);
        let r = remote.get(path);
        let b = base.as_ref().and_then(|base| base.get(path));
        match (l, r) {
            (Some(l), Some(r)) => {
                if l.hash == r.hash {
                    continue;
                }
                match b {
                    Some(b) => {
                        let local_changed = l.hash != b.hash;
                        let remote_changed = r.hash != b.hash;
                        match (local_changed, remote_changed) {
                            (true, true) => plan.conflicts.push(path.clone()),
                            (true, false) => plan.push.push(path.clone()),
                            (false, true) => plan.pull.push(path.clone()),
                            (false, false) => {}
                        }
                    }
                    None => {
                        if l.mtime > r.mtime {
                            plan.push.push(path.clone());
                        } else if r.mtime > l.mtime {
                            plan.pull.push(path.clone());
                        } else {
                            plan.conflicts.push(path.clone());
                        }
                    }
                }
            }
            (Some(l), None) => match b {
                // Known at last sync, gone remotely: deleted there unless we edited since.
                Some(b) if l.hash == b.hash => plan.delete_local.push(path.clone()),
                _ => plan.push.push(path.clone()),
            },
            (None, Some(r)) => match b {
                Some(b) if r.hash == b.hash => plan.delete_remote.push(path.clone()),
                _ => plan.pull.push(path.clone()),
            },
            (None, None) => {}
        }
    }
    plan
}

#[cfg(test)]
mod tests {
    use super::*;

    fn entry(path: &str, title: &str, mtime: u64, links: &[&str]) -> VaultEntry {
        VaultEntry {
            path: path.to_string(),
            filename: Path::new(path)
                .file_name()
                .unwrap()
                .to_string_lossy()
                .to_string(),
            title: title.to_string(),
            modified_at: Some(mtime),
            file_kind: "markdown".into(),
            outgoing_links: links.iter().map(|link| link.to_string()).collect(),
            ..VaultEntry::default()
        }
    }

    #[test]
    fn prose_drops_frontmatter_fences_and_inline_code() {
        let content =
            "---\ntags: [A, b/c]\n---\n# Title\n\nText #real `#notag` more\n```\n#fenced\n```\nend";
        let prose = prose_of(content);
        assert!(!prose.contains("tags:"));
        assert!(!prose.contains("#notag"));
        assert!(!prose.contains("#fenced"));
        assert!(prose.contains("#real"));
        let tags = tags_of(content, &prose);
        assert_eq!(tags, vec!["a", "b/c", "real"]);
    }

    #[test]
    fn frontmatter_tags_accept_lists_and_inline_forms() {
        let listed = "---\ntags:\n  - One\n  - two/Three\nother: x\n---\nbody";
        assert_eq!(tags_of(listed, &prose_of(listed)), vec!["one", "two/three"]);
        let inline = "---\ntags: alpha, beta\n---\nbody";
        assert_eq!(tags_of(inline, &prose_of(inline)), vec!["alpha", "beta"]);
    }

    #[test]
    fn lineage_query_and_marks_behave() {
        assert_eq!(tag_lineage("a/b/c"), vec!["a", "a/b", "a/b/c"]);
        assert_eq!(
            fts_query("  gri  moire ").as_deref(),
            Some("\"gri\" \"moire\"*")
        );
        assert_eq!(fts_query("\"\""), None);
        let (text, marks) = strip_marks("say \u{1}hello\u{2} to \u{1}wörld\u{2}!");
        assert_eq!(text, "say hello to wörld!");
        assert_eq!(
            marks.iter().map(|m| (m.start, m.end)).collect::<Vec<_>>(),
            vec![(4, 9), (13, 18)]
        );
    }

    #[test]
    fn index_refreshes_by_mtime_and_answers_search_tags_and_mentions() {
        let dir = tempfile::tempdir().unwrap();
        let vault = dir.path();
        let a = vault.join("alpha.md");
        let b = vault.join("beta.md");
        std::fs::write(
            &a,
            "---\ntags: [project/grimoire]\n---\n# Alpha\n\nThe grimoire keeps notes. #daily",
        )
        .unwrap();
        std::fs::write(
            &b,
            "# Beta\n\nNothing about the book here, but it mentions Alpha in prose.",
        )
        .unwrap();
        let entries = vec![
            entry(a.to_str().unwrap(), "Alpha", 10, &["Beta"]),
            entry(b.to_str().unwrap(), "Beta", 10, &[]),
        ];
        let mut conn = Connection::open_in_memory().unwrap();
        conn.execute_batch(
            "CREATE TABLE meta (key TEXT PRIMARY KEY, value TEXT NOT NULL);
             CREATE TABLE notes (path TEXT PRIMARY KEY, mtime INTEGER NOT NULL, title TEXT NOT NULL, is_a TEXT, file_kind TEXT NOT NULL, size INTEGER NOT NULL DEFAULT 0, hash TEXT NOT NULL DEFAULT '');
             CREATE VIRTUAL TABLE notes_fts USING fts5(path UNINDEXED, title, body, tokenize = 'unicode61 remove_diacritics 2');
             CREATE TABLE tags (path TEXT NOT NULL, tag TEXT NOT NULL, PRIMARY KEY (path, tag));
             CREATE TABLE links (from_path TEXT NOT NULL, target TEXT NOT NULL, to_path TEXT, PRIMARY KEY (from_path, target));",
        )
        .unwrap();

        let first = refresh_with(&mut conn, &entries).unwrap();
        assert_eq!((first.indexed, first.removed, first.total), (2, 0, 2));
        let again = refresh_with(&mut conn, &entries).unwrap();
        assert_eq!(again.indexed, 0, "unchanged mtimes are not re-read");

        let hits = search_with(&conn, "grim", 10).unwrap();
        assert_eq!(hits.results.len(), 1);
        assert_eq!(hits.results[0].title, "Alpha");
        assert!(!hits.results[0].snippet_matches.is_empty());
        assert!(hits.results[0].snippet.to_lowercase().contains("grimoire"));

        let snapshot = tags_with(&conn).unwrap();
        let names: Vec<&str> = snapshot
            .tags
            .iter()
            .map(|record| record.tag.as_str())
            .collect();
        assert_eq!(names, vec!["daily", "project", "project/grimoire"]);

        let mentioning = mentions_with(&conn, "Alpha", 10).unwrap();
        assert!(mentioning.iter().any(|path| path.ends_with("beta.md")));

        // Alpha links to Beta by title; Beta's backlinks are exactly Alpha.
        let back = backlinks_with(&conn, b.to_str().unwrap()).unwrap();
        assert_eq!(back, vec![a.to_str().unwrap().to_string()]);
        assert!(backlinks_with(&conn, a.to_str().unwrap())
            .unwrap()
            .is_empty());

        let manifest = manifest_with(&conn, vault).unwrap();
        assert_eq!(
            manifest.iter().map(|m| m.path.as_str()).collect::<Vec<_>>(),
            vec!["alpha.md", "beta.md"]
        );
        assert_eq!(manifest[0].hash.len(), 64);
        assert!(manifest[0].size > 0);

        // Beta disappears, Alpha changes: one re-read, one removal.
        std::fs::write(&a, "# Alpha\n\nRewritten.").unwrap();
        let entries = vec![entry(a.to_str().unwrap(), "Alpha", 11, &[])];
        let third = refresh_with(&mut conn, &entries).unwrap();
        assert_eq!((third.indexed, third.removed), (1, 1));
        assert!(search_with(&conn, "grimoire", 10)
            .unwrap()
            .results
            .is_empty());
    }

    fn m(path: &str, mtime: i64, hash: &str) -> ManifestEntry {
        ManifestEntry {
            path: path.into(),
            mtime,
            size: 1,
            hash: hash.into(),
        }
    }

    #[test]
    fn sync_plan_three_way_never_drops_an_edit() {
        let base = vec![
            m("a.md", 1, "A"),
            m("b.md", 1, "B"),
            m("c.md", 1, "C"),
            m("d.md", 1, "D"),
        ];
        let local = vec![
            m("a.md", 5, "A2"),
            m("b.md", 1, "B"),
            m("c.md", 5, "C2"),
            m("e.md", 5, "E"),
        ];
        let remote = vec![
            m("a.md", 6, "A3"),
            m("b.md", 6, "B2"),
            m("d.md", 1, "D"),
            m("f.md", 6, "F"),
        ];
        let plan = sync_plan(&local, &remote, Some(&base));
        assert_eq!(plan.conflicts, vec!["a.md"]); // both changed, differ
        assert_eq!(plan.pull, vec!["b.md", "f.md"]); // remote changed / new remote
        assert_eq!(plan.push, vec!["c.md", "e.md"]); // gone remotely but edited here / new local
        assert_eq!(plan.delete_local, Vec::<String>::new());
        assert_eq!(plan.delete_remote, vec!["d.md"]); // gone locally, untouched remotely
    }

    #[test]
    fn sync_plan_without_a_base_uses_mtime_and_treats_ties_as_conflicts() {
        let local = vec![
            m("a.md", 5, "A1"),
            m("b.md", 1, "B1"),
            m("c.md", 3, "C1"),
            m("same.md", 9, "S"),
        ];
        let remote = vec![
            m("a.md", 2, "A2"),
            m("b.md", 4, "B2"),
            m("c.md", 3, "C2"),
            m("same.md", 1, "S"),
        ];
        let plan = sync_plan(&local, &remote, None);
        assert_eq!(plan.push, vec!["a.md"]);
        assert_eq!(plan.pull, vec!["b.md"]);
        assert_eq!(plan.conflicts, vec!["c.md"]);
        assert!(plan.delete_local.is_empty() && plan.delete_remote.is_empty());
    }

    #[test]
    fn link_lookup_matches_title_stem_alias_and_path_suffix_but_not_self() {
        let mut a = entry("/v/topic/agent-council.md", "Agent Council", 1, &[]);
        a.aliases = vec!["Council".into()];
        let b = entry("/v/notes/b.md", "B", 1, &[]);
        let lookup = LinkLookup::build(&[a.clone(), b]);
        assert_eq!(
            lookup.resolve("Agent Council", "/v/notes/b.md").as_deref(),
            Some("/v/topic/agent-council.md")
        );
        assert_eq!(
            lookup.resolve("agent-council", "/v/notes/b.md").as_deref(),
            Some("/v/topic/agent-council.md")
        );
        assert_eq!(
            lookup.resolve("Council", "/v/notes/b.md").as_deref(),
            Some("/v/topic/agent-council.md")
        );
        assert_eq!(
            lookup
                .resolve("topic/Agent-Council", "/v/notes/b.md")
                .as_deref(),
            Some("/v/topic/agent-council.md")
        );
        assert_eq!(
            lookup.resolve("Agent Council", "/v/topic/agent-council.md"),
            None
        );
        assert_eq!(lookup.resolve("Nowhere", "/v/notes/b.md"), None);
    }
}
