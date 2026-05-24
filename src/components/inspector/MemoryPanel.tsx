import type { CSSProperties, FormEvent, ReactNode } from 'react'
import { Brain, CircleAlert, ExternalLink, Network, Pencil, Save, ShieldCheck, Sparkles, X, Workflow } from 'lucide-react'
import { useMemo, useState } from 'react'
import type { MarkdownDocumentSemantics } from '@grimoire/markdown-editor'
import type { VaultEntry } from '../../types'
import { Badge } from '../ui/badge'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import {
  buildChitraguptaMemoryContext,
  evaluateChitraguptaContractStatus,
  type ChitraguptaStatusPayload,
} from '../../lib/chitraguptaIntegration'
import { resolveEntryLocalityPolicy } from '../../lib/localityPolicy'
import { findMemoryLedgerRecordsForEntry, type MemoryLedgerRecord } from '../../lib/memoryLedger'

interface MemoryPanelProps {
  entry: VaultEntry
  entries: VaultEntry[]
  semantics: MarkdownDocumentSemantics
  chitraguptaStatus?: ChitraguptaStatusPayload | null
  onNavigate?: (target: string) => void
  onUpdateRecordProperty?: MemoryRecordPropertyUpdate
  onDeleteRecordProperty?: (path: string, key: string) => Promise<void> | void
}

type MemoryRecordValue = string | number | boolean | string[] | null
type MemoryRecordPropertyUpdate = (path: string, key: string, value: MemoryRecordValue) => Promise<void> | void

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="min-w-0 rounded-md bg-muted/40 px-2 py-1">
      <div className="text-[10px] uppercase tracking-[0.08em] text-muted-foreground">{label}</div>
      <div className="truncate text-[12px] text-foreground">{value}</div>
    </div>
  )
}

function MemorySignal() {
  return (
    <div className="grimoire-memory-signal mb-2" data-testid="memory-signal" aria-hidden="true">
      <span className="grimoire-memory-signal__orb" />
      <span className="grimoire-memory-signal__node" />
      <span className="grimoire-memory-signal__node" />
    </div>
  )
}

function OrchestrationRow({
  icon,
  label,
  value,
}: {
  icon: ReactNode
  label: string
  value: string
}) {
  return (
    <div className="flex min-w-0 items-center gap-2 rounded-md bg-muted/30 px-2 py-1.5 text-[11px]">
      <span className="shrink-0 text-muted-foreground">{icon}</span>
      <span className="min-w-0 flex-1 truncate text-foreground">{label}</span>
      <span className="max-w-[8rem] truncate text-right text-muted-foreground">{value}</span>
    </div>
  )
}

