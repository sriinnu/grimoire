import type { ReactNode } from 'react'
import { Bot, Brain, CircleAlert, Network, ShieldCheck, Workflow } from 'lucide-react'
import { useMemo } from 'react'
import type { MarkdownDocumentSemantics } from '@grimoire/markdown-editor'
import type { VaultEntry } from '../../types'
import { Badge } from '../ui/badge'
import { buildChitraguptaMemoryContext } from '../../lib/chitraguptaIntegration'
import { resolveEntryLocalityPolicy } from '../../lib/localityPolicy'

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

/** Chitragupta-ready memory lane for the active note. */
export function MemoryPanel({ entry, entries, semantics }: MemoryPanelProps) {
  const context = useMemo(
    () => buildChitraguptaMemoryContext(entry, entries, semantics),
    [entry, entries, semantics],
  )
  const displayPolicy = useMemo(() => resolveEntryLocalityPolicy(entry), [entry])
  const withheldValue = displayPolicy.localOnly ? 'Withheld' : null
  const localityDetail = displayPolicy.localOnly
    ? `${displayPolicy.reason}. Body, title, path, and frontmatter stay out of AI prompts.`
    : 'Agent context can use this note while protected lanes stay withheld.'
  const memoryState = displayPolicy.localOnly ? 'Withheld' : 'Ready for recall'

  return (
    <section className="inspector-card" data-testid="memory-panel">
      <div className="mb-2 flex items-center justify-between gap-2">
        <h4 className="font-mono-overline flex items-center gap-1 text-muted-foreground">
          <Brain className="size-3" />
          Memory
        </h4>
        <Badge variant="outline" className="h-5 rounded-md px-1.5 text-[10px]">
          Chitragupta
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
          Agent access
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
          icon={<Bot className="size-3" />}
          label="Writeback"
          value="Local agent"
        />
      </div>

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
