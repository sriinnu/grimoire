use std::fs;
use std::path::{Path, PathBuf};

use super::{import_app_export, preview_app_export};

fn write_file(path: &Path, content: &str) {
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).unwrap();
    }
    fs::write(path, content).unwrap();
}

fn imported_root(path: &str) -> PathBuf {
    PathBuf::from(path)
}

#[test]
fn obsidian_import_skips_runtime_config_and_copies_assets() {
    let workspace = tempfile::tempdir().unwrap();
    let vault = workspace.path().join("vault");
    let source = workspace.path().join("obsidian-vault");
    fs::create_dir_all(&vault).unwrap();
    write_file(&source.join("Daily.md"), "# Daily\n");
    write_file(&source.join(".obsidian/workspace.json"), "{}");
    write_file(&source.join(".vscode/settings.json"), "{}");
    write_file(&source.join(".env"), "SECRET=value");
    write_file(&source.join("assets/sigil.png"), "image");

    let report = import_app_export(&vault, &source, "obsidian").unwrap();
    let root = imported_root(&report.imported_root);

    assert_eq!(report.notes_copied, 1);
    assert_eq!(report.assets_copied, 1);
    assert!(root.join("Daily.md").exists());
    assert!(root.join("assets/sigil.png").exists());
    assert!(!root.join(".obsidian/workspace.json").exists());
    assert!(!root.join(".vscode/settings.json").exists());
    assert!(!root.join(".env").exists());
}

#[test]
fn obsidian_preview_reports_plan_without_writing_to_vault() {
    let workspace = tempfile::tempdir().unwrap();
    let vault = workspace.path().join("vault");
    let source = workspace.path().join("obsidian-vault");
    fs::create_dir_all(&vault).unwrap();
    write_file(&source.join("Daily.md"), "# Daily\n");
    write_file(&source.join("assets/sigil.png"), "image");
    write_file(&source.join(".obsidian/workspace.json"), "{}");

    let preview = preview_app_export(&vault, &source, "obsidian").unwrap();

    assert_eq!(preview.notes_to_copy, 1);
    assert_eq!(preview.assets_to_copy, 1);
    assert!(preview
        .planned_import_root
        .contains("/imports/obsidian-obsidian-vault"));
    assert!(preview.writes_local_only_report);
    assert!(!vault.join("imports").exists());
}

#[test]
fn app_import_report_is_a_local_only_autopsy_without_mutating_source() {
    let workspace = tempfile::tempdir().unwrap();
    let vault = workspace.path().join("vault");
    let source = workspace.path().join("obsidian-vault");
    fs::create_dir_all(&vault).unwrap();
    write_file(&source.join("Daily.md"), "# Daily\n");

    let report = import_app_export(&vault, &source, "obsidian").unwrap();
    let report_content = fs::read_to_string(&report.report_path).unwrap();

    assert_eq!(
        fs::read_to_string(source.join("Daily.md")).unwrap(),
        "# Daily\n"
    );
    assert!(report_content.contains("type: Import Report"));
    assert!(report_content.contains("locality: local"));
    assert!(report_content.contains("local_only: true"));
    assert!(report_content.contains("## Import Autopsy"));
    assert!(report_content.contains("Source export was read only"));
    assert!(report_content.contains("excluded from portable Markdown ZIP exports"));
}

#[test]
fn notion_import_cleans_page_ids_and_merges_source_metadata() {
    let workspace = tempfile::tempdir().unwrap();
    let vault = workspace.path().join("vault");
    let source = workspace.path().join("notion-export");
    fs::create_dir_all(&vault).unwrap();
    let notion_id = "abcdefabcdefabcdefabcdefabcdefab";
    write_file(
        &source.join(format!("Project {notion_id}.md")),
        "---\nstatus: active\n---\n# Project\n",
    );
    write_file(
        &source.join("Project tasks.csv"),
        "name,status\nShip,done\n",
    );

    let report = import_app_export(&vault, &source, "notion-markdown").unwrap();
    let root = imported_root(&report.imported_root);
    let content = fs::read_to_string(root.join("Project.md")).unwrap();

    assert_eq!(report.notes_copied, 1);
    assert_eq!(report.assets_copied, 1);
    assert!(root.join("Project tasks.csv").exists());
    assert!(content.contains("status: active"));
    assert!(content.contains("source_app: notion"));
    assert!(content.contains(&format!("notion_id: {notion_id}")));
    assert!(content.contains("# Project"));
}

