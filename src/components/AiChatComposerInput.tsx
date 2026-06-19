import { useCallback, useMemo, useRef, useState } from 'react'
import { Textarea } from '@/components/ui/textarea'
import type { VaultEntry } from '../types'
import type { NoteReference } from '../utils/ai-context'
import { buildProviderPromptDraft } from '../lib/providerPromptPrivacy'
import { buildTypeEntryMap } from '../utils/typeColors'
import {
  findActiveWikilinkQuery,
} from './inlineWikilinkText'
import {
  InlineWikilinkSuggestionList,
} from './InlineWikilinkParts'
import { useInlineWikilinkSuggestionsState } from './useInlineWikilinkSuggestionsState'
import { UNSUPPORTED_INLINE_PASTE_MESSAGE } from './InlineWikilinkInput'

interface AiChatComposerInputProps {
  entries: VaultEntry[]
  value: string
  onChange: (value: string) => void
  onSend: (text: string, references: NoteReference[]) => void
  onUnsupportedPaste?: (message: string) => void
  disabled?: boolean
  placeholder?: string
  inputRef?: React.RefObject<HTMLElement | null>
}

function hasUnsupportedClipboardPayload(clipboardData: DataTransfer) {
  if (clipboardData.files.length > 0) return true

  return Array.from(clipboardData.items).some((item) =>
    item.kind === 'file' || item.type.startsWith('image/'),
  )
}

function selectionOrEnd(textarea: HTMLTextAreaElement | null, value: string): number {
  return textarea?.selectionStart ?? value.length
}

function isComposingKeyEvent(event: React.KeyboardEvent<HTMLTextAreaElement>): boolean {
  return event.nativeEvent.isComposing || event.keyCode === 229
}

/** Stable textarea-backed AI composer with markdown wikilink suggestions. */
export function AiChatComposerInput({
  entries,
  value,
  onChange,
  onSend,
  onUnsupportedPaste,
  disabled = false,
  placeholder,
  inputRef,
}: AiChatComposerInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null)
  const [selectionIndex, setSelectionIndex] = useState(value.length)
  const activeQuery = useMemo(
    () => findActiveWikilinkQuery(value, selectionIndex),
    [selectionIndex, value],
  )
  const typeEntryMap = useMemo(() => buildTypeEntryMap(entries), [entries])
  const updateSelectionIndex = useCallback(() => {
    setSelectionIndex(selectionOrEnd(textareaRef.current, value))
  }, [value])
  const focusSelectionAt = useCallback((nextSelectionIndex: number) => {
    const textarea = textareaRef.current
    if (!textarea) return

    textarea.focus()
    textarea.setSelectionRange(nextSelectionIndex, nextSelectionIndex)
    setSelectionIndex(nextSelectionIndex)
  }, [])
  const {
    suggestions,
    selectedSuggestionIndex,
    setSuggestionIndex,
    selectSuggestion,
    cycleSuggestions,
  } = useInlineWikilinkSuggestionsState({
    activeQueryKey: activeQuery ? `${activeQuery.start}:${activeQuery.query}` : '',
    entries,
    query: activeQuery?.query ?? null,
    value,
    selectionIndex,
    onChange,
    onSelectionIndexChange: setSelectionIndex,
    focusSelectionAt,
  })
  const setInputRef = useCallback((node: HTMLTextAreaElement | null) => {
    textareaRef.current = node
    if (inputRef) inputRef.current = node
  }, [inputRef])
  const submitValue = useCallback(() => {
    const draft = buildProviderPromptDraft(value, entries)
    if (!draft.text.trim()) return
    onSend(draft.text, draft.references)
  }, [entries, onSend, value])
  const handlePaste = useCallback((event: React.ClipboardEvent<HTMLTextAreaElement>) => {
    if (!hasUnsupportedClipboardPayload(event.clipboardData)) return

    event.preventDefault()
    onUnsupportedPaste?.(UNSUPPORTED_INLINE_PASTE_MESSAGE)
  }, [onUnsupportedPaste])
  const handleKeyDown = useCallback((event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (disabled) return
    if (isComposingKeyEvent(event)) return

    if (suggestions.length > 0 && (event.key === 'ArrowDown' || event.key === 'ArrowUp')) {
      event.preventDefault()
      cycleSuggestions(event.key === 'ArrowDown' ? 1 : -1)
      return
    }

    if (suggestions.length > 0 && (event.key === 'Enter' || event.key === 'Tab') && !event.shiftKey) {
      event.preventDefault()
      selectSuggestion(selectedSuggestionIndex)
      return
    }

    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      submitValue()
    }
  }, [
    cycleSuggestions,
    disabled,
    selectSuggestion,
    selectedSuggestionIndex,
    submitValue,
    suggestions.length,
  ])

  return (
    <div className="relative">
      <Textarea
        ref={setInputRef}
        aria-label="AI prompt"
        className="ai-composer-input max-h-36 min-h-[72px] resize-none rounded-[10px] px-[10px] py-[8px] text-[13px] leading-[1.45]"
        style={{
          background: 'color-mix(in srgb, var(--surface-card) 96%, var(--background))',
          borderColor: 'color-mix(in srgb, var(--grimoire-hairline, var(--border-default)) 90%, transparent)',
        }}
        data-testid="agent-input"
        disabled={disabled}
        onChange={(event) => {
          onChange(event.currentTarget.value)
          setSelectionIndex(event.currentTarget.selectionStart)
        }}
        onClick={updateSelectionIndex}
        onKeyDown={handleKeyDown}
        onKeyUp={updateSelectionIndex}
        onPaste={handlePaste}
        onSelect={updateSelectionIndex}
        placeholder={placeholder}
        rows={3}
        value={value}
      />
      {suggestions.length > 0 && (
        <InlineWikilinkSuggestionList
          suggestions={suggestions}
          selectedIndex={selectedSuggestionIndex}
          onHover={setSuggestionIndex}
          onSelect={selectSuggestion}
          typeEntryMap={typeEntryMap}
          emptyLabel="No matching pages"
        />
      )}
    </div>
  )
}
