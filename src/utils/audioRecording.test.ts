import { describe, expect, it } from 'vitest'
import {
  buildVoiceRecordingFilename,
  pickSupportedRecordingMimeType,
  recordingBlobToBase64,
  recordingExtension,
} from './audioRecording'

describe('audioRecording', () => {
  it('picks the first supported recorder MIME type', () => {
    const recorder = {
      isTypeSupported: (mimeType: string) => mimeType === 'audio/webm',
    }

    expect(pickSupportedRecordingMimeType(recorder)).toBe('audio/webm')
  })

  it('falls back when MediaRecorder support is missing', () => {
    expect(pickSupportedRecordingMimeType(undefined)).toBe('')
  })

  it('maps MIME types to transcribable file extensions', () => {
    expect(recordingExtension('audio/webm;codecs=opus')).toBe('webm')
    expect(recordingExtension('audio/mp4')).toBe('m4a')
    expect(recordingExtension('audio/mpeg')).toBe('mp3')
    expect(recordingExtension('audio/unknown')).toBe('webm')
  })

  it('builds stable voice recording filenames', () => {
    expect(buildVoiceRecordingFilename(new Date('2026-05-23T04:05:06.000Z'), '.WEBM'))
      .toBe('voice-note-2026-05-23-040506.webm')
  })

  it('converts recorded blobs to raw base64', async () => {
    await expect(recordingBlobToBase64(new Blob(['hello']))).resolves.toBe('aGVsbG8=')
  })
})
