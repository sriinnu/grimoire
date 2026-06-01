import type { TranscriptionProviderId } from './transcriptionProviderConfig'

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

export type {
  TranscriptionProviderDefinition,
  TranscriptionProviderId,
  TranscriptionProviderPreference,
  TranscriptionRequestConfig,
} from './transcriptionProviderConfig'
export {
  DEFAULT_TRANSCRIPTION_PROVIDER,
  TRANSCRIPTION_PROVIDERS,
  createTranscriptionRequestConfig,
  getTranscriptionProviderDefinition,
  isCloudTranscriptionProvider,
  normalizeTranscriptionProvider,
  resolveConfiguredTranscriptionProvider,
  resolveTranscriptionProvider,
} from './transcriptionProviderConfig'

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
