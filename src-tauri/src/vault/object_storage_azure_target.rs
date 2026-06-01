use serde::Deserialize;

#[derive(Debug, Clone, Deserialize, PartialEq, Eq)]
pub struct AzureProviderSyncInput {
    pub account: Option<String>,
    pub container: Option<String>,
    pub prefix: Option<String>,
    pub allow_env_fallback: Option<bool>,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub(super) struct ResolvedAzureProviderTarget {
    pub(super) account: String,
    pub(super) container: String,
    pub(super) prefix: String,
}

impl ResolvedAzureProviderTarget {
    pub(super) fn from_input(input: AzureProviderSyncInput) -> Result<Self, String> {
        let allow_env_fallback = input.allow_env_fallback.unwrap_or(true);
        let account = clean_or_env(
            input.account,
            "GRIMOIRE_AZURE_STORAGE_ACCOUNT",
            allow_env_fallback,
        )
        .ok_or_else(|| "Set an Azure storage account before running provider sync.".to_string())?;
        let container = clean_or_env(
            input.container,
            "GRIMOIRE_AZURE_CONTAINER",
            allow_env_fallback,
        )
        .ok_or_else(|| "Set an Azure Blob container before running provider sync.".to_string())?;
        Ok(Self {
            account,
            container,
            prefix: clean_or_env(input.prefix, "GRIMOIRE_AZURE_PREFIX", allow_env_fallback)
                .unwrap_or_default(),
        })
    }
}

pub(super) fn target_label(target: &ResolvedAzureProviderTarget) -> String {
    let base = format!("azblob://{}/{}", target.account, target.container);
    let prefix = target.prefix.trim_matches('/');
    if prefix.is_empty() {
        base
    } else {
        format!("{base}/{prefix}")
    }
}

pub(super) fn prefix_for_list(prefix: &str) -> String {
    let prefix = prefix.trim_matches('/');
    if prefix.is_empty() {
        String::new()
    } else {
        format!("{prefix}/")
    }
}

pub(super) fn blob_name(prefix: &str, relative: &str) -> String {
    let prefix = prefix.trim_matches('/');
    let relative = relative.trim_start_matches('/');
    if prefix.is_empty() {
        relative.to_string()
    } else {
        format!("{prefix}/{relative}")
    }
}

pub(super) fn relative_blob_name(prefix: &str, name: &str) -> Option<String> {
    let prefix = prefix_for_list(prefix);
    let relative = if prefix.is_empty() {
        name
    } else {
        name.strip_prefix(&prefix)?
    };
    let relative = relative.trim_start_matches('/');
    if relative.is_empty()
        || relative.starts_with("../")
        || relative.contains("/../")
        || relative.contains('\\')
    {
        return None;
    }
    Some(relative.to_string())
}

fn clean_or_env(value: Option<String>, env_key: &str, allow_env_fallback: bool) -> Option<String> {
    match value {
        Some(value) => clean(Some(value)),
        None if allow_env_fallback => clean(std::env::var(env_key).ok()),
        None => None,
    }
}

fn clean(value: Option<String>) -> Option<String> {
    value
        .map(|v| v.trim().to_string())
        .filter(|v| !v.is_empty())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn maps_azure_prefix_blobs_to_vault_relative_paths() {
        assert_eq!(
            relative_blob_name("vault", "vault/docs/readme.md").as_deref(),
            Some("docs/readme.md")
        );
        assert_eq!(
            relative_blob_name("", "note.md").as_deref(),
            Some("note.md")
        );
        assert_eq!(relative_blob_name("vault", "other/note.md"), None);
        assert_eq!(relative_blob_name("", "../secret.md"), None);
    }

    #[test]
    fn builds_provider_target_labels() {
        let target = ResolvedAzureProviderTarget {
            account: "acct".to_string(),
            container: "vaults".to_string(),
            prefix: "notes/".to_string(),
        };
        assert_eq!(target_label(&target), "azblob://acct/vaults/notes");
    }

    #[test]
    fn explicit_settings_targets_do_not_fall_back_to_hidden_env() {
        std::env::set_var("GRIMOIRE_AZURE_STORAGE_ACCOUNT", "hidden-account");
        std::env::set_var("GRIMOIRE_AZURE_CONTAINER", "hidden-container");
        let target = ResolvedAzureProviderTarget::from_input(AzureProviderSyncInput {
            account: None,
            container: None,
            prefix: None,
            allow_env_fallback: Some(false),
        });
        std::env::remove_var("GRIMOIRE_AZURE_STORAGE_ACCOUNT");
        std::env::remove_var("GRIMOIRE_AZURE_CONTAINER");

        assert_eq!(
            target.unwrap_err(),
            "Set an Azure storage account before running provider sync."
        );
    }
}
