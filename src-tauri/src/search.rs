use serde::Serialize;
use std::path::Path;
use std::time::Instant;
use walkdir::WalkDir;

#[derive(Debug, Serialize, Clone)]
pub struct SearchResult {
    pub title: String,
    pub path: String,
    pub snippet: String,
    pub score: f64,
    pub note_type: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct SearchResponse {
    pub results: Vec<SearchResult>,
    pub elapsed_ms: u64,
    pub query: String,
    pub mode: String,
}

fn extract_snippet(content: &str, query_lower: &str) -> String {
    let content_lower = content.to_lowercase();
    let pos = match content_lower.find(query_lower) {
        Some(p) => p,
        None => return String::new(),
    };
    let start = content[..pos]
        .rfind('\n')
        .map(|i| i + 1)
        .unwrap_or(pos.saturating_sub(60));
    let end = content[pos..]
        .find('\n')
        .map(|i| pos + i)
        .unwrap_or_else(|| (pos + 120).min(content.len()));
    let snippet = &content[start..end];
    if snippet.len() > 200 {
        format!("{}…", &snippet[..200])
    } else {
        snippet.to_string()
    }
}

fn score_match(title_lower: &str, content_lower: &str, query_lower: &str) -> f64 {
    let title_exact = title_lower.contains(query_lower);
    let title_word = title_lower.split_whitespace().any(|w| w == query_lower);
    let content_count = content_lower.matches(query_lower).count();

    let mut score = 0.0;
    if title_word {
        score += 10.0;
    } else if title_exact {
        score += 5.0;
    }
    score += (content_count as f64).min(20.0) * 0.5;
    score
}

fn is_searchable_text_path(path: &Path) -> bool {
    matches!(crate::vault::classify_file_kind(path), "markdown" | "text")
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

pub fn search_vault(
    vault_path: &str,
    query: &str,
    _mode: &str,
    limit: usize,
) -> Result<SearchResponse, String> {
    let start = Instant::now();
    let query_lower = query.to_lowercase();
    let vault_dir = Path::new(vault_path);

    let mut results: Vec<SearchResult> = Vec::new();

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
        if entry.file_name().to_string_lossy().starts_with('.') || !is_searchable_text_path(path) {
            continue;
        }

        let content = match std::fs::read_to_string(path) {
            Ok(c) => c,
            Err(_) => continue,
        };

        let content_lower = content.to_lowercase();
        let title = search_result_title(path, &content);
        let title_lower = title.to_lowercase();

        if !title_lower.contains(&query_lower) && !content_lower.contains(&query_lower) {
            continue;
        }

        let score = score_match(&title_lower, &content_lower, &query_lower);
        let snippet = extract_snippet(&content, &query_lower);
        let full_path = path.to_string_lossy().to_string();

        results.push(SearchResult {
            title,
            path: full_path,
            snippet,
            score,
            note_type: None,
        });
    }

    results.sort_by(|a, b| {
        b.score
            .partial_cmp(&a.score)
            .unwrap_or(std::cmp::Ordering::Equal)
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

    #[test]
    fn test_extract_snippet_basic() {
        let content = "line one\nline with keyword here\nline three";
        let snippet = extract_snippet(content, "keyword");
        assert!(snippet.contains("keyword"));
    }

    #[test]
    fn test_extract_snippet_no_match() {
        let snippet = extract_snippet("nothing here", "missing");
        assert!(snippet.is_empty());
    }

    #[test]
    fn test_score_match_title_word() {
        let score = score_match("my keyword", "", "keyword");
        assert!(score >= 10.0);
    }

    #[test]
    fn test_score_match_content_only() {
        let score = score_match("unrelated", "some keyword text keyword", "keyword");
        assert!(score > 0.0);
        assert!(score < 10.0);
    }

    #[test]
    fn test_extract_snippet_long() {
        let long_line = "a".repeat(300);
        let content = format!("start\n{}keyword{}\nend", long_line, long_line);
        let snippet = extract_snippet(&content, "keyword");
        assert!(snippet.len() <= 203); // 200 + "…" (3 bytes UTF-8)
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

        let response =
            search_vault(dir.path().to_str().unwrap(), "keyword", "keyword", 10).unwrap();

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

        let response =
            search_vault(dir.path().to_str().unwrap(), "project", "keyword", 10).unwrap();

        assert_eq!(response.results.len(), 1);
        assert_eq!(response.results[0].title, "notes.txt");
        assert_eq!(response.results[0].path, text_path.to_string_lossy());
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

        let response =
            search_vault(dir.path().to_str().unwrap(), "keyword", "keyword", 10).unwrap();

        assert_eq!(response.results.len(), 1);
        assert_eq!(response.results[0].title, "Visible");
    }
}
