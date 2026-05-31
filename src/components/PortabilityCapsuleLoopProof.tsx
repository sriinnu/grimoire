import { Repeat2 } from 'lucide-react'
import type { createTranslator } from '../lib/i18n'
import type { PortabilityCapsuleFormat } from '../lib/portabilityCapsule'
import type { PortabilityCapsuleLoopProof as CapsuleLoopProof } from '../lib/portabilityCapsuleLoopProof'
import type { PortabilityCapsuleLoopLiveProof } from '../lib/portabilityCapsuleLoopLiveProof'
import { listCapsuleLoopArtifactProofSteps } from '../lib/portabilityCapsuleLoopLiveProof'
import { capsuleLoopCopy, capsuleLoopStepCopy } from './PortabilityProofLedgerDisplay'
import { Badge } from './ui/badge'
import { Button } from './ui/button'

interface PortabilityCapsuleLoopProofProps {
  busyFormat?: PortabilityCapsuleFormat | null
  liveProof?: PortabilityCapsuleLoopLiveProof | null
  onRunProof?: (format: PortabilityCapsuleFormat) => void
  proof: CapsuleLoopProof
  t: ReturnType<typeof createTranslator>
}

/** Shows whether local JSON/SQLite capsule export and import previews are paired. */
export function PortabilityCapsuleLoopProof({
  busyFormat = null,
  liveProof = null,
  onRunProof,
  proof,
  t,
}: PortabilityCapsuleLoopProofProps) {
  const copy = capsuleLoopCopy(proof, t)
  return (
    <section
      aria-label={copy.ariaLabel}
      className="grimoire-preview-stat grid gap-1.5 rounded-md border border-border px-2 py-1.5"
      data-loop-status={proof.status}
      data-testid="portability-capsule-loop-proof"
    >
      <div className="flex min-w-0 flex-wrap items-center gap-1.5">
        <Repeat2 className="size-3.5 text-muted-foreground" />
        <span className="min-w-0 text-xs font-semibold text-foreground">{copy.title}</span>
        <Badge variant={proof.status === 'reviewed' ? 'secondary' : 'outline'} className="rounded-md text-[10px]">
          {copy.statusLabel}
        </Badge>
        <Badge variant="outline" className="rounded-md text-[10px]">
          {copy.formatLabel}
        </Badge>
      </div>
      <div className="text-[11px] leading-snug text-muted-foreground">{copy.detail}</div>
      <div className="flex flex-wrap gap-1">
        <Button
          className="h-6 px-2 text-[11px]"
          disabled={!onRunProof || Boolean(busyFormat)}
          onClick={() => onRunProof?.('json')}
          size="xs"
          type="button"
          variant="outline"
        >
          {busyFormat === 'json'
            ? t('settings.portability.capsuleLoopProofRunning')
            : t('settings.portability.capsuleLoopProofRunJson')}
        </Button>
        <Button
          className="h-6 px-2 text-[11px]"
          disabled={!onRunProof || Boolean(busyFormat)}
          onClick={() => onRunProof?.('sqlite')}
          size="xs"
          type="button"
          variant="outline"
        >
          {busyFormat === 'sqlite'
            ? t('settings.portability.capsuleLoopProofRunning')
            : t('settings.portability.capsuleLoopProofRunSqlite')}
        </Button>
      </div>
      {liveProof ? <CapsuleLoopLiveProof proof={liveProof} t={t} /> : null}
      <div className="grid gap-1 sm:grid-cols-2" data-testid="portability-capsule-loop-steps">
        {proof.steps.map((step) => {
          const stepCopy = capsuleLoopStepCopy(step, t)
          return (
            <div
              className="rounded-md border border-border/70 px-2 py-1 text-[10px] text-muted-foreground"
              data-step-status={step.status}
              data-testid={`portability-capsule-loop-step-${step.id}`}
              key={step.id}
            >
              <span className="font-semibold text-foreground">{stepCopy.label}</span>
              <span className="ml-1">{stepCopy.status}</span>
            </div>
          )
        })}
      </div>
    </section>
  )
}

function CapsuleLoopLiveProof({
  proof,
  t,
}: {
  proof: PortabilityCapsuleLoopLiveProof
  t: ReturnType<typeof createTranslator>
}) {
  const format = proof.format === 'json' ? 'JSON' : 'SQLite'
  const steps = listCapsuleLoopArtifactProofSteps(proof)
  return (
    <div
      className="grid gap-1 rounded-md border border-border/70 px-2 py-1 text-[10px] leading-snug text-muted-foreground"
      data-testid="portability-capsule-loop-live-proof"
    >
      <div>
        <span className="font-semibold text-foreground">
          {t('settings.portability.capsuleLoopProofArtifact')}: {proof.status.replaceAll('_', ' ')}
        </span>
        <span className="block">
          {format}; {proof.files_exported} files; {proof.notes_previewed_for_import} notes;{' '}
          {proof.assets_previewed_for_import} assets; {proof.local_only_rows_previewed} withheld;{' '}
          {proof.artifact_path_stored
            ? t('settings.portability.capsuleLoopProofPathStored')
            : t('settings.portability.capsuleLoopProofPathNotStored')}
        </span>
      </div>
      <div
        aria-label={t('settings.portability.capsuleLoopArtifactStepsAria')}
        className="grid gap-1 sm:grid-cols-2"
      >
        {steps.map((step) => (
          <span
            className="rounded border border-border/70 px-1.5 py-0.5"
            data-step-status={step.status}
            data-testid={`portability-capsule-loop-live-step-${step.id}`}
            key={step.id}
          >
            <span className="font-semibold text-foreground">{artifactStepLabel(step.id, t)}</span>
            <span className="ml-1">
              {step.status === 'done'
                ? t('settings.portability.capsuleLoopStepStatusDone')
                : t('settings.portability.capsuleLoopStepStatusWarning')}
            </span>
          </span>
        ))}
      </div>
    </div>
  )
}

function artifactStepLabel(
  id: ReturnType<typeof listCapsuleLoopArtifactProofSteps>[number]['id'],
  t: ReturnType<typeof createTranslator>,
): string {
  if (id === 'export-signature') return t('settings.portability.capsuleLoopArtifactStepExportSignature')
  if (id === 'import-signature') return t('settings.portability.capsuleLoopArtifactStepImportSignature')
  if (id === 'count-match') return t('settings.portability.capsuleLoopArtifactStepCounts')
  if (id === 'locality-proof') return t('settings.portability.capsuleLoopArtifactStepLocality')
  return t('settings.portability.capsuleLoopArtifactStepPath')
}
