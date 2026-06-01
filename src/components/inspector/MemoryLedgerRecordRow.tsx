import type { CSSProperties, FormEvent, ReactNode } from 'react'
import { useState } from 'react'
import { CircleAlert, ExternalLink, Pencil, Save, Sparkles, X } from 'lucide-react'
import type { MemoryLedgerDisplayState, MemoryLedgerRecord, MemoryLedgerTone } from '../../lib/memoryLedger'
import { buildMemoryLedgerDisplayState, buildMemoryReviewLogEntry, memoryReferenceLabel } from '../../lib/memoryLedger'
import { Badge } from '../ui/badge'
import { Button } from '../ui/button'
import { Input } from '../ui/input'

export type MemoryRecordValue = string | number | boolean | string[] | null
export type MemoryRecordPropertyUpdate = (path: string, key: string, value: MemoryRecordValue) => Promise<void> | void

interface MemoryLedgerRecordRowProps {
  index: number
  record: MemoryLedgerRecord
  onNavigate?: (target: string) => void
  onUpdateRecordProperty?: MemoryRecordPropertyUpdate
  onDeleteRecordProperty?: (path: string, key: string) => Promise<void> | void
}

/** Renders one editable, theme-addressable Memory Ledger row for an active note. */
export function MemoryLedgerRecordRow({
  record,
  index,
  onNavigate,
  onUpdateRecordProperty,
  onDeleteRecordProperty,
}: MemoryLedgerRecordRowProps) {
  const traceStyle = { '--motion-stagger-delay': `${index * 70}ms` } as CSSProperties
  const [editing, setEditing] = useState(false)
  const display = buildMemoryLedgerDisplayState(record)
  const rowTone = memoryRecordTone(display)

  return (
    <div
      className="memory-ledger-record grimoire-memory-trace rounded-md bg-muted/30 px-2 py-1.5 text-[11px]"
      data-testid="memory-ledger-record"
      data-memory-tone={rowTone}
      style={traceStyle}
    >
      <div className="flex min-w-0 items-center gap-1.5">
        <Sparkles className="size-3 shrink-0 text-muted-foreground" />
        <span className="memory-ledger-record__title min-w-0 flex-1 truncate text-foreground">{record.title}</span>
        {display.confidenceLabel ? <LedgerBadge tone={display.confidenceTone}>{display.confidenceLabel}</LedgerBadge> : null}
        {onNavigate ? (
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            aria-label={`Open memory ${record.title}`}
            onClick={() => onNavigate(record.path)}
          >
            <ExternalLink className="size-3" />
          </Button>
        ) : null}
        {onUpdateRecordProperty ? (
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            aria-label={`Edit memory metadata ${record.title}`}
            onClick={() => setEditing(value => !value)}
          >
            {editing ? <X className="size-3" /> : <Pencil className="size-3" />}
          </Button>
        ) : null}
      </div>
      {record.summary ? (
        <div className="mt-0.5 line-clamp-2 text-muted-foreground">{record.summary}</div>
      ) : null}
      <div className="mt-1 flex flex-wrap gap-1">
        {record.lastSeen ? <LedgerBadge tone="neutral">Seen {record.lastSeen}</LedgerBadge> : null}
        {display.handoffLabel ? <LedgerBadge tone={display.handoffTone}>{display.handoffLabel}</LedgerBadge> : null}
        {display.receiptLabel ? <LedgerBadge tone={display.receiptTone}>{display.receiptLabel}</LedgerBadge> : null}
        {display.loopLabel ? <LedgerBadge tone="verified">{display.loopLabel}</LedgerBadge> : null}
        {display.expiryLabel ? <LedgerBadge tone={display.expiryTone}>{display.expiryLabel}</LedgerBadge> : null}
        {display.contradictionLabel ? <LedgerBadge tone={display.contradictionTone}>{display.contradictionLabel}</LedgerBadge> : null}
        {record.version ? <LedgerBadge tone="neutral">v{record.version}</LedgerBadge> : null}
        {record.reviewedAt ? <LedgerBadge tone="neutral">Reviewed {record.reviewedAt}</LedgerBadge> : null}
        {record.reviewLog.length > 0 ? <LedgerBadge tone="neutral">Log {record.reviewLog.length}</LedgerBadge> : null}
      </div>
      {display.reviewLogLabel ? (
        <div className="memory-ledger-review-log mt-1 truncate text-[10px] text-muted-foreground" data-testid="memory-ledger-review-log">
          Latest review: {display.reviewLogLabel}
        </div>
      ) : null}
      <ReferenceChips
        label="Sources"
        values={record.sources}
        labels={display.sourceLabels}
        onNavigate={onNavigate}
      />
      <ReferenceChips
        icon={<CircleAlert className="size-3" />}
        label="Contradicts"
        values={record.contradicts}
        labels={display.contradictionLabels}
        onNavigate={onNavigate}
      />
      {editing && onUpdateRecordProperty ? (
        <MemoryRecordEditForm
          record={record}
          onCancel={() => setEditing(false)}
          onSaved={() => setEditing(false)}
          onUpdateRecordProperty={onUpdateRecordProperty}
          onDeleteRecordProperty={onDeleteRecordProperty}
        />
      ) : null}
    </div>
  )
}

