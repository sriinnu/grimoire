import { CloudCheck, Database, FileArrowDown, ShieldCheck, TerminalWindow } from '@phosphor-icons/react'
import { ClipboardCheck, Copy } from 'lucide-react'
import { useState } from 'react'
import type { ReactNode } from 'react'
import {
  listPortabilityProofRows,
  parseObjectStorageLiveProofReport,
  portabilityProofLevelLabel,
  type ObjectStorageLiveProofReport,
  type PortabilityProofCommand,
  type PortabilityProofRow,
  type PortabilityProofState,
} from '../lib/portabilityProof'
import { buildPortabilityCapsuleLoopProof } from '../lib/portabilityCapsuleLoopProof'
import { Badge } from './ui/badge'
import { Button } from './ui/button'
import { PortabilityCapsuleLoopProof } from './PortabilityCapsuleLoopProof'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from './ui/dialog'
import { Textarea } from './ui/textarea'

const PROOF_ROW_ICONS: Record<PortabilityProofRow['id'], ReactNode> = {
  imports: <FileArrowDown size={15} />,
  exports: <ShieldCheck size={15} />,
  'desktop-sync': <CloudCheck size={15} />,
  'object-storage': <Database size={15} />,
  'provider-proof-runner': <TerminalWindow size={15} />,
}

/** Shows the real proof state for portability lanes without overclaiming cloud sync. */
export function PortabilityProofLedger(proofState: PortabilityProofState = {}) {
  const [pastedProofReport, setPastedProofReport] = useState<ObjectStorageLiveProofReport | null>(null)
  const effectiveProofState = {
    ...proofState,
    objectStorageLiveProofReport: pastedProofReport ?? proofState.objectStorageLiveProofReport,
  }
  const rows = listPortabilityProofRows(effectiveProofState)
  const capsuleLoopProof = buildPortabilityCapsuleLoopProof({
    exportPreview: effectiveProofState.capsuleExportPreview,
    importPreview: effectiveProofState.capsuleImportPreview,
  })

  return (
    <section
      aria-label="Portability proof ledger"
      className="grimoire-portability-card grid gap-2 rounded-md border border-border p-3"
      data-testid="portability-proof-ledger"
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <span className="mt-0.5 text-muted-foreground"><ShieldCheck size={15} /></span>
        <span className="min-w-0">
          <span className="block text-xs font-semibold text-foreground">Portability Status</span>
          <span className="block text-[11px] leading-snug text-muted-foreground">
            Import, export, and sync claims stay visible without hiding local-only boundaries.
          </span>
        </span>
        <ProofReportDialog
          hasPastedReport={Boolean(pastedProofReport)}
          onClear={() => setPastedProofReport(null)}
          onLoad={setPastedProofReport}
        />
      </div>

      <PortabilityCapsuleLoopProof proof={capsuleLoopProof} />

      <div className="grid gap-1.5">
        {rows.map((row) => (
          <ProofLedgerRow key={row.id} row={row} />
        ))}
      </div>
    </section>
  )
}

