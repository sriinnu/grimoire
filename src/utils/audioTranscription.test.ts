import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { VaultEntry } from '../types'
import {
  buildTranscriptNote,
  buildTranscriptionNoteBundle,
  transcribeAudioPathIntoNotes,
} from './audioTranscription'

const mockInvoke = vi.hoisted(() => vi.fn(async (_command: string, args?: Record<string, unknown>) => ({
  title: 'Transcript - recorded voice note',
  audioPath: String(args?.audioPath ?? ''),
  provider: args?.provider ?? 'local_whisper',
  language: 'en',
  transcript: 'Recorded inside Grimoire. Keep it local.',
  segments: [],
})))

vi.mock('../mock-tauri', () => ({
  addMockEntry: vi.fn(),
  isTauri: () => false,
  mockInvoke,
}))

function entry(path: string): VaultEntry {
  return {
    path,
    filename: path.split('/').pop() ?? 'note.md',
    title: 'Existing',
    isA: 'Transcript',
    aliases: [],
    belongsTo: [],
    relatedTo: [],
    status: null,
    archived: false,
    modifiedAt: 0,
    createdAt: 0,
    fileSize: 0,
    snippet: '',
    wordCount: 0,
    relationships: {},
    icon: null,
    color: null,
    order: null,
    outgoingLinks: [],
    sidebarLabel: null,
    template: null,
    sort: null,
    view: null,
    visible: null,
    properties: {},
    organized: false,
    favorite: false,
    favoriteIndex: null,
    listPropertiesDisplay: [],
    hasH1: false,
  }
}

describe('audioTranscription', () => {
  beforeEach(() => {
    mockInvoke.mockClear()
  })

  it('creates a unique transcript note from native transcription output', () => {
    const note = buildTranscriptNote({
      vaultPath: '/vault',
      entries: [entry('/vault/transcript-team-sync.md')],
      result: {
        title: 'Transcript - Team Sync',
        audioPath: '/audio/team-sync.m4a',
        provider: 'local_whisper',
        language: 'en',
        transcript: 'Fallback transcript',
        segments: [{ startSeconds: 0, endSeconds: 8, text: 'Ship the transcript flow.' }],
      },
    })

    expect(note.entry.path).toBe('/vault/transcript-team-sync-2.md')
    expect(note.entry.isA).toBe('Transcript')
    expect(note.entry.properties.locality).toBe('local')
    expect(note.content).toContain('transcription_provider: local_whisper')
    expect(note.content).toContain('locality: local')
    expect(note.content).toContain('source_audio: "/audio/team-sync.m4a"')
    expect(note.content).toContain('- 0:00-0:08 Ship the transcript flow.')
  })

  it('creates a sibling clean note beside the raw transcript', () => {
    const bundle = buildTranscriptionNoteBundle({
      vaultPath: '/vault',
      entries: [entry('/vault/clean-note-team-sync.md')],
      result: {
        title: 'Transcript - Team Sync',
        audioPath: '/audio/team-sync.m4a',
        provider: 'local_whisper',
        language: 'en',
        transcript: 'We should ship the editor package first. Then wire the local transcription flow.',
      },
    })

    expect(bundle.transcript.entry.path).toBe('/vault/transcript-team-sync.md')
    expect(bundle.cleaned.entry.path).toBe('/vault/clean-note-team-sync-2.md')
    expect(bundle.cleaned.entry.isA).toBe('Note')
    expect(bundle.transcript.entry.relationships['Clean note']).toEqual(['[[Clean Note - Team Sync]]'])
    expect(bundle.cleaned.entry.relationships.Source).toEqual(['[[Transcript - Team Sync]]'])
    expect(bundle.transcript.content).toContain('Clean note: [[Clean Note - Team Sync]]')
    expect(bundle.transcript.content).toContain('clean_note: "[[Clean Note - Team Sync]]"')
    expect(bundle.cleaned.content).toContain('source: "[[Transcript - Team Sync]]"')
    expect(bundle.cleaned.content).toContain('Related to:\n  - "[[Transcript - Team Sync]]"')
    expect(bundle.cleaned.content).toContain('## Action Items')
  })

  it('builds transcript notes from an app-recorded local-only audio path', async () => {
    const bundle = await transcribeAudioPathIntoNotes(
      '/vault/Private/attachments/recordings/voice-note.webm',
      { vaultPath: '/vault', entries: [] },
    )

    expect(bundle.transcript.entry.path).toBe('/vault/transcript-recorded-voice-note.md')
    expect(bundle.transcript.content).toContain(
      'source_audio: "/vault/Private/attachments/recordings/voice-note.webm"',
    )
    expect(bundle.cleaned.content).toContain('Audio: [/vault/Private/attachments/recordings/voice-note.webm]')
    expect(mockInvoke).toHaveBeenCalledWith('transcribe_audio', expect.objectContaining({
      provider: 'local_whisper',
      allowCloud: false,
    }))
  })

  it('falls back to local transcription when cloud Whisper lacks opt-in', async () => {
    await transcribeAudioPathIntoNotes('/vault/voice-note.m4a', {
      vaultPath: '/vault',
      entries: [],
      transcriptionPreference: {
        provider: 'whisper_api',
        cloudTranscriptionEnabled: false,
      },
    })

    expect(mockInvoke).toHaveBeenCalledWith('transcribe_audio', expect.objectContaining({
      provider: 'local_whisper',
      allowCloud: false,
    }))
  })

  it('passes cloud transcription only with explicit opt-in', async () => {
    await transcribeAudioPathIntoNotes('/vault/voice-note.m4a', {
      vaultPath: '/vault',
      entries: [],
      transcriptionPreference: {
        provider: 'whisper_api',
        cloudTranscriptionEnabled: true,
      },
    })

    expect(mockInvoke).toHaveBeenCalledWith('transcribe_audio', expect.objectContaining({
      provider: 'whisper_api',
      allowCloud: true,
    }))
  })
})
