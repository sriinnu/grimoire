import {
  portabilityCapsuleFormatLabel,
  type PortabilityCapsuleFormat,
} from '../lib/portabilityCapsule'
import type {
  MarkdownFolderImportPreviewResult,
  MarkdownFolderImportResult,
} from '../lib/vaultPortability'
import { isTauri, mockInvoke } from '../mock-tauri'
import { invoke } from '../lib/tauriRuntime'
import { pickFile } from './vault-dialog'

/** Opens a file picker for importing a Grimoire JSON portability capsule. */
export function pickJsonCapsuleImportFile(): Promise<string | null> {
  return pickFile('Import JSON capsule', [{ name: 'Grimoire JSON capsule', extensions: ['json'] }])
}

/** Opens a file picker for importing a Grimoire SQLite portability capsule. */
export function pickSqliteCapsuleImportFile(): Promise<string | null> {
  return pickFile('Import SQLite capsule', [
    { name: 'Grimoire SQLite capsule', extensions: ['sqlite', 'db'] },
  ])
}

/** Previews a Grimoire JSON or SQLite portability capsule without writing. */
export function previewPortabilityCapsuleImport(
  vaultPath: string,
  sourcePath: string,
  format: PortabilityCapsuleFormat,
): Promise<MarkdownFolderImportPreviewResult> {
  const args = { vaultPath, sourcePath, format }
  return isTauri()
    ? invoke<MarkdownFolderImportPreviewResult>('preview_portability_capsule_import', args)
    : mockInvoke<MarkdownFolderImportPreviewResult>('preview_portability_capsule_import', args)
}

/** Imports a reviewed Grimoire JSON or SQLite capsule into the active vault. */
export function importPortabilityCapsuleIntoVault(
  vaultPath: string,
  sourcePath: string,
  format: PortabilityCapsuleFormat,
  previewSignature: string,
): Promise<MarkdownFolderImportResult> {
  const args = { vaultPath, sourcePath, format, previewSignature }
  return isTauri()
    ? invoke<MarkdownFolderImportResult>('import_portability_capsule', args)
    : mockInvoke<MarkdownFolderImportResult>('import_portability_capsule', args)
}

/** Builds concise user feedback for a completed capsule import. */
export function formatPortabilityCapsuleImportToast(
  result: MarkdownFolderImportResult,
  format: PortabilityCapsuleFormat,
): string {
  const label = portabilityCapsuleFormatLabel(format)
  const noteLabel = result.notes_copied === 1 ? 'note' : 'notes'
  const assetPart = result.assets_copied > 0
    ? ` and ${result.assets_copied} asset${result.assets_copied === 1 ? '' : 's'}`
    : ''
  const skippedPart = result.skipped_files > 0 ? `; withheld ${result.skipped_files}` : ''
  return `Imported ${label}: ${result.notes_copied} ${noteLabel}${assetPart}${skippedPart}`
}

/** Builds concise user feedback for a no-write capsule import preview. */
export function formatPortabilityCapsuleImportPreviewToast(
  result: MarkdownFolderImportPreviewResult,
  format: PortabilityCapsuleFormat,
): string {
  const label = portabilityCapsuleFormatLabel(format)
  const skippedPart = result.skipped_files > 0 ? `, ${result.skipped_files} withheld` : ''
  const noteLabel = result.notes_to_copy === 1 ? 'note' : 'notes'
  const assetLabel = result.assets_to_copy === 1 ? 'asset' : 'assets'
  return `Previewed ${label} import: ${result.notes_to_copy} ${noteLabel}, ${result.assets_to_copy} ${assetLabel}${skippedPart}; no writes yet`
}
