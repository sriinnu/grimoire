import { Repeat2 } from 'lucide-react'
import type { PortabilityCapsuleLoopProof as CapsuleLoopProof } from '../lib/portabilityCapsuleLoopProof'
import { Badge } from './ui/badge'

interface PortabilityCapsuleLoopProofProps {
  proof: CapsuleLoopProof
}

/** Shows whether local JSON/SQLite capsule export and import previews are paired. */
export function PortabilityCapsuleLoopProof({ proof }: PortabilityCapsuleLoopProofProps) {
  return (
    <section
      aria-label="Local capsule loop proof"
      className="grimoire-preview-stat grid gap-1.5 rounded-md border border-border px-2 py-1.5"
      data-loop-status={proof.status}
      data-testid="portability-capsule-loop-proof"
    >
      <div className="flex min-w-0 flex-wrap items-center gap-1.5">
        <Repeat2 className="size-3.5 text-muted-foreground" />
        <span className="min-w-0 text-xs font-semibold text-foreground">Local capsule loop</span>
        <Badge variant={proof.status === 'reviewed' ? 'secondary' : 'outline'} className="rounded-md text-[10px]">
          {proof.statusLabel}
        </Badge>
        <Badge variant="outline" className="rounded-md text-[10px]">
          {proof.formatLabel}
        </Badge>
      </div>
      <div className="text-[11px] leading-snug text-muted-foreground">{proof.detail}</div>
      <div className="grid gap-1 sm:grid-cols-2" data-testid="portability-capsule-loop-steps">
        {proof.steps.map(step => (
          <div
            className="rounded-md border border-border/70 px-2 py-1 text-[10px] text-muted-foreground"
            data-step-status={step.status}
            data-testid={`portability-capsule-loop-step-${step.id}`}
            key={step.id}
          >
            <span className="font-semibold text-foreground">{step.label}</span>
            <span className="ml-1">{step.status}</span>
          </div>
        ))}
      </div>
    </section>
  )
}
