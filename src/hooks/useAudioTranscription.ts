import { useCallback, useMemo } from 'react'
import type { VaultEntry } from '../types'
import { getTranscriptionReadiness } from '../utils/transcriptionReadiness'
import {
  getTranscriptionProviderDefinition,
  resolveConfiguredTranscriptionProvider,
  type TranscriptionProviderId,
} from '../lib/transcriptionProviderConfig'

interface UseAudioTranscriptionParams {
  vaultPath: string
  entries: VaultEntry[]
  transcriptionProvider?: TranscriptionProviderId | null
  cloudTranscriptionEnabled?: boolean | null
  addEntry: (entry: VaultEntry) => void
  openTabWithContent: (entry: VaultEntry, content: string) => void
  loadModifiedFiles: () => Promise<void>
  setToastMessage: (message: string | null) => void
}

interface AudioTranscriptionActions {
  transcribePickedAudio: () => Promise<void>
  transcribeRecordedAudio: (audioPath: string) => Promise<void>
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

function readinessMessage(message: string, hint: string): string {
  return hint.trim() ? `${message} ${hint}` : message
}

async function loadAudioTranscriptionFlow() {
  return import('../utils/audioTranscription')
}

/** Provides local-first flows for creating Markdown transcript notes from audio. */
export function useAudioTranscription({
  vaultPath,
  entries,
  transcriptionProvider,
  cloudTranscriptionEnabled,
  addEntry,
  openTabWithContent,
  loadModifiedFiles,
  setToastMessage,
}: UseAudioTranscriptionParams): AudioTranscriptionActions {
  const resolvedProvider = resolveConfiguredTranscriptionProvider({
    provider: transcriptionProvider,
    cloudTranscriptionEnabled,
  })
  const providerLabel = getTranscriptionProviderDefinition(resolvedProvider).label
  const transcriptionPreference = useMemo(() => ({
    provider: transcriptionProvider,
    cloudTranscriptionEnabled,
  }), [cloudTranscriptionEnabled, transcriptionProvider])

  const transcribePickedAudio = useCallback(async () => {
    if (!vaultPath.trim()) {
      setToastMessage('Open a vault before transcribing audio')
      return
    }

    setToastMessage('Choose an audio file to transcribe')
    try {
      const readiness = await getTranscriptionReadiness(transcriptionPreference)
      if (!readiness.ready) {
        setToastMessage(readinessMessage(readiness.message, readiness.installHint))
        return
      }
      const { createTranscriptionNotes, transcribeAudioIntoNotes } = await loadAudioTranscriptionFlow()
      const bundle = await transcribeAudioIntoNotes({
        vaultPath,
        entries,
        transcriptionPreference,
      })
      setToastMessage(`Transcribing audio with ${providerLabel}...`)
      await createTranscriptionNotes(bundle, addEntry, openTabWithContent)
      await loadModifiedFiles()
      setToastMessage(`Transcript and clean note created: ${bundle.cleaned.entry.title}`)
    } catch (error) {
      if (!isCancelledTranscription(error)) setToastMessage(errorMessage(error))
    }
  }, [
    addEntry,
    entries,
    loadModifiedFiles,
    openTabWithContent,
    providerLabel,
    setToastMessage,
    transcriptionPreference,
    vaultPath,
  ])

  const transcribeRecordedAudio = useCallback(async (audioPath: string) => {
    if (!vaultPath.trim()) {
      setToastMessage('Open a vault before transcribing audio')
      return
    }

    try {
      setToastMessage(`Transcribing recorded audio with ${providerLabel}...`)
      const readiness = await getTranscriptionReadiness(transcriptionPreference)
      if (!readiness.ready) {
        setToastMessage(readinessMessage(readiness.message, readiness.installHint))
        return
      }
      const { createTranscriptionNotes, transcribeAudioPathIntoNotes } = await loadAudioTranscriptionFlow()
      const bundle = await transcribeAudioPathIntoNotes(audioPath, {
        vaultPath,
        entries,
        transcriptionPreference,
      })
      await createTranscriptionNotes(bundle, addEntry, openTabWithContent)
      await loadModifiedFiles()
      setToastMessage(`Recorded transcript created: ${bundle.cleaned.entry.title}`)
    } catch (error) {
      if (!isCancelledTranscription(error)) setToastMessage(errorMessage(error))
    }
  }, [
    addEntry,
    entries,
    loadModifiedFiles,
    openTabWithContent,
    providerLabel,
    setToastMessage,
    transcriptionPreference,
    vaultPath,
  ])

  return { transcribePickedAudio, transcribeRecordedAudio }
}
