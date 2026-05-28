import type { ImportAutopsyPreviewState, VaultPortabilityActionId } from './vaultPortability'

const IMPORT_TO_PREVIEW: Partial<Record<VaultPortabilityActionId, ImportAutopsyPreviewState['sourceId']>> = {
  'apple-journal': 'apple-journal-preview',
  bear: 'bear-preview',
  'day-one': 'day-one-preview',
  'json-capsule': 'json-capsule-preview',
  journey: 'journey-preview',
  'markdown-folder': 'markdown-folder-preview',
  'markdown-zip': 'markdown-zip-preview',
  'notion-folder': 'notion-folder-preview',
  'notion-markdown': 'notion-markdown-preview',
  obsidian: 'obsidian-preview',
  'sqlite-capsule': 'sqlite-capsule-preview',
  spanda: 'spanda-preview',
}

/** Returns true when the import writes to the vault and must follow a matching no-write preview. */
export function importRequiresReview(actionId: VaultPortabilityActionId): boolean {
  return actionId in IMPORT_TO_PREVIEW
}

/** Returns true when the current no-write preview unlocks this exact import action. */
export function hasReviewedImportPreview(
  actionId: VaultPortabilityActionId,
  preview: ImportAutopsyPreviewState | null | undefined,
): boolean {
  return Boolean(preview && IMPORT_TO_PREVIEW[actionId] === preview.sourceId)
}

/** Returns the source path from the matching reviewed preview, or null when import must stay locked. */
export function reviewedImportSourcePath(
  actionId: VaultPortabilityActionId,
  preview: ImportAutopsyPreviewState | null,
): string | null {
  return hasReviewedImportPreview(actionId, preview) ? preview?.result.source_path ?? null : null
}
