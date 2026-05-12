import { useCallback } from 'react'
import type { VaultEntry } from '../types'
import { createTranscriptNote, transcribeAudioIntoNote } from '../utils/audioTranscription'

interface UseAudioTranscriptionParams {
  vaultPath: string
  entries: VaultEntry[]
  addEntry: (entry: VaultEntry) => void
  openTabWithContent: (entry: VaultEntry, content: string) => void
  loadModifiedFiles: () => Promise<void>
  setToastMessage: (message: string | null) => void
}

function isCancelledTranscription(error: unknown): boolean {
  return error instanceof Error && error.message === 'cancelled'
}

function errorMessage(error: unknown): string {
  return typeof error === 'string'
    ? error
    : error instanceof Error
      ? error.message
      : 'Failed to transcribe audio'
}

/** Provides the command-palette flow for creating Markdown transcript notes from audio. */
export function useAudioTranscription({
  vaultPath,
  entries,
  addEntry,
  openTabWithContent,
  loadModifiedFiles,
  setToastMessage,
}: UseAudioTranscriptionParams): () => Promise<void> {
  return useCallback(async () => {
    if (!vaultPath.trim()) {
      setToastMessage('Open a vault before transcribing audio')
      return
    }

    setToastMessage('Choose an audio file to transcribe')
    try {
      const note = await transcribeAudioIntoNote({ vaultPath, entries })
      setToastMessage('Transcribing audio with Local Whisper...')
      await createTranscriptNote(note, addEntry, openTabWithContent)
      await loadModifiedFiles()
      setToastMessage(`Transcript created: ${note.entry.title}`)
    } catch (error) {
      if (!isCancelledTranscription(error)) setToastMessage(errorMessage(error))
    }
  }, [addEntry, entries, loadModifiedFiles, openTabWithContent, setToastMessage, vaultPath])
}
