use crate::transcription::TranscriptionResult;

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
