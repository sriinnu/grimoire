use serde::Deserialize;

#[derive(Debug, Clone, Deserialize, PartialEq, Eq)]
pub struct S3ProviderSyncInput {
    pub bucket: Option<String>,
    pub region: Option<String>,
    pub prefix: Option<String>,
    pub allow_env_fallback: Option<bool>,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub(super) struct ResolvedS3ProviderTarget {
    pub(super) bucket: String,
    pub(super) region: Option<String>,
    pub(super) prefix: String,
}

impl ResolvedS3ProviderTarget {
    pub(super) fn from_input(input: S3ProviderSyncInput) -> Result<Self, String> {
        let allow_env_fallback = input.allow_env_fallback.unwrap_or(true);
        let bucket = clean_or_env(input.bucket, "GRIMOIRE_S3_BUCKET", allow_env_fallback)
            .ok_or_else(|| "Set an S3 bucket before running provider sync.".to_string())?;
        Ok(Self {
            bucket,
            region: clean_or_env(input.region, "GRIMOIRE_S3_REGION", allow_env_fallback),
            prefix: clean_or_env(input.prefix, "GRIMOIRE_S3_PREFIX", allow_env_fallback)
                .unwrap_or_default(),
        })
    }
}

pub(super) fn target_label(target: &ResolvedS3ProviderTarget) -> String {
    if target.prefix.trim_matches('/').is_empty() {
        format!("s3://{}", target.bucket)
    } else {
        format!("s3://{}/{}", target.bucket, target.prefix.trim_matches('/'))
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

pub(super) fn remote_key(prefix: &str, relative: &str) -> String {
    let prefix = prefix.trim_matches('/');
    let relative = relative.trim_start_matches('/');
    if prefix.is_empty() {
        relative.to_string()
    } else {
        format!("{prefix}/{relative}")
    }
}

pub(super) fn relative_remote_key(prefix: &str, key: &str) -> Option<String> {
    let prefix = prefix_for_list(prefix);
    let relative = if prefix.is_empty() {
        key
    } else {
        key.strip_prefix(&prefix)?
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
    fn maps_s3_prefix_keys_to_vault_relative_paths() {
        assert_eq!(
            relative_remote_key("vault", "vault/docs/readme.md").as_deref(),
            Some("docs/readme.md")
        );
        assert_eq!(
            relative_remote_key("", "note.md").as_deref(),
            Some("note.md")
        );
        assert_eq!(relative_remote_key("vault", "other/note.md"), None);
        assert_eq!(relative_remote_key("", "../secret.md"), None);
    }

    #[test]
    fn builds_provider_target_labels() {
        let target = ResolvedS3ProviderTarget {
            bucket: "bucket".to_string(),
            region: None,
            prefix: "vault/".to_string(),
        };
        assert_eq!(target_label(&target), "s3://bucket/vault");
    }

    #[test]
    fn explicit_settings_targets_do_not_fall_back_to_hidden_env() {
        std::env::set_var("GRIMOIRE_S3_BUCKET", "hidden-bucket");
        let target = ResolvedS3ProviderTarget::from_input(S3ProviderSyncInput {
            bucket: None,
            region: None,
            prefix: None,
            allow_env_fallback: Some(false),
        });
        std::env::remove_var("GRIMOIRE_S3_BUCKET");

        assert_eq!(
            target.unwrap_err(),
            "Set an S3 bucket before running provider sync."
        );
    }
}
