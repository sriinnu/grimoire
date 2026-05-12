/** Supported speech-to-text backends for turning audio attachments into notes. */
export type TranscriptionProviderId = 'local_whisper' | 'whisper_api' | 'local_voice_model'

/** Static provider metadata used by settings, import flows, and native commands. */
export interface TranscriptionProviderDefinition {
  id: TranscriptionProviderId
  label: string
  localFirst: boolean
  requiresApiKey: boolean
  supportsTimestamps: boolean
}

/** One timestamped slice of a transcript returned by a provider. */
export interface TranscriptSegment {
  startSeconds: number
  endSeconds: number
  text: string
}

/** Data needed to persist a transcript as a Markdown note beside source audio. */
export interface TranscriptMarkdownInput {
  title: string
  audioPath: string
  provider: TranscriptionProviderId
  language?: string | null
  transcript: string
  segments?: TranscriptSegment[]
}

/** Local-first default so voice notes work without cloud configuration. */
export const DEFAULT_TRANSCRIPTION_PROVIDER: TranscriptionProviderId = 'local_whisper'

/** Provider registry for the upcoming audio attachment transcription flow. */
export const TRANSCRIPTION_PROVIDERS: readonly TranscriptionProviderDefinition[] = [
  {
    id: 'local_whisper',
    label: 'Local Whisper',
    localFirst: true,
    requiresApiKey: false,
    supportsTimestamps: true,
  },
  {
    id: 'whisper_api',
    label: 'Whisper API',
    localFirst: false,
    requiresApiKey: true,
    supportsTimestamps: true,
  },
  {
    id: 'local_voice_model',
    label: 'Local voice model',
    localFirst: true,
    requiresApiKey: false,
    supportsTimestamps: false,
  },
]

const PROVIDER_IDS = new Set(TRANSCRIPTION_PROVIDERS.map((provider) => provider.id))

/** Returns a supported transcription provider ID or null for untrusted values. */
export function normalizeTranscriptionProvider(value: unknown): TranscriptionProviderId | null {
  return typeof value === 'string' && PROVIDER_IDS.has(value as TranscriptionProviderId)
    ? value as TranscriptionProviderId
    : null
}

/** Resolves unknown provider input to the local-first default. */
export function resolveTranscriptionProvider(value: unknown): TranscriptionProviderId {
  return normalizeTranscriptionProvider(value) ?? DEFAULT_TRANSCRIPTION_PROVIDER
}

function formatTimestamp(totalSeconds: number): string {
  const safeSeconds = Math.max(0, Math.floor(totalSeconds))
  const minutes = Math.floor(safeSeconds / 60)
  const seconds = safeSeconds % 60
  return `${minutes}:${seconds.toString().padStart(2, '0')}`
}

/** Builds the Markdown note Grimoire saves beside an audio attachment. */
export function buildTranscriptMarkdown(input: TranscriptMarkdownInput): string {
  const languageLine = input.language?.trim() ? `language: ${input.language.trim()}\n` : ''
  const body = input.segments?.length
    ? input.segments
        .map((segment) => `- ${formatTimestamp(segment.startSeconds)}-${formatTimestamp(segment.endSeconds)} ${segment.text.trim()}`)
        .join('\n')
    : input.transcript.trim()

  return [
    '---',
    `title: ${input.title}`,
    'type: Transcript',
    `source: ${input.audioPath}`,
    `transcription_provider: ${input.provider}`,
    `${languageLine}---`,
    '',
    `# ${input.title}`,
    '',
    `Audio: [${input.audioPath}](${input.audioPath})`,
    '',
    '## Transcript',
    '',
    body,
    '',
  ].join('\n')
}
