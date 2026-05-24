use super::html_exporter::export_static_html_archive;
use std::fs;
use std::path::PathBuf;
use tempfile::TempDir;

#[test]
fn exports_public_markdown_as_static_html() {
    let vault = TempDir::new().unwrap();
    let target = TempDir::new().unwrap();
    fs::create_dir_all(vault.path().join("attachments")).unwrap();
    fs::write(
        vault.path().join("public.md"),
        "---\ntype: Project\n---\n# Public Note\n\n- one\n\n![Diagram](attachments/diagram.png)\n",
    )
    .unwrap();
    fs::write(vault.path().join("attachments/diagram.png"), "image").unwrap();
    fs::write(
        vault.path().join("journal.md"),
        "---\ntype: Journal\nsource_audio: attachments/private-audio.m4a\n---\n# Private day\n\n```grimoire-canvas\ntype: handwriting\nsource: attachments/private-canvas.grimoire-canvas.json\npreview: attachments/private-canvas.png\n```\n",
    )
    .unwrap();
    fs::write(vault.path().join("attachments/private-audio.m4a"), "audio").unwrap();
    fs::write(vault.path().join("attachments/private-photo.png"), "photo").unwrap();
    fs::write(
        vault
            .path()
            .join("attachments/private-canvas.grimoire-canvas.json"),
        r#"{"version":1,"images":[{"src":"attachments/private-photo.png"}],"strokes":[]}"#,
    )
    .unwrap();
    fs::write(vault.path().join("attachments/private-canvas.png"), "image").unwrap();

    let result = export_static_html_archive(vault.path(), &target.path().join("site")).unwrap();

    let root = PathBuf::from(&result.export_path);
    assert_eq!(result.files_exported, 2);
    assert_eq!(result.skipped_files, 5);
    assert!(root.join("index.html").exists());
    assert!(root.join("public.html").exists());
    assert!(root.join("attachments/diagram.png").exists());
    assert!(!root.join("attachments/private-audio.m4a").exists());
    assert!(!root
        .join("attachments/private-canvas.grimoire-canvas.json")
        .exists());
    assert!(!root.join("attachments/private-canvas.png").exists());
    assert!(!root.join("attachments/private-photo.png").exists());
    let page = fs::read_to_string(root.join("public.html")).unwrap();
    assert!(page.contains("<h1>Public Note</h1>"));
    assert!(page.contains("<li>one</li>"));
    assert!(page.contains("<img alt=\"Diagram\" src=\"attachments/diagram.png\">"));
    let index = fs::read_to_string(root.join("index.html")).unwrap();
    assert!(index.contains("Public Note"));
    assert!(!index.contains("Private day"));
}

#[test]
fn rejects_html_export_inside_vault() {
    let vault = TempDir::new().unwrap();

    let error = export_static_html_archive(vault.path(), &vault.path().join("site")).unwrap_err();

    assert!(error.contains("outside the active vault"));
}
