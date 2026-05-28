import { CloudCheck, Database, FileArrowDown, ShieldCheck } from '@phosphor-icons/react'
import type { ReactNode } from 'react'
import {
  listPortabilityProofRows,
  portabilityProofLevelLabel,
  type PortabilityProofRow,
} from '../lib/portabilityProof'
import { Badge } from './ui/badge'

const PROOF_ROW_ICONS: Record<PortabilityProofRow['id'], ReactNode> = {
  imports: <FileArrowDown size={15} />,
  exports: <ShieldCheck size={15} />,
  'desktop-sync': <CloudCheck size={15} />,
  'object-storage': <Database size={15} />,
}

/** Shows the real proof state for portability lanes without overclaiming cloud sync. */
export function PortabilityProofLedger() {
  const rows = listPortabilityProofRows()

  return (
    <section
      aria-label="Portability proof ledger"
      className="grimoire-portability-card grid gap-2 rounded-md border border-border p-3"
      data-testid="portability-proof-ledger"
    >
      <div className="flex items-start gap-2">
        <span className="mt-0.5 text-muted-foreground"><ShieldCheck size={15} /></span>
        <span className="min-w-0">
          <span className="block text-xs font-semibold text-foreground">Proof Ledger</span>
          <span className="block text-[11px] leading-snug text-muted-foreground">
            Support status, proof level, and remaining live-provider checks stay separate.
          </span>
        </span>
      </div>

      <div className="grid gap-1.5">
        {rows.map((row) => (
          <ProofLedgerRow key={row.id} row={row} />
        ))}
      </div>
    </section>
  )
}

function ProofLedgerRow({ row }: { row: PortabilityProofRow }) {
  return (
    <div
      className="grimoire-preview-stat grid gap-1 rounded-md border border-border px-2 py-1.5"
      data-proof-level={row.proofLevel}
      data-support-status={row.supportStatus}
      data-testid={`portability-proof-${row.id}`}
    >
      <div className="flex min-w-0 flex-wrap items-center gap-1.5">
        <span className="text-muted-foreground">{PROOF_ROW_ICONS[row.id]}</span>
        <span className="min-w-0 text-xs font-semibold text-foreground">{row.label}</span>
        <Badge variant={row.supportStatus === 'ready' ? 'secondary' : 'outline'} className="rounded-md text-[10px]">
          {row.supportStatus}
        </Badge>
        <Badge variant="outline" className="rounded-md text-[10px]">
          {portabilityProofLevelLabel(row.proofLevel)}
        </Badge>
        <span className="min-w-0 text-[11px] text-muted-foreground">{row.detail}</span>
      </div>
      <div className="text-[11px] leading-snug text-muted-foreground">{row.evidence}</div>
      <div className="text-[11px] leading-snug text-muted-foreground">
        Still to prove: {row.remainingProof}
      </div>
    </div>
  )
}