function LedgerRecordRow({
  record,
  index,
  onNavigate,
  onUpdateRecordProperty,
  onDeleteRecordProperty,
}: {
  index: number
  record: MemoryLedgerRecord
  onNavigate?: (target: string) => void
  onUpdateRecordProperty?: MemoryRecordPropertyUpdate
  onDeleteRecordProperty?: (path: string, key: string) => Promise<void> | void
}) {
  const traceStyle = { '--motion-stagger-delay': `${index * 70}ms` } as CSSProperties
  const [editing, setEditing] = useState(false)

  return (
    <div
      className="grimoire-memory-trace rounded-md bg-muted/30 px-2 py-1.5 text-[11px]"
      data-testid="memory-ledger-record"
      style={traceStyle}
    >
      <div className="flex min-w-0 items-center gap-1.5">
        <Sparkles className="size-3 shrink-0 text-muted-foreground" />
        <span className="min-w-0 flex-1 truncate text-foreground">{record.title}</span>
        {record.confidence !== null ? (
          <span className="shrink-0 text-muted-foreground">{record.confidence}</span>
        ) : null}
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
        {record.lastSeen ? <Badge variant="outline" className="rounded-md text-[10px]">Seen {record.lastSeen}</Badge> : null}
        {record.expiresAt ? <Badge variant="outline" className="rounded-md text-[10px]">Expires {record.expiresAt}</Badge> : null}
        {record.contradicts.length > 0 ? <Badge variant="outline" className="rounded-md text-[10px]">Contradicts {record.contradicts.length}</Badge> : null}
        {record.version ? <Badge variant="outline" className="rounded-md text-[10px]">v{record.version}</Badge> : null}
        {record.reviewedAt ? <Badge variant="outline" className="rounded-md text-[10px]">Reviewed {record.reviewedAt}</Badge> : null}
      </div>
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
      await updateOrDelete(onUpdateRecordProperty, onDeleteRecordProperty, record.path, 'confidence', confidence.trim())
      await updateOrDelete(onUpdateRecordProperty, onDeleteRecordProperty, record.path, 'expires_at', expiresAt.trim())
      await updateOrDelete(
        onUpdateRecordProperty,
        onDeleteRecordProperty,
        record.path,
        'contradicts',
        splitLedgerList(contradicts),
      )
      await onUpdateRecordProperty(record.path, 'memory_version', nextVersion)
      await onUpdateRecordProperty(record.path, 'reviewed_at', new Date().toISOString())
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
        <Badge variant="outline" className="rounded-md text-[10px]">v{nextVersion}</Badge>
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

/** Chitragupta-ready memory lane for the active note. */
export function MemoryPanel({
  entry,
  entries,
  semantics,
  chitraguptaStatus = null,
  onNavigate,
  onUpdateRecordProperty,
  onDeleteRecordProperty,
}: MemoryPanelProps) {
  const context = useMemo(
    () => buildChitraguptaMemoryContext(entry, entries, semantics),
    [entry, entries, semantics],
  )
  const contractStatus = useMemo(
    () => evaluateChitraguptaContractStatus(chitraguptaStatus),
    [chitraguptaStatus],
  )
  const displayPolicy = useMemo(() => resolveEntryLocalityPolicy(entry), [entry])
  const ledgerRecords = useMemo(() => (
    displayPolicy.localOnly ? [] : findMemoryLedgerRecordsForEntry(entry, entries)
  ), [displayPolicy.localOnly, entries, entry])
  const withheldValue = displayPolicy.localOnly ? 'Withheld' : null
  const localityDetail = displayPolicy.localOnly
    ? `${displayPolicy.reason}. Body, title, path, and frontmatter stay out of AI prompts.`
    : 'Local ledger can use this note while live agent recall waits for Chitragupta contract health.'
  const memoryState = displayPolicy.localOnly
    ? 'Withheld'
    : contractStatus.state === 'ready' ? 'Ready for recall' : 'Local ledger only'
  const contractState = displayPolicy.localOnly
    ? 'Withheld'
    : contractStatus.state === 'ready' ? 'Ready' : 'Blocked'
  const ledgerState = displayPolicy.localOnly
    ? 'Withheld'
    : ledgerRecords.length > 0 ? `${ledgerRecords.length} records` : 'No records yet'

  return (
    <section className="inspector-card" data-testid="memory-panel">
      <div className="mb-2 flex items-center justify-between gap-2">
        <h4 className="font-mono-overline flex items-center gap-1 text-muted-foreground">
          <Brain className="size-3" />
          Memory
        </h4>
        <Badge variant={displayPolicy.localOnly ? 'outline' : 'secondary'} className="h-5 rounded-md px-1.5 text-[10px]">
          {displayPolicy.localOnly ? 'Protected' : 'Local ledger'}
        </Badge>
      </div>

      <MemorySignal />

      <div className="mb-2 rounded-md border border-border bg-muted/25 px-2 py-2">
        <div className="flex items-start gap-2 text-[12px] text-muted-foreground">
          {displayPolicy.localOnly
            ? <ShieldCheck className="mt-0.5 size-3.5 shrink-0" />
            : <CircleAlert className="mt-0.5 size-3.5 shrink-0" />}
          <span>
            {localityDetail}
          </span>
        </div>
      </div>

      <div className="mb-2 grid grid-cols-2 gap-1.5">
        <Stat label="Headings" value={withheldValue ?? context.headingCount} />
        <Stat label="YAML" value={withheldValue ?? `${context.frontmatterFieldCount} fields`} />
        <Stat label="Links" value={withheldValue ?? context.outgoingLinks.length} />
        <Stat label="Policy" value={displayPolicy.badgeLabel} />
      </div>

      <div className="mb-2 grid gap-1">
        <div className="mb-0.5 flex items-center gap-1 text-[11px] text-muted-foreground">
          <Workflow className="size-3" />
          Ledger
        </div>
        <OrchestrationRow
          icon={<ShieldCheck className="size-3" />}
          label="Policy"
          value={displayPolicy.reason}
        />
        <OrchestrationRow
          icon={<Brain className="size-3" />}
          label="Memory"
          value={memoryState}
        />
        <OrchestrationRow
          icon={<Network className="size-3" />}
          label="Chitragupta"
          value={contractState}
        />
        <OrchestrationRow
          icon={<Sparkles className="size-3" />}
          label="Records"
          value={ledgerState}
        />
      </div>

      {ledgerRecords.length > 0 ? (
        <div className="mb-2 grid gap-1">
          {ledgerRecords.slice(0, 3).map((record, index) => (
            <LedgerRecordRow
              key={record.path}
              index={index}
              record={record}
              onNavigate={onNavigate}
              onUpdateRecordProperty={onUpdateRecordProperty}
              onDeleteRecordProperty={onDeleteRecordProperty}
            />
          ))}
        </div>
      ) : null}

      {context.relatedTitles.length > 0 && (
        <div className="mb-2">
          <div className="mb-1 flex items-center gap-1 text-[11px] text-muted-foreground">
            <Network className="size-3" />
            Related context
          </div>
          <div className="flex flex-wrap gap-1">
            {context.relatedTitles.map((title) => (
              <Badge key={title} variant="secondary" className="max-w-full rounded-md text-[10px]">
                <span className="truncate">{title}</span>
              </Badge>
            ))}
          </div>
        </div>
      )}

      <div className="rounded-md bg-muted/30 px-2 py-1 text-[11px] text-muted-foreground">
        Local-only notes never leave this vault through agent context.
      </div>
    </section>
  )
}

function splitLedgerList(value: string): string[] {
  return value.split(',').map(item => item.trim()).filter(Boolean)
}

function nextMemoryVersion(value: string | number | null): number {
  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed >= 0 ? parsed + 1 : 1
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
