import { CloudCheck, Database, FileArrowDown, ShieldCheck, TerminalWindow } from '@phosphor-icons/react'
import { ClipboardCheck, Copy } from 'lucide-react'
import { useState } from 'react'
import type { ReactNode } from 'react'
import type { createTranslator } from '../lib/i18n'
import type { PortabilityCapsuleFormat } from '../lib/portabilityCapsule'
import type { PortabilityCapsuleLoopLiveProof } from '../lib/portabilityCapsuleLoopLiveProof'
import {
  listPortabilityProofRows,
  type ObjectStorageLiveProofReport,
  type PortabilityProofCommand,
  type PortabilityProofRow,
  type PortabilityProofState,
} from '../lib/portabilityProof'
import { buildPortabilityCapsuleLoopProof } from '../lib/portabilityCapsuleLoopProof'
import { useObjectStorageLiveProofReport } from '../hooks/useObjectStorageLiveProofReport'
import { Badge } from './ui/badge'
import { Button } from './ui/button'
import { PortabilityCapsuleLoopProof } from './PortabilityCapsuleLoopProof'
import { PortabilityProofHistoryStrip } from './PortabilityProofHistoryStrip'
import { PortabilityProofReportDialog } from './PortabilityProofReportDialog'
import { PortabilityProviderFailureMatrix } from './PortabilityProviderFailureMatrix'
import {
  proofCommandCopy,
  proofLevelLabel,
  proofRequirementNeed,
  proofRowCopy,
} from './PortabilityProofLedgerDisplay'

const PROOF_ROW_ICONS: Record<PortabilityProofRow['id'], ReactNode> = {
  imports: <FileArrowDown size={15} />,
  exports: <ShieldCheck size={15} />,
  'desktop-sync': <CloudCheck size={15} />,
  'object-storage': <Database size={15} />,
  'provider-proof-runner': <TerminalWindow size={15} />,
}

type Translate = ReturnType<typeof createTranslator>

interface PortabilityProofLedgerProps extends PortabilityProofState {
  capsuleLoopArtifactProof?: PortabilityCapsuleLoopLiveProof | null
  capsuleLoopProofBusyFormat?: PortabilityCapsuleFormat | null
  onRunCapsuleLoopProof?: (format: PortabilityCapsuleFormat) => void
  t: Translate
}

/** Shows the real proof state for portability lanes without overclaiming cloud sync. */
export function PortabilityProofLedger({
  capsuleLoopArtifactProof,
  capsuleLoopProofBusyFormat,
  onRunCapsuleLoopProof,
  t,
  ...proofState
}: PortabilityProofLedgerProps) {
  const { clearProofReport, proofReport, proofReports, storeProofReport } = useObjectStorageLiveProofReport()
  const effectiveProofState = {
    ...proofState,
    objectStorageLiveProofReport: proofReport ?? proofState.objectStorageLiveProofReport,
  }
  const providerProofReports = proofReports.length > 0
    ? proofReports
    : compactProofReport(effectiveProofState.objectStorageLiveProofReport)
  const rows = listPortabilityProofRows(effectiveProofState)
  const capsuleLoopPreviewProof = buildPortabilityCapsuleLoopProof({
    exportPreview: effectiveProofState.capsuleExportPreview,
    importPreview: effectiveProofState.capsuleImportPreview,
  })

  return (
    <section
      aria-label={t('settings.portability.proofLedgerAria')}
      className="grimoire-portability-card grid gap-2 rounded-md border border-border p-3"
      data-testid="portability-proof-ledger"
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <span className="mt-0.5 text-muted-foreground"><ShieldCheck size={15} /></span>
        <span className="min-w-0">
          <span className="block text-xs font-semibold text-foreground">{t('settings.portability.proofLedgerTitle')}</span>
          <span className="block text-[11px] leading-snug text-muted-foreground">
            {t('settings.portability.proofLedgerDescription')}
          </span>
        </span>
        <PortabilityProofReportDialog
          hasPastedReport={Boolean(proofReport)}
          onClear={clearProofReport}
          onLoad={storeProofReport}
          t={t}
        />
      </div>

      <PortabilityProofHistoryStrip reports={providerProofReports} t={t} />

      <PortabilityCapsuleLoopProof
        busyFormat={capsuleLoopProofBusyFormat}
        liveProof={capsuleLoopArtifactProof}
        onRunProof={onRunCapsuleLoopProof}
        proof={capsuleLoopPreviewProof}
        t={t}
      />

      <div className="grid gap-1.5">
        {rows.map((row) => (
          <ProofLedgerRow
            key={row.id}
            providerProofReports={providerProofReports}
            row={row}
            t={t}
          />
        ))}
      </div>
    </section>
  )
}

