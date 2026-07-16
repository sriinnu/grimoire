use super::vault::VaultBoundary;
use std::path::PathBuf;

/// Parse one code file inside the active vault. The frontend only receives
/// syntax facts; file contents never leave the native process.
#[tauri::command]
pub fn inspect_code_symbols(
    path: PathBuf,
    vault_path: Option<PathBuf>,
) -> Result<crate::code_intelligence::CodeSymbolSnapshot, String> {
    let boundary = VaultBoundary::from_request(
        vault_path
            .as_ref()
            .map(|value| value.to_string_lossy())
            .as_deref(),
    )?;
    let mut validated_paths =
        boundary.validate_existing_paths(&[path.to_string_lossy().into_owned()])?;
    let validated_path = validated_paths
        .pop()
        .ok_or_else(|| "No code file was selected".to_string())?;
    crate::code_intelligence::inspect_code_symbols(PathBuf::from(validated_path).as_path())
}
