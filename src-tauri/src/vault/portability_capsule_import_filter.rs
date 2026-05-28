use std::collections::BTreeSet;
use std::path::Path;

use super::locality::{is_local_only_markdown_content, is_local_only_relative_path};
use super::locality_attachments::local_only_referenced_attachments_from_content;
use super::portability_capsule_import::{
    ImportedCapsule, ImportedCapsuleFile, ImportedCapsuleWithheld,
};

/// Re-runs inbound Locality Firewall checks before restoring an untrusted capsule.
pub(super) fn filter_inbound_capsule(capsule: ImportedCapsule) -> ImportedCapsule {
    let mut blocked = BTreeSet::new();
    let mut referenced = BTreeSet::new();
    let mut withheld = capsule.withheld;

    for file in &capsule.files {
        if is_inbound_local_only(file, &mut referenced) {
            blocked.insert(file.path.clone());
        }
    }

    let mut files = Vec::new();
    for file in capsule.files {
        if blocked.contains(&file.path) {
            withheld.push(withheld_file(
                file.path,
                "Protected by inbound Locality Firewall",
            ));
        } else if referenced.contains(&file.path) {
            withheld.push(withheld_file(
                file.path,
                "Referenced only by inbound local-only Markdown",
            ));
        } else {
            files.push(file);
        }
    }
    withheld.sort_by(|left, right| left.path.cmp(&right.path));
    withheld.dedup_by(|left, right| left.path == right.path);
    ImportedCapsule { files, withheld }
}

fn is_inbound_local_only(file: &ImportedCapsuleFile, referenced: &mut BTreeSet<String>) -> bool {
    if is_local_only_relative_path(Path::new(&file.path)) {
        collect_refs_from_markdown(file, referenced);
        return true;
    }
    if !is_markdown_file(&file.path) {
        return false;
    }
    let Ok(content) = std::str::from_utf8(&file.bytes) else {
        return false;
    };
    if !is_local_only_markdown_content(content) {
        return false;
    }
    referenced.extend(local_only_referenced_attachments_from_content(
        Path::new(&file.path),
        content,
    ));
    true
}

fn collect_refs_from_markdown(file: &ImportedCapsuleFile, referenced: &mut BTreeSet<String>) {
    if is_markdown_file(&file.path) {
        if let Ok(content) = std::str::from_utf8(&file.bytes) {
            referenced.extend(local_only_referenced_attachments_from_content(
                Path::new(&file.path),
                content,
            ));
        }
    }
}

fn withheld_file(path: String, reason: &str) -> ImportedCapsuleWithheld {
    ImportedCapsuleWithheld {
        path,
        reason: reason.to_string(),
    }
}

fn is_markdown_file(path: &str) -> bool {
    Path::new(path)
        .extension()
        .map(|extension| {
            matches!(
                extension.to_string_lossy().to_ascii_lowercase().as_str(),
                "md" | "markdown" | "mdown" | "mkd"
            )
        })
        .unwrap_or(false)
}
