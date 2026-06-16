use crate::commands::expand_tilde;
use crate::vault::filename_rules::validate_folder_name;
use crate::{git, vault};
use std::path::Path;

#[tauri::command]
pub fn migrate_is_a_to_type(vault_path: String) -> Result<usize, String> {
    let vault_path = expand_tilde(&vault_path);
    vault::migrate_is_a_to_type(&vault_path)
}

#[tauri::command]
pub fn create_empty_vault(
    target_path: String,
    initialize_git: Option<bool>,
    template_kind: Option<String>,
) -> Result<String, String> {
    let path = expand_tilde(&target_path).into_owned();
    let vault_dir = Path::new(&path);
    initialize_empty_vault(
        vault_dir,
        &path,
        initialize_git.unwrap_or(false),
        template_kind.as_deref(),
    )?;
    Ok(canonical_vault_path_string(vault_dir))
}

fn initialize_empty_vault(
    vault_dir: &Path,
    vault_path: &str,
    initialize_git: bool,
    template_kind: Option<&str>,
) -> Result<(), String> {
    validate_new_vault_folder_name(vault_dir)?;
    ensure_directory_is_missing_or_empty(vault_dir)?;
    std::fs::create_dir_all(vault_dir)
        .map_err(|e| format!("Failed to create notebook directory: {}", e))?;

    vault::seed_config_files(vault_path);
    seed_template_type_definitions(vault_dir, template_kind)?;
    if initialize_git {
        git::init_repo(vault_path)?;
    }
    Ok(())
}

fn validate_new_vault_folder_name(vault_dir: &Path) -> Result<(), String> {
    let folder_name = vault_dir
        .file_name()
        .and_then(|value| value.to_str())
        .ok_or_else(|| "Invalid folder name".to_string())?;
    validate_folder_name(folder_name)
}

fn write_template_type(vault_dir: &Path, file_name: &str, content: &str) -> Result<(), String> {
    let path = vault_dir.join(file_name);
    if path.exists() {
        return Ok(());
    }
    std::fs::write(&path, content).map_err(|e| format!("Failed to write {}: {e}", path.display()))
}

fn seed_template_type_definitions(
    vault_dir: &Path,
    template_kind: Option<&str>,
) -> Result<(), String> {
    match template_kind.unwrap_or("blank") {
        "journal" => seed_journal_types(vault_dir),
        "dreams" => seed_dream_types(vault_dir),
        "project" => seed_project_types(vault_dir),
        "research" | "reading-study" => seed_research_types(vault_dir),
        "personal-os" => {
            seed_journal_types(vault_dir)?;
            seed_dream_types(vault_dir)?;
            seed_task_memory_types(vault_dir)
        }
        "relationships" => seed_people_types(vault_dir),
        "work-log" => {
            seed_journal_types(vault_dir)?;
            seed_task_memory_types(vault_dir)
        }
        "creative-studio" => seed_creative_types(vault_dir),
        _ => Ok(()),
    }
}

fn seed_journal_types(vault_dir: &Path) -> Result<(), String> {
    write_template_type(
        vault_dir,
        "journal.md",
        "---\ntype: Type\nsidebarLabel: Journals\nicon: notebook\ncolor: green\ntemplate: |\n  ## Check-in\n\n  ## Signals\n\n  ## Next\n\n---\n# Journal\n\nDaily check-ins, evening reviews, decision logs, and weekly reviews.\n",
    )
}

fn seed_dream_types(vault_dir: &Path) -> Result<(), String> {
    write_template_type(
        vault_dir,
        "dream.md",
        "---\ntype: Type\nsidebarLabel: Dreams\nicon: moon-stars\ncolor: purple\ntemplate: |\n  ## Dream\n\n  ## Symbols\n\n  ## Emotional Weather\n\n  ## Thread\n\n---\n# Dream\n\nPrivate dream captures, recurring symbols, nightmares, and lucid dreams.\n",
    )
}

fn seed_task_memory_types(vault_dir: &Path) -> Result<(), String> {
    write_template_type(
        vault_dir,
        "task.md",
        "---\ntype: Type\nsidebarLabel: Tasks\nicon: check-square\ncolor: orange\ntemplate: |\n  ## Outcome\n\n  ## Next Action\n  - [ ] \n\n  ## Notes\n\n---\n# Task\n\nOpen loops and next actions.\n",
    )?;
    write_template_type(
        vault_dir,
        "memory.md",
        "---\ntype: Type\nsidebarLabel: Memory\nicon: brain\ncolor: blue\ntemplate: |\n  ## Source\n\n  ## Memory\n\n  ## Confidence\n  medium\n\n  ## Review\n  - [ ] Verify or crystallize this memory.\n\n---\n# Memory\n\nEditable AI and human memory records.\n",
    )
}

