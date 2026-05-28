use std::collections::{HashMap, HashSet};
use std::path::{Path, PathBuf};

use super::journal_import_helpers::extension;

const MEDIA_EXTENSIONS: &[&str] = &[
    "aac", "avif", "gif", "heic", "heif", "jpeg", "jpg", "m4a", "mov", "mp3", "mp4", "pdf", "png",
    "svg", "wav", "webm", "webp",
];

#[derive(Debug, Default)]
pub(super) struct MediaIndex {
    paths_by_key: HashMap<String, PathBuf>,
    ambiguous_keys: HashSet<String>,
}

impl MediaIndex {
    pub(super) fn resolve(&self, reference: &str) -> Option<&Path> {
        for key in reference_lookup_keys(reference) {
            if self.ambiguous_keys.contains(&key) {
                continue;
            }
            if let Some(path) = self.paths_by_key.get(&key) {
                return Some(path);
            }
        }
        None
    }

    fn insert_unique_key(&mut self, key: String, path: &Path) {
        if key.is_empty() || self.ambiguous_keys.contains(&key) {
            return;
        }
        match self.paths_by_key.get(&key) {
            Some(existing) if existing == path => {}
            Some(_) => {
                self.paths_by_key.remove(&key);
                self.ambiguous_keys.insert(key);
            }
            None => {
                self.paths_by_key.insert(key, path.to_path_buf());
            }
        }
    }
}

#[derive(Debug)]
pub(super) struct AttachmentPlan {
    pub(super) source: PathBuf,
    pub(super) link: String,
    pub(super) is_new_copy: bool,
}

#[derive(Debug, Default)]
pub(super) struct AttachmentPlanner {
    link_by_source: HashMap<PathBuf, String>,
    used_names: HashMap<String, usize>,
}

impl AttachmentPlanner {
    pub(super) fn plan(&mut self, source: &Path) -> Option<AttachmentPlan> {
        let source = source.to_path_buf();
        if let Some(link) = self.link_by_source.get(&source) {
            return Some(AttachmentPlan {
                source,
                link: link.clone(),
                is_new_copy: false,
            });
        }
        let file_name = source.file_name()?.to_string_lossy().into_owned();
        let destination = self.unique_destination_name(&file_name);
        let link = format!("attachments/{destination}");
        self.link_by_source.insert(source.clone(), link.clone());
        Some(AttachmentPlan {
            source,
            link,
            is_new_copy: true,
        })
    }

    fn unique_destination_name(&mut self, file_name: &str) -> String {
        let key = file_name.to_ascii_lowercase();
        let count = self.used_names.entry(key).or_insert(0);
        *count += 1;
        if *count == 1 {
            return file_name.to_string();
        }
        let path = Path::new(file_name);
        let stem = path
            .file_stem()
            .map(|value| value.to_string_lossy())
            .filter(|value| !value.is_empty())
            .unwrap_or_else(|| "attachment".into());
        match extension(path) {
            Some(ext) => format!("{stem}-{count}.{ext}"),
            None => format!("{stem}-{count}"),
        }
    }
}

pub(super) fn build_media_index(root: &Path, files: Vec<PathBuf>) -> (MediaIndex, usize) {
    let mut index = MediaIndex::default();
    let mut skipped = 0;
    for file in files {
        let Some(ext) = extension(&file) else {
            skipped += 1;
            continue;
        };
        if !MEDIA_EXTENSIONS.contains(&ext.as_str()) {
            continue;
        }
        for key in media_lookup_keys(root, &file) {
            index.insert_unique_key(key, &file);
        }
    }
    (index, skipped)
}

fn media_lookup_keys(root: &Path, path: &Path) -> Vec<String> {
    let mut keys = Vec::new();
    if let Ok(relative) = path.strip_prefix(root) {
        push_key(&mut keys, path_key(relative));
        push_key(&mut keys, path_stem_key(relative));
    }
    if let Some(file_name) = path.file_name() {
        push_key(&mut keys, normalize_key(&file_name.to_string_lossy()));
    }
    if let Some(stem) = path.file_stem() {
        push_key(&mut keys, normalize_key(&stem.to_string_lossy()));
    }
    keys
}

fn reference_lookup_keys(reference: &str) -> Vec<String> {
    let clean = reference
        .split(['?', '#'])
        .next()
        .unwrap_or(reference)
        .trim();
    let mut keys = Vec::new();
    push_key(&mut keys, normalize_key(clean));
    let path = Path::new(clean);
    push_key(&mut keys, path_stem_key(path));
    if let Some(file_name) = path.file_name() {
        push_key(&mut keys, normalize_key(&file_name.to_string_lossy()));
    }
    if let Some(stem) = path.file_stem() {
        push_key(&mut keys, normalize_key(&stem.to_string_lossy()));
    }
    keys
}

fn push_key(keys: &mut Vec<String>, key: String) {
    if !key.is_empty() && !keys.contains(&key) {
        keys.push(key);
    }
}

fn path_key(path: &Path) -> String {
    normalize_key(&path.to_string_lossy())
}

fn path_stem_key(path: &Path) -> String {
    let Some(stem) = path.file_stem() else {
        return String::new();
    };
    match path
        .parent()
        .filter(|parent| !parent.as_os_str().is_empty())
    {
        Some(parent) => normalize_key(&parent.join(stem).to_string_lossy()),
        None => normalize_key(&stem.to_string_lossy()),
    }
}

fn normalize_key(value: &str) -> String {
    value
        .replace('\\', "/")
        .trim_start_matches("./")
        .trim_start_matches('/')
        .to_ascii_lowercase()
}
