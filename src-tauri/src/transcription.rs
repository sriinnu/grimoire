use serde::{Deserialize, Serialize};
use std::fs;
use std::path::{Path, PathBuf};
use std::process::Output;

const AUDIO_EXTENSIONS: &[&str] = &[
    "aac", "flac", "m4a", "mp3", "mp4", "ogg", "opus", "wav", "webm",
];
const LOCAL_WHISPER_PROVIDER: &str = "local_whisper";
const WHISPER_API_PROVIDER: &str = "whisper_api";
const LOCAL_VOICE_MODEL_PROVIDER: &str = "local_voice_model";

#[derive(Debug, Clone, Serialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct TranscriptSegment {
    pub start_seconds: f64,
    pub end_seconds: f64,
    pub text: String,
}

#[derive(Debug, Clone, Serialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct TranscriptionResult {
    pub title: String,
    pub audio_path: String,
    pub provider: String,
    pub language: Option<String>,
    pub transcript: String,
    pub segments: Vec<TranscriptSegment>,
}

#[derive(Debug, Deserialize)]
struct WhisperSegment {
    start: f64,
    end: f64,
    text: String,
}

#[derive(Debug, Deserialize)]
struct WhisperJson {
    text: Option<String>,
    language: Option<String>,
    segments: Option<Vec<WhisperSegment>>,
}

fn normalize_provider(provider: Option<&str>) -> Result<&'static str, String> {
    match provider.map(|value| value.trim().to_ascii_lowercase()) {
        None => Ok(LOCAL_WHISPER_PROVIDER),
        Some(value) if value == LOCAL_WHISPER_PROVIDER => Ok(LOCAL_WHISPER_PROVIDER),
        Some(value) if value == LOCAL_VOICE_MODEL_PROVIDER => Ok(LOCAL_VOICE_MODEL_PROVIDER),
        Some(value) if value == WHISPER_API_PROVIDER => Ok(WHISPER_API_PROVIDER),
        Some(value) => Err(format!("Unsupported transcription provider: {value}")),
    }
}

fn ensure_provider_allowed(provider: &str, allow_cloud: Option<bool>) -> Result<(), String> {
    if provider == WHISPER_API_PROVIDER && allow_cloud != Some(true) {
        return Err(
            "Cloud transcription is disabled. Enable it in Settings before using Whisper API."
                .to_string(),
        );
    }
    Ok(())
}

fn validate_audio_path(audio_path: &str) -> Result<PathBuf, String> {
    let path = PathBuf::from(audio_path);
    if !path.exists() {
        return Err(format!("Audio file does not exist: {}", path.display()));
    }
    if !path.is_file() {
        return Err(format!("Audio path is not a file: {}", path.display()));
    }
    let extension = path
        .extension()
        .and_then(|value| value.to_str())
        .map(str::to_ascii_lowercase)
        .ok_or_else(|| "Audio file must have an extension".to_string())?;
    if !AUDIO_EXTENSIONS.contains(&extension.as_str()) {
        return Err(format!("Unsupported audio extension: .{extension}"));
    }
    Ok(path)
}

fn first_json_output(output_dir: &Path) -> Result<PathBuf, String> {
    let entries = fs::read_dir(output_dir)
        .map_err(|error| format!("Failed to read transcription output: {error}"))?;
    entries
        .flatten()
        .map(|entry| entry.path())
        .find(|path| path.extension().and_then(|value| value.to_str()) == Some("json"))
        .ok_or_else(|| "Whisper did not produce a JSON transcript".to_string())
}

fn command_error(output: &Output) -> String {
    let stderr = String::from_utf8_lossy(&output.stderr).trim().to_string();
    let stdout = String::from_utf8_lossy(&output.stdout).trim().to_string();
    if !stderr.is_empty() {
        stderr
    } else if !stdout.is_empty() {
        stdout
    } else {
        "Whisper exited without an error message".to_string()
    }
}

fn title_from_audio_path(audio_path: &Path) -> String {
    let stem = audio_path
        .file_stem()
        .and_then(|value| value.to_str())
        .unwrap_or("Audio");
    let title = stem.replace(['-', '_'], " ");
    format!("Transcript - {title}")
}

fn parse_whisper_json(
    json: &str,
    audio_path: &Path,
    provider: &str,
    requested_language: Option<String>,
) -> Result<TranscriptionResult, String> {
    let parsed: WhisperJson = serde_json::from_str(json)
        .map_err(|error| format!("Failed to parse Whisper transcript: {error}"))?;
    let segments = parsed
        .segments
        .unwrap_or_default()
        .into_iter()
        .map(|segment| TranscriptSegment {
            start_seconds: segment.start,
            end_seconds: segment.end,
            text: segment.text.trim().to_string(),
        })
        .filter(|segment| !segment.text.is_empty())
        .collect::<Vec<_>>();
    let transcript = parsed
        .text
        .unwrap_or_else(|| {
            segments
                .iter()
                .map(|segment| segment.text.as_str())
                .collect::<Vec<_>>()
                .join(" ")
        })
        .trim()
        .to_string();
    if transcript.is_empty() {
        return Err("Whisper produced an empty transcript".to_string());
    }

    Ok(TranscriptionResult {
        title: title_from_audio_path(audio_path),
        audio_path: audio_path.to_string_lossy().to_string(),
        provider: provider.to_string(),
        language: parsed.language.or(requested_language),
        transcript,
        segments,
    })
}

