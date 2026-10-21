import { useEffect, useRef, useState, type KeyboardEvent } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { APP_STORAGE_KEYS } from '../constants/appStorage'
import { formatShortcutDisplay, formatShortcutHint } from '../hooks/appCommandCatalog'
import {
  classifyCaptureDraft,
  shouldShowPromotion,
  type CaptureLane,
  type Promotion,
} from '../lib/quickCapturePromotion'
import { CAPTURE_KIND_CONFIGS } from '../utils/dashboardCapture'
import './QuickCaptureSheet.css'

interface QuickCaptureSheetProps {
  open: boolean
  onClose: () => void
  /** Resolves true when the capture landed; the sheet stays open otherwise. */
  onSave: (text: string) => Promise<boolean>
  /** Creates the draft as a typed note in the given lane and opens it in the editor. */
  onPromote?: (text: string, lane: CaptureLane) => Promise<boolean>
}

const DRAFT_KEY = APP_STORAGE_KEYS.quickCaptureDraft
const PROMOTE_DEBOUNCE_MS = 400

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

function laneLabel(lane: CaptureLane): string {
  return CAPTURE_KIND_CONFIGS.find((config) => config.kind === lane)?.label ?? lane
}

/** Small centered composer that drops a thought into today's journal without leaving the current note. */
export function QuickCaptureSheet({ open, onClose, onSave, onPromote }: QuickCaptureSheetProps) {
  const [text, setText] = useState(readDraft)
  const [saving, setSaving] = useState(false)
  const [promoting, setPromoting] = useState(false)
  const [promotion, setPromotion] = useState<Promotion | null>(null)
  const [dismissed, setDismissed] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const debounceRef = useRef<number>(0)

  useEffect(() => () => window.clearTimeout(debounceRef.current), [])

  const evaluateDraft = (value: string) => {
    window.clearTimeout(debounceRef.current)
    if (!value.trim()) {
      setPromotion(null)
      setDismissed(false)
      return
    }
    debounceRef.current = window.setTimeout(() => {
      const promo = classifyCaptureDraft(value, null)
      setPromotion(promo && shouldShowPromotion(value, promo) ? promo : null)
    }, PROMOTE_DEBOUNCE_MS)
  }

  const updateText = (value: string) => {
    setText(value)
    writeDraft(value)
    evaluateDraft(value)
  }

  const submit = async () => {
    if (saving || text.trim().length === 0) return
    setSaving(true)
    try {
      const saved = await onSave(text)
      if (!saved) return
      writeDraft('')
      setText('')
      setPromotion(null)
      setDismissed(false)
      onClose()
    } finally {
      setSaving(false)
    }
  }

  const promote = async (lane: CaptureLane) => {
    if (!onPromote || promoting || text.trim().length === 0) return
    setPromoting(true)
    try {
      const promoted = await onPromote(text, lane)
      if (!promoted) return
      writeDraft('')
      setText('')
      setPromotion(null)
      setDismissed(false)
      onClose()
    } finally {
      setPromoting(false)
    }
  }

  const stripVisible = !!onPromote && promotion !== null && !dismissed && !promoting

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (!isSaveShortcut(event)) return
    event.preventDefault()
    event.stopPropagation()
    if (stripVisible && promotion) {
      void promote(promotion.lane)
      return
    }
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
          readOnly={saving || promoting}
          aria-busy={saving || promoting}
          onChange={(event) => updateText(event.target.value)}
          onKeyDown={handleKeyDown}
        />
        {stripVisible && promotion ? (
          <div className="qcp-strip" role="status" aria-live="polite" data-testid="quick-capture-promotion">
            <span className="qcp-strip__label" title={promotion.reason}>
              Looks like: <b>{laneLabel(promotion.lane)}</b>
            </span>
            <button
              type="button"
              className="qcp-strip__promote"
              disabled={promoting}
              onClick={() => void promote(promotion.lane)}
              data-testid="quick-capture-promote"
            >
              Promote
            </button>
            {promotion.alternatives.slice(0, 3).map((lane) => (
              <button
                key={lane}
                type="button"
                className="qcp-strip__alt"
                onClick={() => void promote(lane)}
                data-testid={`quick-capture-alt-${lane}`}
              >
                {laneLabel(lane)}
              </button>
            ))}
            <span className="qcp-strip__status">local only</span>
            <button
              type="button"
              className="qcp-strip__dismiss"
              aria-label="Dismiss suggestion"
              onClick={() => setDismissed(true)}
              data-testid="quick-capture-dismiss"
            >
              ×
            </button>
            {formatShortcutHint('⌘↵') ? (
              <p className="qcp-strip__hint">
                <kbd className="font-sans">{formatShortcutDisplay({ display: '⌘↵' })}</kbd> promote
              </p>
            ) : null}
          </div>
        ) : null}
        <div className="flex items-center justify-between text-[11px] text-[var(--muted-foreground)]">
          <span>Today's journal</span>
          {formatShortcutHint('⌘↵') ? (
            <span>
              <kbd className="font-sans">{formatShortcutDisplay({ display: '⌘↵' })}</kbd> {stripVisible ? 'promote' : 'save'} · <kbd className="font-sans">{formatShortcutDisplay({ display: '⎋' })}</kbd> close
            </span>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  )
}
