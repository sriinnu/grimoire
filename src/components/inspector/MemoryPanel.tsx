import { Brain, CircleAlert, Network, Search, Sparkles } from 'lucide-react'
import { useMemo } from 'react'
import type { MarkdownDocumentSemantics } from '@grimoire/markdown-editor'
import type { VaultEntry } from '../../types'
import { Badge } from '../ui/badge'
import { buildChitraguptaMemoryContext } from '../../lib/chitraguptaIntegration'

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

/** Chitragupta-ready memory lane for the active note. */
export function MemoryPanel({ entry, entries, semantics }: MemoryPanelProps) {
  const context = useMemo(
    () => buildChitraguptaMemoryContext(entry, entries, semantics),
    [entry, entries, semantics],
  )
  const pendingCapabilities = context.requiredCapabilities.length

  return (
    <section data-testid="memory-panel">
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
          <CircleAlert className="mt-0.5 size-3.5 shrink-0" />
          <span>
            Waiting for Chitragupta status, recall, wiki, graph, ingest, and diagnostics MCP tools.
          </span>
        </div>
      </div>

      <div className="mb-2 grid grid-cols-2 gap-1.5">
        <Stat label="Headings" value={context.headingCount} />
        <Stat label="YAML" value={`${context.frontmatterFieldCount} fields`} />
        <Stat label="Links" value={context.outgoingLinks.length} />
        <Stat label="Needed" value={`${pendingCapabilities} tools`} />
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

      <div className="grid gap-1 text-[11px] text-muted-foreground">
        <div className="flex items-center gap-1.5 rounded-md bg-muted/30 px-2 py-1">
          <Search className="size-3" />
          <span className="truncate">Next: source-backed recall for this note.</span>
        </div>
        <div className="flex items-center gap-1.5 rounded-md bg-muted/30 px-2 py-1">
          <Sparkles className="size-3" />
          <span className="truncate">Then: crystallize clean Markdown back into the vault.</span>
        </div>
      </div>
    </section>
  )
}
