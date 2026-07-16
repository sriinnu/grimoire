use serde::Serialize;
use std::path::{Path, PathBuf};

const BEAR_STORE_RELATIVE_PATH: &str =
    "Library/Group Containers/9K33E3U3T4.net.shinyfrog.bear/Application Data/database.sqlite";
const APPLE_NOTES_STORE_RELATIVE_PATH: &str =
    "Library/Group Containers/group.com.apple.notes/NoteStore.sqlite";

/// One locally installed app whose data store Grimoire can read directly.
#[derive(Debug, Clone, Serialize)]
pub struct DiscoveredApp {
    pub id: String,
    pub name: String,
    pub installed: bool,
    pub store_found: bool,
    pub store_path: Option<String>,
    /// "full" when direct import is supported, "detected-only" when the store
    /// is recognized but importing is a future slice.
    pub support: String,
}

/// Finds installed apps whose local data stores Grimoire can import directly.
/// Absence is data: missing apps come back as `installed: false`, never an error.
pub fn discover_importable_apps() -> Vec<DiscoveredApp> {
    if !cfg!(target_os = "macos") {
        return vec![
            missing_app("bear", "Bear", "full"),
            missing_app("apple-notes", "Apple Notes", "detected-only"),
        ];
    }
    discover_apps_in(dirs::home_dir().as_deref(), Path::new("/Applications"))
}

/// Probes known store locations under `home`; split out so tests can point at
/// a fixture home directory instead of the real one.
fn discover_apps_in(home: Option<&Path>, applications_root: &Path) -> Vec<DiscoveredApp> {
    vec![
        discover_bear(home, applications_root),
        discover_apple_notes(home),
    ]
}

fn discover_bear(home: Option<&Path>, applications_root: &Path) -> DiscoveredApp {
    let store = existing_store(home, BEAR_STORE_RELATIVE_PATH);
    let bundle_installed = applications_root.join("Bear.app").exists();
    DiscoveredApp {
        id: "bear".to_string(),
        name: "Bear".to_string(),
        installed: bundle_installed || store.is_some(),
        store_found: store.is_some(),
        store_path: store.map(path_to_string),
        support: "full".to_string(),
    }
}

fn discover_apple_notes(home: Option<&Path>) -> DiscoveredApp {
    let store = existing_store(home, APPLE_NOTES_STORE_RELATIVE_PATH);
    DiscoveredApp {
        id: "apple-notes".to_string(),
        name: "Apple Notes".to_string(),
        installed: store.is_some(),
        store_found: store.is_some(),
        store_path: store.map(path_to_string),
        support: "detected-only".to_string(),
    }
}

fn existing_store(home: Option<&Path>, relative_path: &str) -> Option<PathBuf> {
    let candidate = home?.join(relative_path);
    candidate.is_file().then_some(candidate)
}

fn missing_app(id: &str, name: &str, support: &str) -> DiscoveredApp {
    DiscoveredApp {
        id: id.to_string(),
        name: name.to_string(),
        installed: false,
        store_found: false,
        store_path: None,
        support: support.to_string(),
    }
}

fn path_to_string(path: PathBuf) -> String {
    path.to_string_lossy().into_owned()
}

#[cfg(test)]
mod tests {
    use super::{discover_apps_in, APPLE_NOTES_STORE_RELATIVE_PATH, BEAR_STORE_RELATIVE_PATH};
    use std::fs;
    use std::path::Path;

    fn write_store(home: &Path, relative_path: &str) {
        let store = home.join(relative_path);
        fs::create_dir_all(store.parent().unwrap()).unwrap();
        fs::write(&store, b"sqlite fixture").unwrap();
    }

    #[test]
    fn missing_apps_are_reported_as_data_not_errors() {
        let workspace = tempfile::tempdir().unwrap();
        let home = workspace.path().join("home");
        let applications = workspace.path().join("Applications");
        fs::create_dir_all(&home).unwrap();
        fs::create_dir_all(&applications).unwrap();

        let apps = discover_apps_in(Some(&home), &applications);

        assert_eq!(apps.len(), 2);
        let bear = apps.iter().find(|app| app.id == "bear").unwrap();
        assert!(!bear.installed);
        assert!(!bear.store_found);
        assert_eq!(bear.store_path, None);
        assert_eq!(bear.support, "full");
        let notes = apps.iter().find(|app| app.id == "apple-notes").unwrap();
        assert!(!notes.installed);
        assert_eq!(notes.support, "detected-only");
    }

    #[test]
    fn bear_store_presence_marks_bear_installed_with_store_path() {
        let workspace = tempfile::tempdir().unwrap();
        let home = workspace.path().join("home");
        let applications = workspace.path().join("Applications");
        fs::create_dir_all(&applications).unwrap();
        write_store(&home, BEAR_STORE_RELATIVE_PATH);

        let apps = discover_apps_in(Some(&home), &applications);
        let bear = apps.iter().find(|app| app.id == "bear").unwrap();

        assert!(bear.installed);
        assert!(bear.store_found);
        assert!(bear
            .store_path
            .as_deref()
            .is_some_and(|path| path.ends_with("database.sqlite")));
    }

    #[test]
    fn bear_app_bundle_without_store_is_installed_but_storeless() {
        let workspace = tempfile::tempdir().unwrap();
        let home = workspace.path().join("home");
        let applications = workspace.path().join("Applications");
        fs::create_dir_all(&home).unwrap();
        fs::create_dir_all(applications.join("Bear.app")).unwrap();

        let apps = discover_apps_in(Some(&home), &applications);
        let bear = apps.iter().find(|app| app.id == "bear").unwrap();

        assert!(bear.installed);
        assert!(!bear.store_found);
        assert_eq!(bear.store_path, None);
    }

    #[test]
    fn apple_notes_store_is_detected_only() {
        let workspace = tempfile::tempdir().unwrap();
        let home = workspace.path().join("home");
        let applications = workspace.path().join("Applications");
        fs::create_dir_all(&applications).unwrap();
        write_store(&home, APPLE_NOTES_STORE_RELATIVE_PATH);

        let apps = discover_apps_in(Some(&home), &applications);
        let notes = apps.iter().find(|app| app.id == "apple-notes").unwrap();

        assert!(notes.installed);
        assert!(notes.store_found);
        assert_eq!(notes.support, "detected-only");
        assert!(notes
            .store_path
            .as_deref()
            .is_some_and(|path| path.ends_with("NoteStore.sqlite")));
    }

    #[test]
    fn missing_home_directory_never_errors() {
        let workspace = tempfile::tempdir().unwrap();
        let applications = workspace.path().join("Applications");
        fs::create_dir_all(&applications).unwrap();

        let apps = discover_apps_in(None, &applications);

        assert_eq!(apps.len(), 2);
        assert!(apps.iter().all(|app| !app.store_found));
    }
}
