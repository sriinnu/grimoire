import type { ReactNode } from 'react'
import { Brain, CircleAlert, Network, ShieldCheck, Sparkles, Workflow } from 'lucide-react'
import { useMemo } from 'react'
import type { MarkdownDocumentSemantics } from '@grimoire/markdown-editor'
import type { VaultEntry } from '../../types'
import { Badge } from '../ui/badge'
import { buildChitraguptaMemoryContext } from '../../lib/chitraguptaIntegration'
import { resolveEntryLocalityPolicy } from '../../lib/localityPolicy'
import { findMemoryLedgerRecordsForEntry, type MemoryLedgerRecord } from '../../lib/memoryLedger'

interface MemoryPanelProps {
  entry: VaultEntry
  entries: VaultEntry[]
  semantics: MarkdownDocumentSemantics
}

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

function LedgerRecordRow({ record }: { record: MemoryLedgerRecord }) {
  return (
    <div className="rounded-md bg-muted/30 px-2 py-1.5 text-[11px]" data-testid="memory-ledger-record">
      <div className="flex min-w-0 items-center gap-1.5">
        <Sparkles className="size-3 shrink-0 text-muted-foreground" />
        <span className="min-w-0 flex-1 truncate text-foreground">{record.title}</span>
        {record.confidence !== null ? (
          <span className="shrink-0 text-muted-foreground">{record.confidence}</span>
        ) : null}
      </div>
      {record.summary ? (
        <div className="mt-0.5 line-clamp-2 text-muted-foreground">{record.summary}</div>
      ) : null}
      <div className="mt-1 flex flex-wrap gap-1">
        {record.lastSeen ? <Badge variant="outline" className="rounded-md text-[10px]">Seen {record.lastSeen}</Badge> : null}
        {record.expiresAt ? <Badge variant="outline" className="rounded-md text-[10px]">Expires {record.expiresAt}</Badge> : null}
        {record.contradicts.length > 0 ? <Badge variant="outline" className="rounded-md text-[10px]">Contradicts {record.contradicts.length}</Badge> : null}
      </div>
    </div>
  )
}

/** Chitragupta-ready memory lane for the active note. */
export function MemoryPanel({ entry, entries, semantics }: MemoryPanelProps) {
  const context = useMemo(
    () => buildChitraguptaMemoryContext(entry, entries, semantics),
    [entry, entries, semantics],
  )
  const displayPolicy = useMemo(() => resolveEntryLocalityPolicy(entry), [entry])
  const ledgerRecords = useMemo(() => (
    displayPolicy.localOnly ? [] : findMemoryLedgerRecordsForEntry(entry, entries)
  ), [displayPolicy.localOnly, entries, entry])
  const withheldValue = displayPolicy.localOnly ? 'Withheld' : null
  const localityDetail = displayPolicy.localOnly
    ? `${displayPolicy.reason}. Body, title, path, and frontmatter stay out of AI prompts.`
    : 'Agent context can use this note while protected lanes stay withheld.'
  const memoryState = displayPolicy.localOnly ? 'Withheld' : 'Ready for recall'
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
          icon={<Sparkles className="size-3" />}
          label="Records"
          value={ledgerState}
        />
      </div>

      {ledgerRecords.length > 0 ? (
        <div className="mb-2 grid gap-1">
          {ledgerRecords.slice(0, 3).map(record => <LedgerRecordRow key={record.path} record={record} />)}
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
