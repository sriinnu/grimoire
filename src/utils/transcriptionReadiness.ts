import { invoke } from '../lib/tauriRuntime'
import { isTauri, mockInvoke } from '../mock-tauri'
import {
  createTranscriptionRequestConfig,
  type TranscriptionProviderPreference,
} from '../lib/transcriptionProviderConfig'

export interface TranscriptionReadiness {
  provider: string
  ready: boolean
  status: 'ready' | 'missing_cli' | 'missing_model' | 'cloud_blocked' | 'api_pending' | string
  message: string
  cliPath?: string | null
  modelPath?: string | null
  recommendedModelPath?: string | null
  downloadUrl?: string | null
  installHint: string
}

/** Checks whether the selected speech-to-text backend can run on this machine. */
export async function getTranscriptionReadiness(
  preference: TranscriptionProviderPreference = {},
): Promise<TranscriptionReadiness> {
  const args = { ...createTranscriptionRequestConfig(preference) }
  return isTauri()
    ? invoke<TranscriptionReadiness>('get_transcription_readiness', args)
    : mockInvoke<TranscriptionReadiness>('get_transcription_readiness', args)
}
