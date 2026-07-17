use serde::Serialize;
use std::collections::HashMap;
use std::path::{Path, PathBuf};
use std::sync::atomic::{AtomicUsize, Ordering};
use std::sync::{Arc, Mutex};
use std::time::{Instant, SystemTime};
use walkdir::WalkDir;

const MAX_SEARCHABLE_FILE_BYTES: u64 = 2 * 1024 * 1024;

/// A matched term range within `SearchResult::snippet`, in UTF-16 code units
/// so the frontend can slice the snippet string directly.
#[derive(Debug, Serialize, Clone, PartialEq, Eq)]
pub struct SnippetMatch {
    pub start: usize,
    pub end: usize,
}

#[derive(Debug, Serialize, Clone)]
pub struct SearchResult {
    pub title: String,
    pub path: String,
    pub snippet: String,
    pub snippet_matches: Vec<SnippetMatch>,
    pub score: f64,
    pub note_type: Option<String>,
    pub file_kind: String,
}

#[derive(Debug, Serialize)]
pub struct SearchResponse {
    pub results: Vec<SearchResult>,
    pub elapsed_ms: u64,
    pub query: String,
    pub mode: String,
}

/// One searchable document, cached between queries so repeated keystrokes do
/// not re-read or re-lowercase unchanged files.
struct CachedDoc {
    mtime: Option<SystemTime>,
    size: u64,
    content: String,
    content_lower: String,
    title: String,
    title_lower: String,
    file_kind: &'static str,
}

/// In-memory per-vault search cache. Entries are validated against
/// mtime + size on every search and evicted when files vanish.
#[derive(Default)]
pub struct SearchCache {
    vaults: Mutex<HashMap<String, HashMap<PathBuf, CachedDoc>>>,
    file_reads: AtomicUsize,
}

impl SearchCache {
    /// Number of files read from disk so far (cache misses). Used by tests to
    /// assert cache reuse.
    pub fn file_reads(&self) -> usize {
        self.file_reads.load(Ordering::SeqCst)
    }
}

/// Tauri-managed wrapper so the `Arc` can be cloned into `spawn_blocking`.
#[derive(Default)]
pub struct SearchCacheState(pub Arc<SearchCache>);

fn floor_char_boundary(s: &str, index: usize) -> usize {
    let mut i = index.min(s.len());
    while i > 0 && !s.is_char_boundary(i) {
        i -= 1;
    }
    i
}

/// Extracts the line (bounded, max 200 chars-ish) around the earliest term hit
/// in the content. Returns an empty string when no term matches the body.
fn extract_snippet(content: &str, content_lower: &str, terms: &[String]) -> String {
    let pos = match terms.iter().filter_map(|t| content_lower.find(t)).min() {
        Some(p) => p,
        None => return String::new(),
    };
    // Positions come from the lowercased content; slice the original only when
    // lowercasing preserved byte length (the common case), else stay lossless
    // by slicing the lowercased text.
    let source = if content.len() == content_lower.len() {
        content
    } else {
        content_lower
    };
    let pos = floor_char_boundary(source, pos);
    let start = source[..pos]
        .rfind('\n')
        .map(|i| i + 1)
        .unwrap_or_else(|| floor_char_boundary(source, pos.saturating_sub(60)));
    let end = source[pos..]
        .find('\n')
        .map(|i| pos + i)
        .unwrap_or_else(|| floor_char_boundary(source, (pos + 120).min(source.len())));
    let snippet = source[start..end].trim_end();
    if snippet.len() > 200 {
        format!("{}…", &snippet[..floor_char_boundary(snippet, 200)])
    } else {
        snippet.to_string()
    }
}

