use crate::transcription::{TranscriptSegment, TranscriptionResult};
use crate::transcription_runtime_discovery::{find_executable, whisper_install_hint};
use serde_json::Value;
use std::fs;
use std::path::{Path, PathBuf};
use std::process::Output;

const WHISPER_CPP_SUPPORTED_EXTENSIONS: &[&str] = &["flac", "mp3", "ogg", "wav"];
const RECOMMENDED_MODEL: &str = "ggml-base.en.bin";
const MODEL_DOWNLOAD_URL: &str =
    "https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-base.en.bin";

#[derive(Debug, Clone, serde::Serialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct TranscriptionReadiness {
    pub provider: String,
    pub ready: bool,
    pub status: String,
    pub message: String,
    pub cli_path: Option<String>,
    pub model_path: Option<String>,
    pub recommended_model_path: Option<String>,
    pub download_url: Option<String>,
    pub install_hint: String,
}

#[derive(Debug, Clone, PartialEq)]
struct WhisperCppRuntime {
    cli_path: PathBuf,
    model_path: PathBuf,
}

fn model_base_dir() -> Option<PathBuf> {
    dirs::data_dir().map(|dir| dir.join("Grimoire").join("models").join("whisper"))
}

pub fn recommended_model_path() -> Option<PathBuf> {
    model_base_dir().map(|dir| dir.join(RECOMMENDED_MODEL))
}

fn model_candidates(explicit_model: Option<&str>) -> Vec<PathBuf> {
    let mut candidates = Vec::new();
    if let Some(value) = explicit_model.filter(|value| !value.trim().is_empty()) {
        candidates.push(PathBuf::from(value.trim()));
    }
    if let Ok(value) = std::env::var("GRIMOIRE_WHISPER_MODEL") {
        if !value.trim().is_empty() {
            candidates.push(PathBuf::from(value.trim()));
        }
    }
    if let Some(base) = model_base_dir() {
        for name in [
            "ggml-small.en.bin",
            RECOMMENDED_MODEL,
            "ggml-small.bin",
            "ggml-base.bin",
            "ggml-medium.en.bin",
            "ggml-large-v3-turbo.bin",
        ] {
            candidates.push(base.join(name));
        }
    }
    for root in [
        "/opt/homebrew/share/whisper-cpp",
        "/usr/local/share/whisper-cpp",
    ] {
        for name in [
            "ggml-small.en.bin",
            RECOMMENDED_MODEL,
            "ggml-small.bin",
            "ggml-base.bin",
        ] {
            candidates.push(PathBuf::from(root).join(name));
        }
    }
    candidates
}

fn find_model(explicit_model: Option<&str>) -> Option<PathBuf> {
    model_candidates(explicit_model)
        .into_iter()
        .find(|path| path.is_file())
}

fn resolve_whisper_cpp(explicit_model: Option<&str>) -> Result<Option<WhisperCppRuntime>, String> {
    let Some(cli_path) = find_executable("whisper-cli") else {
        return Ok(None);
    };
    let Some(model_path) = find_model(explicit_model) else {
        let recommended = recommended_model_path()
            .map(|path| path.display().to_string())
            .unwrap_or_else(|| {
                format!("~/Library/Application Support/Grimoire/models/whisper/{RECOMMENDED_MODEL}")
            });
        return Err(format!(
            "Local Whisper CLI is installed, but no ggml model was found. Download {RECOMMENDED_MODEL} to {recommended}."
        ));
    };
    Ok(Some(WhisperCppRuntime {
        cli_path,
        model_path,
    }))
}

