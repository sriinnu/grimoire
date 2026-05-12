import { detectCodeLanguage } from '../utils/codeLanguageDetection'

type UnknownRecord = Record<string, unknown>

type CodeBlockSnapshot = {
  id: string
  type: string
  props?: UnknownRecord
  content?: unknown
}

export type CodeLanguageDetectionEditor = {
  getTextCursorPosition: () => { block?: unknown }
  updateBlock: (block: string, update: { props: { language: string } }) => unknown
}

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === 'object' && value !== null
}

function toCodeBlockSnapshot(value: unknown): CodeBlockSnapshot | null {
  if (!isRecord(value)) return null
  if (typeof value.id !== 'string' || typeof value.type !== 'string') return null

  return {
    id: value.id,
    type: value.type,
    props: isRecord(value.props) ? value.props : undefined,
    content: value.content,
  }
}

function inlineContentToText(content: unknown): string {
  if (typeof content === 'string') return content
  if (Array.isArray(content)) return content.map(inlineContentToText).join('')
  if (!isRecord(content)) return ''
  if (typeof content.text === 'string') return content.text
  return inlineContentToText(content.content)
}

function isUndetectedLanguage(language: unknown): boolean {
  if (typeof language !== 'string') return true

  const normalized = language.trim().toLowerCase()
  return normalized === '' || normalized === 'text' || normalized === 'plain' || normalized === 'plaintext'
}

/** Detects and applies a language to the active code block when it is still plain text. */
export function applyDetectedCodeBlockLanguage(editor: CodeLanguageDetectionEditor): string | null {
  const block = toCodeBlockSnapshot(editor.getTextCursorPosition().block)
  if (block?.type !== 'codeBlock') return null
  if (!isUndetectedLanguage(block.props?.language)) return null

  const language = detectCodeLanguage(inlineContentToText(block.content))
  if (!language) return null

  editor.updateBlock(block.id, { props: { language } })
  return language
}
