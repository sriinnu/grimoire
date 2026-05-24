import { FileSearch, FileStack, Network, PackageCheck, ShieldCheck } from 'lucide-react'
import type { ReactNode } from 'react'
import type { ContextCapsulePreview } from '../lib/contextCapsule'
import { Badge } from './ui/badge'
import { Button } from './ui/button'

interface ContextCapsuleCardProps {
  preview: ContextCapsulePreview
  onReviewPackage?: () => void
}

/** Shows the local context package that would be handed to an agent. */
export function ContextCapsuleCard({ preview, onReviewPackage }: ContextCapsuleCardProps) {
  const stateLabel = preview.state === 'protected'
    ? 'Protected'
    : preview.state === 'empty' ? 'Empty' : 'Preview'

  return (
    <section className="border-b border-border px-3 py-2" data-testid="context-capsule-card">
      <div className="rounded-md border border-border bg-muted/25 p-2">
        <div className="flex items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-1.5 text-[11px] font-medium text-foreground">
            <PackageCheck className="size-3.5 shrink-0 text-muted-foreground" />
            <span>Context Capsule</span>
          </div>
          <Badge variant={preview.state === 'protected' ? 'secondary' : 'outline'} className="h-5 rounded-md px-1.5 text-[10px]">
            {stateLabel}
          </Badge>
        </div>
        {onReviewPackage ? (
          <Button
            type="button"
            variant="outline"
            size="xs"
            className="mt-2 w-full justify-start"
            onClick={onReviewPackage}
            data-testid="context-capsule-review"
          >
            <FileSearch className="size-3" />
            Review capsule package
          </Button>
        ) : null}

        <div className="mt-2 grid grid-cols-2 gap-1.5">
          <CapsuleStat label="Notes" value={preview.counts.selectedNotes} />
          <CapsuleStat label="Linked" value={preview.counts.linkedNotes} />
          <CapsuleStat label="List" value={preview.counts.noteListItems} />
          <CapsuleStat label="Held" value={preview.counts.exclusions} />
        </div>

        <div className="mt-2 flex flex-wrap gap-1">
          <CapsuleBadge icon={<ShieldCheck className="size-3" />} label={preview.rules[1]} />
          <CapsuleBadge icon={<Network className="size-3" />} label={`${preview.projectMap.graphNodes} graph notes`} />
          <CapsuleBadge icon={<Network className="size-3" />} label={`${preview.projectMap.graphEdges} graph edges`} />
          {preview.projectMap.graphOmitted > 0 ? (
            <CapsuleBadge icon={<ShieldCheck className="size-3" />} label={`${preview.projectMap.graphOmitted} graph held`} />
          ) : null}
          <CapsuleBadge icon={<FileStack className="size-3" />} label={preview.rules[2]} />
        </div>

        {preview.includedNotes.length > 0 ? (
          <div className="mt-2 flex flex-wrap gap-1" data-testid="context-capsule-included">
            {preview.includedNotes.slice(0, 3).map((note) => (
              <Badge key={note.path} variant="secondary" className="max-w-full rounded-md text-[10px]">
                <span className="truncate">{note.title}</span>
              </Badge>
            ))}
          </div>
        ) : null}

        {preview.exclusions.length > 0 ? (
          <div className="mt-2 grid gap-1" data-testid="context-capsule-exclusions">
            {preview.exclusions.slice(0, 3).map((item) => (
              <div key={item.label} className="flex min-w-0 items-center justify-between gap-2 text-[10px] text-muted-foreground">
                <span className="truncate">{item.label}</span>
                <span className="shrink-0">{item.reason}</span>
              </div>
            ))}
          </div>
        ) : null}
      </div>
    </section>
  )
}

function CapsuleStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md bg-background/60 px-2 py-1">
      <div className="text-[9px] uppercase tracking-[0.08em] text-muted-foreground">{label}</div>
      <div className="text-[12px] font-medium text-foreground">{value}</div>
    </div>
  )
}

function CapsuleBadge({ icon, label }: { icon: ReactNode; label: string }) {
  return (
    <Badge variant="outline" className="h-5 max-w-full rounded-md px-1.5 text-[9px]">
      {icon}
      <span className="truncate">{label}</span>
    </Badge>
  )
}
