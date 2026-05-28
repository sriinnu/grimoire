import type { PortabilityCapsuleFormat, PortabilityCapsulePreviewResult } from './portabilityCapsule'
import type { VaultPortabilityActionId } from './vaultPortability'

const EXPORT_TO_PREVIEW: Partial<Record<VaultPortabilityActionId, PortabilityCapsuleFormat>> = {
  'export-json': 'json',
  'export-sqlite': 'sqlite',
}

/** In-memory reviewed export preview; source paths never live here. */
export interface PortabilityExportPreviewState {
  format: PortabilityCapsuleFormat
  result: PortabilityCapsulePreviewResult
}

/** Returns true when this export writes a capsule and must follow a matching preview. */
export function exportRequiresReview(actionId: VaultPortabilityActionId): boolean {
  return actionId in EXPORT_TO_PREVIEW
}

/** Returns true when the current capsule preview unlocks this exact export action. */
export function hasReviewedExportPreview(
  actionId: VaultPortabilityActionId,
  preview: PortabilityExportPreviewState | null | undefined,
): boolean {
  return Boolean(preview && EXPORT_TO_PREVIEW[actionId] === preview.format)
}

/** Returns the reviewed capsule format or null when the export should stay locked. */
export function reviewedExportFormat(
  actionId: VaultPortabilityActionId,
  preview: PortabilityExportPreviewState | null,
): PortabilityCapsuleFormat | null {
  return hasReviewedExportPreview(actionId, preview) ? preview?.format ?? null : null
}