function LedgerBadge({ children, tone }: { children: ReactNode; tone: MemoryLedgerTone }) {
  const className = {
    danger: 'border-destructive/50 bg-destructive/10 text-destructive',
    neutral: 'text-muted-foreground',
    proposed: 'border-primary/30 bg-primary/10 text-primary',
    verified: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
    warning: 'border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300',
  }[tone]
  return <Badge variant="outline" className={`memory-ledger-badge rounded-md text-[10px] ${className}`} data-memory-tone={tone}>{children}</Badge>
}

function ReferenceChips({
  icon,
  label,
  labels,
  values,
  onNavigate,
}: {
  icon?: ReactNode
  label: string
  labels: string[]
  values: string[]
  onNavigate?: (target: string) => void
}) {
  if (labels.length === 0) return null
  return (
    <div className="mt-1 flex min-w-0 flex-wrap items-center gap-1">
      <span className="flex shrink-0 items-center gap-1 text-[10px] uppercase tracking-[0.08em] text-muted-foreground">
        {icon}
        {label}
      </span>
      {labels.map((text, index) => (
        <Button
          key={`${values[index]}-${index}`}
          type="button"
          variant="outline"
          size="xs"
          className="memory-ledger-reference max-w-full border-border/70 bg-background/60 px-1.5 font-normal text-muted-foreground"
          onClick={onNavigate ? () => onNavigate(memoryReferenceLabel(values[index])) : undefined}
          disabled={!onNavigate}
        >
          <span className="max-w-[9rem] truncate">{text}</span>
        </Button>
      ))}
    </div>
  )
}