pub fn local_transcription_readiness(
    provider: &str,
    explicit_model: Option<&str>,
) -> TranscriptionReadiness {
    let cli_path = find_executable("whisper-cli");
    let model_path = find_model(explicit_model);
    let recommended_model = recommended_model_path().map(|path| path.display().to_string());
    match (cli_path, model_path) {
        (Some(cli), Some(model)) => TranscriptionReadiness {
            provider: provider.to_string(),
            ready: true,
            status: "ready".to_string(),
            message: "Local transcription is ready through whisper.cpp.".to_string(),
            cli_path: Some(cli.display().to_string()),
            model_path: Some(model.display().to_string()),
            recommended_model_path: recommended_model,
            download_url: Some(MODEL_DOWNLOAD_URL.to_string()),
            install_hint: "whisper.cpp is installed and a ggml model is available.".to_string(),
        },
        (Some(cli), None) => TranscriptionReadiness {
            provider: provider.to_string(),
            ready: false,
            status: "missing_model".to_string(),
            message: format!(
                "whisper.cpp is installed at {}, but Grimoire needs a ggml model.",
                cli.display()
            ),
            cli_path: Some(cli.display().to_string()),
            model_path: None,
            recommended_model_path: recommended_model,
            download_url: Some(MODEL_DOWNLOAD_URL.to_string()),
            install_hint: format!(
                "Download {RECOMMENDED_MODEL} from the whisper.cpp model mirror."
            ),
        },
        (None, _) => TranscriptionReadiness {
            provider: provider.to_string(),
            ready: false,
            status: "missing_cli".to_string(),
            message: "Local Whisper CLI is not installed.".to_string(),
            cli_path: None,
            model_path: None,
            recommended_model_path: recommended_model,
            download_url: Some(MODEL_DOWNLOAD_URL.to_string()),
            install_hint: whisper_install_hint(),
        },
    }
}

fn command_error(output: &Output) -> String {
    let stderr = String::from_utf8_lossy(&output.stderr).trim().to_string();
    let stdout = String::from_utf8_lossy(&output.stdout).trim().to_string();
    if !stderr.is_empty() {
        stderr
    } else if !stdout.is_empty() {
        stdout
    } else {
        "whisper.cpp exited without an error message".to_string()
    }
}

fn whisper_cpp_needs_conversion(audio_path: &Path) -> bool {
    let extension = audio_path
        .extension()
        .and_then(|value| value.to_str())
        .map(str::to_ascii_lowercase)
        .unwrap_or_default();
    !WHISPER_CPP_SUPPORTED_EXTENSIONS.contains(&extension.as_str())
}

fn whisper_cpp_audio_path(audio_path: &Path, workspace: &Path) -> Result<PathBuf, String> {
    if !whisper_cpp_needs_conversion(audio_path) {
        return Ok(audio_path.to_path_buf());
    }
    let ffmpeg = find_executable("ffmpeg").ok_or_else(|| {
        "whisper.cpp needs ffmpeg to convert this audio format before transcription.".to_string()
    })?;
    let converted = workspace.join("converted.wav");
    let output = crate::hidden_command(ffmpeg)
        .arg("-y")
        .arg("-i")
        .arg(audio_path)
        .arg("-ar")
        .arg("16000")
        .arg("-ac")
        .arg("1")
        .arg("-c:a")
        .arg("pcm_s16le")
        .arg(&converted)
        .output()
        .map_err(|error| format!("Failed to run ffmpeg for audio conversion: {error}"))?;
    if !output.status.success() {
        return Err(command_error(&output));
    }
    Ok(converted)
}

fn timestamp_seconds(value: &Value) -> Option<f64> {
    value.as_f64().or_else(|| {
        value.as_str().and_then(|text| {
            let parts = text.split(':').collect::<Vec<_>>();
            match parts.as_slice() {
                [hours, minutes, seconds] => Some(
                    hours.parse::<f64>().ok()? * 3600.0
                        + minutes.parse::<f64>().ok()? * 60.0
                        + seconds.parse::<f64>().ok()?,
                ),
                [minutes, seconds] => {
                    Some(minutes.parse::<f64>().ok()? * 60.0 + seconds.parse::<f64>().ok()?)
                }
                [seconds] => seconds.parse::<f64>().ok(),
                _ => None,
            }
        })
    })
}

fn segment_seconds(segment: &Value, key: &str) -> f64 {
    segment
        .pointer(&format!("/timestamps/{key}"))
        .and_then(timestamp_seconds)
        .or_else(|| {
            segment
                .pointer(&format!("/offsets/{key}"))
                .and_then(|value| value.as_f64().map(|n| n / 1000.0))
        })
        .unwrap_or(0.0)
}

