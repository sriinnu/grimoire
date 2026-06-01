import { FileCheck2, GitBranch, ShieldCheck } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import type { AskContextPackage } from '../lib/askContextPackage'
import type { GraphCouncilPrompt } from '../utils/graphCouncilPrompt'
import { AgentPreflightGate } from './AgentPreflightGate'

export interface GraphCouncilReviewDraft {
  contextPackage: AskContextPackage
  prompt: GraphCouncilPrompt
}

interface GraphCouncilReviewDialogProps {
  draft: GraphCouncilReviewDraft | null
  onCancel: () => void
  onConfirm: (draft: GraphCouncilReviewDraft) => void
  open: boolean
}

/** Lets the user inspect the source-safe graph package before agent handoff. */
export function GraphCouncilReviewDialog({
  draft,
  onCancel,
  onConfirm,
  open,
}: GraphCouncilReviewDialogProps) {
  if (!draft) return null

  const graph = draft.contextPackage.graph
  const held = draft.contextPackage.withheld.protectedNotes + (graph?.protectedEdges ?? 0)
  const trimmed = (graph?.truncatedNodes ?? 0) + (graph?.truncatedEdges ?? 0)

  return (
    <Dialog open={open} onOpenChange={(next) => { if (!next) onCancel() }}>
      <DialogContent
        showCloseButton={false}
        className="grid max-h-[calc(100dvh-2rem)] grid-rows-[auto_minmax(0,1fr)_auto] overflow-hidden sm:max-w-[700px]"
        data-testid="graph-council-review-dialog"
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileCheck2 className="size-4" />
            Review graph Council handoff
          </DialogTitle>
          <DialogDescription>
            Inspect the labels, graph counts, and prompt before Grimoire opens the AI panel.
          </DialogDescription>
        </DialogHeader>

        <div className="grid min-h-0 gap-3 overflow-hidden">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary" className="rounded-md">Review first</Badge>
            <Badge variant="outline" className="rounded-md">No note bodies</Badge>
            <Badge variant="outline" className="rounded-md">
              <ShieldCheck className="size-3" />
              Source-safe
            </Badge>
            {held > 0 ? <Badge variant="outline" className="rounded-md">{held} held local</Badge> : null}
            {trimmed > 0 ? <Badge variant="outline" className="rounded-md">{trimmed} trimmed</Badge> : null}
          </div>

          <AgentPreflightGate
            heldLocalCount={held}
            label="Locality Firewall preflight"
            sourceCount={draft.contextPackage.sourceLabels.length}
            trimmedCount={trimmed}
          />

          <section className="grimoire-agent-manifest grid gap-2 rounded-md border border-border p-3">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">
              <GitBranch className="size-3.5" />
              Package manifest
            </div>
            <div className="grid gap-2 text-xs text-muted-foreground sm:grid-cols-3">
              <ManifestMetric label="Notes" value={`${graph?.visibleNodes ?? draft.contextPackage.visibleCount}`} />
              <ManifestMetric label="Links" value={`${graph?.visibleEdges ?? 0}`} />
              <ManifestMetric label="Sources" value={`${draft.contextPackage.sourceLabels.length}`} />
            </div>
            <div className="flex flex-wrap gap-1.5" data-testid="graph-council-review-sources">
              {draft.contextPackage.sourceLabels.slice(0, 8).map((label, index) => (
                <Badge key={`${label}-${index}`} variant="outline" className="rounded-md">{label}</Badge>
              ))}
            </div>
          </section>

          {graph?.edges?.length ? (
            <section className="grimoire-agent-edge-manifest max-h-28 overflow-auto rounded-md border border-border p-3 text-xs text-muted-foreground">
              {graph.edges.slice(0, 5).map((edge, index) => (
                <div key={`${edge.sourceTitle}-${edge.targetTitle}-${edge.label}-${index}`} className="truncate">
                  {edge.sourceTitle}{' -> '}{edge.targetTitle} - {edge.label}
                </div>
              ))}
            </section>
          ) : null}

          <Textarea
            readOnly
            aria-label="Graph Agent Council prompt preview"
            value={draft.prompt.text}
            className="min-h-[220px] resize-none overflow-auto font-mono text-xs"
            data-testid="graph-council-review-prompt"
          />
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
          <Button type="button" onClick={() => onConfirm(draft)}>Open AI with packet</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function ManifestMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="grimoire-agent-manifest__metric rounded-md border border-border px-2.5 py-2">
      <div className="text-[10px] font-semibold uppercase tracking-[0.08em]">{label}</div>
      <div className="mt-1 text-sm font-semibold text-foreground">{value}</div>
    </div>
  )
}
