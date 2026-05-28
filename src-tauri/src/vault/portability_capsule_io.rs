use base64::prelude::{Engine as _, BASE64_STANDARD};
use rusqlite::{params, Connection};
use serde::Serialize;
use std::fs;
use std::path::Path;
use tempfile::TempPath;

use super::portability_capsule::{
    proof_for_inventory, vault_label, CapsuleFile, CapsuleInventory, CapsuleWithheld,
    PortabilityCapsuleFormat, PortabilityCapsuleProof,
};

#[derive(Serialize)]
struct JsonCapsule {
    schema: &'static str,
    format: &'static str,
    vault_label: String,
    proof: PortabilityCapsuleProof,
    files: Vec<JsonCapsuleFile>,
    withheld: Vec<CapsuleWithheldJson>,
}

#[derive(Serialize)]
struct JsonCapsuleFile {
    path: String,
    kind: String,
    bytes: u64,
    sha256: String,
    encoding: &'static str,
    content: String,
}

#[derive(Serialize)]
struct CapsuleWithheldJson {
    path: String,
    reason: String,
}

pub(super) fn write_capsule(
    vault_root: &Path,
    inventory: &CapsuleInventory,
    temp_path: &TempPath,
    format: PortabilityCapsuleFormat,
) -> Result<(), String> {
    match format {
        PortabilityCapsuleFormat::Json => write_json_capsule(vault_root, inventory, temp_path),
        PortabilityCapsuleFormat::Sqlite => write_sqlite_capsule(vault_root, inventory, temp_path),
    }
}

fn write_json_capsule(
    vault_root: &Path,
    inventory: &CapsuleInventory,
    temp_path: &TempPath,
) -> Result<(), String> {
    let capsule = JsonCapsule {
        schema: "grimoire-portability-capsule/v1",
        format: PortabilityCapsuleFormat::Json.label(),
        vault_label: vault_label(vault_root),
        proof: proof_for_inventory(inventory),
        files: inventory.files.iter().map(json_file).collect(),
        withheld: inventory.withheld.iter().map(withheld_json).collect(),
    };
    let json = serde_json::to_vec_pretty(&capsule)
        .map_err(|e| format!("Failed to encode JSON capsule: {e}"))?;
    fs::write(temp_path, json).map_err(|e| format!("Failed to write JSON capsule: {e}"))
}

fn json_file(file: &CapsuleFile) -> JsonCapsuleFile {
    match std::str::from_utf8(&file.bytes) {
        Ok(text) => JsonCapsuleFile {
            path: file.path.clone(),
            kind: file.kind.clone(),
            bytes: file.bytes.len() as u64,
            sha256: file.sha256.clone(),
            encoding: "utf-8",
            content: text.to_string(),
        },
        Err(_) => JsonCapsuleFile {
            path: file.path.clone(),
            kind: file.kind.clone(),
            bytes: file.bytes.len() as u64,
            sha256: file.sha256.clone(),
            encoding: "base64",
            content: BASE64_STANDARD.encode(&file.bytes),
        },
    }
}

fn withheld_json(item: &CapsuleWithheld) -> CapsuleWithheldJson {
    CapsuleWithheldJson {
        path: item.path.clone(),
        reason: item.reason.clone(),
    }
}

fn write_sqlite_capsule(
    vault_root: &Path,
    inventory: &CapsuleInventory,
    temp_path: &TempPath,
) -> Result<(), String> {
    let mut connection =
        Connection::open(temp_path).map_err(|e| format!("Failed to create SQLite capsule: {e}"))?;
    connection
        .execute_batch(
            "CREATE TABLE capsule_meta(key TEXT PRIMARY KEY, value TEXT NOT NULL);
             CREATE TABLE capsule_files(path TEXT PRIMARY KEY, kind TEXT NOT NULL, bytes INTEGER NOT NULL, sha256 TEXT NOT NULL, content_text TEXT, content_blob BLOB NOT NULL);
             CREATE TABLE withheld_files(path TEXT PRIMARY KEY, reason TEXT NOT NULL);
             CREATE TABLE locality_proof(key TEXT PRIMARY KEY, value TEXT NOT NULL);",
        )
        .map_err(|e| format!("Failed to initialize SQLite capsule: {e}"))?;
    let transaction = connection
        .transaction()
        .map_err(|e| format!("Failed to begin SQLite capsule transaction: {e}"))?;
    write_sqlite_meta(vault_root, &transaction)?;
    for file in &inventory.files {
        write_sqlite_file(&transaction, file)?;
    }
    for file in &inventory.withheld {
        write_sqlite_withheld(&transaction, file)?;
    }
    write_sqlite_proof(&transaction, inventory)?;
    transaction
        .commit()
        .map_err(|e| format!("Failed to commit SQLite capsule: {e}"))
}

fn write_sqlite_meta(
    vault_root: &Path,
    transaction: &rusqlite::Transaction<'_>,
) -> Result<(), String> {
    transaction
        .execute(
            "INSERT INTO capsule_meta(key, value) VALUES (?1, ?2), (?3, ?4), (?5, ?6)",
            params![
                "schema",
                "grimoire-portability-capsule/v1",
                "format",
                PortabilityCapsuleFormat::Sqlite.label(),
                "vault_label",
                vault_label(vault_root)
            ],
        )
        .map(|_| ())
        .map_err(|e| format!("Failed to write SQLite capsule metadata: {e}"))
}

fn write_sqlite_file(
    transaction: &rusqlite::Transaction<'_>,
    file: &CapsuleFile,
) -> Result<(), String> {
    transaction
        .execute(
            "INSERT INTO capsule_files(path, kind, bytes, sha256, content_text, content_blob) VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
            params![file.path, file.kind, file.bytes.len() as i64, file.sha256, text_content(file), file.bytes],
        )
        .map(|_| ())
        .map_err(|e| format!("Failed to write SQLite capsule file row: {e}"))
}

fn write_sqlite_withheld(
    transaction: &rusqlite::Transaction<'_>,
    file: &CapsuleWithheld,
) -> Result<(), String> {
    transaction
        .execute(
            "INSERT INTO withheld_files(path, reason) VALUES (?1, ?2)",
            params![file.path, file.reason],
        )
        .map(|_| ())
        .map_err(|e| format!("Failed to write SQLite withheld row: {e}"))
}

fn write_sqlite_proof(
    transaction: &rusqlite::Transaction<'_>,
    inventory: &CapsuleInventory,
) -> Result<(), String> {
    let withheld_count = inventory.withheld.len().to_string();
    for (key, value) in [
        ("markdown_source_of_truth", "true"),
        ("absolute_source_paths_redacted", "true"),
        ("local_only_files_withheld", withheld_count.as_str()),
    ] {
        transaction
            .execute(
                "INSERT INTO locality_proof(key, value) VALUES (?1, ?2)",
                params![key, value],
            )
            .map_err(|e| format!("Failed to write SQLite locality proof: {e}"))?;
    }
    Ok(())
}

fn text_content(file: &CapsuleFile) -> Option<String> {
    std::str::from_utf8(&file.bytes).ok().map(str::to_string)
}
