use super::*;

fn create_last_vault_path(path_parts: &[&str]) -> (tempfile::TempDir, PathBuf) {
    let dir = tempfile::TempDir::new().unwrap();
    let path = path_parts
        .iter()
        .fold(dir.path().to_path_buf(), |acc, part| acc.join(part));
    (dir, path)
}

fn write_and_assert_last_vault(path: &PathBuf, value: &str) {
    set_last_vault_at(path, value).unwrap();
    assert_eq!(get_last_vault_at(path).as_deref(), Some(value));
}

#[test]
fn test_get_last_vault_returns_none_for_missing_file() {
    let dir = tempfile::TempDir::new().unwrap();
    let path = dir.path().join("last-vault.txt");
    assert!(get_last_vault_at(&path).is_none());
}

#[test]
fn test_set_and_get_last_vault_roundtrip() {
    let (_dir, path) = create_last_vault_path(&["last-vault.txt"]);
    write_and_assert_last_vault(&path, "/Users/test/MyVault");
}

#[test]
fn test_set_last_vault_trims_whitespace() {
    let (_dir, path) = create_last_vault_path(&["last-vault.txt"]);
    set_last_vault_at(&path, " \n\t/Users/test/Vault \r\n").unwrap();
    assert_eq!(
        get_last_vault_at(&path).as_deref(),
        Some("/Users/test/Vault")
    );
    assert_eq!(fs::read_to_string(&path).unwrap(), "/Users/test/Vault");
}

#[test]
fn test_get_last_vault_returns_none_for_empty_file() {
    let dir = tempfile::TempDir::new().unwrap();
    let path = dir.path().join("last-vault.txt");
    fs::write(&path, "   \n  ").unwrap();
    assert!(get_last_vault_at(&path).is_none());
}

#[test]
fn test_set_last_vault_creates_parent_directories() {
    let (_dir, path) = create_last_vault_path(&["nested", "dir", "last-vault.txt"]);
    write_and_assert_last_vault(&path, "/Users/test/Vault");
    assert!(path.exists());
}

#[test]
fn test_set_last_vault_overwrites_previous() {
    let (_dir, path) = create_last_vault_path(&["last-vault.txt"]);
    write_and_assert_last_vault(&path, "/Users/test/OldVault");
    write_and_assert_last_vault(&path, "/Users/test/NewVault");
}
