import { ShieldAlert, ShieldCheck } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

interface AgentPreflightGateProps {
  gatedLaneCount?: number
  heldLocalCount?: number
  label: string
  protectedContext?: boolean
  readyLaneCount?: number
  sourceCount?: number
  trimmedCount?: number
  unavailableLaneCount?: number
}

/** Shows the Locality Firewall result before an agent receives context. */
export function AgentPreflightGate({
  gatedLaneCount,
  heldLocalCount = 0,
  label,
  protectedContext = false,
  readyLaneCount,
  sourceCount = 0,
  trimmedCount = 0,
  unavailableLaneCount,
}: AgentPreflightGateProps) {
  const Icon = protectedContext ? ShieldAlert : ShieldCheck
  const stateLabel = protectedContext ? 'Local-only gate' : 'Source-safe packet'
  const detail = protectedContext
    ? 'Protected context stays local; no title, path, body, or excerpt is in this packet.'
    : 'Only listed source labels and counts are in this packet; private lanes stay withheld.'

  return (
    <section
      className="grimoire-agent-preflight grid gap-2 rounded-md border border-border p-3"
      data-testid="agent-preflight-gate"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">
          <Icon className="size-3.5" />
          {label}
        </div>
        <Badge variant={protectedContext ? 'destructive' : 'secondary'} className="rounded-md">
          {stateLabel}
        </Badge>
      </div>
      <div className="grid gap-2 text-xs sm:grid-cols-3">
        <PreflightMetric label="Allowed context" value={sourceCount} />
        <PreflightMetric label="Held local" value={heldLocalCount} />
        <PreflightMetric label="Trimmed" value={trimmedCount} />
      </div>
      {readyLaneCount != null && gatedLaneCount != null && unavailableLaneCount != null ? (
        <div className="grid gap-2 text-xs sm:grid-cols-3" data-testid="agent-preflight-lanes">
          <PreflightMetric label="Ready lanes" value={readyLaneCount} />
          <PreflightMetric label="Private gated" value={gatedLaneCount} />
          <PreflightMetric label="Unavailable" value={unavailableLaneCount} />
        </div>
      ) : null}
      <p className="text-xs leading-relaxed text-muted-foreground">{detail}</p>
    </section>
  )
}

function PreflightMetric({ label, value }: { label: string; value: number }) {
  return (
    <div className="grimoire-agent-preflight__metric rounded-md border border-border px-2.5 py-2">
      <div className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">{label}</div>
      <div className="mt-1 text-sm font-semibold text-foreground">{value}</div>
    </div>
  )
}