fn seed_project_types(vault_dir: &Path) -> Result<(), String> {
    write_template_type(
        vault_dir,
        "project.md",
        "---\ntype: Type\nsidebarLabel: Projects\nicon: target\ncolor: blue\ntemplate: |\n  ## Objective\n\n  ## Open Loops\n  - [ ] \n\n  ## Decisions\n\n  ## Notes\n\n---\n# Project\n\nProjects, milestones, decisions, and next actions.\n",
    )?;
    seed_task_memory_types(vault_dir)
}

fn seed_research_types(vault_dir: &Path) -> Result<(), String> {
    write_template_type(
        vault_dir,
        "research.md",
        "---\ntype: Type\nsidebarLabel: Research\nicon: book-open\ncolor: yellow\ntemplate: |\n  ## Question\n\n  ## Sources\n\n  ## Findings\n\n  ## Synthesis\n\n---\n# Research\n\nSources, claims, findings, and synthesis.\n",
    )
}

fn seed_people_types(vault_dir: &Path) -> Result<(), String> {
    write_template_type(
        vault_dir,
        "person.md",
        "---\ntype: Type\nsidebarLabel: People\nicon: users\ncolor: green\ntemplate: |\n  ## Context\n\n  ## Conversations\n\n  ## Promises\n\n  ## Follow-ups\n  - [ ] \n\n---\n# Person\n\nPeople, relationships, conversations, and follow-ups.\n",
    )
}

fn seed_creative_types(vault_dir: &Path) -> Result<(), String> {
    write_template_type(
        vault_dir,
        "idea.md",
        "---\ntype: Type\nsidebarLabel: Ideas\nicon: lightbulb\ncolor: purple\ntemplate: |\n  ## Spark\n\n  ## References\n\n  ## Draft\n\n  ## Release\n\n---\n# Idea\n\nIdeas, drafts, references, and releases.\n",
    )
}

fn ensure_directory_is_missing_or_empty(vault_dir: &Path) -> Result<(), String> {
    if !vault_dir.exists() {
        return Ok(());
    }

    let metadata = std::fs::metadata(vault_dir)
        .map_err(|e| format!("Failed to inspect target folder: {e}"))?;
    if !metadata.is_dir() {
        return Err("Choose a folder path for the new notebook".to_string());
    }

    let has_entries = std::fs::read_dir(vault_dir)
        .map_err(|e| format!("Failed to inspect target folder: {e}"))?
        .next()
        .is_some();
    if has_entries {
        return Err("Choose an empty folder to create a new notebook".to_string());
    }

    Ok(())
}

fn canonical_vault_path_string(vault_dir: &Path) -> String {
    vault_dir
        .canonicalize()
        .unwrap_or_else(|_| vault_dir.to_path_buf())
        .to_string_lossy()
        .to_string()
}

#[tauri::command]
pub async fn create_getting_started_vault(
    app_handle: tauri::AppHandle,
    target_path: Option<String>,
) -> Result<String, String> {
    use tauri::Manager;

    let path = resolve_getting_started_target(target_path.as_deref())?;
    let resource_dir = app_handle.path().resource_dir().ok();
    tokio::task::spawn_blocking(move || vault::create_getting_started_vault(&path, resource_dir))
        .await
        .map_err(|e| format!("Task panicked: {e}"))?
}

fn resolve_getting_started_target(target_path: Option<&str>) -> Result<String, String> {
    match target_path {
        Some(path) if !path.is_empty() => Ok(expand_tilde(path).into_owned()),
        _ => vault::default_vault_path().map(|path| path.to_string_lossy().to_string()),
    }
}

#[tauri::command]
pub fn check_vault_exists(path: String) -> bool {
    let path = expand_tilde(&path);
    vault::vault_exists(&path)
}

#[tauri::command]
pub fn get_default_vault_path() -> Result<String, String> {
    vault::default_vault_path().map(|path| path.to_string_lossy().to_string())
}

#[tauri::command]
pub fn repair_vault(vault_path: String) -> Result<String, String> {
    let vault_path = expand_tilde(&vault_path);
    vault::migrate_is_a_to_type(&vault_path)?;
    vault::repair_config_files(&vault_path)?;
    git::ensure_gitignore(&vault_path)?;
    Ok("Vault repaired".to_string())
}
