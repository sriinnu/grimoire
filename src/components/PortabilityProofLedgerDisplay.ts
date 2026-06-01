import type { createTranslator } from '../lib/i18n'
import type {
  PortabilityCapsuleLoopProof,
  PortabilityCapsuleLoopStep,
} from '../lib/portabilityCapsuleLoopProof'
import type {
  PortabilityProofCommand,
  PortabilityProofLevel,
  PortabilityProofRow,
  PortabilityProviderRequirement,
} from '../lib/portabilityProof'

type Translate = ReturnType<typeof createTranslator>

interface ProofRowCopy {
  detail: string
  evidence: string
  label: string
  remainingProof: string
}

interface ProofCommandCopy {
  detail: string
  label: string
}

interface CapsuleLoopCopy {
  ariaLabel: string
  detail: string
  formatLabel: string
  statusLabel: string
  title: string
}

interface CapsuleLoopStepCopy {
  label: string
  status: string
}

/** Translates the static proof-row contract while keeping model evidence structured and redacted. */
export function proofRowCopy(row: PortabilityProofRow, t: Translate): ProofRowCopy {
  switch (row.id) {
    case 'imports':
      return {
        detail: t('settings.portability.proofRowImportsDetail', { count: row.metrics?.readyImportsCount ?? 0 }),
        evidence: row.evidence,
        label: t('settings.portability.proofRowImportsLabel'),
        remainingProof: t('settings.portability.proofRowImportsRemaining'),
      }
    case 'exports':
      return {
        detail: t('settings.portability.proofRowExportsDetail', { count: row.metrics?.readyExportsCount ?? 0 }),
        evidence: t('settings.portability.proofRowExportsEvidence'),
        label: t('settings.portability.proofRowExportsLabel'),
        remainingProof: t('settings.portability.proofRowExportsRemaining'),
      }
    case 'desktop-sync':
      return {
        detail: t('settings.portability.proofRowDesktopSyncDetail', {
          count: row.metrics?.filesystemStorageCount ?? 0,
        }),
        evidence: t('settings.portability.proofRowDesktopSyncEvidence'),
        label: t('settings.portability.proofRowDesktopSyncLabel'),
        remainingProof: t('settings.portability.proofRowDesktopSyncRemaining'),
      }
    case 'object-storage':
      return {
        detail: t('settings.portability.proofRowObjectStorageDetail', {
          providers: row.metrics?.objectStorageLabels || 'S3, Azure Blob',
        }),
        evidence: t('settings.portability.proofRowObjectStorageEvidence'),
        label: t('settings.portability.proofRowObjectStorageLabel'),
        remainingProof: t('settings.portability.proofRowObjectStorageRemaining'),
      }
    case 'provider-proof-runner':
      return {
        detail: t('settings.portability.proofRowProviderRunnerDetail'),
        evidence: t('settings.portability.proofRowProviderRunnerEvidence'),
        label: t('settings.portability.proofRowProviderRunnerLabel'),
        remainingProof: t('settings.portability.proofRowProviderRunnerRemaining'),
      }
  }
}

/** Translates copyable proof commands without changing the command string itself. */
export function proofCommandCopy(command: PortabilityProofCommand, t: Translate): ProofCommandCopy {
  if (command.id === 'dry-run') {
    return {
      detail: t('settings.portability.proofCommandDryRunDetail'),
      label: t('settings.portability.proofCommandDryRunLabel'),
    }
  }
  return {
    detail: t('settings.portability.proofCommandLiveProofDetail'),
    label: t('settings.portability.proofCommandLiveProofLabel'),
  }
}

/** Translates requirement proof-needs while preserving provider names and env var gates. */
export function proofRequirementNeed(requirement: PortabilityProviderRequirement, t: Translate): string {
  if (requirement.id === 's3') return t('settings.portability.proofRequirementS3Need')
  return t('settings.portability.proofRequirementAzureNeed')
}

/** Converts proof levels into localized compact labels for Settings badges. */
export function proofLevelLabel(level: PortabilityProofLevel, t: Translate): string {
  switch (level) {
    case 'fixture-regression':
      return t('settings.portability.proofLevelFixtureRegression')
    case 'local-regression':
      return t('settings.portability.proofLevelLocalRegression')
    case 'provider-managed-local-folder':
      return t('settings.portability.proofLevelProviderManagedLocalFolder')
    case 'local-mirror-fixture':
      return t('settings.portability.proofLevelLocalMirrorFixture')
    case 'live-read-only-plus-local-mirror':
      return t('settings.portability.proofLevelLiveReadOnlyPlusLocalMirror')
    case 'live-provider-proof-runner':
      return t('settings.portability.proofLevelManualLive')
  }
}

/** Translates the always-visible local capsule loop proof card. */
export function capsuleLoopCopy(proof: PortabilityCapsuleLoopProof, t: Translate): CapsuleLoopCopy {
  const formatLabel = capsuleLoopFormatLabel(proof.formatLabel, t)
  return {
    ariaLabel: t('settings.portability.capsuleLoopAria'),
    detail: capsuleLoopDetail(proof.status, formatLabel, t),
    formatLabel,
    statusLabel: capsuleLoopStatusLabel(proof.status, t),
    title: t('settings.portability.capsuleLoopTitle'),
  }
}

/** Translates one local capsule loop checklist row. */
export function capsuleLoopStepCopy(step: PortabilityCapsuleLoopStep, t: Translate): CapsuleLoopStepCopy {
  return {
    label: capsuleLoopStepLabel(step.id, t),
    status: capsuleLoopStepStatus(step.status, t),
  }
}

function capsuleLoopStatusLabel(status: PortabilityCapsuleLoopProof['status'], t: Translate): string {
  if (status === 'reviewed') return t('settings.portability.capsuleLoopStatusReviewed')
  if (status === 'mismatch') return t('settings.portability.capsuleLoopStatusMismatch')
  if (status === 'needs-review') return t('settings.portability.capsuleLoopStatusNeedsReview')
  return t('settings.portability.capsuleLoopStatusMissing')
}

function capsuleLoopDetail(
  status: PortabilityCapsuleLoopProof['status'],
  formatLabel: string,
  t: Translate,
): string {
  if (status === 'reviewed') return t('settings.portability.capsuleLoopDetailReviewed', { format: formatLabel })
  if (status === 'mismatch') return t('settings.portability.capsuleLoopDetailMismatch', { format: formatLabel })
  if (status === 'needs-review') return t('settings.portability.capsuleLoopDetailNeedsReview')
  return t('settings.portability.capsuleLoopDetailMissing')
}

function capsuleLoopFormatLabel(label: string, t: Translate): string {
  if (label === 'No capsule') return t('settings.portability.capsuleLoopFormatNone')
  return label.replaceAll('missing', t('settings.portability.capsuleLoopFormatMissing'))
}

function capsuleLoopStepLabel(id: PortabilityCapsuleLoopStep['id'], t: Translate): string {
  if (id === 'export-preview') return t('settings.portability.capsuleLoopStepExportPreview')
  if (id === 'import-preview') return t('settings.portability.capsuleLoopStepImportPreview')
  if (id === 'format-match') return t('settings.portability.capsuleLoopStepFormatMatch')
  return t('settings.portability.capsuleLoopStepLocalityProof')
}

function capsuleLoopStepStatus(status: PortabilityCapsuleLoopStep['status'], t: Translate): string {
  if (status === 'done') return t('settings.portability.capsuleLoopStepStatusDone')
  if (status === 'warning') return t('settings.portability.capsuleLoopStepStatusWarning')
  return t('settings.portability.capsuleLoopStepStatusMissing')
}
