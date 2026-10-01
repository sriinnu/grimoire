import { useRef, useState, type KeyboardEvent } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { APP_STORAGE_KEYS } from '../constants/appStorage'
import { formatShortcutDisplay, formatShortcutHint } from '../hooks/appCommandCatalog'

interface QuickCaptureSheetProps {
  open: boolean
  onClose: () => void
  /** Resolves true when the capture landed; the sheet stays open otherwise. */
  onSave: (text: string) => Promise<boolean>
}

const DRAFT_KEY = APP_STORAGE_KEYS.quickCaptureDraft

function readDraft(): string {
  try {
    return localStorage.getItem(DRAFT_KEY) ?? ''
  } catch {
    return ''
  }
}

function writeDraft(value: string): void {
  try {
    if (value.length > 0) localStorage.setItem(DRAFT_KEY, value)
    else localStorage.removeItem(DRAFT_KEY)
  } catch {
    // Storage can be unavailable (private windows, blocked site data); the draft is a convenience.
  }
}

function isSaveShortcut(event: KeyboardEvent<HTMLTextAreaElement>): boolean {
  return event.key === 'Enter' && (event.metaKey || event.ctrlKey) && !event.altKey
}

/** Small centered composer that drops a thought into today's journal without leaving the current note. */
export function QuickCaptureSheet({ open, onClose, onSave }: QuickCaptureSheetProps) {
  const [text, setText] = useState(readDraft)
  const [saving, setSaving] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const updateText = (value: string) => {
    setText(value)
    writeDraft(value)
  }

  const submit = async () => {
    if (saving || text.trim().length === 0) return
    setSaving(true)
    try {
      const saved = await onSave(text)
      if (!saved) return
      writeDraft('')
      setText('')
      onClose()
    } finally {
      setSaving(false)
    }
  }

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (!isSaveShortcut(event)) return
    event.preventDefault()
    event.stopPropagation()
    void submit()
  }

  return (
    <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) onClose() }}>
      <DialogContent
        showCloseButton={false}
        data-testid="quick-capture-sheet"
        className="quick-capture-sheet gap-2 border-[var(--border)] bg-[var(--surface-panel)] p-3 text-[var(--foreground)] sm:max-w-[460px]"
        onOpenAutoFocus={(event) => {
          event.preventDefault()
          const textarea = textareaRef.current
          if (!textarea) return
          textarea.focus()
          textarea.setSelectionRange(textarea.value.length, textarea.value.length)
        }}
      >
        <DialogTitle className="sr-only">Quick capture</DialogTitle>
        <DialogDescription className="sr-only">
          Adds a timestamped bullet to today's journal.
        </DialogDescription>
        <textarea
          ref={textareaRef}
          aria-label="Quick capture"
          className="min-h-[96px] w-full resize-none rounded-md border border-[var(--border)] bg-transparent px-3 py-2 text-sm leading-relaxed text-[var(--foreground)] outline-none placeholder:text-[var(--muted-foreground)] focus-visible:border-[var(--primary)]"
          placeholder="Capture a thought…"
          rows={4}
          value={text}
          readOnly={saving}
          aria-busy={saving}
          onChange={(event) => updateText(event.target.value)}
          onKeyDown={handleKeyDown}
        />
        <div className="flex items-center justify-between text-[11px] text-[var(--muted-foreground)]">
          <span>Today's journal</span>
          {formatShortcutHint('⌘↵') ? (
            <span>
              <kbd className="font-sans">{formatShortcutDisplay({ display: '⌘↵' })}</kbd> save · <kbd className="font-sans">{formatShortcutDisplay({ display: '⎋' })}</kbd> close
            </span>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  )
}