/// Finds every case-insensitive occurrence of each term inside the snippet and
/// returns merged, sorted ranges in UTF-16 code units.
fn snippet_term_matches(snippet: &str, terms: &[String]) -> Vec<SnippetMatch> {
    let chars: Vec<char> = snippet.chars().collect();
    let lower: Vec<char> = chars
        .iter()
        .map(|c| c.to_lowercase().next().unwrap_or(*c))
        .collect();
    let mut utf16_offsets = Vec::with_capacity(chars.len() + 1);
    let mut acc = 0usize;
    utf16_offsets.push(0);
    for c in &chars {
        acc += c.len_utf16();
        utf16_offsets.push(acc);
    }

    let mut ranges: Vec<(usize, usize)> = Vec::new();
    for term in terms {
        let term_chars: Vec<char> = term.chars().collect();
        if term_chars.is_empty() || term_chars.len() > lower.len() {
            continue;
        }
        for start in 0..=(lower.len() - term_chars.len()) {
            if lower[start..start + term_chars.len()] == term_chars[..] {
                ranges.push((start, start + term_chars.len()));
            }
        }
    }
    ranges.sort_unstable();

    let mut merged: Vec<(usize, usize)> = Vec::new();
    for (start, end) in ranges {
        if let Some(last) = merged.last_mut() {
            if start <= last.1 {
                last.1 = last.1.max(end);
                continue;
            }
        }
        merged.push((start, end));
    }
    merged
        .into_iter()
        .map(|(start, end)| SnippetMatch {
            start: utf16_offsets[start],
            end: utf16_offsets[end],
        })
        .collect()
}

fn heading_line_contains(content_lower: &str, term: &str) -> bool {
    content_lower.lines().any(|line| {
        let trimmed = line.trim_start();
        trimmed.starts_with('#') && trimmed.contains(term)
    })
}

/// Deterministic ranking. The query is split on whitespace into terms; every
/// term must match somewhere (title, body, or relative path) for a document to
/// be a hit. The score is a sum of per-term contributions:
///
///   title == term              +30.0   (title exact; tiers are exclusive,
///   title starts with term     +20.0    best one wins)
///   title has word == term     +14.0
///   title contains term         +9.0
///   filename contains term      +6.0   (exclusive with path tier)
///   relative path contains      +3.0
///   heading line contains term  +2.0
///   body occurrences            +0.5 each, capped at 20 (max +10.0)
///
/// plus, for multi-term queries, a phrase bonus for the normalized query
/// (terms joined by one space) against the title: exact +30 / prefix +20 /
/// contains +9. Ties are broken by relative path for stable ordering.
fn score_match(
    title_lower: &str,
    content_lower: &str,
    relative_path_lower: &str,
    filename_lower: &str,
    query_lower: &str,
) -> f64 {
    let terms: Vec<String> = query_lower.split_whitespace().map(String::from).collect();
    if terms.is_empty() {
        return 0.0;
    }

    let title_tier = |needle: &str| -> f64 {
        if title_lower == needle {
            30.0
        } else if title_lower.starts_with(needle) {
            20.0
        } else if title_lower.split_whitespace().any(|w| w == needle) {
            14.0
        } else if title_lower.contains(needle) {
            9.0
        } else {
            0.0
        }
    };

    let mut score = 0.0;
    for term in &terms {
        score += title_tier(term);
        if filename_lower.contains(term.as_str()) {
            score += 6.0;
        } else if relative_path_lower.contains(term.as_str()) {
            score += 3.0;
        }
        if heading_line_contains(content_lower, term) {
            score += 2.0;
        }
        let body_count = content_lower.matches(term.as_str()).count();
        score += (body_count as f64).min(20.0) * 0.5;
    }

    if terms.len() > 1 {
        score += title_tier(&terms.join(" "));
    }
    score
}

fn search_result_title(path: &Path, content: &str) -> String {
    let filename = path
        .file_name()
        .and_then(|value| value.to_str())
        .unwrap_or("");

    if crate::vault::is_md_file(path) {
        return crate::vault::derive_markdown_title_from_content(content, filename);
    }

    filename.to_string()
}

fn relative_search_path(vault_dir: &Path, path: &Path) -> String {
    path.strip_prefix(vault_dir)
        .unwrap_or(path)
        .to_string_lossy()
        .replace('\\', "/")
}

