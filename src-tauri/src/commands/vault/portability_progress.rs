use std::collections::HashMap;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::{Arc, Mutex, OnceLock};

type CancellationMap = HashMap<String, Arc<AtomicBool>>;

static PORTABILITY_CANCELLATIONS: OnceLock<Mutex<CancellationMap>> = OnceLock::new();

fn cancellation_registry() -> &'static Mutex<CancellationMap> {
    PORTABILITY_CANCELLATIONS.get_or_init(|| Mutex::new(HashMap::new()))
}

pub(super) fn register_portability_operation(
    operation_id: &str,
) -> Result<Arc<AtomicBool>, String> {
    let token = Arc::new(AtomicBool::new(false));
    let mut registry = cancellation_registry()
        .lock()
        .map_err(|_| "Import cancellation registry is unavailable".to_string())?;
    if registry.contains_key(operation_id) {
        return Err("Import operation is already running".to_string());
    }
    registry.insert(operation_id.to_string(), Arc::clone(&token));
    Ok(token)
}

pub(super) fn unregister_portability_operation(operation_id: &str) {
    if let Ok(mut registry) = cancellation_registry().lock() {
        registry.remove(operation_id);
    }
}

pub(super) fn operation_id_error(operation_id: &str) -> Option<String> {
    if operation_id.trim().is_empty() {
        Some("Import operation id is required".to_string())
    } else {
        None
    }
}

pub(super) fn cancel_portability_token(operation_id: &str) -> Result<bool, String> {
    if let Some(error) = operation_id_error(operation_id) {
        return Err(error);
    }

    let registry = cancellation_registry()
        .lock()
        .map_err(|_| "Import cancellation registry is unavailable".to_string())?;
    let Some(token) = registry.get(operation_id) else {
        return Ok(false);
    };
    token.store(true, Ordering::SeqCst);
    Ok(true)
}
