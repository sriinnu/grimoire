import { ScanSearch } from 'lucide-react'
import type { AgentCouncilEvidence } from '../lib/agentCouncilTypes'
import { Badge } from './ui/badge'
import { Button } from './ui/button'

interface AgentCouncilEvidenceListProps {
  evidence: AgentCouncilEvidence[]
  memberId: string
  memberLabel: string
  onOpenSource?: (path: string) => void
}

/** Renders the source-safe evidence a Council lane used for its stance. */
export function AgentCouncilEvidenceList({
  evidence,
  memberId,
  memberLabel,
  onOpenSource,
}: AgentCouncilEvidenceListProps) {
  const visibleEvidence = evidence.slice(0, 2)
  if (visibleEvidence.length === 0) return null

  return (
    <div
      className="grimoire-agent-council__evidence mt-1 rounded-md border border-border/70 bg-background/45 p-1"
      data-testid="agent-council-evidence"
    >
      <div className="mb-1 flex items-center gap-1 text-[9px] font-medium text-muted-foreground">
        <ScanSearch className="size-3" />
        <span>Evidence</span>
      </div>
      <div className="grid gap-1">
        {visibleEvidence.map((item) => (
          <EvidenceChip
            key={`${memberId}:${item.sourceKind}:${item.label}:${item.detail}`}
            evidence={item}
            memberLabel={memberLabel}
            onOpenSource={onOpenSource}
          />
        ))}
      </div>
    </div>
  )
}

function EvidenceChip({
  evidence,
  memberLabel,
  onOpenSource,
}: {
  evidence: AgentCouncilEvidence
  memberLabel: string
  onOpenSource?: (path: string) => void
}) {
  const body = (
    <span className="flex min-w-0 flex-col items-start leading-tight">
      <span className="max-w-full truncate">{evidence.label}</span>
      <span className="max-w-full truncate font-normal opacity-75">{evidence.detail}</span>
    </span>
  )
  const navigationTarget = evidence.navigationTarget ?? evidence.label
  if (evidence.targetPath && onOpenSource) {
    return (
      <Button
        type="button"
        variant="outline"
        size="xs"
        className={`h-auto min-h-8 w-full min-w-0 max-w-full shrink justify-start overflow-hidden whitespace-normal px-1 py-0.5 text-left text-[9px] ${evidenceClass(evidence.sourceKind)}`}
        aria-label={`Open ${evidence.label} evidence for ${memberLabel}`}
        onClick={() => onOpenSource(navigationTarget)}
        data-source-kind={evidence.sourceKind}
      >
        {body}
      </Button>
    )
  }

  return (
    <Badge
      variant="outline"
      className={`h-auto max-w-full justify-start rounded-md px-1 py-0.5 text-left text-[9px] ${evidenceClass(evidence.sourceKind)}`}
      data-source-kind={evidence.sourceKind}
    >
      {body}
    </Badge>
  )
}

function evidenceClass(kind: AgentCouncilEvidence['sourceKind']): string {
  if (kind === 'withheld') return 'border-[var(--grimoire-private-local-accent)] text-[var(--grimoire-private-local-accent)]'
  if (kind === 'graph-node') return 'border-[var(--grimoire-signal-border)] text-[var(--grimoire-signal-text)]'
  return ''
}