function ProofReportDialog({
  hasPastedReport,
  onClear,
  onLoad,
}: {
  hasPastedReport: boolean
  onClear: () => void
  onLoad: (report: ObjectStorageLiveProofReport) => void
}) {
  const [draft, setDraft] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [open, setOpen] = useState(false)

  function loadReport() {
    const report = parseObjectStorageLiveProofReport(draft)
    if (!report) {
      setError('Paste a redacted grimoire-object-storage-live-proof-v1 JSON report.')
      return
    }
    onLoad(report)
    setDraft('')
    setError(null)
    setOpen(false)
  }

  function clearReport() {
    onClear()
    setError(null)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button
        aria-label="Paste redacted proof report"
        className="h-7 shrink-0 px-2 text-[11px]"
        onClick={() => setOpen(true)}
        size="xs"
        type="button"
        variant="outline"
      >
        <ClipboardCheck className="size-3" />
        Proof report
      </Button>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Load Proof Report</DialogTitle>
          <DialogDescription>
            Paste the redacted JSON from the live proof runner. Grimoire keeps only provider status, gate state, and set/missing config evidence.
          </DialogDescription>
        </DialogHeader>
        <Textarea
          aria-label="Redacted proof report JSON"
          className="min-h-36 font-mono text-xs"
          onChange={(event) => setDraft(event.currentTarget.value)}
          placeholder='{"schema":"grimoire-object-storage-live-proof-v1",...}'
          value={draft}
        />
        {error ? <div className="text-xs text-destructive">{error}</div> : null}
        <DialogFooter>
          <Button disabled={!hasPastedReport} onClick={clearReport} type="button" variant="outline">
            Clear pasted proof
          </Button>
          <Button onClick={loadReport} type="button">
            Load report
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function ProofLedgerRow({ row }: { row: PortabilityProofRow }) {
  const [copiedCommand, setCopiedCommand] = useState<string | null>(null)
  const [failedCommand, setFailedCommand] = useState<string | null>(null)
  const [detailsOpen, setDetailsOpen] = useState(false)
  const hasDeveloperProof = Boolean(row.commands?.length || row.providerRequirements?.length)

  async function copyCommand(proofCommand: PortabilityProofCommand) {
    setCopiedCommand(null)
    setFailedCommand(null)
    if (typeof navigator === 'undefined' || !navigator.clipboard?.writeText) {
      setFailedCommand(proofCommand.id)
      return
    }

    try {
      await navigator.clipboard.writeText(proofCommand.command)
      setCopiedCommand(proofCommand.id)
    } catch {
      setFailedCommand(proofCommand.id)
    }
  }

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
          {supportStatusLabel(row.supportStatus)}
        </Badge>
        <Badge variant="outline" className="rounded-md text-[10px]">
          {proofLevelDisplayLabel(row.proofLevel)}
        </Badge>
        <span className="min-w-0 text-[11px] text-muted-foreground">{row.detail}</span>
      </div>
      <div className="text-[11px] leading-snug text-muted-foreground">{row.evidence}</div>
      {row.liveProofs?.length ? (
        <div className="grid gap-1" aria-label={`${row.label} live proof`}>
          {row.liveProofs.map((proof) => (
            <div
              className="grimoire-preview-stat rounded-md border border-border/70 px-2 py-1 text-[10px] leading-snug text-muted-foreground"
              data-testid={`portability-proof-live-${proof.id}`}
              key={proof.id}
            >
              <span className="font-semibold text-foreground">{proof.label}: {proof.status}</span>
              <span className="block">{proof.detail}</span>
            </div>
          ))}
        </div>
      ) : null}
      <Button
        aria-expanded={detailsOpen}
        className="h-6 w-fit px-2 text-[11px]"
        data-testid={`portability-proof-details-toggle-${row.id}`}
        onClick={() => setDetailsOpen((open) => !open)}
        size="xs"
        type="button"
        variant="ghost"
      >
        {detailsOpen
          ? hasDeveloperProof ? 'Hide developer proof' : 'Hide proof details'
          : hasDeveloperProof ? 'Developer proof details' : 'Show proof details'}
      </Button>
      {detailsOpen ? (
        <div
          className="grid gap-1.5 border-t border-border/70 pt-1.5"
          data-testid={`portability-proof-details-${row.id}`}
        >
          {row.commands?.length ? (
            <div className="grid gap-1">
              {row.commands.map((proofCommand) => {
                const copyState = copiedCommand === proofCommand.id
                  ? 'copied'
                  : failedCommand === proofCommand.id ? 'failed' : 'idle'

                return (
                  <div className="flex min-w-0 items-center gap-2" key={proofCommand.id}>
                    <Button
                      aria-label={`${proofCommand.label} command`}
                      className="h-6 border-border px-2 text-[11px] text-foreground"
                      onClick={() => {
                        void copyCommand(proofCommand)
                      }}
                      size="xs"
                      type="button"
                      variant="outline"
                    >
                      {copyState === 'copied' ? <ClipboardCheck className="size-3" /> : <Copy className="size-3" />}
                      {copyState === 'copied' ? 'Copied' : copyState === 'failed' ? 'Copy failed' : proofCommand.label}
                    </Button>
                    <span className="min-w-0 truncate font-mono text-[10px] text-muted-foreground">
                      {proofCommand.command}
                    </span>
                    <span className="hidden min-w-[11rem] text-[10px] text-muted-foreground sm:inline">
                      {proofCommand.detail}
                    </span>
                  </div>
                )
              })}
            </div>
          ) : null}
          {row.providerRequirements?.length ? (
            <div
              aria-label={`${row.label} setup checklist`}
              className="grid gap-1 text-[10px] leading-snug text-muted-foreground"
            >
              {row.providerRequirements.map((requirement) => (
                <div className="grid gap-0.5" key={requirement.id}>
                  <span className="font-semibold text-foreground">{requirement.label} setup</span>
                  <span>
                    gate <code className="font-mono text-foreground">{requirement.gate}</code>; required{' '}
                    <EnvNameList names={requirement.required} />; optional <EnvNameList names={requirement.optional} />
                  </span>
                  <span>Still needs {requirement.proofNeed}.</span>
                </div>
              ))}
            </div>
          ) : null}
          <div className="text-[11px] leading-snug text-muted-foreground">
            Still to prove: {row.remainingProof}
          </div>
        </div>
      ) : null}
    </div>
  )
}

function supportStatusLabel(status: PortabilityProofRow['supportStatus']): string {
  if (status === 'ready') return 'ready'
  if (status === 'fixture') return 'preview-backed'
  if (status === 'available') return 'opt-in'
  return status
}

function proofLevelDisplayLabel(level: PortabilityProofRow['proofLevel']): string {
  if (level === 'live-provider-proof-runner') return 'manual live proof'
  return portabilityProofLevelLabel(level)
}

function EnvNameList({ names }: { names: readonly string[] }) {
  return (
    <>
      {names.map((name, index) => (
        <span key={name}>
          {index > 0 ? ', ' : null}
          <code className="font-mono text-foreground">{name}</code>
        </span>
      ))}
    </>
  )
}
