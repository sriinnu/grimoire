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

/** User preference used to resolve the runtime transcription backend. */
export interface TranscriptionProviderPreference {
  provider?: unknown
  cloudTranscriptionEnabled?: boolean | null
}

/** Native command args that make cloud transport explicit. */
export interface TranscriptionRequestConfig {
  provider: TranscriptionProviderId
  allowCloud: boolean
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

/** Data needed to persist the cleaned note generated beside a raw transcript. */
export interface CleanTranscriptMarkdownInput extends TranscriptMarkdownInput {
  transcriptTitle: string
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

/** Returns provider metadata for a supported transcription provider. */
export function getTranscriptionProviderDefinition(
  providerId: TranscriptionProviderId,
): TranscriptionProviderDefinition {
  return TRANSCRIPTION_PROVIDERS.find((provider) => provider.id === providerId)
    ?? TRANSCRIPTION_PROVIDERS[0]!
}

/** True when a provider can send audio off-device. */
export function isCloudTranscriptionProvider(providerId: TranscriptionProviderId): boolean {
  const provider = getTranscriptionProviderDefinition(providerId)
  return !provider.localFirst || provider.requiresApiKey
}

/** Resolves settings into the provider Grimoire is allowed to call right now. */
export function resolveConfiguredTranscriptionProvider(
  preference: TranscriptionProviderPreference = {},
): TranscriptionProviderId {
  const provider = resolveTranscriptionProvider(preference.provider)
  if (isCloudTranscriptionProvider(provider) && preference.cloudTranscriptionEnabled !== true) {
    return DEFAULT_TRANSCRIPTION_PROVIDER
  }
  return provider
}

/** Builds native command config with cloud disabled unless the user opted in. */
export function createTranscriptionRequestConfig(
  preference: TranscriptionProviderPreference = {},
): TranscriptionRequestConfig {
  const provider = resolveConfiguredTranscriptionProvider(preference)
  return {
    provider,
    allowCloud: isCloudTranscriptionProvider(provider) && preference.cloudTranscriptionEnabled === true,
  }
}

function formatTimestamp(totalSeconds: number): string {
  const safeSeconds = Math.max(0, Math.floor(totalSeconds))
  const minutes = Math.floor(safeSeconds / 60)
  const seconds = safeSeconds % 60
  return `${minutes}:${seconds.toString().padStart(2, '0')}`
}

function yamlDoubleQuoted(value: string): string {
  return `"${value.replace(/\\/gu, '\\\\').replace(/"/gu, '\\"')}"`
}

function wikilinkRef(title: string): string {
  return `[[${title}]]`
}

function transcriptText(input: TranscriptMarkdownInput): string {
  return input.segments?.length
    ? input.segments.map((segment) => segment.text).join(' ')
    : input.transcript
}

function cleanSentence(text: string): string {
  return text.replace(/\s+/g, ' ').trim()
}

function transcriptSentences(input: TranscriptMarkdownInput): string[] {
  return transcriptText(input)
    .split(/(?<=[.!?])\s+|\n+/)
    .map(cleanSentence)
    .filter(Boolean)
}

function summaryBullets(sentences: string[]): string[] {
  const selected = sentences.slice(0, 3)
  return selected.length > 0 ? selected : ['Review the raw transcript for details.']
}

function actionBullets(sentences: string[]): string[] {
  const actionPattern = /\b(action|todo|follow up|next|need|needs|should|ship|wire|fix|review|send|ask|call|email|create|add|update)\b/i
  const selected = sentences.filter((sentence) => actionPattern.test(sentence)).slice(0, 8)
  return selected.length > 0 ? selected : ['Review transcript and decide next action.']
}

function cleanParagraphs(sentences: string[]): string {
  return sentences.length > 0
    ? sentences.join(' ')
    : 'No clean transcript text was available.'
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
    'locality: local',
    `source: ${yamlDoubleQuoted(input.audioPath)}`,
    `source_audio: ${yamlDoubleQuoted(input.audioPath)}`,
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

/** Builds a local-only cleaned note beside the raw transcript. */
export function buildCleanTranscriptMarkdown(input: CleanTranscriptMarkdownInput): string {
  const languageLine = input.language?.trim() ? `language: ${input.language.trim()}\n` : ''
  const sentences = transcriptSentences(input)
  const summary = summaryBullets(sentences).map((sentence) => `- ${sentence}`).join('\n')
  const actions = actionBullets(sentences).map((sentence) => `- [ ] ${sentence}`).join('\n')

  return [
    '---',
    `title: ${input.title}`,
    'type: Note',
    'locality: local',
    `source: ${yamlDoubleQuoted(wikilinkRef(input.transcriptTitle))}`,
    `source_audio: ${yamlDoubleQuoted(input.audioPath)}`,
    `transcription_provider: ${input.provider}`,
    'Related to:',
    `  - ${yamlDoubleQuoted(wikilinkRef(input.transcriptTitle))}`,
    `${languageLine}---`,
    '',
    `# ${input.title}`,
    '',
    `Source transcript: [[${input.transcriptTitle}]]`,
    `Audio: [${input.audioPath}](${input.audioPath})`,
    '',
    '## Summary',
    '',
    summary,
    '',
    '## Action Items',
    '',
    actions,
    '',
    '## Clean Notes',
    '',
    cleanParagraphs(sentences),
    '',
  ].join('\n')
}
