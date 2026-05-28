import type { VaultEntry } from '../types'
import type { NoteReference } from '../utils/ai-context'
import { buildProviderPromptDraft } from '../lib/providerPromptPrivacy'

export const UNSUPPORTED_INLINE_PASTE_MESSAGE = 'Only text paste is supported in the AI composer right now.'

interface SubmitInlineValueParams {
  entries: VaultEntry[]
  onSubmit?: (text: string, references: NoteReference[]) => void
  submitOnEmpty: boolean
  value: string
}

/** Detects clipboard or drop payloads that the inline AI composer cannot represent safely. */
export function hasUnsupportedClipboardPayload(clipboardData: DataTransfer): boolean {
  if (clipboardData.files.length > 0) return true

  return Array.from(clipboardData.items).some((item) =>
    item.kind === 'file' || item.type.startsWith('image/'),
  )
}

/** Detects browser-inserted rich media before it can be serialized into a prompt. */
export function containsUnsupportedInlineContent(editor: HTMLDivElement): boolean {
  return editor.querySelector('img, picture, video, audio, canvas, figure, iframe, object') !== null
}

/** Submits only provider-safe prompt text and public note references. */
export function submitInlineValue({
  onSubmit,
  submitOnEmpty,
  value,
  entries,
}: SubmitInlineValueParams): void {
  if (!onSubmit) return
  const draft = buildProviderPromptDraft(value, entries)
  if (!submitOnEmpty && !draft.text.trim()) return
  onSubmit(draft.text, draft.references)
}