fn run_local_whisper(
    audio_path: &Path,
    provider: &str,
    language: Option<String>,
    model: Option<String>,
) -> Result<TranscriptionResult, String> {
    let output_dir = tempfile::tempdir()
        .map_err(|error| format!("Failed to create transcription workspace: {error}"))?;
    let mut command = crate::hidden_command("whisper");
    command
        .arg(audio_path)
        .arg("--output_format")
        .arg("json")
        .arg("--output_dir")
        .arg(output_dir.path())
        .arg("--verbose")
        .arg("False");
    if let Some(value) = language.as_deref().filter(|value| !value.trim().is_empty()) {
        command.arg("--language").arg(value.trim());
    }
    if let Some(value) = model.as_deref().filter(|value| !value.trim().is_empty()) {
        command.arg("--model").arg(value.trim());
    }

    let output = command
        .output()
        .map_err(|error| format!("Local Whisper CLI is not available: {error}"))?;
    if !output.status.success() {
        return Err(command_error(&output));
    }

    let json_path = first_json_output(output_dir.path())?;
    let json = fs::read_to_string(&json_path)
        .map_err(|error| format!("Failed to read Whisper transcript: {error}"))?;
    parse_whisper_json(&json, audio_path, provider, language)
}

pub fn transcribe_audio(
    audio_path: String,
    provider: Option<String>,
    language: Option<String>,
    model: Option<String>,
    allow_cloud: Option<bool>,
) -> Result<TranscriptionResult, String> {
    let provider = normalize_provider(provider.as_deref())?;
    ensure_provider_allowed(provider, allow_cloud)?;
    let audio_path = validate_audio_path(&audio_path)?;
    match provider {
        LOCAL_WHISPER_PROVIDER | LOCAL_VOICE_MODEL_PROVIDER => {
            run_local_whisper(&audio_path, provider, language, model)
        }
        WHISPER_API_PROVIDER => Err(
            "Whisper API transcription needs API key transport; use Local Whisper for now."
                .to_string(),
        ),
        _ => Err("Unsupported transcription provider".to_string()),
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::io::Write;

    #[test]
    fn parses_whisper_json_segments() {
        let json = r#"{
          "text": "Hello Sriinnu. Ship Grimoire.",
          "language": "en",
          "segments": [
            { "start": 0.0, "end": 1.5, "text": " Hello Sriinnu. " },
            { "start": 1.5, "end": 3.0, "text": "Ship Grimoire." }
          ]
        }"#;

        let result = parse_whisper_json(
            json,
            Path::new("/tmp/team-sync.m4a"),
            LOCAL_WHISPER_PROVIDER,
            None,
        )
        .unwrap();

        assert_eq!(result.title, "Transcript - team sync");
        assert_eq!(result.language.as_deref(), Some("en"));
        assert_eq!(result.segments[0].text, "Hello Sriinnu.");
    }

    #[test]
    fn validates_supported_audio_extensions() {
        let dir = tempfile::TempDir::new().unwrap();
        let audio_path = dir.path().join("voice-note.m4a");
        fs::File::create(&audio_path)
            .unwrap()
            .write_all(b"audio")
            .unwrap();

        assert_eq!(
            validate_audio_path(audio_path.to_str().unwrap()).unwrap(),
            audio_path
        );
    }

    #[test]
    fn rejects_unsupported_audio_extensions() {
        let dir = tempfile::TempDir::new().unwrap();
        let audio_path = dir.path().join("voice-note.txt");
        fs::File::create(&audio_path)
            .unwrap()
            .write_all(b"text")
            .unwrap();

        assert!(validate_audio_path(audio_path.to_str().unwrap()).is_err());
    }

    #[test]
    fn rejects_cloud_transcription_without_explicit_opt_in() {
        let err = transcribe_audio(
            "/tmp/voice-note.m4a".to_string(),
            Some(WHISPER_API_PROVIDER.to_string()),
            None,
            None,
            Some(false),
        )
        .unwrap_err();

        assert!(err.contains("Cloud transcription is disabled"));
    }

    #[test]
    fn reaches_api_transport_guard_after_cloud_opt_in() {
        let dir = tempfile::TempDir::new().unwrap();
        let audio_path = dir.path().join("voice-note.m4a");
        fs::File::create(&audio_path)
            .unwrap()
            .write_all(b"audio")
            .unwrap();

        let err = transcribe_audio(
            audio_path.to_string_lossy().to_string(),
            Some(WHISPER_API_PROVIDER.to_string()),
            None,
            None,
            Some(true),
        )
        .unwrap_err();

        assert!(err.contains("needs API key transport"));
    }
}