#[test]
fn notion_preview_counts_zip_contents_without_writing_to_vault() {
    let workspace = tempfile::tempdir().unwrap();
    let vault = workspace.path().join("vault");
    let source = workspace.path().join("notion-export");
    let zip_path = workspace.path().join("notion.zip");
    fs::create_dir_all(&vault).unwrap();
    write_file(
        &source.join("Project abcdefabcdefabcdefabcdefabcdefab.md"),
        "# Project\n",
    );
    write_file(
        &source.join("Project tasks.csv"),
        "name,status\nShip,done\n",
    );
    create_zip(&source, &zip_path);

    let preview = preview_app_export(&vault, &zip_path, "notion-markdown").unwrap();

    assert_eq!(preview.notes_to_copy, 1);
    assert_eq!(preview.assets_to_copy, 1);
    assert!(preview
        .planned_import_root
        .contains("/imports/notion-notion"));
    assert!(!vault.join("imports").exists());
}

#[test]
fn notion_import_merges_crlf_frontmatter() {
    let workspace = tempfile::tempdir().unwrap();
    let vault = workspace.path().join("vault");
    let source = workspace.path().join("notion-export");
    fs::create_dir_all(&vault).unwrap();
    let notion_id = "11111111111111111111111111111111";
    write_file(
        &source.join(format!("Windows {notion_id}.md")),
        "---\r\nstatus: active\r\n---\r\n# Windows\r\n",
    );

    let report = import_app_export(&vault, &source, "notion-markdown").unwrap();
    let root = imported_root(&report.imported_root);
    let content = fs::read_to_string(root.join("Windows.md")).unwrap();

    assert!(content.starts_with("---\nstatus: active\n"));
    assert!(content.contains("source_app: notion"));
    assert_eq!(content.matches("---").count(), 2);
    assert!(content.contains("# Windows"));
}

#[test]
fn spanda_import_converts_sessions_to_local_sadhana_notes() {
    let workspace = tempfile::tempdir().unwrap();
    let vault = workspace.path().join("vault");
    let source = workspace.path().join("spanda");
    fs::create_dir_all(&vault).unwrap();
    write_file(
        &source.join("spanda.json"),
        r#"{
          "sessions": [{
            "id": "s1",
            "practice": "Japa",
            "startedAt": "2026-05-19T06:00:00Z",
            "notes": "108 rounds",
            "tags": ["sadhana"]
          }]
        }"#,
    );

    let report = import_app_export(&vault, &source, "spanda").unwrap();
    let root = imported_root(&report.imported_root);
    let content = fs::read_to_string(root.join("2026-05-19-japa.md")).unwrap();

    assert_eq!(report.notes_copied, 1);
    assert!(content.contains("type: Sadhana"));
    assert!(content.contains("source_app: spanda"));
    assert!(content.contains("locality: local"));
    assert!(content.contains("local_only: true"));
    assert!(content.contains("108 rounds"));
}

#[test]
fn spanda_preview_counts_sessions_without_writing_to_vault() {
    let workspace = tempfile::tempdir().unwrap();
    let vault = workspace.path().join("vault");
    let source = workspace.path().join("spanda");
    fs::create_dir_all(&vault).unwrap();
    write_file(
        &source.join("spanda.json"),
        r#"{
          "sessions": [{
            "id": "s1",
            "practice": "Japa",
            "startedAt": "2026-05-19T06:00:00Z",
            "notes": "108 rounds"
          }]
        }"#,
    );

    let preview = preview_app_export(&vault, &source, "spanda").unwrap();

    assert_eq!(preview.notes_to_copy, 1);
    assert_eq!(preview.assets_to_copy, 0);
    assert!(preview.writes_local_only_report);
    assert!(!vault.join("imports").exists());
}

