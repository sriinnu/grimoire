use crate::vault_service::execute_vault_request_v1;
use std::ffi::{c_char, CStr, CString};

#[no_mangle]
pub unsafe extern "C" fn grimoire_vault_execute_v1(request: *const c_char) -> *mut c_char {
    let response = if request.is_null() {
        r#"{"version":1,"ok":false,"error":"Vault request was null"}"#.to_string()
    } else {
        // SAFETY: The caller contract requires a valid NUL-terminated UTF-8 C string.
        match unsafe { CStr::from_ptr(request) }.to_str() {
            Ok(request) => execute_vault_request_v1(request),
            Err(_) => {
                r#"{"version":1,"ok":false,"error":"Vault request was not UTF-8"}"#.to_string()
            }
        }
    };
    CString::new(response)
        .expect("serialized vault responses cannot contain NUL bytes")
        .into_raw()
}

#[no_mangle]
pub unsafe extern "C" fn grimoire_string_free(value: *mut c_char) {
    if !value.is_null() {
        // SAFETY: The pointer must have been returned by grimoire_vault_execute_v1 once.
        drop(unsafe { CString::from_raw(value) });
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn returns_a_owned_json_error_for_a_null_request() {
        // SAFETY: Null is an explicitly supported error input.
        let pointer = unsafe { grimoire_vault_execute_v1(std::ptr::null()) };
        // SAFETY: The function returns an owned, NUL-terminated C string.
        let response = unsafe { CStr::from_ptr(pointer) }.to_str().unwrap();
        assert!(response.contains("Vault request was null"));
        // SAFETY: The pointer came from grimoire_vault_execute_v1 and is freed once.
        unsafe { grimoire_string_free(pointer) };
    }
}
