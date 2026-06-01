import { CircleAlert, Clock3, ExternalLink, ShieldAlert } from 'lucide-react'
import type { ReactNode } from 'react'
import type { MemoryLedgerAuditItem, MemoryLedgerTone } from '../../lib/memoryLedger'
import { Badge } from '../ui/badge'
import { Button } from '../ui/button'

interface MemoryLedgerAuditStripProps {
  items: MemoryLedgerAuditItem[]
  onNavigate?: (target: string) => void
}

/** Shows the next metadata-only Memory Ledger review items for the active note. */
export function MemoryLedgerAuditStrip({ items, onNavigate }: MemoryLedgerAuditStripProps) {
  if (items.length === 0) return null
  const [nextItem, ...rest] = items

  return (
    <div
      className="grimoire-memory-audit mb-2 rounded-md border px-2 py-2 text-[11px]"
      data-memory-tone={nextItem.tone}
      data-testid="memory-ledger-audit-strip"
      aria-label="Memory ledger review queue"
    >
      <div className="mb-1.5 flex items-start gap-2">
        <span className="grimoire-memory-audit__icon mt-0.5 shrink-0">{auditIcon(nextItem.reason)}</span>
        <span className="min-w-0 flex-1">
          <span className="block truncate font-medium text-foreground">{nextItem.title}</span>
          <span className="block truncate text-muted-foreground">{nextItem.label}</span>
        </span>
        <LedgerAuditBadge tone={nextItem.tone}>{reasonLabel(nextItem.reason)}</LedgerAuditBadge>
      </div>
      <div className="flex items-center justify-between gap-2">
        <span className="truncate text-muted-foreground">
          {rest.length > 0 ? `${rest.length} more review item${rest.length === 1 ? '' : 's'}` : 'Review queue clear after this'}
        </span>
        {onNavigate ? (
          <Button
            type="button"
            size="xs"
            variant="outline"
            aria-label={`Open memory audit item ${nextItem.title}`}
            onClick={() => onNavigate(nextItem.path)}
          >
            <ExternalLink className="size-3" />
            Review
          </Button>
        ) : null}
      </div>
    </div>
  )
}

function LedgerAuditBadge({ children, tone }: { children: ReactNode; tone: MemoryLedgerTone }) {
  return (
    <Badge variant="outline" className="memory-ledger-badge rounded-md text-[10px]" data-memory-tone={tone}>
      {children}
    </Badge>
  )
}

function auditIcon(reason: MemoryLedgerAuditItem['reason']): ReactNode {
  if (reason === 'expired' || reason === 'expiring' || reason === 'stale') return <Clock3 className="size-3.5" />
  if (reason === 'unreviewed') return <ShieldAlert className="size-3.5" />
  return <CircleAlert className="size-3.5" />
}

function reasonLabel(reason: MemoryLedgerAuditItem['reason']): string {
  if (reason === 'expired') return 'Expired'
  if (reason === 'expiring') return 'Expiring'
  if (reason === 'stale') return 'Stale'
  if (reason === 'unreviewed') return 'Review'
  return 'Conflict'
}
