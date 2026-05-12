import { describe, expect, it } from 'vitest'
import {
  DEFAULT_TRANSCRIPTION_PROVIDER,
  TRANSCRIPTION_PROVIDERS,
  buildTranscriptMarkdown,
  normalizeTranscriptionProvider,
  resolveTranscriptionProvider,
} from './transcriptionProviders'

describe('transcriptionProviders', () => {
  it('defaults to a local-first transcription provider', () => {
    expect(DEFAULT_TRANSCRIPTION_PROVIDER).toBe('local_whisper')
    expect(TRANSCRIPTION_PROVIDERS.find((provider) => provider.id === 'local_whisper')).toMatchObject({
      localFirst: true,
      requiresApiKey: false,
      supportsTimestamps: true,
    })
  })

  it('normalizes provider identifiers from untrusted input', () => {
    expect(normalizeTranscriptionProvider('whisper_api')).toBe('whisper_api')
    expect(normalizeTranscriptionProvider('random')).toBeNull()
    expect(resolveTranscriptionProvider('random')).toBe('local_whisper')
  })

  it('builds timestamped transcript Markdown beside the source audio', () => {
    expect(buildTranscriptMarkdown({
      title: 'Team sync',
      audioPath: 'attachments/team-sync.m4a',
      provider: 'local_whisper',
      language: 'en',
      transcript: 'Fallback text',
      segments: [
        { startSeconds: 0, endSeconds: 12, text: 'We should ship the editor package first.' },
        { startSeconds: 75, endSeconds: 91, text: 'Then wire the local transcription flow.' },
      ],
    })).toContain('- 0:00-0:12 We should ship the editor package first.')
  })
})
