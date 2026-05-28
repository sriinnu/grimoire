import type { ReactNode } from 'react'
import { Brain, CircleAlert, Network, ShieldCheck, Sparkles, Terminal, Workflow } from 'lucide-react'
import { useMemo } from 'react'
import type { MarkdownDocumentSemantics } from '@grimoire/markdown-editor'
import type { VaultEntry } from '../../types'
import type { AiAgentAvailability } from '../../lib/aiAgents'
import { Badge } from '../ui/badge'
import {
  buildChitraguptaMemoryContext,
  evaluateChitraguptaContractStatus,
  summarizeChitraguptaRuntimeReadiness,
  type ChitraguptaStatusPayload,
} from '../../lib/chitraguptaIntegration'
import { resolveEntryLocalityPolicy } from '../../lib/localityPolicy'
import {
  buildMemoryLedgerAuditQueue,
  findMemoryLedgerRecordsForEntry,
  summarizeMemoryLedgerEvidence,
  type MemoryLedgerEvidenceSummary,
} from '../../lib/memoryLedger'
import { MemoryLedgerAuditStrip } from './MemoryLedgerAuditStrip'
import { MemoryLedgerRecordRow, type MemoryRecordPropertyUpdate } from './MemoryLedgerRecordRow'

interface MemoryPanelProps {
  entry: VaultEntry
  entries: VaultEntry[]
  semantics: MarkdownDocumentSemantics
  chitraguptaStatus?: ChitraguptaStatusPayload | null
  chitraguptaAvailability?: AiAgentAvailability | null
  onNavigate?: (target: string) => void
  onUpdateRecordProperty?: MemoryRecordPropertyUpdate
  onDeleteRecordProperty?: (path: string, key: string) => Promise<void> | void
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="grimoire-memory-stat min-w-0 rounded-md px-2 py-1">
      <div className="grimoire-memory-stat__label text-[10px] uppercase tracking-[0.08em]">{label}</div>
      <div className="grimoire-memory-stat__value truncate text-[12px]">{value}</div>
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
    <div className="grimoire-memory-orchestration-row flex min-w-0 items-center gap-2 rounded-md px-2 py-1.5 text-[11px]">
      <span className="grimoire-memory-orchestration-row__icon shrink-0">{icon}</span>
      <span className="grimoire-memory-orchestration-row__label min-w-0 flex-1 truncate">{label}</span>
      <span className="grimoire-memory-orchestration-row__value max-w-[8rem] truncate text-right">{value}</span>
    </div>
  )
}

function pluralCount(count: number, noun: string): string {
  return `${count} ${noun}${count === 1 ? '' : 's'}`
}

function LedgerEvidenceStrip({ summary }: { summary: MemoryLedgerEvidenceSummary }) {
  return (
    <div
      className="grimoire-memory-evidence mb-2 grid grid-cols-2 gap-1.5"
      data-testid="memory-ledger-evidence-strip"
      aria-label="Memory ledger evidence summary"
    >
      <Stat label="Records" value={pluralCount(summary.records, 'record')} />
      <Stat label="Sources" value={pluralCount(summary.sources, 'source')} />
      <Stat label="Contradicts" value={pluralCount(summary.contradictions, 'contradiction')} />
      <Stat label="Review" value={pluralCount(summary.reviewFlags, 'flag')} />
    </div>
  )
}

function RuntimeDiagnosticStrip({
  diagnostic,
}: {
  diagnostic: ReturnType<typeof summarizeChitraguptaRuntimeReadiness>
}) {
  return (
    <div
      className="grimoire-memory-runtime mb-2 rounded-md border px-2 py-2"
      data-state={diagnostic.state}
      data-testid="memory-chitragupta-runtime"
    >
      <div className="mb-1.5 flex items-center gap-1 text-[11px] text-muted-foreground">
        <Terminal className="size-3" />
        Chitragupta runtime
      </div>
      <div className="grid gap-1">
        <RuntimeDiagnosticRow label="CLI" value={diagnostic.cliLabel} />
        <RuntimeDiagnosticRow label="Memory" value={diagnostic.contractLabel} />
        <RuntimeDiagnosticRow label="MCP" value={diagnostic.capabilityLabel} />
      </div>
      {diagnostic.warnings.length > 0 ? (
        <div className="mt-1.5 grid gap-1" data-testid="memory-chitragupta-warnings">
          {diagnostic.warnings.map(warning => (
            <div key={warning} className="grimoire-memory-runtime__warning rounded px-1.5 py-1 text-[10px]">
              {warning}
            </div>
          ))}
        </div>
      ) : null}
    </div>
  )
}

function RuntimeDiagnosticRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grimoire-memory-runtime__row flex min-w-0 items-center justify-between gap-2 text-[11px]">
      <span className="grimoire-memory-runtime__label">{label}</span>
      <span className="grimoire-memory-runtime__value truncate text-right">{value}</span>
    </div>
  )
}

/** Chitragupta-ready memory lane for the active note. */
export function MemoryPanel({
  entry,
  entries,
  semantics,
  chitraguptaStatus = null,
  chitraguptaAvailability = null,
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
  const runtimeDiagnostic = useMemo(
    () => summarizeChitraguptaRuntimeReadiness({
      availability: chitraguptaAvailability,
      contractStatus,
      protectedNote: displayPolicy.localOnly,
    }),
    [chitraguptaAvailability, contractStatus, displayPolicy.localOnly],
  )
  const ledgerRecords = useMemo(() => (
    displayPolicy.localOnly ? [] : findMemoryLedgerRecordsForEntry(entry, entries)
  ), [displayPolicy.localOnly, entries, entry])
  const ledgerEvidence = useMemo(
    () => summarizeMemoryLedgerEvidence(ledgerRecords),
    [ledgerRecords],
  )
  const ledgerAuditItems = useMemo(
    () => buildMemoryLedgerAuditQueue(ledgerRecords),
    [ledgerRecords],
  )
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
  const localityState = displayPolicy.localOnly ? 'local-only' : 'source-safe'

  return (
    <section
      className="inspector-card grimoire-memory-panel"
      data-locality={localityState}
      data-private-surface={displayPolicy.localOnly ? 'memory-protected' : 'memory-ledger'}
      data-testid="memory-panel"
    >
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

      <div className="grimoire-memory-locality-note mb-2 rounded-md border px-2 py-2">
        <div className="flex items-start gap-2 text-[12px]">
          {displayPolicy.localOnly
            ? <ShieldCheck className="mt-0.5 size-3.5 shrink-0" />
            : <CircleAlert className="mt-0.5 size-3.5 shrink-0" />}
          <span>
            {localityDetail}
          </span>
        </div>
      </div>

      <div className="grimoire-memory-stat-grid mb-2 grid grid-cols-2 gap-1.5">
        <Stat label="Headings" value={withheldValue ?? context.headingCount} />
        <Stat label="YAML" value={withheldValue ?? `${context.frontmatterFieldCount} fields`} />
        <Stat label="Links" value={withheldValue ?? context.outgoingLinks.length} />
        <Stat label="Policy" value={displayPolicy.badgeLabel} />
      </div>

      <div className="grimoire-memory-orchestration mb-2 grid gap-1">
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

      <RuntimeDiagnosticStrip diagnostic={runtimeDiagnostic} />

      {!displayPolicy.localOnly ? <LedgerEvidenceStrip summary={ledgerEvidence} /> : null}
      {!displayPolicy.localOnly ? <MemoryLedgerAuditStrip items={ledgerAuditItems} onNavigate={onNavigate} /> : null}

      {ledgerRecords.length > 0 ? (
        <div className="mb-2 grid gap-1">
          {ledgerRecords.slice(0, 3).map((record, index) => (
            <MemoryLedgerRecordRow
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

      <div className="grimoire-memory-footer rounded-md px-2 py-1 text-[11px]">
        Local-only notes never leave this vault through agent context.
      </div>
    </section>
  )
}