#[test]
fn spanda_single_file_import_does_not_copy_sibling_files() {
    let workspace = tempfile::tempdir().unwrap();
    let vault = workspace.path().join("vault");
    let source = workspace.path().join("exports");
    fs::create_dir_all(&vault).unwrap();
    write_file(
        &source.join("spanda.json"),
        r#"[{
          "id": "s1",
          "practice": "Japa",
          "startedAt": "2026-05-19T06:00:00Z",
          "notes": "108 rounds"
        }]"#,
    );
    write_file(&source.join("unrelated.md"), "# Should not import\n");
    write_file(&source.join("image.png"), "image");

    let report = import_app_export(&vault, &source.join("spanda.json"), "spanda").unwrap();
    let root = imported_root(&report.imported_root);

    assert_eq!(report.notes_copied, 1);
    assert_eq!(report.assets_copied, 0);
    assert!(root.join("2026-05-19-japa.md").exists());
    assert!(!root.join("unrelated.md").exists());
    assert!(!root.join("attachments/image.png").exists());
}

#[test]
fn spanda_import_skips_non_session_json_metadata() {
    let workspace = tempfile::tempdir().unwrap();
    let vault = workspace.path().join("vault");
    let source = workspace.path().join("spanda");
    fs::create_dir_all(&vault).unwrap();
    write_file(
        &source.join("manifest.json"),
        r#"{"name":"Spanda Export","version":"1"}"#,
    );
    write_file(
        &source.join("sessions.json"),
        r#"{"sessions":[{"practice":"Japa","startedAt":"2026-05-19","notes":"108"}]}"#,
    );

    let report = import_app_export(&vault, &source, "spanda").unwrap();
    let root = imported_root(&report.imported_root);
    let notes = fs::read_dir(&root)
        .unwrap()
        .filter_map(Result::ok)
        .filter(|entry| entry.path().extension().is_some_and(|ext| ext == "md"))
        .filter(|entry| {
            !entry
                .file_name()
                .to_string_lossy()
                .starts_with("import-report-")
        })
        .count();

    assert_eq!(report.notes_copied, 1);
    assert_eq!(notes, 1);
    assert!(root.join("2026-05-19-japa.md").exists());
}

#[test]
fn spanda_import_rejects_generic_notes_json_without_session_evidence() {
    let workspace = tempfile::tempdir().unwrap();
    let vault = workspace.path().join("vault");
    let source = workspace.path().join("spanda");
    fs::create_dir_all(&vault).unwrap();
    write_file(
        &source.join("notes.json"),
        r#"{"notes":"generic app export"}"#,
    );

    let error = import_app_export(&vault, &source, "spanda").unwrap_err();

    assert!(error.contains("No Spanda sessions"));
}

#[test]
fn import_rejects_sources_inside_the_active_vault() {
    let workspace = tempfile::tempdir().unwrap();
    let vault = workspace.path().join("vault");
    let source = vault.join("exports/notion");
    fs::create_dir_all(&source).unwrap();
    write_file(&source.join("Note.md"), "# Note\n");

    let error = import_app_export(&vault, &source, "notion").unwrap_err();

    assert!(error.contains("outside the active vault"));
}

fn create_zip(source: &Path, zip_path: &Path) {
    let file = fs::File::create(zip_path).unwrap();
    let mut zip = zip::ZipWriter::new(file);
    let options = zip::write::FileOptions::default();
    for entry in walkdir::WalkDir::new(source) {
        let entry = entry.unwrap();
        if !entry.file_type().is_file() {
            continue;
        }
        let relative = entry.path().strip_prefix(source).unwrap().to_string_lossy();
        zip.start_file(relative.replace('\\', "/"), options)
            .unwrap();
        std::io::copy(&mut fs::File::open(entry.path()).unwrap(), &mut zip).unwrap();
    }
    zip.finish().unwrap();
}