function ProofLedgerRow({
  providerProofReports,
  row,
  t,
}: {
  providerProofReports?: readonly ObjectStorageLiveProofReport[]
  row: PortabilityProofRow
  t: Translate
}) {
  const [copiedCommand, setCopiedCommand] = useState<string | null>(null)
  const [failedCommand, setFailedCommand] = useState<string | null>(null)
  const [detailsOpen, setDetailsOpen] = useState(false)
  const hasDeveloperProof = Boolean(row.commands?.length || row.providerRequirements?.length)
  const copy = proofRowCopy(row, t)

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
        <span className="min-w-0 text-xs font-semibold text-foreground">{copy.label}</span>
        <Badge variant={row.supportStatus === 'ready' ? 'secondary' : 'outline'} className="rounded-md text-[10px]">
          {supportStatusLabel(row.supportStatus, t)}
        </Badge>
        <Badge variant="outline" className="rounded-md text-[10px]">
          {proofLevelLabel(row.proofLevel, t)}
        </Badge>
        <span className="min-w-0 text-[11px] text-muted-foreground">{copy.detail}</span>
      </div>
      <div className="text-[11px] leading-snug text-muted-foreground">{copy.evidence}</div>
      {row.providerRequirements?.length ? (
        <ProviderSetupSummary row={row} t={t} />
      ) : null}
      {row.liveProofs?.length ? (
        <div className="grid gap-1" aria-label={t('settings.portability.proofLiveAria', { label: copy.label })}>
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
      {row.id === 'provider-proof-runner' ? (
        <PortabilityProviderFailureMatrix reports={providerProofReports} t={t} />
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
          ? hasDeveloperProof ? t('settings.portability.proofDetailsDeveloperHide') : t('settings.portability.proofDetailsHide')
          : hasDeveloperProof ? t('settings.portability.proofDetailsDeveloperShow') : t('settings.portability.proofDetailsShow')}
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
                const commandCopy = proofCommandCopy(proofCommand, t)

                return (
                  <div className="flex min-w-0 items-center gap-2" key={proofCommand.id}>
                    <Button
                      aria-label={t('settings.portability.proofCommandAria', { label: commandCopy.label })}
                      className="h-6 border-border px-2 text-[11px] text-foreground"
                      onClick={() => {
                        void copyCommand(proofCommand)
                      }}
                      size="xs"
                      type="button"
                      variant="outline"
                    >
                      {copyState === 'copied' ? <ClipboardCheck className="size-3" /> : <Copy className="size-3" />}
                      {copyState === 'copied'
                        ? t('settings.portability.proofCopyCopied')
                        : copyState === 'failed' ? t('settings.portability.proofCopyFailed') : commandCopy.label}
                    </Button>
                    <span className="min-w-0 truncate font-mono text-[10px] text-muted-foreground">
                      {proofCommand.command}
                    </span>
                    <span className="hidden min-w-[11rem] text-[10px] text-muted-foreground sm:inline">
                      {commandCopy.detail}
                    </span>
                  </div>
                )
              })}
            </div>
          ) : null}
          {row.providerRequirements?.length ? (
            <div
              aria-label={t('settings.portability.proofSetupChecklistAria', { label: copy.label })}
              className="grid gap-1 text-[10px] leading-snug text-muted-foreground"
            >
              {row.providerRequirements.map((requirement) => (
                <div className="grid gap-0.5" key={requirement.id}>
                  <span className="font-semibold text-foreground">
                    {t('settings.portability.proofSetupLabel', { label: requirement.label })}
                  </span>
                  <span>
                    {t('settings.portability.proofGate')}{' '}
                    <code className="font-mono text-foreground">{requirement.gate}</code>;{' '}
                    {t('settings.portability.proofRequired')}{' '}
                    <EnvNameList names={requirement.required} />; {t('settings.portability.proofOptional')}{' '}
                    <EnvNameList names={requirement.optional} />
                  </span>
                  <span>{t('settings.portability.proofStillNeeds', { need: proofRequirementNeed(requirement, t) })}</span>
                </div>
              ))}
            </div>
          ) : null}
          <div className="text-[11px] leading-snug text-muted-foreground">
            {t('settings.portability.proofStillToProve', { proof: copy.remainingProof })}
          </div>
        </div>
      ) : null}
    </div>
  )
}

function compactProofReport(
  report?: ObjectStorageLiveProofReport | null,
): readonly ObjectStorageLiveProofReport[] {
  return report ? [report] : []
}

function ProviderSetupSummary({ row, t }: { row: PortabilityProofRow; t: Translate }) {
  return (
    <div
      className="flex flex-wrap gap-1.5 text-[10px] leading-snug text-muted-foreground"
      data-testid={`portability-proof-setup-summary-${row.id}`}
    >
      {row.providerRequirements?.map((requirement) => (
        <span className="settings-proof-chip rounded border border-border px-1.5 py-0.5" key={requirement.id}>
          <span className="font-semibold text-foreground">{requirement.label}</span>
          <span> {t('settings.portability.proofGate')} </span>
          <code className="font-mono text-foreground">{requirement.gate}</code>
          <span>; {t('settings.portability.proofNeeds')} </span>
          <EnvNameList names={requirement.required} />
        </span>
      ))}
    </div>
  )
}

function supportStatusLabel(status: PortabilityProofRow['supportStatus'], t: Translate): string {
  if (status === 'ready') return t('settings.portability.ready')
  if (status === 'fixture') return t('settings.portability.supportPreviewBacked')
  if (status === 'available') return t('settings.portability.supportOptIn')
  if (status === 'folder-proof') return t('settings.portability.supportFolderProofOnly')
  if (status === 'proof-preview') return t('settings.portability.proofPreview')
  return status
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