pub fn parse_whisper_cpp_json(
    json: &str,
    source_audio_path: &Path,
    provider: &str,
    requested_language: Option<String>,
) -> Result<TranscriptionResult, String> {
    let parsed: Value = serde_json::from_str(json)
        .map_err(|error| format!("Failed to parse whisper.cpp transcript: {error}"))?;
    let segments = parsed
        .get("transcription")
        .and_then(Value::as_array)
        .map(Vec::as_slice)
        .unwrap_or(&[])
        .iter()
        .filter_map(|segment| {
            let text = segment.get("text")?.as_str()?.trim().to_string();
            if text.is_empty() {
                return None;
            }
            Some(TranscriptSegment {
                start_seconds: segment_seconds(segment, "from"),
                end_seconds: segment_seconds(segment, "to"),
                text,
            })
        })
        .collect::<Vec<_>>();
    let transcript = segments
        .iter()
        .map(|segment| segment.text.as_str())
        .collect::<Vec<_>>()
        .join(" ")
        .trim()
        .to_string();
    if transcript.is_empty() {
        return Err("whisper.cpp produced an empty transcript".to_string());
    }
    let language = parsed
        .pointer("/result/language")
        .and_then(Value::as_str)
        .map(str::to_string)
        .or(requested_language);
    let stem = source_audio_path
        .file_stem()
        .and_then(|value| value.to_str())
        .unwrap_or("Audio");
    Ok(TranscriptionResult {
        title: format!("Transcript - {}", stem.replace(['-', '_'], " ")),
        audio_path: source_audio_path.to_string_lossy().to_string(),
        provider: provider.to_string(),
        language,
        transcript,
        segments,
    })
}

pub fn try_transcribe_with_whisper_cpp(
    audio_path: &Path,
    provider: &str,
    language: Option<String>,
    explicit_model: Option<&str>,
) -> Result<Option<TranscriptionResult>, String> {
    let Some(runtime) = resolve_whisper_cpp(explicit_model)? else {
        return Ok(None);
    };
    let output_dir = tempfile::tempdir()
        .map_err(|error| format!("Failed to create whisper.cpp workspace: {error}"))?;
    let cli_audio_path = whisper_cpp_audio_path(audio_path, output_dir.path())?;
    let output_prefix = output_dir.path().join("transcript");
    let mut command = crate::hidden_command(runtime.cli_path);
    command
        .arg("-m")
        .arg(runtime.model_path)
        .arg("-f")
        .arg(&cli_audio_path)
        .arg("-oj")
        .arg("-of")
        .arg(&output_prefix)
        .arg("-np")
        .arg("-l")
        .arg(
            language
                .as_deref()
                .filter(|value| !value.trim().is_empty())
                .unwrap_or("auto"),
        );
    let output = command
        .output()
        .map_err(|error| format!("Failed to run whisper.cpp: {error}"))?;
    if !output.status.success() {
        return Err(command_error(&output));
    }
    let json = fs::read_to_string(output_prefix.with_extension("json"))
        .map_err(|error| format!("Failed to read whisper.cpp JSON transcript: {error}"))?;
    parse_whisper_cpp_json(&json, audio_path, provider, language).map(Some)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parses_whisper_cpp_segments() {
        let json = r#"{
          "result": { "language": "en" },
          "transcription": [
            { "timestamps": { "from": "00:00:00.000", "to": "00:00:01.500" }, "text": " Hello " },
            { "offsets": { "from": 1500, "to": 3000 }, "text": "Grimoire." }
          ]
        }"#;
        let result = parse_whisper_cpp_json(
            json,
            Path::new("/tmp/voice-note.wav"),
            "local_whisper",
            None,
        )
        .unwrap();
        assert_eq!(result.title, "Transcript - voice note");
        assert_eq!(result.language.as_deref(), Some("en"));
        assert_eq!(result.transcript, "Hello Grimoire.");
        assert_eq!(result.segments[1].start_seconds, 1.5);
    }
}
