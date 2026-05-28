use base64::prelude::{Engine as _, BASE64_STANDARD};
use rusqlite::{Connection, OpenFlags};
use serde::Deserialize;
use std::fs;
use std::path::Path;

use super::portability_capsule::{PortabilityCapsuleFormat, PortabilityCapsuleProof};
use super::portability_capsule_import::{
    ImportedCapsule, ImportedCapsuleFile, ImportedCapsuleWithheld,
};

const CAPSULE_SCHEMA: &str = "grimoire-portability-capsule/v1";

#[derive(Deserialize)]
struct JsonCapsuleImport {
    schema: String,
    format: String,
    proof: PortabilityCapsuleProof,
    files: Vec<JsonCapsuleFileImport>,
    #[serde(default)]
    withheld: Vec<JsonCapsuleWithheldImport>,
}

#[derive(Deserialize)]
struct JsonCapsuleFileImport {
    path: String,
    kind: String,
    bytes: u64,
    sha256: String,
    encoding: String,
    content: String,
}

#[derive(Deserialize)]
struct JsonCapsuleWithheldImport {
    path: String,
    reason: String,
}

pub(super) fn read_capsule(
    path: &Path,
    format: PortabilityCapsuleFormat,
) -> Result<ImportedCapsule, String> {
    match format {
        PortabilityCapsuleFormat::Json => read_json_capsule(path),
        PortabilityCapsuleFormat::Sqlite => read_sqlite_capsule(path),
    }
}

fn read_json_capsule(path: &Path) -> Result<ImportedCapsule, String> {
    let bytes = fs::read(path).map_err(|e| format!("Failed to read JSON capsule: {e}"))?;
    let capsule: JsonCapsuleImport =
        serde_json::from_slice(&bytes).map_err(|e| format!("Failed to parse JSON capsule: {e}"))?;
    validate_capsule_header(
        &capsule.schema,
        &capsule.format,
        PortabilityCapsuleFormat::Json,
    )?;
    validate_capsule_proof(&capsule.proof, capsule.withheld.len())?;
    Ok(ImportedCapsule {
        files: capsule
            .files
            .into_iter()
            .map(decode_json_capsule_file)
            .collect::<Result<Vec<_>, _>>()?,
        withheld: capsule
            .withheld
            .into_iter()
            .map(|item| ImportedCapsuleWithheld {
                path: item.path,
                reason: item.reason,
            })
            .collect(),
    })
}

fn decode_json_capsule_file(file: JsonCapsuleFileImport) -> Result<ImportedCapsuleFile, String> {
    let bytes = match file.encoding.as_str() {
        "utf-8" => file.content.into_bytes(),
        "base64" => BASE64_STANDARD
            .decode(file.content)
            .map_err(|e| format!("Failed to decode base64 capsule file {}: {e}", file.path))?,
        _ => return Err(format!("Unsupported capsule encoding for {}", file.path)),
    };
    if bytes.len() as u64 != file.bytes {
        return Err(format!("Capsule byte count mismatch for {}", file.path));
    }
    Ok(ImportedCapsuleFile {
        path: file.path,
        kind: file.kind,
        bytes,
        sha256: file.sha256,
    })
}

fn read_sqlite_capsule(path: &Path) -> Result<ImportedCapsule, String> {
    let connection = Connection::open_with_flags(path, OpenFlags::SQLITE_OPEN_READ_ONLY)
        .map_err(|e| format!("Failed to open SQLite capsule: {e}"))?;
    let schema = sqlite_meta_value(&connection, "schema")?;
    let format = sqlite_meta_value(&connection, "format")?;
    validate_capsule_header(&schema, &format, PortabilityCapsuleFormat::Sqlite)?;
    let files = read_sqlite_files(&connection)?;
    let withheld = read_sqlite_withheld(&connection)?;
    validate_sqlite_proof(&connection, withheld.len())?;
    Ok(ImportedCapsule { files, withheld })
}

fn sqlite_meta_value(connection: &Connection, key: &str) -> Result<String, String> {
    connection
        .query_row(
            "SELECT value FROM capsule_meta WHERE key = ?1",
            [key],
            |row| row.get(0),
        )
        .map_err(|e| format!("SQLite capsule is missing metadata `{key}`: {e}"))
}

