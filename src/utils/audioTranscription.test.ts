import { describe, expect, it } from 'vitest'
import type { VaultEntry } from '../types'
import { buildTranscriptNote } from './audioTranscription'

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
    expect(note.content).toContain('transcription_provider: local_whisper')
    expect(note.content).toContain('- 0:00-0:08 Ship the transcript flow.')
  })
})