function MemoryRecordEditForm({
  record,
  onCancel,
  onSaved,
  onUpdateRecordProperty,
  onDeleteRecordProperty,
}: {
  record: MemoryLedgerRecord
  onCancel: () => void
  onSaved: () => void
  onUpdateRecordProperty: MemoryRecordPropertyUpdate
  onDeleteRecordProperty?: (path: string, key: string) => Promise<void> | void
}) {
  const [confidence, setConfidence] = useState(record.confidence == null ? '' : String(record.confidence))
  const [expiresAt, setExpiresAt] = useState(record.expiresAt ?? '')
  const [contradicts, setContradicts] = useState(record.contradicts.join(', '))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const nextVersion = nextMemoryVersion(record.version)

  async function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSaving(true)
    setError(null)
    try {
      const reviewedAt = new Date().toISOString()
      const nextContradicts = splitLedgerList(contradicts)
      await updateOrDelete(onUpdateRecordProperty, onDeleteRecordProperty, record.path, 'confidence', confidence.trim())
      await updateOrDelete(onUpdateRecordProperty, onDeleteRecordProperty, record.path, 'expires_at', expiresAt.trim())
      await updateOrDelete(onUpdateRecordProperty, onDeleteRecordProperty, record.path, 'contradicts', nextContradicts)
      await onUpdateRecordProperty(record.path, 'memory_version', nextVersion)
      await onUpdateRecordProperty(record.path, 'reviewed_at', reviewedAt)
      await onUpdateRecordProperty(
        record.path,
        'memory_review_log',
        nextReviewLog(record, reviewedAt, nextVersion, confidence.trim(), expiresAt.trim(), nextContradicts),
      )
      onSaved()
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Could not update memory metadata')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form className="mt-2 grid gap-2 rounded-md border border-border bg-background/70 p-2" onSubmit={handleSave}>
      <label className="grid gap-1 text-[10px] uppercase tracking-[0.08em] text-muted-foreground">
        Confidence
        <Input className="h-7 text-[12px]" value={confidence} onChange={event => setConfidence(event.target.value)} />
      </label>
      <label className="grid gap-1 text-[10px] uppercase tracking-[0.08em] text-muted-foreground">
        Expires
        <Input className="h-7 text-[12px]" placeholder="YYYY-MM-DD" value={expiresAt} onChange={event => setExpiresAt(event.target.value)} />
      </label>
      <label className="grid gap-1 text-[10px] uppercase tracking-[0.08em] text-muted-foreground">
        Contradicts
        <Input className="h-7 text-[12px]" value={contradicts} onChange={event => setContradicts(event.target.value)} />
      </label>
      {error ? <div className="text-[11px] text-destructive">{error}</div> : null}
      <div className="flex items-center justify-between gap-2">
        <LedgerBadge tone="neutral">v{nextVersion}</LedgerBadge>
        <div className="flex gap-1">
          <Button type="button" variant="ghost" size="xs" onClick={onCancel}>
            <X className="size-3" />
            Cancel
          </Button>
          <Button type="submit" size="xs" disabled={saving} aria-label="Save memory metadata">
            <Save className="size-3" />
            Save
          </Button>
        </div>
      </div>
    </form>
  )
}

function splitLedgerList(value: string): string[] {
  return value.split(',').map(item => item.trim()).filter(Boolean)
}

function nextMemoryVersion(value: string | number | null): number {
  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed >= 0 ? parsed + 1 : 1
}

function nextReviewLog(
  record: MemoryLedgerRecord,
  reviewedAt: string,
  nextVersion: number,
  confidence: string,
  expiresAt: string,
  contradicts: string[],
): string[] {
  const entry = buildMemoryReviewLogEntry({ at: reviewedAt, confidence, contradicts, expiresAt, version: nextVersion })
  return [...record.reviewLog, entry].slice(-12)
}

function memoryRecordTone(display: MemoryLedgerDisplayState): MemoryLedgerTone {
  if (display.expiryTone === 'danger') return 'danger'
  if (
    display.expiryTone === 'warning' ||
    display.contradictionTone === 'warning' ||
    display.handoffTone === 'warning'
  ) return 'warning'
  if (display.confidenceTone === 'verified') return 'verified'
  if (display.confidenceTone === 'proposed' || display.handoffTone === 'proposed') return 'proposed'
  return 'neutral'
}

async function updateOrDelete(
  updateRecord: MemoryRecordPropertyUpdate,
  deleteRecord: ((path: string, key: string) => Promise<void> | void) | undefined,
  path: string,
  key: string,
  value: string | string[],
): Promise<void> {
  const isEmpty = Array.isArray(value) ? value.length === 0 : value.length === 0
  if (isEmpty && deleteRecord) {
    await deleteRecord(path, key)
    return
  }
  await updateRecord(path, key, value)
}
