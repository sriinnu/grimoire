import { invoke } from '../lib/tauriRuntime'
import { isTauri, mockInvoke } from '../mock-tauri'

export const RECORDING_MIME_TYPES = [
  'audio/webm;codecs=opus',
  'audio/webm',
  'audio/mp4',
  'audio/mpeg',
  'audio/wav',
] as const

const MIME_EXTENSION: Record<string, string> = {
  'audio/mp4': 'm4a',
  'audio/mpeg': 'mp3',
  'audio/wav': 'wav',
  'audio/webm': 'webm',
}

interface SaveVoiceRecordingParams {
  vaultPath: string
  blob: Blob
  filename: string
}

type MediaRecorderSupport = Pick<typeof MediaRecorder, 'isTypeSupported'>

/** Picks the first browser recording MIME type supported by the current runtime. */
export function pickSupportedRecordingMimeType(
  recorder: MediaRecorderSupport | undefined = globalThis.MediaRecorder,
): string {
  if (!recorder?.isTypeSupported) return ''
  return RECORDING_MIME_TYPES.find((mimeType) => recorder.isTypeSupported(mimeType)) ?? ''
}

/** Maps a recording MIME type to the extension Grimoire can save and transcribe. */
export function recordingExtension(mimeType: string): string {
  const baseType = mimeType.split(';')[0]?.trim().toLowerCase() ?? ''
  return MIME_EXTENSION[baseType] ?? 'webm'
}

/** Creates a stable local voice-note filename from a timestamp and audio extension. */
export function buildVoiceRecordingFilename(now = new Date(), extension = 'webm'): string {
  const safeExtension = extension.replace(/^\.+/u, '').replace(/[^a-z0-9]/giu, '').toLowerCase() || 'webm'
  const stamp = now.toISOString().slice(0, 19).replace('T', '-').replace(/:/gu, '')
  return `voice-note-${stamp}.${safeExtension}`
}

/** Converts a recorded audio blob to the raw base64 payload expected by Tauri. */
export async function recordingBlobToBase64(blob: Blob): Promise<string> {
  const bytes = new Uint8Array(await blobToArrayBuffer(blob))
  let binary = ''
  const chunkSize = 0x8000
  for (let index = 0; index < bytes.length; index += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(index, index + chunkSize))
  }
  return btoa(binary)
}

function blobToArrayBuffer(blob: Blob): Promise<ArrayBuffer> {
  if (typeof blob.arrayBuffer === 'function') return blob.arrayBuffer()

  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as ArrayBuffer)
    reader.onerror = () => reject(reader.error)
    reader.readAsArrayBuffer(blob)
  })
}

/** Persists an app-recorded voice note in the vault's local-only recording lane. */
export async function saveVoiceRecordingToVault(params: SaveVoiceRecordingParams): Promise<string> {
  const data = await recordingBlobToBase64(params.blob)
  const args = {
    vaultPath: params.vaultPath,
    filename: params.filename,
    data,
  }
  return isTauri()
    ? invoke<string>('save_audio_recording', args)
    : mockInvoke<string>('save_audio_recording', args)
}
