const ARG_KEY: &str = "--grimoire-native-startup-smoke";
const ENV_KEY: &str = "GRIMOIRE_NATIVE_STARTUP_SMOKE";
pub(crate) const READY_MARKER: &str = "GRIMOIRE_NATIVE_STARTUP_SMOKE_READY";

pub(crate) fn enabled_with<F>(mut get_var: F) -> bool
where
    F: FnMut(&str) -> Option<String>,
{
    get_var(ENV_KEY).is_some_and(|value| {
        matches!(
            value.trim().to_ascii_lowercase().as_str(),
            "1" | "true" | "yes"
        )
    })
}

fn enabled() -> bool {
    enabled_with(|key| std::env::var(key).ok()) || arg_enabled_with(std::env::args())
}

pub(crate) fn arg_enabled_with<I, S>(args: I) -> bool
where
    I: IntoIterator<Item = S>,
    S: AsRef<str>,
{
    args.into_iter().any(|arg| arg.as_ref() == ARG_KEY)
}

pub(crate) fn exit_at_process_entry() -> bool {
    if !enabled() {
        return false;
    }

    println!("{READY_MARKER} process_entry=true");
    true
}