fn read_sqlite_files(connection: &Connection) -> Result<Vec<ImportedCapsuleFile>, String> {
    let mut statement = connection
        .prepare("SELECT path, kind, bytes, sha256, content_blob FROM capsule_files ORDER BY path")
        .map_err(|e| format!("SQLite capsule is missing file table: {e}"))?;
    let rows = statement
        .query_map([], |row| {
            let expected_bytes: i64 = row.get(2)?;
            let bytes: Vec<u8> = row.get(4)?;
            Ok((row.get(0)?, row.get(1)?, expected_bytes, row.get(3)?, bytes))
        })
        .map_err(|e| format!("Failed to read SQLite capsule files: {e}"))?;
    rows.map(|row| {
        let (path, kind, expected_bytes, sha256, bytes) =
            row.map_err(|e| format!("Failed to read SQLite capsule file row: {e}"))?;
        if expected_bytes < 0 || bytes.len() as i64 != expected_bytes {
            return Err(format!("Capsule byte count mismatch for {path}"));
        }
        Ok(ImportedCapsuleFile {
            path,
            kind,
            bytes,
            sha256,
        })
    })
    .collect()
}

fn read_sqlite_withheld(connection: &Connection) -> Result<Vec<ImportedCapsuleWithheld>, String> {
    let mut statement = connection
        .prepare("SELECT path, reason FROM withheld_files ORDER BY path")
        .map_err(|e| format!("SQLite capsule is missing withheld table: {e}"))?;
    let rows = statement
        .query_map([], |row| {
            Ok(ImportedCapsuleWithheld {
                path: row.get(0)?,
                reason: row.get(1)?,
            })
        })
        .map_err(|e| format!("Failed to read SQLite withheld files: {e}"))?;
    rows.collect::<Result<Vec<_>, _>>()
        .map_err(|e| format!("Failed to read SQLite withheld row: {e}"))
}

fn validate_sqlite_proof(connection: &Connection, withheld_count: usize) -> Result<(), String> {
    let proof = PortabilityCapsuleProof {
        markdown_source_of_truth: sqlite_proof_bool(connection, "markdown_source_of_truth")?,
        absolute_source_paths_redacted: sqlite_proof_bool(
            connection,
            "absolute_source_paths_redacted",
        )?,
        local_only_files_withheld: sqlite_proof_usize(connection, "local_only_files_withheld")?,
    };
    validate_capsule_proof(&proof, withheld_count)
}

fn sqlite_proof_bool(connection: &Connection, key: &str) -> Result<bool, String> {
    match sqlite_proof_value(connection, key)?.as_str() {
        "true" => Ok(true),
        "false" => Ok(false),
        _ => Err(format!(
            "SQLite capsule locality proof `{key}` is not boolean"
        )),
    }
}

fn sqlite_proof_usize(connection: &Connection, key: &str) -> Result<usize, String> {
    sqlite_proof_value(connection, key)?
        .parse::<usize>()
        .map_err(|_| format!("SQLite capsule locality proof `{key}` is not a count"))
}

fn sqlite_proof_value(connection: &Connection, key: &str) -> Result<String, String> {
    connection
        .query_row(
            "SELECT value FROM locality_proof WHERE key = ?1",
            [key],
            |row| row.get(0),
        )
        .map_err(|e| format!("SQLite capsule is missing locality proof `{key}`: {e}"))
}

fn validate_capsule_header(
    schema: &str,
    format: &str,
    expected: PortabilityCapsuleFormat,
) -> Result<(), String> {
    if schema != CAPSULE_SCHEMA {
        return Err("Unsupported Grimoire capsule schema".to_string());
    }
    if format != expected.label() {
        return Err(format!("Capsule is not a {} file", expected.label()));
    }
    Ok(())
}

fn validate_capsule_proof(
    proof: &PortabilityCapsuleProof,
    withheld_count: usize,
) -> Result<(), String> {
    if !proof.markdown_source_of_truth {
        return Err(
            "Capsule locality proof does not preserve Markdown source of truth".to_string(),
        );
    }
    if !proof.absolute_source_paths_redacted {
        return Err("Capsule locality proof does not redact absolute source paths".to_string());
    }
    if proof.local_only_files_withheld != withheld_count {
        return Err("Capsule locality proof does not match withheld manifest rows".to_string());
    }
    Ok(())
}
