use crate::mentions::{self, MentionHit};

use super::boundary::{
    with_existing_path_in_requested_vault, with_validated_path, ValidatedPathMode,
};

fn find_note_mentions_validated(
    vault_path: &str,
    note_path: &str,
    title: &str,
    aliases: &[String],
) -> Result<Vec<MentionHit>, String> {
    with_existing_path_in_requested_vault(
        vault_path,
        note_path,
        |requested_root, validated_note_path| {
            mentions::find_note_mentions(requested_root, validated_note_path, title, aliases)
        },
    )
}

#[tauri::command]
pub async fn find_note_mentions(
    vault_path: String,
    note_path: String,
    title: String,
    aliases: Vec<String>,
) -> Result<Vec<MentionHit>, String> {
    tokio::task::spawn_blocking(move || {
        find_note_mentions_validated(&vault_path, &note_path, &title, &aliases)
    })
    .await
    .map_err(|e| format!("Mention scan task failed: {e}"))?
}

#[tauri::command]
pub fn link_unlinked_mention(
    vault_path: String,
    source_path: String,
    target_title: String,
    matched_text: String,
    line: u32,
) -> Result<(), String> {
    with_validated_path(
        &source_path,
        Some(&vault_path),
        ValidatedPathMode::Existing,
        |validated_path| {
            mentions::link_unlinked_mention(
                &vault_path,
                validated_path,
                &target_title,
                &matched_text,
                line,
            )
        },
    )
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;
    use tempfile::TempDir;

    #[test]
    fn find_note_mentions_rejects_note_paths_outside_the_vault() {
        let vault = TempDir::new().unwrap();
        let outside = TempDir::new().unwrap();
        let outside_note = outside.path().join("outside.md");
        fs::write(&outside_note, "# Outside\n").unwrap();

        let error = find_note_mentions_validated(
            vault.path().to_str().unwrap(),
            outside_note.to_str().unwrap(),
            "Outside",
            &[],
        )
        .unwrap_err();

        assert!(error.contains("Path must stay inside the active vault"));
    }

    #[test]
    fn link_unlinked_mention_rejects_source_paths_outside_the_vault() {
        let vault = TempDir::new().unwrap();
        let outside = TempDir::new().unwrap();
        let outside_note = outside.path().join("outside.md");
        fs::write(&outside_note, "Body mentions Target Note here.\n").unwrap();

        let error = link_unlinked_mention(
            vault.path().to_string_lossy().into_owned(),
            outside_note.to_string_lossy().into_owned(),
            "Target Note".to_string(),
            "Target Note".to_string(),
            1,
        )
        .unwrap_err();

        assert!(error.contains("Path must stay inside the active vault"));
        assert_eq!(
            fs::read_to_string(&outside_note).unwrap(),
            "Body mentions Target Note here.\n"
        );
    }

    #[test]
    fn find_and_link_round_trip_inside_the_vault() {
        let vault = TempDir::new().unwrap();
        let target = vault.path().join("grimoire.md");
        let source = vault.path().join("journal.md");
        fs::write(&target, "# Grimoire\n").unwrap();
        fs::write(&source, "# Journal\n\nShipped grimoire fixes today.\n").unwrap();

        let hits = find_note_mentions_validated(
            vault.path().to_str().unwrap(),
            target.to_str().unwrap(),
            "Grimoire",
            &[],
        )
        .unwrap();
        assert_eq!(hits.len(), 1);
        assert_eq!(hits[0].matched_text, "grimoire");
        assert_eq!(hits[0].line, 3);

        link_unlinked_mention(
            vault.path().to_string_lossy().into_owned(),
            hits[0].path.clone(),
            "Grimoire".to_string(),
            hits[0].matched_text.clone(),
            hits[0].line,
        )
        .unwrap();

        assert_eq!(
            fs::read_to_string(&source).unwrap(),
            "# Journal\n\nShipped [[Grimoire|grimoire]] fixes today.\n"
        );

        let remaining = find_note_mentions_validated(
            vault.path().to_str().unwrap(),
            target.to_str().unwrap(),
            "Grimoire",
            &[],
        )
        .unwrap();
        assert!(remaining.is_empty());
    }
}
