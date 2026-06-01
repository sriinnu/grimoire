import { invoke } from '../lib/tauriRuntime'
import { addMockEntry, isTauri, mockInvoke } from '../mock-tauri'
import {
  buildCleanTranscriptMarkdown,
  buildTranscriptMarkdown,
  type TranscriptMarkdownInput,
} from '../lib/transcriptionProviders'
import {
  createTranscriptionRequestConfig,
  type TranscriptionProviderId,
  type TranscriptionProviderPreference,
} from '../lib/transcriptionProviderConfig'
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

/** Raw transcript plus local cleaned note generated from the same audio. */
export interface TranscriptionNoteBundle {
  transcript: TranscriptNote
  cleaned: TranscriptNote
}

interface TranscriptNoteParams {
  vaultPath: string
  entries: VaultEntry[]
  result: NativeTranscriptionResult
}

interface TranscriptionFlowParams {
  vaultPath: string
  entries: VaultEntry[]
  transcriptionPreference?: TranscriptionProviderPreference
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

async function requestNativeTranscription(
  audioPath: string,
  preference?: TranscriptionProviderPreference,
): Promise<NativeTranscriptionResult> {
  const args = { audioPath, ...createTranscriptionRequestConfig(preference) }
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

function uniqueNoteSlug(title: string, entries: VaultEntry[], vaultPath: string): string {
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

function wikilinkRef(title: string): string {
  return `[[${title}]]`
}

function yamlDoubleQuoted(value: string): string {
  return `"${value.replace(/\\/gu, '\\\\').replace(/"/gu, '\\"')}"`
}

function withTranscriptionProperties(
  entry: VaultEntry,
  result: NativeTranscriptionResult,
): VaultEntry {
  return {
    ...entry,
    properties: {
      ...entry.properties,
      locality: 'local',
      source_audio: result.audioPath,
      transcription_provider: result.provider,
    },
  }
}

/** Converts a native transcription result into a vault note entry and Markdown body. */
export function buildTranscriptNote({ vaultPath, entries, result }: TranscriptNoteParams): TranscriptNote {
  const title = result.title.trim() || 'Transcript'
  const slug = uniqueNoteSlug(title, entries, vaultPath)
  const root = normalizeVaultRoot(vaultPath)
  const entry = withTranscriptionProperties(buildNewEntry({
    path: `${root}/${slug}.md`,
    slug,
    title,
    type: 'Transcript',
    status: null,
  }), result)
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

function buildCleanedTranscriptNote(
  params: TranscriptNoteParams,
  transcriptNote: TranscriptNote,
): TranscriptNote {
  const title = `Clean Note - ${params.result.title.replace(/^Transcript\s*-\s*/i, '').trim() || 'Transcript'}`
  const entriesWithTranscript = [...params.entries, transcriptNote.entry]
  const slug = uniqueNoteSlug(title, entriesWithTranscript, params.vaultPath)
  const root = normalizeVaultRoot(params.vaultPath)
  const entry = withTranscriptionProperties(buildNewEntry({
    path: `${root}/${slug}.md`,
    slug,
    title,
    type: 'Note',
    status: null,
  }), params.result)
  const content = buildCleanTranscriptMarkdown({
    title,
    transcriptTitle: transcriptNote.entry.title,
    audioPath: params.result.audioPath,
    provider: params.result.provider,
    language: params.result.language,
    transcript: params.result.transcript,
    segments: params.result.segments,
  })
  return { entry, content }
}

function linkTranscriptBundle(bundle: TranscriptionNoteBundle): TranscriptionNoteBundle {
  const cleanRef = wikilinkRef(bundle.cleaned.entry.title)
  const transcriptRef = wikilinkRef(bundle.transcript.entry.title)

  return {
    transcript: {
      ...bundle.transcript,
      entry: {
        ...bundle.transcript.entry,
        relatedTo: [cleanRef],
        relationships: {
          ...bundle.transcript.entry.relationships,
          'Clean note': [cleanRef],
          'Related to': [cleanRef],
        },
        outgoingLinks: [...new Set([...bundle.transcript.entry.outgoingLinks, bundle.cleaned.entry.title])],
      },
      content: addCleanNoteBacklink(addCleanNoteFrontmatterLink(bundle.transcript.content, cleanRef), bundle.cleaned.entry.title),
    },
    cleaned: {
      ...bundle.cleaned,
      entry: {
        ...bundle.cleaned.entry,
        relatedTo: [transcriptRef],
        relationships: {
          ...bundle.cleaned.entry.relationships,
          Source: [transcriptRef],
          'Related to': [transcriptRef],
        },
        outgoingLinks: [...new Set([...bundle.cleaned.entry.outgoingLinks, bundle.transcript.entry.title])],
      },
    },
  }
}

/** Converts a native transcription result into raw and cleaned Markdown notes. */
export function buildTranscriptionNoteBundle(params: TranscriptNoteParams): TranscriptionNoteBundle {
  const transcript = buildTranscriptNote(params)
  const cleaned = buildCleanedTranscriptNote(params, transcript)
  return linkTranscriptBundle({ transcript, cleaned })
}

function addCleanNoteFrontmatterLink(content: string, cleanNoteRef: string): string {
  const quotedRef = yamlDoubleQuoted(cleanNoteRef)
  return content.replace('\n---\n\n#', `\nclean_note: ${quotedRef}\nClean note:\n  - ${quotedRef}\nRelated to:\n  - ${quotedRef}\n---\n\n#`)
}

function addCleanNoteBacklink(content: string, cleanNoteTitle: string): string {
  return content.replace('\n## Transcript\n', `\nClean note: [[${cleanNoteTitle}]]\n\n## Transcript\n`)
}

/** Persists a transcript note and opens it in the editor. */
export async function createTranscriptNote(
  note: TranscriptNote,
  addEntry: (entry: VaultEntry) => void,
  openTabWithContent: (entry: VaultEntry, content: string) => void,
): Promise<void> {
  await persistTranscriptNote(note, addEntry)
  openTabWithContent(note.entry, note.content)
}

/** Persists raw transcript and cleaned note, then opens the cleaned note. */
export async function createTranscriptionNotes(
  bundle: TranscriptionNoteBundle,
  addEntry: (entry: VaultEntry) => void,
  openTabWithContent: (entry: VaultEntry, content: string) => void,
): Promise<void> {
  await persistTranscriptNote(bundle.transcript, addEntry)
  await persistTranscriptNote(bundle.cleaned, addEntry)
  openTabWithContent(bundle.cleaned.entry, bundle.cleaned.content)
}

async function persistTranscriptNote(
  note: TranscriptNote,
  addEntry: (entry: VaultEntry) => void,
): Promise<void> {
  if (isTauri()) {
    await invoke<void>('create_note_content', { path: note.entry.path, content: note.content })
  } else {
    addMockEntry(note.entry, note.content)
  }
  addEntry(note.entry)
}

/** Runs the full local-first audio transcription flow for the active vault. */
export async function transcribeAudioIntoNote(params: TranscriptionFlowParams): Promise<TranscriptNote> {
  const audioPath = await pickAudioForTranscription()
  if (!audioPath) throw new Error('cancelled')
  const result = await requestNativeTranscription(audioPath, params.transcriptionPreference)
  return buildTranscriptNote({ ...params, result })
}

/** Runs transcription and builds both raw transcript and local cleaned note. */
export async function transcribeAudioPathIntoNotes(
  audioPath: string,
  params: TranscriptionFlowParams,
): Promise<TranscriptionNoteBundle> {
  const result = await requestNativeTranscription(audioPath, params.transcriptionPreference)
  return buildTranscriptionNoteBundle({ ...params, result })
}

/** Runs transcription and builds both raw transcript and local cleaned note from a picked file. */
export async function transcribeAudioIntoNotes(
  params: TranscriptionFlowParams,
): Promise<TranscriptionNoteBundle> {
  const audioPath = await pickAudioForTranscription()
  if (!audioPath) throw new Error('cancelled')
  return transcribeAudioPathIntoNotes(audioPath, params)
}
