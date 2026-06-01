use crate::transcription::{TranscriptionReadiness, TranscriptionResult};

#[tauri::command]
pub fn transcribe_audio(
    audio_path: String,
    provider: Option<String>,
    language: Option<String>,
    model: Option<String>,
    allow_cloud: Option<bool>,
) -> Result<TranscriptionResult, String> {
    crate::transcription::transcribe_audio(audio_path, provider, language, model, allow_cloud)
}

#[tauri::command]
pub fn get_transcription_readiness(
    provider: Option<String>,
    model: Option<String>,
    allow_cloud: Option<bool>,
) -> Result<TranscriptionReadiness, String> {
    crate::transcription::get_transcription_readiness(provider, model, allow_cloud)
}
