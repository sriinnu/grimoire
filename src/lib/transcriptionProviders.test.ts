import { describe, expect, it } from 'vitest'
import {
  DEFAULT_TRANSCRIPTION_PROVIDER,
  TRANSCRIPTION_PROVIDERS,
  buildCleanTranscriptMarkdown,
  buildTranscriptMarkdown,
  createTranscriptionRequestConfig,
  isCloudTranscriptionProvider,
  normalizeTranscriptionProvider,
  resolveConfiguredTranscriptionProvider,
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

  it('keeps cloud transcription behind an explicit opt-in', () => {
    expect(isCloudTranscriptionProvider('whisper_api')).toBe(true)
    expect(isCloudTranscriptionProvider('local_whisper')).toBe(false)
    expect(resolveConfiguredTranscriptionProvider({
      provider: 'whisper_api',
      cloudTranscriptionEnabled: false,
    })).toBe('local_whisper')
    expect(createTranscriptionRequestConfig({
      provider: 'whisper_api',
      cloudTranscriptionEnabled: true,
    })).toEqual({ provider: 'whisper_api', allowCloud: true })
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

  it('builds a local cleaned note with summary and actions beside the transcript', () => {
    const markdown = buildCleanTranscriptMarkdown({
      title: 'Clean Note - Team sync',
      transcriptTitle: 'Transcript - Team sync',
      audioPath: 'attachments/team-sync.m4a',
      provider: 'local_whisper',
      language: 'en',
      transcript: 'Fallback text',
      segments: [
        { startSeconds: 0, endSeconds: 12, text: 'We should ship the editor package first.' },
        { startSeconds: 75, endSeconds: 91, text: 'Then wire the local transcription flow.' },
      ],
    })

    expect(markdown).toContain('locality: local')
    expect(markdown).toContain('Source transcript: [[Transcript - Team sync]]')
    expect(markdown).toContain('- We should ship the editor package first.')
    expect(markdown).toContain('- [ ] Then wire the local transcription flow.')
  })
})
