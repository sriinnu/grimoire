import { invoke } from '@tauri-apps/api/core'
import { addMockEntry, isTauri, mockInvoke } from '../mock-tauri'
import { DEFAULT_TRANSCRIPTION_PROVIDER, buildTranscriptMarkdown, type TranscriptMarkdownInput, type TranscriptionProviderId } from '../lib/transcriptionProviders'
import type { VaultEntry } from '../types'
import { buildNewEntry, slugify } from '../hooks/useNoteCreation'

const AUDIO_EXTENSIONS = ['aac', 'flac', 'm4a', 'mp3', 'mp4', 'ogg', 'opus', 'wav', 'webm']

/** Transcription payload returned by the native audio provider command. */
export interface NativeTranscriptionResult {
  title: string
  audioPath: string
  provider: TranscriptionProviderId
  language?: string | null
  transcript: string
  segments?: TranscriptMarkdownInput['segments']
}

/** Resolved Markdown note generated from a native audio transcription result. */
export interface TranscriptNote {
  entry: VaultEntry
  content: string
}

interface TranscriptNoteParams {
  vaultPath: string
  entries: VaultEntry[]
  result: NativeTranscriptionResult
}

interface TranscriptionFlowParams {
  vaultPath: string
  entries: VaultEntry[]
}

function audioDialogFilters() {
  return [{ name: 'Audio', extensions: AUDIO_EXTENSIONS }]
}

function normalizePickedAudioPath(selected: unknown): string | null {
  if (typeof selected !== 'string') return null
  const path = selected.trim()
  return path.length > 0 ? path : null
}

/** Opens an audio picker for transcript creation. */
export async function pickAudioForTranscription(): Promise<string | null> {
  if (isTauri()) {
    const { open } = await import('@tauri-apps/plugin-dialog')
    return normalizePickedAudioPath(await open({
      directory: false,
      multiple: false,
      title: 'Choose audio to transcribe',
      filters: audioDialogFilters(),
    }))
  }

  return normalizePickedAudioPath(prompt('Audio file path to transcribe:'))
}

async function requestNativeTranscription(audioPath: string): Promise<NativeTranscriptionResult> {
  const args = { audioPath, provider: DEFAULT_TRANSCRIPTION_PROVIDER }
  return isTauri()
    ? invoke<NativeTranscriptionResult>('transcribe_audio', args)
    : mockInvoke<NativeTranscriptionResult>('transcribe_audio', args)
}

function normalizeVaultRoot(vaultPath: string): string {
  return vaultPath.replace(/\/+$/, '')
}

function existingPaths(entries: VaultEntry[]): Set<string> {
  return new Set(entries.map((entry) => entry.path.replace(/\\/g, '/').toLocaleLowerCase()))
}

function uniqueTranscriptSlug(title: string, entries: VaultEntry[], vaultPath: string): string {
  const root = normalizeVaultRoot(vaultPath)
  const paths = existingPaths(entries)
  const base = slugify(title) || 'transcript'
  let candidate = base
  let suffix = 2
  while (paths.has(`${root}/${candidate}.md`.toLocaleLowerCase())) {
    candidate = `${base}-${suffix}`
    suffix += 1
  }
  return candidate
}

/** Converts a native transcription result into a vault note entry and Markdown body. */
export function buildTranscriptNote({ vaultPath, entries, result }: TranscriptNoteParams): TranscriptNote {
  const title = result.title.trim() || 'Transcript'
  const slug = uniqueTranscriptSlug(title, entries, vaultPath)
  const root = normalizeVaultRoot(vaultPath)
  const entry = buildNewEntry({
    path: `${root}/${slug}.md`,
    slug,
    title,
    type: 'Transcript',
    status: null,
  })
  const content = buildTranscriptMarkdown({
    title,
    audioPath: result.audioPath,
    provider: result.provider,
    language: result.language,
    transcript: result.transcript,
    segments: result.segments,
  })
  return { entry, content }
}

/** Persists a transcript note and opens it in the editor. */
export async function createTranscriptNote(
  note: TranscriptNote,
  addEntry: (entry: VaultEntry) => void,
  openTabWithContent: (entry: VaultEntry, content: string) => void,
): Promise<void> {
  if (isTauri()) {
    await invoke<void>('create_note_content', { path: note.entry.path, content: note.content })
  } else {
    addMockEntry(note.entry, note.content)
  }
  addEntry(note.entry)
  openTabWithContent(note.entry, note.content)
}

/** Runs the full local-first audio transcription flow for the active vault. */
export async function transcribeAudioIntoNote(params: TranscriptionFlowParams): Promise<TranscriptNote> {
  const audioPath = await pickAudioForTranscription()
  if (!audioPath) throw new Error('cancelled')
  const result = await requestNativeTranscription(audioPath)
  return buildTranscriptNote({ ...params, result })
}
