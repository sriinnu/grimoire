import type { PortabilityLiveProof } from './portabilityProof'
import type { ObjectStorageSyncReport } from '../utils/objectStorageSync'

export interface ObjectStorageProviderPreviewProofReports {
  azurePull?: ObjectStorageSyncReport
  azurePush?: ObjectStorageSyncReport
  s3Pull?: ObjectStorageSyncReport
  s3Push?: ObjectStorageSyncReport
}

/** Builds redacted proof-ledger cards from reviewed S3/Azure provider previews. */
export function objectStorageProviderPreviewProofs(
  reports?: ObjectStorageProviderPreviewProofReports | null,
): readonly PortabilityLiveProof[] {
  if (!reports) return []
  return [
    previewProof('s3-provider-push-preview', 'S3 provider push preview', reports.s3Push),
    previewProof('s3-provider-pull-preview', 'S3 provider pull preview', reports.s3Pull),
    previewProof('azure-provider-push-preview', 'Azure provider push preview', reports.azurePush),
    previewProof('azure-provider-pull-preview', 'Azure provider pull preview', reports.azurePull),
  ].filter((proof): proof is PortabilityLiveProof => proof !== null)
}

function previewProof(
  id: PortabilityLiveProof['id'],
  label: string,
  report?: ObjectStorageSyncReport,
): PortabilityLiveProof | null {
  if (!report || report.adapter_phase !== 'provider-sdk-adapter') return null
  return {
    id,
    label,
    status: report.applied ? 'applied preview contract' : 'reviewed preview',
    detail: [
      `${providerModeLabel(report.prototype_mode)} ${report.direction}`,
      `${report.conflicts} conflicts`,
      `${report.excluded_files} local-only withheld`,
      report.preview_signature ? 'signature captured' : 'signature missing',
      'not provider-proven sync yet',
    ].join('; '),
  }
}

function providerModeLabel(mode: ObjectStorageSyncReport['prototype_mode']): string {
  if (mode === 's3-live-provider') return 's3-live-provider'
  if (mode === 'azure-live-provider') return 'azure-live-provider'
  return 'local-mirror-fixture'
}