fn cached_doc(
    cache: &SearchCache,
    vault_cache: &mut HashMap<PathBuf, CachedDoc>,
    path: &Path,
    mtime: Option<SystemTime>,
    size: u64,
    file_kind: &'static str,
) -> bool {
    if let Some(doc) = vault_cache.get(path) {
        if doc.mtime == mtime && doc.mtime.is_some() && doc.size == size {
            return true;
        }
    }

    cache.file_reads.fetch_add(1, Ordering::SeqCst);
    let content = match std::fs::read_to_string(path) {
        Ok(c) => c,
        Err(_) => {
            vault_cache.remove(path);
            return false;
        }
    };
    let title = search_result_title(path, &content);
    vault_cache.insert(
        path.to_path_buf(),
        CachedDoc {
            mtime,
            size,
            content_lower: content.to_lowercase(),
            title_lower: title.to_lowercase(),
            content,
            title,
            file_kind,
        },
    );
    true
}

pub fn search_vault(
    vault_path: &str,
    query: &str,
    _mode: &str,
    limit: usize,
    cache: &SearchCache,
) -> Result<SearchResponse, String> {
    let start = Instant::now();
    let query_lower = query.to_lowercase();
    let terms: Vec<String> = query_lower.split_whitespace().map(String::from).collect();
    let vault_dir = Path::new(vault_path);

    let mut vaults = cache
        .vaults
        .lock()
        .unwrap_or_else(std::sync::PoisonError::into_inner);
    let vault_cache = vaults.entry(vault_path.to_string()).or_default();

    let mut results: Vec<SearchResult> = Vec::new();
    let mut seen_paths: Vec<PathBuf> = Vec::new();

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
        let path = entry.path();
        if !entry.file_type().is_file() {
            continue;
        }
        let file_kind = crate::vault::classify_file_kind(path);
        if entry.file_name().to_string_lossy().starts_with('.') || file_kind == "binary" {
            continue;
        }
        let metadata = match std::fs::metadata(path) {
            Ok(m) => m,
            Err(_) => continue,
        };
        if metadata.len() > MAX_SEARCHABLE_FILE_BYTES {
            continue;
        }

        if !cached_doc(
            cache,
            vault_cache,
            path,
            metadata.modified().ok(),
            metadata.len(),
            file_kind,
        ) {
            continue;
        }
        seen_paths.push(path.to_path_buf());
        if terms.is_empty() {
            continue;
        }
        let doc = &vault_cache[path];

        let relative_path = relative_search_path(vault_dir, path);
        let relative_path_lower = relative_path.to_lowercase();
        let filename_lower = path
            .file_name()
            .and_then(|value| value.to_str())
            .unwrap_or("")
            .to_lowercase();

        // AND semantics: every term must appear in the title, body, or path.
        let all_terms_match = terms.iter().all(|term| {
            doc.title_lower.contains(term.as_str())
                || doc.content_lower.contains(term.as_str())
                || relative_path_lower.contains(term.as_str())
        });
        if !all_terms_match {
            continue;
        }

        let score = score_match(
            &doc.title_lower,
            &doc.content_lower,
            &relative_path_lower,
            &filename_lower,
            &query_lower,
        );
        let snippet = match extract_snippet(&doc.content, &doc.content_lower, &terms) {
            snippet if !snippet.is_empty() => snippet,
            _ => relative_path.clone(),
        };
        let snippet_matches = snippet_term_matches(&snippet, &terms);
        let full_path = path.to_string_lossy().to_string();

        results.push(SearchResult {
            title: doc.title.clone(),
            path: full_path,
            snippet,
            snippet_matches,
            score,
            note_type: None,
            file_kind: doc.file_kind.to_string(),
        });
    }

    // Evict cache entries for files that no longer exist in the vault.
    if seen_paths.len() != vault_cache.len() {
        let alive: std::collections::HashSet<&PathBuf> = seen_paths.iter().collect();
        vault_cache.retain(|path, _| alive.contains(path));
    }

    results.sort_by(|a, b| {
        b.score
            .partial_cmp(&a.score)
            .unwrap_or(std::cmp::Ordering::Equal)
            .then_with(|| a.path.cmp(&b.path))
    });
    results.truncate(limit);

    let elapsed_ms = start.elapsed().as_millis() as u64;

    Ok(SearchResponse {
        results,
        elapsed_ms,
        query: query.to_string(),
        mode: "keyword".to_string(),
    })
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;
    use tempfile::Builder;

    fn search(vault: &str, query: &str, cache: &SearchCache) -> SearchResponse {
        search_vault(vault, query, "keyword", 10, cache).unwrap()
    }

    #[test]
    fn test_extract_snippet_basic() {
        let content = "line one\nline with keyword here\nline three";
        let snippet = extract_snippet(content, &content.to_lowercase(), &["keyword".into()]);
        assert!(snippet.contains("keyword"));
    }

    #[test]
    fn test_extract_snippet_no_match() {
        let snippet = extract_snippet("nothing here", "nothing here", &["missing".into()]);
        assert!(snippet.is_empty());
    }

    #[test]
    fn test_score_match_title_word() {
        let score = score_match("my keyword", "", "", "", "keyword");
        assert!(score >= 10.0);
    }

    #[test]
    fn test_score_match_content_only() {
        let score = score_match("unrelated", "some keyword text keyword", "", "", "keyword");
        assert!(score > 0.0);
        assert!(score < 10.0);
    }

    #[test]
    fn test_score_match_ranking_tiers() {
        // title exact > title prefix > title word > title contains > filename > body
        let exact = score_match("keyword", "", "", "", "keyword");
        let prefix = score_match("keyword extras", "", "", "", "keyword");
        let word = score_match("my keyword note", "", "", "", "keyword");
        let contains = score_match("rekeyworded", "", "", "", "keyword");
        let filename = score_match("other", "", "", "keyword.txt", "keyword");
        let heading = score_match("other", "# keyword\nbody", "", "", "keyword");
        let body = score_match("other", "plain keyword mention", "", "", "keyword");
        assert!(exact > prefix);
        assert!(prefix > word);
        assert!(word > contains);
        assert!(contains > filename);
        assert!(filename > heading);
        assert!(heading > body);
        assert!(body > 0.0);
    }

    #[test]
    fn test_score_match_multi_term_phrase_bonus() {
        let phrase_title = score_match("api design", "", "", "", "api design");
        let scattered_title = score_match("design of an api", "", "", "", "api design");
        assert!(phrase_title > scattered_title);
        assert!(scattered_title > 0.0);
    }

    #[test]
    fn test_extract_snippet_long() {
        let long_line = "a".repeat(300);
        let content = format!("start\n{}keyword{}\nend", long_line, long_line);
        let snippet = extract_snippet(&content, &content.to_lowercase(), &["keyword".into()]);
        assert!(snippet.len() <= 203); // 200 + "…" (3 bytes UTF-8)
    }

    #[test]
    fn test_snippet_term_matches_offsets() {
        let snippet = "Alpha meets beta and alpha again";
        let matches = snippet_term_matches(snippet, &["alpha".into(), "beta".into()]);
        let hits: Vec<&str> = matches.iter().map(|m| &snippet[m.start..m.end]).collect();
        assert_eq!(hits, vec!["Alpha", "beta", "alpha"]);
        assert_eq!(matches[0], SnippetMatch { start: 0, end: 5 });
    }

    #[test]
    fn test_snippet_term_matches_merges_overlaps() {
        let matches = snippet_term_matches("keywords", &["keyword".into(), "word".into()]);
        assert_eq!(matches, vec![SnippetMatch { start: 0, end: 7 }]);
    }

    #[test]
    fn test_search_vault_uses_h1_for_result_title() {
        let dir = Builder::new()
            .prefix("search-vault-")
            .tempdir_in(std::env::current_dir().unwrap())
            .unwrap();
        let note_path = dir.path().join("legacy-name.md");
        fs::write(
            &note_path,
            "# Updated Display Title\n\nThe body contains keyword for search.",
        )
        .unwrap();

        let cache = SearchCache::default();
        let response = search(dir.path().to_str().unwrap(), "keyword", &cache);

        assert_eq!(response.results.len(), 1);
        assert_eq!(response.results[0].title, "Updated Display Title");
    }

    #[test]
    fn test_search_vault_includes_editable_text_files() {
        let dir = Builder::new()
            .prefix("search-vault-text-")
            .tempdir_in(std::env::current_dir().unwrap())
            .unwrap();
        let text_path = dir.path().join("notes.txt");
        fs::write(&text_path, "Spotlight should find text project notes.").unwrap();

        let cache = SearchCache::default();
        let response = search(dir.path().to_str().unwrap(), "project", &cache);

        assert_eq!(response.results.len(), 1);
        assert_eq!(response.results[0].title, "notes.txt");
        assert_eq!(response.results[0].path, text_path.to_string_lossy());
        assert_eq!(response.results[0].file_kind, "text");
    }

    #[test]
    fn test_search_vault_matches_relative_path_for_project_docs() {
        let dir = Builder::new()
            .prefix("search-vault-path-")
            .tempdir_in(std::env::current_dir().unwrap())
            .unwrap();
        let docs_dir = dir.path().join("docs/reference");
        fs::create_dir_all(&docs_dir).unwrap();
        let docs_path = docs_dir.join("spotlight-proof.ts");
        fs::write(&docs_path, "export const proof = true;").unwrap();

        let cache = SearchCache::default();
        let response = search(dir.path().to_str().unwrap(), "reference", &cache);

        assert_eq!(response.results.len(), 1);
        assert_eq!(response.results[0].title, "spotlight-proof.ts");
        assert_eq!(
            response.results[0].snippet,
            "docs/reference/spotlight-proof.ts"
        );
        // Path-fallback snippets still get term highlights.
        assert_eq!(
            response.results[0].snippet_matches,
            vec![SnippetMatch { start: 5, end: 14 }]
        );
        assert_eq!(response.results[0].file_kind, "text");
    }

    #[test]
    fn test_search_vault_skips_build_and_dependency_dirs() {
        let dir = Builder::new()
            .prefix("search-vault-skip-")
            .tempdir_in(std::env::current_dir().unwrap())
            .unwrap();
        let dependency_dir = dir.path().join("node_modules/pkg");
        fs::create_dir_all(&dependency_dir).unwrap();
        fs::write(dependency_dir.join("hidden.md"), "# Hidden\n\nkeyword").unwrap();
        fs::write(dir.path().join("visible.md"), "# Visible\n\nkeyword").unwrap();

        let cache = SearchCache::default();
        let response = search(dir.path().to_str().unwrap(), "keyword", &cache);

        assert_eq!(response.results.len(), 1);
        assert_eq!(response.results[0].title, "Visible");
    }

    #[test]
    fn test_search_vault_skips_large_text_files() {
        let dir = Builder::new()
            .prefix("search-vault-large-")
            .tempdir_in(std::env::current_dir().unwrap())
            .unwrap();
        let large_path = dir.path().join("generated.json");
        let small_path = dir.path().join("small.md");
        let large_content = "needle ".repeat((MAX_SEARCHABLE_FILE_BYTES as usize / 7) + 2);
        fs::write(&large_path, large_content).unwrap();
        fs::write(&small_path, "# Small\n\nneedle").unwrap();

        let cache = SearchCache::default();
        let response = search(dir.path().to_str().unwrap(), "needle", &cache);

        assert_eq!(response.results.len(), 1);
        assert_eq!(response.results[0].title, "Small");
    }

    #[test]
    fn test_search_vault_multi_term_requires_all_terms() {
        let dir = Builder::new()
            .prefix("search-vault-and-")
            .tempdir_in(std::env::current_dir().unwrap())
            .unwrap();
        fs::write(dir.path().join("both.md"), "# Both\n\nalpha and beta").unwrap();
        fs::write(dir.path().join("one.md"), "# One\n\nalpha only").unwrap();

        let cache = SearchCache::default();
        let response = search(dir.path().to_str().unwrap(), "alpha beta", &cache);

        assert_eq!(response.results.len(), 1);
        assert_eq!(response.results[0].title, "Both");
    }

    #[test]
    fn test_search_vault_ranking_order() {
        let dir = Builder::new()
            .prefix("search-vault-rank-")
            .tempdir_in(std::env::current_dir().unwrap())
            .unwrap();
        fs::write(dir.path().join("a.md"), "# keyword\n\nbody").unwrap();
        fs::write(dir.path().join("b.md"), "# keyword roadmap\n\nbody").unwrap();
        fs::write(dir.path().join("c.md"), "# notes about keyword\n\nbody").unwrap();
        fs::write(
            dir.path().join("d.md"),
            "# unrelated\n\nplain keyword mention",
        )
        .unwrap();

        let cache = SearchCache::default();
        let response = search(dir.path().to_str().unwrap(), "keyword", &cache);

        let titles: Vec<&str> = response.results.iter().map(|r| r.title.as_str()).collect();
        assert_eq!(
            titles,
            vec![
                "keyword",
                "keyword roadmap",
                "notes about keyword",
                "unrelated"
            ]
        );
    }

    #[test]
    fn test_search_vault_snippet_offsets_highlight_terms() {
        let dir = Builder::new()
            .prefix("search-vault-offsets-")
            .tempdir_in(std::env::current_dir().unwrap())
            .unwrap();
        fs::write(
            dir.path().join("note.md"),
            "# Note\n\nAlpha rendezvous with beta at dawn.",
        )
        .unwrap();

        let cache = SearchCache::default();
        let response = search(dir.path().to_str().unwrap(), "alpha beta", &cache);

        assert_eq!(response.results.len(), 1);
        let result = &response.results[0];
        let hits: Vec<&str> = result
            .snippet_matches
            .iter()
            .map(|m| &result.snippet[m.start..m.end])
            .collect();
        assert_eq!(hits, vec!["Alpha", "beta"]);
    }

    #[test]
    fn test_search_vault_reuses_cache_for_unchanged_files() {
        let dir = Builder::new()
            .prefix("search-vault-cache-")
            .tempdir_in(std::env::current_dir().unwrap())
            .unwrap();
        fs::write(dir.path().join("a.md"), "# Alpha\n\nkeyword").unwrap();
        fs::write(dir.path().join("b.md"), "# Beta\n\nother").unwrap();

        let cache = SearchCache::default();
        let first = search(dir.path().to_str().unwrap(), "keyword", &cache);
        assert_eq!(first.results.len(), 1);
        assert_eq!(cache.file_reads(), 2);

        let second = search(dir.path().to_str().unwrap(), "keyword", &cache);
        assert_eq!(second.results.len(), 1);
        assert_eq!(cache.file_reads(), 2, "unchanged files must not be re-read");
    }

    #[test]
    fn test_search_vault_invalidates_cache_on_modified_file() {
        let dir = Builder::new()
            .prefix("search-vault-invalidate-")
            .tempdir_in(std::env::current_dir().unwrap())
            .unwrap();
        let note = dir.path().join("a.md");
        fs::write(&note, "# Alpha\n\noriginal").unwrap();

        let cache = SearchCache::default();
        assert_eq!(
            search(dir.path().to_str().unwrap(), "refreshed", &cache)
                .results
                .len(),
            0
        );
        let reads_after_first = cache.file_reads();

        // Different size guarantees invalidation even on coarse mtime clocks.
        fs::write(&note, "# Alpha\n\noriginal now refreshed content").unwrap();
        let response = search(dir.path().to_str().unwrap(), "refreshed", &cache);

        assert_eq!(response.results.len(), 1);
        assert!(cache.file_reads() > reads_after_first);
    }

    #[test]
    fn test_search_vault_evicts_deleted_files() {
        let dir = Builder::new()
            .prefix("search-vault-evict-")
            .tempdir_in(std::env::current_dir().unwrap())
            .unwrap();
        let note = dir.path().join("gone.md");
        fs::write(&note, "# Gone\n\nkeyword").unwrap();
        fs::write(dir.path().join("stays.md"), "# Stays\n\nkeyword").unwrap();

        let cache = SearchCache::default();
        assert_eq!(
            search(dir.path().to_str().unwrap(), "keyword", &cache)
                .results
                .len(),
            2
        );

        fs::remove_file(&note).unwrap();
        let response = search(dir.path().to_str().unwrap(), "keyword", &cache);

        assert_eq!(response.results.len(), 1);
        assert_eq!(response.results[0].title, "Stays");
        let vaults = cache.vaults.lock().unwrap();
        let vault_cache = vaults.get(dir.path().to_str().unwrap()).unwrap();
        assert!(!vault_cache.contains_key(&note));
    }
}
