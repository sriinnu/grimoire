import { invoke } from '@tauri-apps/api/core'
import { isTauri, mockInvoke } from '../mock-tauri'
import type { MarkdownFolderImportResult } from '../lib/vaultPortability'
import { pickFile, pickFolder } from './vault-dialog'

export type JournalImportSource = 'day-one' | 'journey'

/** Opens a folder picker for importing a local Markdown app export. */
export function pickMarkdownImportFolder(): Promise<string | null> {
  return pickFolder('Import Markdown folder')
}

/** Opens a file picker for importing a portable Markdown ZIP export. */
export function pickMarkdownZipImportFile(): Promise<string | null> {
  return pickFile('Import Markdown ZIP', [{ name: 'Markdown ZIP', extensions: ['zip'] }])
}

/** Opens a folder picker for importing a Bear Markdown/TextBundle export. */
export function pickBearImportFolder(): Promise<string | null> {
  return pickFolder('Import Bear Markdown/TextBundle folder')
}

/** Opens a file picker for importing app journal exports. */
export function pickJournalImportSource(source: JournalImportSource): Promise<string | null> {
  const label = source === 'day-one' ? 'Day One JSON/ZIP export' : 'Journey ZIP/JSON export'
  return pickFile(`Import ${label}`, [{ name: label, extensions: ['zip', 'json'] }])
}

/** Copies a local Markdown folder into the active vault. */
export function importMarkdownFolderIntoVault(
  vaultPath: string,
  sourcePath: string,
): Promise<MarkdownFolderImportResult> {
  const args = { vaultPath, sourcePath }
  return isTauri()
    ? invoke<MarkdownFolderImportResult>('import_markdown_folder', args)
    : mockInvoke<MarkdownFolderImportResult>('import_markdown_folder', args)
}

/** Extracts a Markdown ZIP export into the active vault. */
export function importMarkdownZipIntoVault(
  vaultPath: string,
  sourcePath: string,
): Promise<MarkdownFolderImportResult> {
  const args = { vaultPath, sourcePath }
  return isTauri()
    ? invoke<MarkdownFolderImportResult>('import_markdown_zip', args)
    : mockInvoke<MarkdownFolderImportResult>('import_markdown_zip', args)
}

/** Converts a Day One or Journey export into Markdown notes in the active vault. */
export function importJournalExportIntoVault(
  vaultPath: string,
  sourcePath: string,
  sourceKind: JournalImportSource,
): Promise<MarkdownFolderImportResult> {
  const args = { vaultPath, sourcePath, sourceKind }
  return isTauri()
    ? invoke<MarkdownFolderImportResult>('import_journal_export', args)
    : mockInvoke<MarkdownFolderImportResult>('import_journal_export', args)
}

/** Builds concise user feedback for a completed Markdown folder import. */
export function formatMarkdownImportToast(result: MarkdownFolderImportResult): string {
  const noteLabel = result.notes_copied === 1 ? 'note' : 'notes'
  const assetPart = result.assets_copied > 0
    ? ` and ${result.assets_copied} asset${result.assets_copied === 1 ? '' : 's'}`
    : ''
  const failurePart = result.failed_files > 0 ? `; ${result.failed_files} failed` : ''
  return `Imported ${result.notes_copied} ${noteLabel}${assetPart}${failurePart}`
}
